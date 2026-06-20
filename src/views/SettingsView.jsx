// File: src/views/SettingsView.jsx
// Author: Cheng
// Description:
//   Settings panel for storage mode, access log, data management, and logout.

import { useEffect, useRef, useState } from 'react';
import {
  getStorageAccessLog,
  resetStorageAccessLog,
  subscribeStorageAccessLog
} from '../services/storageAccessLog';

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function sortSources(sources) {
  if (!sources || typeof sources !== 'object') return [];
  return Object.entries(sources).sort((a, b) => b[1] - a[1]);
}

function SourceList({ title, sources }) {
  const entries = sortSources(sources);
  if (entries.length === 0) {
    return (
      <div style={{ marginTop: '12px' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: '#888' }}>(none)</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>
      <div
        style={{
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          lineHeight: 1.5,
          maxHeight: '160px',
          overflowY: 'auto'
        }}
      >
        {entries.map(([name, count]) => (
          <div key={name}>
            {name}: {count}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentEventsList({ events }) {
  const list = Array.isArray(events) ? events.slice(0, 20) : [];
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>Recent Events (latest 20)</div>
      {list.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: '#888' }}>(none)</div>
      ) : (
        <div
          style={{
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            lineHeight: 1.4,
            maxHeight: '200px',
            overflowY: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {list.map((evt, i) => (
            <div key={`${evt.at}-${i}`}>
              {formatTimestamp(evt.at)} | {evt.provider} | {evt.operation} | {evt.source} |{' '}
              {evt.amount}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsView({
  userId,
  storageMode,
  onStorageModeChange,
  items,
  setItems,
  updateItem,
  saveAllItems,
  onLogout
}) {
  const fileInputRef = useRef();
  const [accessLog, setAccessLog] = useState(getStorageAccessLog);

  useEffect(() => {
    return subscribeStorageAccessLog(setAccessLog);
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habit_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (typeof parsed !== 'object' || parsed === null) {
          alert('Invalid file content');
          return;
        }

        if (storageMode === 'local' && userId) {
          setItems(parsed);
          await saveAllItems('local', userId, parsed);
          alert('Import successful!');
          return;
        }

        for (const itemId in parsed) {
          updateItem(parsed[itemId], { immediate: true });
        }
        alert('Import successful! (Each item triggers a Firebase write.)');
      } catch {
        alert('Failed to parse file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
      <h2>⚙️ Settings View</h2>

      <section style={{ textAlign: 'left', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>資料儲存位置</h3>
        <label style={{ display: 'block', marginBottom: '6px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="storageMode"
            value="firebase"
            checked={storageMode === 'firebase'}
            onChange={() => onStorageModeChange('firebase')}
            style={{ marginRight: '8px' }}
          />
          Firebase 雲端同步
        </label>
        <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
          <input
            type="radio"
            name="storageMode"
            value="local"
            checked={storageMode === 'local'}
            onChange={() => onStorageModeChange('local')}
            style={{ marginRight: '8px' }}
          />
          本機瀏覽器儲存
        </label>
        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
          Firebase：可跨裝置同步，但會消耗 Firebase 讀寫。
          <br />
          本機：只存在目前瀏覽器，不會寫入 Firebase habits / filters / timers，換裝置不會同步。
        </p>
      </section>

      <section style={{ textAlign: 'left', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Storage Access Log</h3>
        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 0 }}>
          程式層級讀寫估算，不等於 Firebase Console 精準計費。
        </p>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
          <div>Firebase Reads: {accessLog.firebaseReadCount}</div>
          <div>Firebase Writes: {accessLog.firebaseWriteCount}</div>
          <div>Local Reads: {accessLog.localReadCount}</div>
          <div>Local Writes: {accessLog.localWriteCount}</div>
          <div>Last Firebase Read: {formatTimestamp(accessLog.lastFirebaseReadAt)}</div>
          <div>Last Firebase Write: {formatTimestamp(accessLog.lastFirebaseWriteAt)}</div>
          <div>Last Local Read: {formatTimestamp(accessLog.lastLocalReadAt)}</div>
          <div>Last Local Write: {formatTimestamp(accessLog.lastLocalWriteAt)}</div>
        </div>
        <SourceList title="Firebase Write Sources" sources={accessLog.firebaseWriteSources} />
        <SourceList title="Firebase Read Sources" sources={accessLog.firebaseReadSources} />
        <RecentEventsList events={accessLog.recentEvents} />
        <button type="button" onClick={() => resetStorageAccessLog()} style={{ marginTop: '8px' }}>
          Reset Log
        </button>
      </section>

      <button type="button" onClick={handleExport}>
        📤 Export Data
      </button>
      <br />
      <br />

      <button type="button" onClick={() => fileInputRef.current.click()}>
        📥 Import Data
      </button>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <br />
      <br />
      <button type="button" onClick={onLogout}>
        🔓 Sign Out
      </button>

      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Export will download all habit and group data.
        <br />
        Import will replace current data with the selected JSON file.
        {storageMode === 'firebase' && (
          <>
            <br />
            Firebase 模式下 Import 會逐筆寫入 Firestore，可能產生大量 writes。
          </>
        )}
      </p>
    </div>
  );
}
