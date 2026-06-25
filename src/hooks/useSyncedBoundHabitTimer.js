// File: src/hooks/useSyncedBoundHabitTimer.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { recordStorageAccess } from '../services/storageAccessLog';

function buildTimerDocId(target) {
  const lv = target?.isLevelHabit ? `L${target.mainLevelIndex ?? 0}` : 'N';
  return `${target.itemId}__${target.date}__${lv}`;
}

export function useSyncedBoundHabitTimer({
  enabled,
  userId,
  countdownSeconds = 5,
  getBindTarget,
  getCurrentValueAtTarget,
  commitValueAtTarget
}) {
  const targetRef = useRef(null);

  const countdownAbortRef = useRef({ aborted: false });
  const countdownRunningRef = useRef(false);

  const [countdown, setCountdown] = useState(0);

  const [state, setState] = useState('idle'); // idle | running | paused
  const [accumulatedSec, setAccumulatedSec] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState(null);

  const [displaySec, setDisplaySec] = useState(0);

  const isTiming = state === 'running' || countdown > 0;

  const bindTarget = getBindTarget?.() ?? null;
  const timerDocId = bindTarget ? buildTimerDocId(bindTarget) : null;

  const buildDocRefFromTarget = useCallback(
    (target) => {
      const id = buildTimerDocId(target);
      return doc(db, 'users', userId, 'timers', id);
    },
    [userId]
  );

  const timerDocRef = useMemo(() => {
    if (!userId || !timerDocId) return null;
    return doc(db, 'users', userId, 'timers', timerDocId);
  }, [userId, timerDocId]);

  useEffect(() => {
    if (!enabled) return;
    if (!timerDocRef) return;

    const unsub = onSnapshot(
      timerDocRef,
      (snap) => {
        recordStorageAccess('firebase', 'read', 1, 'timer.snapshot');

        if (!snap.exists()) {
          setState('idle');
          setAccumulatedSec(0);
          setStartedAtMs(null);
          return;
        }

        const d = snap.data() || {};
        setState(d.state || 'idle');
        setAccumulatedSec(Number(d.accumulatedSec) || 0);
        setStartedAtMs(d.startedAt?.toMillis ? d.startedAt.toMillis() : null);
      },
      (err) => {
        console.error('[TIMER] onSnapshot error', err);
      }
    );

    return () => unsub();
  }, [enabled, timerDocRef]);

  useEffect(() => {
    if (!enabled) return;

    if (state !== 'running' || !startedAtMs) {
      setDisplaySec(accumulatedSec);
      return;
    }

    const id = setInterval(() => {
      const delta = Math.floor((Date.now() - startedAtMs) / 1000);
      setDisplaySec(accumulatedSec + Math.max(0, delta));
    }, 1000);

    return () => clearInterval(id);
  }, [enabled, state, startedAtMs, accumulatedSec]);

  const formatSec = useCallback((sec) => {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, []);

  const start = useCallback(async () => {
    if (!enabled) return;
    if (!userId) return;

    if (countdownRunningRef.current) return;
    if (state === 'running') return;

    const resolvedTarget = targetRef.current ?? getBindTarget?.() ?? null;
    if (!resolvedTarget) return;
    targetRef.current = resolvedTarget;

    const localDocRef = buildDocRefFromTarget(resolvedTarget);

    const token = { aborted: false };
    countdownAbortRef.current = token;
    countdownRunningRef.current = true;

    setCountdown(countdownSeconds);

    try {
      for (let t = countdownSeconds; t > 0; t--) {
        await new Promise((r) => setTimeout(r, 1000));
        if (token.aborted) {
          setCountdown(0);
          return;
        }
        setCountdown((prev) => Math.max(0, prev - 1));
      }

      if (token.aborted) {
        setCountdown(0);
        return;
      }

      let didWrite = false;

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(localDocRef);
        const d = snap.exists() ? snap.data() : {};

        if (d?.state === 'running') return;

        const nextVersion = (Number(d?.version) || 0) + 1;

        tx.set(
          localDocRef,
          {
            state: 'running',
            accumulatedSec: Number(d?.accumulatedSec) || 0,
            startedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: nextVersion
          },
          { merge: true }
        );

        didWrite = true;
      });

      if (didWrite) {
        recordStorageAccess('firebase', 'write', 1, 'timer.start.running');
      }
    } catch (err) {
      console.error('[TIMER] start error', err);
      if (!token.aborted) {
        setCountdown(0);
      }
    } finally {
      if (countdownAbortRef.current === token) {
        countdownRunningRef.current = false;
      }
    }
  }, [
    enabled,
    userId,
    state,
    getBindTarget,
    countdownSeconds,
    buildDocRefFromTarget
  ]);

  const cancel = useCallback(() => {
    if (countdownAbortRef.current) countdownAbortRef.current.aborted = true;
    countdownRunningRef.current = false;

    setCountdown(0);
    setStartedAtMs(null);
    setDisplaySec(accumulatedSec);
  }, [accumulatedSec]);

  const pause = useCallback(async () => {
    if (!enabled) return;
    if (!userId) return;

    const resolvedTarget = targetRef.current ?? getBindTarget?.() ?? null;
    if (!resolvedTarget) return;
    targetRef.current = resolvedTarget;

    const localDocRef = buildDocRefFromTarget(resolvedTarget);

    let optimisticAccumulatedSec;
    if (state === 'running' && startedAtMs) {
      optimisticAccumulatedSec =
        accumulatedSec + Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    } else {
      optimisticAccumulatedSec = displaySec || accumulatedSec;
    }

    const previousState = state;
    const previousAccumulatedSec = accumulatedSec;
    const previousStartedAtMs = startedAtMs;
    const previousDisplaySec = displaySec;

    setState('paused');
    setAccumulatedSec(optimisticAccumulatedSec);
    setStartedAtMs(null);
    setDisplaySec(optimisticAccumulatedSec);
    setCountdown(0);

    try {
      let didWrite = false;
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(localDocRef);
        if (!snap.exists()) return;

        const d = snap.data() || {};
        if (d.state !== 'running' || !d.startedAt?.toMillis) return;

        const acc = Number(d.accumulatedSec) || 0;
        const started = d.startedAt.toMillis();
        const delta = Math.floor((Date.now() - started) / 1000);
        const add = Math.max(0, delta);

        const nextVersion = (Number(d.version) || 0) + 1;

        tx.set(
          localDocRef,
          {
            state: 'paused',
            accumulatedSec: acc + add,
            startedAt: null,
            updatedAt: serverTimestamp(),
            version: nextVersion
          },
          { merge: true }
        );
        didWrite = true;
      });
      if (didWrite) {
        recordStorageAccess('firebase', 'write', 1, 'timer.pause.paused');
      }
    } catch (err) {
      console.error('[TIMER] pause error', err);
      setState(previousState);
      setAccumulatedSec(previousAccumulatedSec);
      setStartedAtMs(previousStartedAtMs);
      setDisplaySec(previousDisplaySec);
    }
  }, [
    enabled,
    userId,
    getBindTarget,
    buildDocRefFromTarget,
    state,
    accumulatedSec,
    startedAtMs,
    displaySec
  ]);

  const stopAndCommit = useCallback(async () => {
    if (!enabled) return;
    if (!userId) return;

    const resolvedTarget = targetRef.current ?? getBindTarget?.() ?? null;
    if (!resolvedTarget) return;
    targetRef.current = resolvedTarget;

    const localDocRef = buildDocRefFromTarget(resolvedTarget);

    const previousState = state;
    const previousAccumulatedSec = accumulatedSec;
    const previousStartedAtMs = startedAtMs;
    const previousDisplaySec = displaySec;

    setState('idle');
    setAccumulatedSec(0);
    setStartedAtMs(null);
    setDisplaySec(0);
    setCountdown(0);

    try {
      let didWrite = false;
      const secondsToCommit = await runTransaction(db, async (tx) => {
        const snap = await tx.get(localDocRef);
        if (!snap.exists()) return 0;

        const d = snap.data() || {};
        const acc = Number(d.accumulatedSec) || 0;

        let add = 0;
        if (d.state === 'running' && d.startedAt?.toMillis) {
          const started = d.startedAt.toMillis();
          const delta = Math.floor((Date.now() - started) / 1000);
          add = Math.max(0, delta);
        }

        const total = acc + add;
        const nextVersion = (Number(d.version) || 0) + 1;

        tx.set(
          localDocRef,
          {
            state: 'idle',
            accumulatedSec: 0,
            startedAt: null,
            updatedAt: serverTimestamp(),
            version: nextVersion
          },
          { merge: true }
        );
        didWrite = true;

        return total;
      });

      if (didWrite) {
        recordStorageAccess('firebase', 'write', 1, 'timer.stop.idle');
      }

      if (secondsToCommit > 0) {
        const current = Number(getCurrentValueAtTarget?.(resolvedTarget)) || 0;
        commitValueAtTarget?.(resolvedTarget, current + secondsToCommit);
      }
    } catch (err) {
      console.error('[TIMER] stopAndCommit error', err);
      setState(previousState);
      setAccumulatedSec(previousAccumulatedSec);
      setStartedAtMs(previousStartedAtMs);
      setDisplaySec(previousDisplaySec);
    }
  }, [
    enabled,
    userId,
    getBindTarget,
    buildDocRefFromTarget,
    getCurrentValueAtTarget,
    commitValueAtTarget,
    state,
    accumulatedSec,
    startedAtMs,
    displaySec
  ]);

  const toggleBound = useCallback(() => {
    if (!enabled) return;

    if (!isTiming) {
      start();
      return;
    }

    if (countdown > 0) {
      cancel();
      return;
    }

    if (state === 'running') {
      stopAndCommit();
      return;
    }

    start();
  }, [enabled, isTiming, countdown, state, start, cancel, stopAndCommit]);

  return {
    state,
    isTiming,
    countdown,
    elapsedSec: displaySec,
    formatSec,
    start,
    pause,
    stopAndCommit,
    toggleBound,
    cancelBound: cancel,
    boundTarget: targetRef.current
  };
}
