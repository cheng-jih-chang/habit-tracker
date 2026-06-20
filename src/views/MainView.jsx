// File: src/views/MainView.jsx
// Author: Cheng
// Description:
//   Main daily view for habit tracking. Displays a list of top-level habit groups,
//   each rendered via the GroupTree component. Users can navigate between days
//   using date controls, view or manage habit items, and perform CRUD operations.

import GroupTree from '../components/GroupTree';
import AddFilterModal from '../components/AddFilterModal';
import { useEffect, useMemo, useRef, useState } from 'react';
import { subscribeMainViewUi, saveMainViewUi } from '../services/habitStorage';

export default function MainView({
  userId,
  storageMode,
  items,
  selectedDate,
  setSelectedDate,
  updateItem,
  deleteItem,
  setEditItem,
  goToPreviousDay,
  goToNextDay,
  openDropdownId,
  setOpenDropdownId
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [collapsedMap, setCollapsedMap] = useState({});
  const [viewFilter, setViewFilter] = useState('all');
  const [filters, setFilters] = useState([]);
  const uiHydratingRef = useRef(true);

  const lastFiltersRef = useRef('');
  const writeTimerRef = useRef(null);

  const topLevelItems = useMemo(() => {
    const allChildren = Object.values(items)
      .filter((i) => i.type === 'group')
      .flatMap((g) => g.children || []);
    return Object.values(items).filter((item) => !allChildren.includes(item.id));
  }, [items]);

  useEffect(() => {
    if (!userId) return;

    uiHydratingRef.current = true;

    const unsub = subscribeMainViewUi(
      storageMode,
      userId,
      (data) => {
        const itemIds = Array.isArray(data?.filters) ? data.filters : [];
        setFilters(itemIds.map((itemId) => ({ id: itemId, itemId })));
        setViewFilter('all');

        const sorted = Array.from(new Set(itemIds)).sort();
        lastFiltersRef.current = JSON.stringify(sorted);
        uiHydratingRef.current = false;
      },
      (err) => {
        console.error('🔥 ui/mainView subscribe error:', err?.code, err?.message);
        uiHydratingRef.current = false;
      }
    );

    return () => unsub?.();
  }, [userId, storageMode]);

  useEffect(() => {
    if (uiHydratingRef.current) return;
    if (!items || Object.keys(items).length === 0) return;

    const topLevelIdSet = new Set(topLevelItems.map((x) => x.id));

    setFilters((prev) => {
      const next = prev.filter((f) => topLevelIdSet.has(f.itemId));
      return next;
    });

    setViewFilter((curr) => {
      if (curr === 'all') return curr;
      return items[curr] ? curr : 'all';
    });
  }, [topLevelItems, items]);

  useEffect(() => {
    if (!userId) return;
    if (uiHydratingRef.current) return;

    const itemIds = Array.from(new Set(filters.map((f) => f.itemId))).sort();
    const payloadStr = JSON.stringify(itemIds);

    if (payloadStr === lastFiltersRef.current) return;

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);

    writeTimerRef.current = setTimeout(() => {
      saveMainViewUi(storageMode, userId, { filters: itemIds })
        .then(() => {
          lastFiltersRef.current = payloadStr;
        })
        .catch((e) => {
          console.error('🔥 write filters failed:', e?.code, e?.message);
        });
    }, 600);

    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, [userId, storageMode, filters]);

  const visibleItems = useMemo(() => {
    if (viewFilter === 'all') return topLevelItems;
    const it = items[viewFilter];
    return it ? [it] : [];
  }, [items, topLevelItems, viewFilter]);

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          background: '#f8f9f5',
          padding: '8px',
          display: 'flex',
          justifyContent: 'center',
          gap: '0px'
        }}
      >
        <button
          style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={goToPreviousDay}
        >
          ◀
        </button>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        <button
          style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={goToNextDay}
        >
          ▶
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '6px 8px',
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        <button
          onClick={() => setViewFilter('all')}
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            border: viewFilter === 'all' ? '1px solid #333' : '1px solid #ccc',
            background: viewFilter === 'all' ? '#eaeaea' : '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          All
        </button>

        {filters.map((f) => {
          const it = items[f.itemId];
          if (!it) return null;

          const active =
            viewFilter === f.itemId ||
            (it.type === 'group' && (it.children || []).some((cid) => cid === viewFilter));

          return (
            <button
              key={f.id}
              onClick={() => {
                const target = items[f.itemId];
                if (!target) return;

                if (target.type === 'group') {
                  setViewFilter(target.id);
                  setCollapsedMap((prev) => ({ ...prev, [target.id]: false }));
                  return;
                }
                setViewFilter(target.id);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                border: active ? '1px solid #333' : '1px solid #ccc',
                background: active ? '#eaeaea' : '#fff',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {it.name}
            </button>
          );
        })}

        <button
          onClick={() => {
            if (topLevelItems.length === 0) return;
            setShowFilterModal(true);
          }}
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            border: '1px dashed #aaa',
            background: '#fff',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          ＋
        </button>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {visibleItems.map((item) => (
          <GroupTree
            key={item.id}
            userId={userId}
            storageMode={storageMode}
            items={items}
            itemId={item.id}
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

      <AddFilterModal
        open={showFilterModal}
        topLevelItems={topLevelItems}
        filters={filters}
        onCancel={() => setShowFilterModal(false)}
        onToggleItem={(id) => {
          setFilters((prev) => {
            const exists = prev.some((f) => f.itemId === id);
            if (exists) {
              return prev.filter((f) => f.itemId !== id);
            }
            return [...prev, { id, itemId: id }];
          });

          const it = items[id];
          if (it?.type === 'group') {
            setCollapsedMap((prev) => ({ ...prev, [id]: false }));
          }
        }}
      />
    </>
  );
}
