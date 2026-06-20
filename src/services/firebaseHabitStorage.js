import { db } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { recordStorageAccess } from './storageAccessLog';

export function subscribeItems(userId, onChange, onError) {
  return onSnapshot(
    collection(db, `users/${userId}/habits`),
    (snapshot) => {
      recordStorageAccess(
        'firebase',
        'read',
        Math.max(1, snapshot.size || 0),
        'habits.subscribeItems.snapshot'
      );

      const data = {};
      snapshot.forEach((d) => {
        data[d.id] = { id: d.id, ...d.data() };
      });
      onChange(data);
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function saveItem(userId, item) {
  await setDoc(doc(db, `users/${userId}/habits`, item.id), item, { merge: true });
  recordStorageAccess('firebase', 'write', 1, 'habits.saveItem');
}

export async function deleteItem(userId, itemId) {
  await deleteDoc(doc(db, `users/${userId}/habits`, itemId));
  recordStorageAccess('firebase', 'write', 1, 'habits.deleteItem');
}

export function subscribeMainViewUi(userId, onChange, onError) {
  const ref = doc(db, `users/${userId}/ui`, 'mainView');

  return onSnapshot(
    ref,
    async (snap) => {
      recordStorageAccess('firebase', 'read', 1, 'mainView.subscribeUi.snapshot');

      if (!snap.exists()) {
        onChange({ filters: [] });
        try {
          await setDoc(ref, { filters: [], updatedAt: serverTimestamp() }, { merge: true });
          recordStorageAccess('firebase', 'write', 1, 'mainView.initUiDoc');
        } catch (e) {
          onError?.(e);
        }
        return;
      }

      const data = snap.data() || {};
      const itemIds = Array.isArray(data.filters) ? data.filters : [];
      onChange({ filters: itemIds });
    },
    (err) => {
      onError?.(err);
    }
  );
}

export async function saveMainViewUi(userId, data) {
  const ref = doc(db, `users/${userId}/ui`, 'mainView');
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  recordStorageAccess('firebase', 'write', 1, 'mainView.saveUi');
}
