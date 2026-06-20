// File: src/App.jsx
// Author: Cheng
// Description:
//    Main App component handling routing, Firebase auth, habit CRUD logic,
//    storage mode (firebase / local), and rendering views (Main, Calendar, Settings).

import { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Login from './components/Login';

import './App.css';
import MainView from './views/MainView';
import CalendarView from './views/CalendarView';
import SettingsView from './views/SettingsView';
import BottomBar from './components/BottomBar';
import AddItemForm from './components/AddItemForm';
import {
  getStorageMode,
  setStorageMode as persistStorageMode,
  subscribeItems,
  saveItem,
  saveAllItems,
  deleteItem as deleteStoredItem
} from './services/habitStorage';

const HABIT_WRITE_DEBOUNCE_MS = 900;

function App() {
  const [user, setUser] = useState(null);
  const userId = user?.uid;

  const [view, setView] = useState('main');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState({});
  const [storageMode, setStorageModeState] = useState(getStorageMode);

  const pendingWritesRef = useRef({});
  const writeTimersRef = useRef({});
  const storageModeRef = useRef(storageMode);

  useEffect(() => {
    storageModeRef.current = storageMode;
  }, [storageMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeItems(
      storageMode,
      userId,
      setItems,
      (err) => {
        console.error('🔥 habits subscribe error:', err?.code, err?.message);
      }
    );

    return () => unsub?.();
  }, [userId, storageMode]);

  useEffect(() => {
    return () => {
      Object.values(writeTimersRef.current).forEach(clearTimeout);
      writeTimersRef.current = {};
      pendingWritesRef.current = {};
    };
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  const formatDate = (date) => date.toISOString().split('T')[0];

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(formatDate(prev));
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(formatDate(next));
  };

  const flushOne = (id, uid) => {
    const toWrite = pendingWritesRef.current[id];
    delete pendingWritesRef.current[id];
    delete writeTimersRef.current[id];
    if (!toWrite || !uid) return;

    saveItem(storageModeRef.current, uid, toWrite).catch((e) => {
      console.error('🔥 saveItem failed:', e?.code, e?.message, toWrite);
    });
  };

  const updateItem = (updated, options = {}) => {
    if (!userId) {
      console.error('🔥 updateItem without userId', updated);
      return;
    }

    if (!updated?.id) {
      console.error('🔥 updateItem missing id', updated);
      return;
    }

    const id = updated.id;
    const immediate = options.immediate === true;

    setItems((prev) => ({
      ...prev,
      [id]: updated
    }));

    if (immediate) {
      if (writeTimersRef.current[id]) {
        clearTimeout(writeTimersRef.current[id]);
        delete writeTimersRef.current[id];
      }
      pendingWritesRef.current[id] = updated;
      flushOne(id, userId);
      return;
    }

    pendingWritesRef.current[id] = updated;
    if (writeTimersRef.current[id]) clearTimeout(writeTimersRef.current[id]);
    writeTimersRef.current[id] = setTimeout(() => {
      flushOne(id, userId);
    }, HABIT_WRITE_DEBOUNCE_MS);
  };

  const deleteItem = async (idToDelete) => {
    if (!userId) return;

    const nextItems = { ...items };
    delete nextItems[idToDelete];

    const groupsToUpdate = [];
    for (const key in nextItems) {
      const item = nextItems[key];
      if (item.type === 'group' && item.children) {
        const newChildren = item.children.filter((childId) => childId !== idToDelete);
        if (newChildren.length !== item.children.length) {
          nextItems[key] = { ...item, children: newChildren };
          groupsToUpdate.push(nextItems[key]);
        }
      }
    }

    setItems(nextItems);

    const mode = storageModeRef.current;
    try {
      if (mode === 'local') {
        await saveAllItems(mode, userId, nextItems);
      } else {
        await deleteStoredItem(mode, userId, idToDelete);
        for (const group of groupsToUpdate) {
          await saveItem(mode, userId, group);
        }
      }
    } catch (e) {
      console.error('🔥 deleteItem failed:', e?.code, e?.message);
    }
  };

  const handleStorageModeChange = async (nextMode) => {
    const normalized = nextMode === 'local' ? 'local' : 'firebase';
    if (normalized === storageMode) return;

    if (normalized === 'local') {
      if (userId) {
        await saveAllItems('local', userId, items);
      }
      persistStorageMode('local');
      setStorageModeState('local');
      return;
    }

    persistStorageMode('firebase');
    setStorageModeState('firebase');
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>
          Habit Tracker <span style={{ fontSize: '0.5em' }}>Happy new year 📆</span>
        </h1>
      </div>

      <div className="app-main">
        {view === 'main' && (
          <MainView
            userId={userId}
            storageMode={storageMode}
            items={items}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            updateItem={updateItem}
            deleteItem={deleteItem}
            setEditItem={setEditItem}
            goToPreviousDay={goToPreviousDay}
            goToNextDay={goToNextDay}
            openDropdownId={openDropdownId}
            setOpenDropdownId={setOpenDropdownId}
          />
        )}
        {view === 'calendar' && <CalendarView items={items} selectedDate={selectedDate} />}

        {view === 'settings' && (
          <SettingsView
            userId={userId}
            storageMode={storageMode}
            onStorageModeChange={handleStorageModeChange}
            items={items}
            setItems={setItems}
            updateItem={updateItem}
            saveAllItems={saveAllItems}
            onLogout={() => signOut(auth)}
          />
        )}
      </div>

      {showForm && !editItem && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="close-button" onClick={() => setShowForm(false)}>
              ✖
            </button>
            <AddItemForm items={items} updateItem={updateItem} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {editItem && !showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="close-button" onClick={() => setEditItem(null)}>
              ✖
            </button>
            <AddItemForm
              items={items}
              updateItem={updateItem}
              editItem={editItem}
              onClose={() => setEditItem(null)}
            />
          </div>
        </div>
      )}

      <BottomBar view={view} setView={setView} setShowForm={setShowForm} />
    </div>
  );
}

export default App;
