import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataSetter, PlatformData, SyncStatus } from './types';
import {
  DATA_KEY,
  SHARED_DATA_REFRESH_MS,
  fetchSharedData,
  fetchSharedDataUpdatedAt,
  mergeCanteenRecordsForPush,
  mergeDeletionTombstones,
  promoteLocalDataIfRemoteIsEmpty,
  saveSharedData
} from './data';

const LOCAL_EDIT_REMOTE_PAUSE_MS = 2_500;

export function useSharedDataSync(data: PlatformData, setData: DataSetter, currentUserId?: string | null) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('checking');
  const latestDataRef = useRef(data);
  const remoteLoadedRef = useRef(false);
  const remoteEnabledRef = useRef(false);
  const skipNextSharedSaveRef = useRef(false);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const sharedSaveInFlightRef = useRef(false);
  const sharedRefreshInFlightRef = useRef(false);
  const localChangeVersionRef = useRef(0);
  const savedLocalChangeVersionRef = useRef(0);
  const latestLocalChangeAtRef = useRef(0);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  const setSyncStatusIfChanged = useCallback((nextStatus: SyncStatus) => {
    setSyncStatus((previousStatus) => (previousStatus === nextStatus ? previousStatus : nextStatus));
  }, []);

  const hasPendingLocalChanges = useCallback(() => {
    return localChangeVersionRef.current !== savedLocalChangeVersionRef.current;
  }, []);

  const isLocalEditSettling = useCallback(() => {
    return Date.now() - latestLocalChangeAtRef.current < LOCAL_EDIT_REMOTE_PAUSE_MS;
  }, []);

  const applySharedData = useCallback(
    (nextData: PlatformData) => {
      const nextDataJson = JSON.stringify(nextData);
      setData((previous) => {
        const mergedData = mergeDeletionTombstones(nextData, previous);
        const mergedDataJson = JSON.stringify(mergedData);
        if (JSON.stringify(previous) === mergedDataJson) {
          return previous;
        }

        skipNextSharedSaveRef.current = mergedDataJson === nextDataJson;
        return mergedData;
      });
    },
    [setData]
  );

  const refreshSharedData = useCallback(async () => {
    const currentData = latestDataRef.current;

    try {
      setSyncStatusIfChanged('checking');
      const sharedSnapshot = await fetchSharedData();
      if (!sharedSnapshot) {
        remoteEnabledRef.current = false;
        remoteLoadedRef.current = true;
        setSyncStatusIfChanged('local');
        return currentData;
      }

      remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
      const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedSnapshot.data, currentData);
      remoteEnabledRef.current = true;
      remoteLoadedRef.current = true;
      applySharedData(nextData);
      setSyncStatusIfChanged('shared');
      return nextData;
    } catch {
      remoteEnabledRef.current = false;
      remoteLoadedRef.current = true;
      setSyncStatusIfChanged('local');
      return currentData;
    }
  }, [applySharedData, setSyncStatusIfChanged]);

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
          setSyncStatusIfChanged('local');
          return;
        }

        remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
        const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedSnapshot.data, latestDataRef.current);
        remoteEnabledRef.current = true;
        applySharedData(nextData);
        setSyncStatusIfChanged('shared');
      } catch {
        if (!cancelled) {
          remoteEnabledRef.current = false;
          setSyncStatusIfChanged('local');
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
  }, [applySharedData, setSyncStatusIfChanged]);

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

    const saveVersion = localChangeVersionRef.current + 1;
    localChangeVersionRef.current = saveVersion;
    latestLocalChangeAtRef.current = Date.now();

    const saveTimer = window.setTimeout(() => {
      if (sharedSaveInFlightRef.current) {
        return;
      }

      sharedSaveInFlightRef.current = true;
      setSyncStatusIfChanged('saving');
      saveSharedData(data)
        .then((snapshot) => {
          remoteUpdatedAtRef.current = snapshot?.updatedAt ?? remoteUpdatedAtRef.current;
          if (localChangeVersionRef.current === saveVersion) {
            savedLocalChangeVersionRef.current = saveVersion;
            setSyncStatusIfChanged('shared');
          }
        })
        .catch(() => setSyncStatusIfChanged('error'))
        .finally(() => {
          sharedSaveInFlightRef.current = false;
        });
    }, 500);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [data, setSyncStatusIfChanged]);

  const retryPendingSave = useCallback(async () => {
    if (
      !remoteEnabledRef.current ||
      !hasPendingLocalChanges() ||
      sharedSaveInFlightRef.current ||
      sharedRefreshInFlightRef.current ||
      isLocalEditSettling()
    ) {
      return;
    }

    const currentData = latestDataRef.current;
    sharedSaveInFlightRef.current = true;
    setSyncStatusIfChanged('saving');
    try {
      const sharedSnapshot = await fetchSharedData();
      const mergedData = sharedSnapshot
        ? mergeCanteenRecordsForPush(mergeDeletionTombstones(sharedSnapshot.data, currentData), currentData)
        : currentData;
      const snapshot = await saveSharedData(mergedData);
      remoteUpdatedAtRef.current = snapshot?.updatedAt ?? remoteUpdatedAtRef.current;
      savedLocalChangeVersionRef.current = localChangeVersionRef.current;
      remoteEnabledRef.current = true;
      remoteLoadedRef.current = true;
      applySharedData(mergedData);
      setSyncStatusIfChanged('shared');
    } catch {
      setSyncStatusIfChanged('error');
    } finally {
      sharedSaveInFlightRef.current = false;
    }
  }, [applySharedData, hasPendingLocalChanges, isLocalEditSettling, setSyncStatusIfChanged]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let cancelled = false;

    const refreshLatestSharedData = async () => {
      if (cancelled || !remoteEnabledRef.current) {
        return;
      }

      sharedRefreshInFlightRef.current = true;
      try {
        const updatedAt = await fetchSharedDataUpdatedAt();
        if (cancelled) {
          return;
        }

        if (updatedAt && updatedAt === remoteUpdatedAtRef.current) {
          return;
        }

        const sharedSnapshot = await fetchSharedData();
        if (!cancelled && sharedSnapshot) {
          remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
          remoteEnabledRef.current = true;
          remoteLoadedRef.current = true;
          applySharedData(sharedSnapshot.data);
          setSyncStatusIfChanged('shared');
        }
      } catch {
        if (!cancelled) {
          setSyncStatusIfChanged('error');
        }
      } finally {
        sharedRefreshInFlightRef.current = false;
      }
    };

    const tick = async () => {
      if (
        cancelled ||
        document.visibilityState === 'hidden' ||
        sharedSaveInFlightRef.current ||
        sharedRefreshInFlightRef.current ||
        isLocalEditSettling()
      ) {
        return;
      }

      if (hasPendingLocalChanges()) {
        await retryPendingSave();
      } else {
        await refreshLatestSharedData();
      }
    };

    const onOnline = () => {
      if (hasPendingLocalChanges()) {
        void retryPendingSave();
      }
    };
    const onFocus = () => void tick();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void tick();
      }
    };

    const refreshTimer = window.setInterval(() => void tick(), SHARED_DATA_REFRESH_MS);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    applySharedData,
    currentUserId,
    hasPendingLocalChanges,
    isLocalEditSettling,
    retryPendingSave,
    setSyncStatusIfChanged
  ]);

  return { refreshSharedData, syncStatus };
}
