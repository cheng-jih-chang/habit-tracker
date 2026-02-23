// File: src/components/evaluate.js
// Author: Cheng
// Description:
//   Evaluate habit/group completion for a date.
//   NOTE: For unit === 'minutes', progress is stored in SECONDS.
//   So dailyGoal / thresholds must be converted to seconds for calculations.

const isMinutesUnit = (item) => String(item?.unit || '').toLowerCase() === 'minutes';

// Convert target numbers (minutes) -> seconds when unit is minutes.
// For non-minutes units, keep as-is.
const toProgressUnit = (item, value) => {
  const n = Number(value) || 0;
  return isMinutesUnit(item) ? n * 60 : n;
};

// --- Frequency goal picker (UI units) ---
const getGoalUIByFrequency = (item) => {
  const freq = String(item?.frequency || 'daily').toLowerCase();
  if (freq === 'weekly') return item?.weeklyGoal ?? 0;
  if (freq === 'monthly') return item?.monthlyGoal ?? 0;
  if (freq === 'yearly') return item?.yearlyGoal ?? 0;
  if (freq === 'life') return item?.lifeGoal ?? 0;
  if (freq === 'none') return 0;
  return item?.dailyGoal ?? 0;
};

// --- Sum progress map by frequency (progress units) ---
// progressMap keys: 'YYYY-MM-DD' -> number (minutes habit stores seconds)
const sumProgressByFrequency = (progressMap, selectedDate, frequency) => {
  if (!progressMap) return 0;

  const freq = String(frequency || 'daily').toLowerCase();

  // Daily: today only
  if (freq === 'daily') return Number(progressMap?.[selectedDate] ?? 0) || 0;

  // None: always 0
  if (freq === 'none') return 0;

  // Life: sum all
  if (freq === 'life') {
    return Object.values(progressMap).reduce((sum, v) => sum + (Number(v) || 0), 0);
  }

  // Parse YYYY-MM-DD safely (local date)
  const toDate = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const dt = toDate(selectedDate);
  dt.setHours(0, 0, 0, 0);

  // Monday-start week (Mon..Sun)
  const startOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 Sun ... 6 Sat
    const diff = day === 0 ? -6 : 1 - day; // move to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  let from, to;

  if (freq === 'weekly') {
    from = startOfWeek(dt);
    to = new Date(from);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else if (freq === 'monthly') {
    from = new Date(dt.getFullYear(), dt.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    to = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
  } else if (freq === 'yearly') {
    from = new Date(dt.getFullYear(), 0, 1);
    from.setHours(0, 0, 0, 0);
    to = new Date(dt.getFullYear(), 11, 31);
    to.setHours(23, 59, 59, 999);
  } else {
    // fallback daily
    return Number(progressMap?.[selectedDate] ?? 0) || 0;
  }

  let sum = 0;
  for (const [dateStr, v] of Object.entries(progressMap)) {
    const d2 = toDate(dateStr);
    d2.setHours(0, 0, 0, 0);
    if (d2 >= from && d2 <= to) sum += Number(v) || 0;
  }
  return sum;
};

export function evaluateCompletion(items, id, selectedDate, visited = new Set()) {
  const item = items[id];
  if (!item) return { completed: false, count: 0, totalCount: 0 };

  // 防止循環：A -> B -> A
  if (visited.has(id)) {
    // 回傳安全值，避免整棵樹 render 爆掉
    return {
      completed: false,
      count: 0,
      totalCount: 0,
      totalChildren: item.type === 'group' ? item.children?.length || 0 : 0,
      nextLevelTotal: 0,
      level: 0,
      requiredTarget: item.type === 'group' ? Number(item.targetCount ?? 0) : 0
    };
  }

  const nextVisited = new Set(visited);
  nextVisited.add(id);

  // ------------------------------------------------------------
  // GROUP LEVEL (NEW)
  // ------------------------------------------------------------
  if (item.type === 'group' && item.levelEnabled) {
    const children = item.children || [];
    const childStats = children
      .map((childId) => evaluateCompletion(items, childId, selectedDate, nextVisited))
      .filter(Boolean);

    // child 的「進度比值」：能算就用 totalCount/nextLevelTotal，不能算就用 completed 轉 0/1
    const ratios = childStats.map((s) => {
      if (s.nextLevelTotal && s.nextLevelTotal > 0) return s.totalCount / s.nextLevelTotal;
      return s.completed ? 1 : 0;
    });

    // 也把 totalCount/nextLevelTotal 拿出來，方便 sum 策略用
    const totalCounts = childStats.map((s) => Number(s.totalCount) || 0);
    const nextTotals = childStats.map((s) => Number(s.nextLevelTotal) || 0);

    const strategy = String(item.levelStrategy || 'min').toLowerCase();

    // group level：用孩子的 level 聚合（沒有 level 就當 0）
    const childLevels = childStats.map((s) => Number(s.level) || 0);

    const safeMin = (arr) => (arr.length ? Math.min(...arr) : 0);
    const safeMax = (arr) => (arr.length ? Math.max(...arr) : 0);
    const safeAvg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const safeSum = (arr) => arr.reduce((a, b) => a + b, 0);

    let progressRatio = 0;
    let level = 0;

    if (strategy === 'max') {
      progressRatio = safeMax(ratios);
      level = safeMax(childLevels);
    } else if (strategy === 'avg') {
      progressRatio = safeAvg(ratios);
      level = Math.floor(safeAvg(childLevels));
    } else if (strategy === 'sum') {
      const total = safeSum(totalCounts);
      const next = safeSum(nextTotals);
      progressRatio = next > 0 ? total / next : safeAvg(ratios);
      // sum 的 level 比較難定義，這裡先用 min（保守）或你也可以改成 avg/max
      level = safeMin(childLevels);
    } else {
      // default: 'min'
      progressRatio = safeMin(ratios);
      level = safeMin(childLevels);
    }

    progressRatio = Math.max(0, Math.min(1, progressRatio));

    // 讓 UI 能顯示成「x / y」
    // 這裡用 ratio*100 代表進度，nextLevelTotal 固定 100 -> 顯示更直觀
    const nextLevelTotal = 100;
    const totalCount = Math.round(progressRatio * 100);

    // 你原本 group 完成條件（count/totalChildren/targetCount）可以照舊算
    // 這裡示範：維持你原本 count / totalChildren 計算方式（用 child completed）
    const totalChildren = children.length;
    const count = childStats.filter((s) => s.completed).length;

    // targetCount：你 group data 有 targetCount
    const requiredTarget = Number(item.targetCount ?? totalChildren) || 0;
    const completed = requiredTarget > 0 ? count >= requiredTarget : count === totalChildren;

    return {
      completed,
      count,
      totalChildren,
      requiredTarget,
      level,
      totalCount,
      nextLevelTotal
    };
  }

  // LEVEL HABIT
  if (item.type === 'habit' && item.levelEnabled) {
    const mainLevelIndex = item.currentMainLevel ?? 0;
    const progressMap = item.progressByMainLevel?.[mainLevelIndex] ?? {};

    // progress values are:
    // - seconds if unit === minutes
    // - original unit otherwise
    const freq = item.frequency ?? 'daily';
    const currentValue = sumProgressByFrequency(progressMap, selectedDate, freq);
    const totalCount = Object.values(progressMap).reduce((sum, v) => sum + (Number(v) || 0), 0);

    // thresholds are stored in UI units (minutes when unit === minutes)
    const thresholdUI = item.levelThreshold || 100;
    const multiplier = item.levelMultiplier || 3;

    // Convert threshold to progress unit if needed (minutes -> seconds)
    let base = toProgressUnit(item, thresholdUI);
    let totalRequired = base;

    let level = 0;
    while (totalCount >= totalRequired) {
      level += 1;
      base *= multiplier;
      totalRequired += base;
    }

    // dailyGoal is in UI units (minutes when unit === minutes)
    const requiredTargetUI = getGoalUIByFrequency(item);
    const requiredTarget = toProgressUnit(item, requiredTargetUI);
    const completed = requiredTarget > 0 ? currentValue >= requiredTarget : false;

    return {
      completed,
      level,
      mainLevelIndex,
      currentValue, // in progress unit (sec if minutes)
      requiredTarget: requiredTargetUI, // keep UI unit for display (minutes)
      requiredTargetRaw: requiredTarget,
      count: 0,
      totalCount, // in progress unit
      nextLevelTotal: totalRequired // in progress unit
    };
  }

  // SIMPLE HABIT
  if (item.type === 'habit') {
    const freq = item.frequency ?? 'daily';
    const currentValue = sumProgressByFrequency(item.progressByDate, selectedDate, freq);

    const requiredTargetUI = getGoalUIByFrequency(item);
    const requiredTarget = toProgressUnit(item, requiredTargetUI);

    const completed = requiredTarget > 0 ? currentValue >= requiredTarget : false;

    return {
      completed,
      currentValue, // in progress unit (sec if minutes)
      requiredTarget: requiredTargetUI, // UI unit for display (minutes)
      requiredTargetRaw: requiredTarget
    };
  }

  // GROUP
  if (item.type === 'group') {
    const results = (item.children || []).map((childId) =>
      evaluateCompletion(items, childId, selectedDate, nextVisited)
    );
    const count = results.filter((r) => r.completed).length;
    const totalChildren = results.length;
    const completed = count >= (item.targetCount || 0);

    return {
      completed,
      count,
      requiredTarget: item.targetCount,
      totalChildren
    };
  }

  return { completed: false };
}
