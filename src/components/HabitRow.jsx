// File: src/components/HabitRow.jsx
// Author: Cheng (refactor assisted)
// Description:
//   UI row for a single habit.
//   - Keeps your original layout (two rows + optional level bar)
//   - Background uses makeProgressBg({percent, completed}) to act as progress fill
//   - Supports minutes timer (countdown + elapsedSec + commit)
//   - Supports quick add, calculator, dropdown (edit/delete/upgrade/downgrade)
//
// Notes:
//   - Minutes unit stored as seconds (handled by your hooks: useHabitValue/useHabitValueAtTarget)

import { useCallback, useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { useSyncedBoundHabitTimer } from '../hooks/useSyncedBoundHabitTimer';
import { useBoundHabitTimer } from '../hooks/useBoundHabitTimer';
import { useHabitValue } from '../hooks/useHabitValue';
import { useHabitValueAtTarget } from '../hooks/useHabitValueAtTarget';
import HabitValueCalculator from './HabitValueCalculator';
import { formatSec } from '../utils/formatSec';

const TODAY_COLOR = '#2196f3';
const DONE_COLOR = '#4caf50';
const QUICK_ADD_BASE_STYLE = {
  border: '1px solid #4caf50',
  borderRadius: '3px',
  padding: '2px 5px',
  cursor: 'pointer',
  background: '#e8f5e9',
  fontSize: '10px',
  fontWeight: '500',
  color: '#2e7d32',
  minWidth: '28px',
  transition: 'all 0.2s'
};

const QUICK_ADD_HOVER_STYLE = {
  background: '#c8e6c9'
};

function QuickAddButtons({ values, unit, onAdd }) {
  const [hover, setHover] = useState(null);

  return (
    <>
      {values.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onAdd(n)}
          style={{
            ...QUICK_ADD_BASE_STYLE,
            ...(hover === n ? QUICK_ADD_HOVER_STYLE : null)
          }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          title={`Add ${n} ${unit || ''}`}
        >
          +{n}
        </button>
      ))}
    </>
  );
}

function DropdownMenu({
  dropdownRef,
  canUpgrade,
  canDowngrade,
  onEdit,
  onDelete,
  onUpgrade,
  onDowngrade
}) {
  return (
    <div
      ref={dropdownRef}
      className="dropdown"
      style={{
        position: 'absolute',
        width: '120px',
        top: '100%',
        right: 0,
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '6px 8px',
        zIndex: 999,
        marginTop: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
      }}
    >
      <button style={{ padding: '4px 0' }} onClick={onEdit}>
        ✏️ Edit
      </button>

      {canUpgrade && (
        <button style={{ padding: '4px 0' }} onClick={onUpgrade}>
          ⬆️ Upgrade
        </button>
      )}

      {canDowngrade && (
        <button style={{ padding: '4px 0' }} onClick={onDowngrade}>
          ⬇️ Downgrade
        </button>
      )}

      <button style={{ padding: '4px 0' }} onClick={onDelete}>
        🗑️ Delete
      </button>
    </div>
  );
}

export default function HabitRow({
  userId,
  storageMode,
  item,
  items,
  selectedDate,
  updateItem,
  deleteItem,
  setEditItem,
  openDropdownId,
  setOpenDropdownId,

  // from evaluateCompletion:
  completed,
  level,
  mainLevelIndex,
  requiredTarget,
  requiredTargetRaw, // ✅ 新增
  currentValue,
  totalCount = 0,
  nextLevelTotal = 0,

  // helper for background
  makeProgressBg
}) {
  const isLevelHabit = item.type === 'habit' && item.levelEnabled;
  const showDropdown = openDropdownId === item.id;
  const dropdownRef = useRef(null);

  const isMinuteUnit = String(item.unit || '').toLowerCase() === 'minutes';

  const { rawValue, setRawValue, displayValue, inputStep, addDisplayValue } = useHabitValue({
    item,
    selectedDate,
    updateItem,
    isLevelHabit,
    mainLevelIndex,
    isMinuteUnit
  });

  useClickOutside(dropdownRef, () => setOpenDropdownId(null), showDropdown);

  const habitValueAtTarget = useHabitValueAtTarget({ items, updateItem });

  const timerBindTarget = useMemo(
    () => ({
      itemId: item.id,
      date: selectedDate,
      isLevelHabit,
      mainLevelIndex
    }),
    [item.id, selectedDate, isLevelHabit, mainLevelIndex]
  );

  const getTimerBindTarget = useCallback(() => timerBindTarget, [timerBindTarget]);

  const syncedTimer = useSyncedBoundHabitTimer({
    enabled: isMinuteUnit && storageMode === 'firebase',
    userId,
    countdownSeconds: 5,
    getBindTarget: getTimerBindTarget,
    getCurrentValueAtTarget: habitValueAtTarget.getRawValueAtTarget,
    commitValueAtTarget: habitValueAtTarget.setRawValueAtTarget
  });

  const localTimer = useBoundHabitTimer({
    enabled: isMinuteUnit && storageMode === 'local',
    countdownSeconds: 5,
    getBindTarget: getTimerBindTarget,
    getCurrentValueAtTarget: habitValueAtTarget.getRawValueAtTarget,
    commitValueAtTarget: habitValueAtTarget.setRawValueAtTarget
  });

  const timer = storageMode === 'local' ? localTimer : syncedTimer;

  const label = isLevelHabit ? item.mainLevels?.[mainLevelIndex] || item.name : item.name;
  const status = completed ? '✅' : '☑️';

  // ✅ 日/週/月/年 的進度分子要用 evaluate 回傳的 currentValue（它已經依 frequency 做加總）
  // ✅ 分母要用 requiredTargetRaw（minutes=seconds）才能跟 currentValue 對齊
  const curRaw = Number(currentValue) || 0;
  const targetRaw = Number(requiredTargetRaw) || 0;

  const dayProgressPercent =
    targetRaw > 0 ? Math.min(100, Math.floor((curRaw / targetRaw) * 100)) : 0;
  const freq = String(item.frequency || 'daily').toLowerCase();

  const perLabelMap = {
    daily: 'daily',
    weekly: 'per week',
    monthly: 'per month',
    yearly: 'per year'
  };

  const perLabel = perLabelMap[freq] || freq;

  const fmtRaw = (n) => (isMinuteUnit ? formatSec(Number(n) || 0) : String(Number(n) || 0));

  // today: 直接用 input 顯示值（已經是你 hook 處理過的 display）
  const todayText = String(displayValue ?? '0');

  // period: 用 evaluate 的 currentValue/requiredTargetRaw（raw → 依 unit format）
  const periodCurText = fmtRaw(curRaw);
  const periodTargetText = fmtRaw(targetRaw);

  // 你要的 UI 文字：
  // daily: 30 / 30 reps (daily)
  // weekly/monthly/yearly: 30(today) 90/300 reps (per week)
  const isDaily = freq === 'daily';

  const todayNode = <span style={{ color: '#2196f3' }}>{todayText}(today)</span>;

  const periodNode = (
    <span>
      {' '}
      {periodCurText} / {periodTargetText} {item.unit || ''}{' '}
      {!isDaily && <span style={{ color: '#999' }}>({perLabel})</span>}
    </span>
  );

  const progressPercent =
    nextLevelTotal > 0
      ? Math.min(100, Math.floor((Number(totalCount) / Number(nextLevelTotal)) * 100))
      : 0;

  const closeDropdown = () => setOpenDropdownId(null);

  const onEdit = () => {
    setEditItem(item);
    closeDropdown();
  };

  const onDelete = () => {
    if (confirm(`Delete "${item.name}"?`)) deleteItem(item.id);
    closeDropdown();
  };

  const mainLevelsLength = item.mainLevels?.length ?? 0;
  const canUpgrade = isLevelHabit && mainLevelsLength > 0 && mainLevelIndex < mainLevelsLength - 1;
  const canDowngrade = isLevelHabit && mainLevelsLength > 0 && mainLevelIndex > 0;

  const onUpgrade = () => {
    updateItem({ ...item, currentMainLevel: mainLevelIndex + 1 });
    closeDropdown();
  };

  const onDowngrade = () => {
    updateItem({ ...item, currentMainLevel: mainLevelIndex - 1 });
    closeDropdown();
  };

  const renderHabitInput = () => {
    return (
      <input
        type="number"
        min="0"
        step={inputStep}
        placeholder="0"
        value={displayValue}
        readOnly
        style={{
          width: '40px',
          padding: '0px 0px',
          border: 'none',
          fontSize: '13px',
          textAlign: 'right',
          backgroundColor: 'transparent',
          color: '#2196f3'
        }}
      />
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: '8px',
        padding: '6px 8px',
        borderRadius: '8px',
        background: makeProgressBg
          ? makeProgressBg({ percent: dayProgressPercent, completed })
          : undefined,
        transition: 'background 0.25s'
      }}
    >
      {/* First row: Status + Label + Input + Unit, Dropdown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {/* Left: Status + Label + Input + Unit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: '1', minWidth: 0 }}>
          <span>{status}</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>

          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
              {isDaily ? (
                <>
                  <span style={{ color: completed ? DONE_COLOR : TODAY_COLOR }}>
                    {periodCurText}
                  </span>
                  {' / '}
                  {periodTargetText} {item.unit || ''}
                </>
              ) : (
                <>
                  <span style={{ color: completed ? DONE_COLOR : TODAY_COLOR }}>
                    {todayText}(today)
                  </span>{' '}
                  {periodCurText} / {periodTargetText} {item.unit || ''}{' '}
                  <span style={{ color: '#999' }}>({perLabel})</span>
                </>
              )}
            </span>
          </div>

          {isMinuteUnit && (
            <span style={{ fontSize: '11px', color: '#888' }}>
              ({formatSec(Number(rawValue) || 0)})
            </span>
          )}

          <span style={{ fontSize: '12px', color: '#666' }}>LV{level}</span>
        </div>

        {/* Right: Dropdown trigger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenDropdownId(showDropdown ? null : item.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ⋮
            </button>

            {showDropdown && (
              <DropdownMenu
                dropdownRef={dropdownRef}
                canUpgrade={canUpgrade}
                canDowngrade={canDowngrade}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpgrade={onUpgrade}
                onDowngrade={onDowngrade}
              />
            )}
          </div>
        </div>
      </div>

      {/* Second row: Quick action buttons, Timer, Calculator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '6px',
          marginTop: '4px'
        }}
      >
        <QuickAddButtons values={[1, 2, 5, 10, 20]} unit={item.unit} onAdd={addDisplayValue} />

        {isMinuteUnit && (
          <button
            type="button"
            onClick={timer.toggleBound}
            title={
              timer.isTiming
                ? timer.countdown > 0
                  ? `倒數 ${timer.countdown} 秒後開始`
                  : 'Stop timer'
                : 'Start timer (倒數5秒後開始)'
            }
            style={{
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
              background: timer.countdown > 0 ? '#ff9800' : timer.isTiming ? '#ffe9a8' : '#f5f5f5',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
              color: timer.countdown > 0 ? '#fff' : 'inherit',
              fontWeight: timer.countdown > 0 ? 'bold' : 'normal'
            }}
          >
            ⏱️{' '}
            {timer.countdown > 0
              ? `倒數 ${timer.countdown}`
              : timer.isTiming
                ? timer.formatSec(timer.elapsedSec)
                : 'Start'}
          </button>
        )}

        <HabitValueCalculator
          isMinuteUnit={isMinuteUnit}
          rawValue={rawValue}
          commitRawValue={setRawValue}
        />
      </div>

      {/* Level progress (only when level habit) */}
      {isLevelHabit && (
        <div
          style={{
            marginTop: '6px',
            marginBottom: '4px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>LV{level}</span>
            <span>
              {isMinuteUnit
                ? `${formatSec(totalCount)} / ${formatSec(nextLevelTotal)}`
                : `${totalCount} / ${nextLevelTotal}`}
            </span>
            <span>LV{level + 1}</span>
          </div>

          <div
            style={{
              height: '10px',
              background: '#e0e0e0',
              borderRadius: '5px',
              overflow: 'hidden',
              marginTop: '4px'
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: '#4caf50',
                transition: 'width 0.3s'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
