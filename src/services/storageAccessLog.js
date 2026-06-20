const LOG_KEY = 'habit-tree-tracker:storage-access-log:v1';
const LOG_CHANGED_EVENT = 'habit-tree-tracker:storage-access-log-changed';
const MAX_RECENT_EVENTS = 50;

const DEFAULT_LOG = {
  firebaseReadCount: 0,
  firebaseWriteCount: 0,
  localReadCount: 0,
  localWriteCount: 0,
  lastFirebaseReadAt: null,
  lastFirebaseWriteAt: null,
  lastLocalReadAt: null,
  lastLocalWriteAt: null,
  firebaseWriteSources: {},
  firebaseReadSources: {},
  localWriteSources: {},
  localReadSources: {},
  recentEvents: []
};

function normalizeSources(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
}

function normalizeRecentEvents(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_RECENT_EVENTS);
}

function parseLog(raw) {
  if (!raw) return { ...DEFAULT_LOG };
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LOG,
      ...parsed,
      firebaseWriteSources: normalizeSources(parsed.firebaseWriteSources),
      firebaseReadSources: normalizeSources(parsed.firebaseReadSources),
      localWriteSources: normalizeSources(parsed.localWriteSources),
      localReadSources: normalizeSources(parsed.localReadSources),
      recentEvents: normalizeRecentEvents(parsed.recentEvents)
    };
  } catch {
    return { ...DEFAULT_LOG };
  }
}

export function getStorageAccessLog() {
  return parseLog(localStorage.getItem(LOG_KEY));
}

function persistLog(log) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
  window.dispatchEvent(new Event(LOG_CHANGED_EVENT));
}

function getSourcesKey(provider, operation) {
  if (provider === 'firebase') {
    return operation === 'read' ? 'firebaseReadSources' : 'firebaseWriteSources';
  }
  if (provider === 'local') {
    return operation === 'read' ? 'localReadSources' : 'localWriteSources';
  }
  return null;
}

export function recordStorageAccess(provider, operation, amount = 1, source = 'unknown') {
  const n = Math.max(0, Number(amount) || 0);
  if (n === 0) return;

  const log = getStorageAccessLog();
  const now = new Date().toISOString();
  const sourceName = source || 'unknown';

  if (provider === 'firebase') {
    if (operation === 'read') {
      log.firebaseReadCount += n;
      log.lastFirebaseReadAt = now;
    } else if (operation === 'write') {
      log.firebaseWriteCount += n;
      log.lastFirebaseWriteAt = now;
    }
  } else if (provider === 'local') {
    if (operation === 'read') {
      log.localReadCount += n;
      log.lastLocalReadAt = now;
    } else if (operation === 'write') {
      log.localWriteCount += n;
      log.lastLocalWriteAt = now;
    }
  }

  const sourcesKey = getSourcesKey(provider, operation);
  if (sourcesKey) {
    log[sourcesKey] = { ...log[sourcesKey] };
    log[sourcesKey][sourceName] = (log[sourcesKey][sourceName] || 0) + n;
  }

  log.recentEvents = [
    {
      at: now,
      provider,
      operation,
      source: sourceName,
      amount: n
    },
    ...log.recentEvents
  ].slice(0, MAX_RECENT_EVENTS);

  persistLog(log);
}

export function resetStorageAccessLog() {
  persistLog({ ...DEFAULT_LOG });
}

export function subscribeStorageAccessLog(listener) {
  const handler = () => listener(getStorageAccessLog());
  window.addEventListener(LOG_CHANGED_EVENT, handler);
  listener(getStorageAccessLog());
  return () => window.removeEventListener(LOG_CHANGED_EVENT, handler);
}
