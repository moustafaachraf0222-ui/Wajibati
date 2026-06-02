import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataSetter, PlatformData, SyncStatus } from './types';
import {
  DATA_KEY,
  SHARED_DATA_REFRESH_MS,
  fetchSharedData,
  fetchSharedDataUpdatedAt,
  mergeDeletionTombstones,
  promoteLocalDataIfRemoteIsEmpty,
  saveSharedData
} from './data';

export function useSharedDataSync(data: PlatformData, setData: DataSetter, currentUserId?: string | null) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('checking');
  const latestDataRef = useRef(data);
  const remoteLoadedRef = useRef(false);
  const remoteEnabledRef = useRef(false);
  const skipNextSharedSaveRef = useRef(false);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const sharedSaveInFlightRef = useRef(false);
  const sharedRefreshInFlightRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const applySharedData = useCallback(
    (nextData: PlatformData) => {
      setData((previous) => {
        const mergedData = mergeDeletionTombstones(nextData, previous);
        if (JSON.stringify(previous) === JSON.stringify(mergedData)) {
          return previous;
        }

        skipNextSharedSaveRef.current = JSON.stringify(mergedData) === JSON.stringify(nextData);
        return mergedData;
      });
    },
    [setData]
  );

  const refreshSharedData = useCallback(async () => {
    const currentData = latestDataRef.current;

    try {
      setSyncStatus('checking');
      const sharedSnapshot = await fetchSharedData();
      if (!sharedSnapshot) {
        remoteEnabledRef.current = false;
        remoteLoadedRef.current = true;
        setSyncStatus('local');
        return currentData;
      }

      remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
      const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedSnapshot.data, currentData);
      remoteEnabledRef.current = true;
      remoteLoadedRef.current = true;
      applySharedData(nextData);
      setSyncStatus('shared');
      return nextData;
    } catch {
      remoteEnabledRef.current = false;
      remoteLoadedRef.current = true;
      setSyncStatus('local');
      return currentData;
    }
  }, [applySharedData]);

  useEffect(() => {
    let cancelled = false;

    const loadSharedData = async () => {
      try {
        const sharedSnapshot = await fetchSharedData();
        if (cancelled) {
          return;
        }

        if (!sharedSnapshot) {
          remoteEnabledRef.current = false;
          setSyncStatus('local');
          return;
        }

        remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
        const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedSnapshot.data, latestDataRef.current);
        remoteEnabledRef.current = true;
        applySharedData(nextData);
        setSyncStatus('shared');
      } catch {
        if (!cancelled) {
          remoteEnabledRef.current = false;
          setSyncStatus('local');
        }
      } finally {
        if (!cancelled) {
          remoteLoadedRef.current = true;
        }
      }
    };

    loadSharedData();

    return () => {
      cancelled = true;
    };
  }, [applySharedData]);

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    if (skipNextSharedSaveRef.current) {
      skipNextSharedSaveRef.current = false;
      sharedSaveInFlightRef.current = false;
      return;
    }

    if (!remoteLoadedRef.current || !remoteEnabledRef.current) {
      sharedSaveInFlightRef.current = false;
      return;
    }

    sharedSaveInFlightRef.current = true;
    setSyncStatus('saving');
    const saveTimer = window.setTimeout(() => {
      saveSharedData(data)
        .then((snapshot) => {
          remoteUpdatedAtRef.current = snapshot?.updatedAt ?? remoteUpdatedAtRef.current;
          if (snapshot) {
            applySharedData(snapshot.data);
          }
          setSyncStatus('shared');
        })
        .catch(() => setSyncStatus('error'))
        .finally(() => {
          sharedSaveInFlightRef.current = false;
        });
    }, 500);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [applySharedData, data]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let cancelled = false;

    const refreshLatestSharedData = async () => {
      if (
        cancelled ||
        !remoteEnabledRef.current ||
        document.visibilityState === 'hidden' ||
        sharedSaveInFlightRef.current ||
        sharedRefreshInFlightRef.current
      ) {
        return;
      }

      sharedRefreshInFlightRef.current = true;
      try {
        const updatedAt = await fetchSharedDataUpdatedAt();
        if (cancelled) {
          return;
        }

        if (updatedAt && updatedAt === remoteUpdatedAtRef.current) {
          setSyncStatus('shared');
          return;
        }

        const sharedSnapshot = await fetchSharedData();
        if (!cancelled && sharedSnapshot) {
          remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
          remoteEnabledRef.current = true;
          remoteLoadedRef.current = true;
          applySharedData(sharedSnapshot.data);
          setSyncStatus('shared');
        }
      } catch {
        if (!cancelled) {
          setSyncStatus('error');
        }
      } finally {
        sharedRefreshInFlightRef.current = false;
      }
    };

    const refreshOnFocus = () => {
      refreshLatestSharedData();
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshLatestSharedData();
      }
    };

    const refreshTimer = window.setInterval(refreshLatestSharedData, SHARED_DATA_REFRESH_MS);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [applySharedData, currentUserId]);

  return { refreshSharedData, syncStatus };
}
