import { recordStorageAccess } from './storageAccessLog';

const LEGACY_ITEMS_KEY = 'habit_items';

function itemsKey(userId) {
  return `habit-tree-tracker:local-items:v1:${userId}`;
}

function mainViewUiKey(userId) {
  return `habit-tree-tracker:local-main-view-ui:v1:${userId}`;
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function loadItems(userId) {
  recordStorageAccess('local', 'read');

  const key = itemsKey(userId);
  let raw = localStorage.getItem(key);

  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_ITEMS_KEY);
    if (legacy) {
      const parsed = parseJson(legacy, {});
      localStorage.setItem(key, JSON.stringify(parsed));
      recordStorageAccess('local', 'write');
      return parsed;
    }
    return {};
  }

  return parseJson(raw, {});
}

export function saveAllItems(userId, items) {
  localStorage.setItem(itemsKey(userId), JSON.stringify(items));
  recordStorageAccess('local', 'write');
}

export function saveItem(userId, item) {
  const items = loadItems(userId);
  items[item.id] = item;
  saveAllItems(userId, items);
}

export function deleteItem(userId, itemId) {
  const items = loadItems(userId);
  delete items[itemId];
  saveAllItems(userId, items);
}

export function subscribeItems(userId, onChange, onError) {
  try {
    const items = loadItems(userId);
    onChange(items);
  } catch (err) {
    onError?.(err);
  }
  return () => {};
}

export function loadMainViewUi(userId) {
  recordStorageAccess('local', 'read');
  const raw = localStorage.getItem(mainViewUiKey(userId));
  return parseJson(raw, { filters: [] });
}

export function saveMainViewUi(userId, data) {
  localStorage.setItem(mainViewUiKey(userId), JSON.stringify(data));
  recordStorageAccess('local', 'write');
}

export function subscribeMainViewUi(userId, onChange, onError) {
  try {
    const data = loadMainViewUi(userId);
    onChange(data);
  } catch (err) {
    onError?.(err);
  }
  return () => {};
}
