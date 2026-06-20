import * as localHabitStorage from './localHabitStorage';
import * as firebaseHabitStorage from './firebaseHabitStorage';

export const STORAGE_MODE_KEY = 'habit-tree-tracker:storage-mode:v1';

export function getStorageMode() {
  const raw = localStorage.getItem(STORAGE_MODE_KEY);
  if (raw === 'local' || raw === 'firebase') return raw;
  return 'firebase';
}

export function setStorageMode(mode) {
  const next = mode === 'local' ? 'local' : 'firebase';
  localStorage.setItem(STORAGE_MODE_KEY, next);
  return next;
}

function normalizeMode(storageMode) {
  return storageMode === 'local' ? 'local' : 'firebase';
}

export function subscribeItems(storageMode, userId, onChange, onError) {
  const mode = normalizeMode(storageMode);
  if (mode === 'local') {
    return localHabitStorage.subscribeItems(userId, onChange, onError);
  }
  return firebaseHabitStorage.subscribeItems(userId, onChange, onError);
}

export async function saveAllItems(storageMode, userId, items) {
  const mode = normalizeMode(storageMode);
  if (mode === 'local') {
    localHabitStorage.saveAllItems(userId, items);
    return;
  }
  const itemList = Object.values(items);
  console.warn(
    `[Firebase write warning] saveAllItems(firebase) will write ${itemList.length} habit documents.`
  );
  for (const item of itemList) {
    await firebaseHabitStorage.saveItem(userId, item);
  }
}

export async function saveItem(storageMode, userId, item) {
  const mode = normalizeMode(storageMode);
  if (mode === 'local') {
    localHabitStorage.saveItem(userId, item);
    return;
  }
  await firebaseHabitStorage.saveItem(userId, item);
}

export async function deleteItem(storageMode, userId, itemId) {
  const mode = normalizeMode(storageMode);
  if (mode === 'local') {
    localHabitStorage.deleteItem(userId, itemId);
    return;
  }
  await firebaseHabitStorage.deleteItem(userId, itemId);
}

export function subscribeMainViewUi(storageMode, userId, onChange, onError) {
  const mode = normalizeMode(storageMode);
  if (mode === 'local') {
    return localHabitStorage.subscribeMainViewUi(userId, onChange, onError);
  }
  return firebaseHabitStorage.subscribeMainViewUi(userId, onChange, onError);
}

export async function saveMainViewUi(storageMode, userId, data) {
  const mode = normalizeMode(storageMode);
  if (mode === 'local') {
    localHabitStorage.saveMainViewUi(userId, data);
    return;
  }
  await firebaseHabitStorage.saveMainViewUi(userId, data);
}
