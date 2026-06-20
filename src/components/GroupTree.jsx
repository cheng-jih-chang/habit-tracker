// File: src/components/GroupTree.jsx
// Author: Cheng
// Description:
//   Recursive UI component for displaying and managing habits and habit groups.
//   Supports three item types:
//     - Simple habits with direct daily input
//     - Level-enabled habits with progress bars and level calculation
//     - Groups composed of child habits or subgroups
//   Includes logic for dropdown actions (edit, delete, level upgrade/downgrade),
//   nested rendering of child items, and progress input handling.
//   Evaluates completion status via evaluateCompletion() for visual feedback and progress display.

import { evaluateCompletion } from './evaluate';

import HabitRow from './HabitRow';
import GroupRow from './GroupRow';

const BG_TODO = '#eef7ee';
const BG_FILL = '#d9f2dc';
const BG_DONE = '#c8e6c9';

function makeProgressBg({ percent, completed }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const fill = completed ? BG_DONE : BG_FILL;
  return `linear-gradient(
    90deg,
    ${fill} 0%,
    ${fill} ${p}%,
    ${BG_TODO} ${p}%,
    ${BG_TODO} 100%
  )`;
}

function GroupTree({
  userId,
  storageMode,
  items,
  itemId,
  selectedDate,
  updateItem,
  deleteItem,
  setEditItem,
  openDropdownId,
  setOpenDropdownId,
  collapsedMap,
  setCollapsedMap
}) {
  const item = items[itemId];
  if (!item) return null;

  const {
    completed,
    level,
    mainLevelIndex,
    requiredTarget,
    requiredTargetRaw,
    currentValue,
    count,
    totalCount = 0,
    totalChildren = 0,
    nextLevelTotal = 0
  } = evaluateCompletion(items, itemId, selectedDate);
  const isLevelGroup = item.type === 'group' && item.levelEnabled;
  const isHabit = item.type === 'habit';
  const isGroup = item.type === 'group';
  const isCollapsed = isGroup ? (collapsedMap?.[item.id] ?? true) : false;

  const toggleCollapse = () => {
    if (!isGroup) return;
    setCollapsedMap((prev) => {
      const prevMap = prev || {};
      const current = prevMap[item.id] ?? true; // 預設收合
      return {
        ...prevMap,
        [item.id]: !current
      };
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'rgb(197, 241, 198)',
        marginLeft: '0px',
        borderLeft: '2px solid #ccc',
        borderRadius: '5px',
        paddingLeft: '10px',
        marginBottom: '10px'
      }}
    >
      {isGroup && (
        <GroupRow
          item={item}
          completed={completed}
          level={level}
          count={count}
          totalChildren={totalChildren}
          totalCount={totalCount}
          nextLevelTotal={nextLevelTotal}
          isCollapsed={isCollapsed}
          isLevelGroup={isLevelGroup}
          onToggleCollapse={toggleCollapse}
          openDropdownId={openDropdownId}
          setOpenDropdownId={setOpenDropdownId}
          onEdit={() => setEditItem(item)}
          onDelete={() => {
            if (confirm(`Delete "${item.name}"?`)) deleteItem(item.id);
          }}
        />
      )}
      {isHabit && (
        <HabitRow
          userId={userId}
          storageMode={storageMode}
          item={item}
          items={items}
          selectedDate={selectedDate}
          updateItem={updateItem}
          deleteItem={deleteItem}
          setEditItem={setEditItem}
          openDropdownId={openDropdownId}
          setOpenDropdownId={setOpenDropdownId}
          completed={completed}
          level={level}
          mainLevelIndex={mainLevelIndex}
          requiredTargetRaw={requiredTargetRaw}
          currentValue={currentValue}
          totalCount={totalCount}
          nextLevelTotal={nextLevelTotal}
          makeProgressBg={makeProgressBg}
        />
      )}

      {isGroup &&
        !isCollapsed &&
        item.children.map((childId) => (
          <GroupTree
            key={childId}
            userId={userId}
            storageMode={storageMode}
            items={items}
            itemId={childId}
            selectedDate={selectedDate}
            updateItem={updateItem}
            deleteItem={deleteItem}
            setEditItem={setEditItem}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
            collapsedMap={collapsedMap}
            setCollapsedMap={setCollapsedMap}
          />
        ))}
    </div>
  );
}

export default GroupTree;
