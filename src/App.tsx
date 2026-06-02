import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { useEffect, useRef, useState } from 'react';
import type {
  Language,
  PlatformData,
  SyncStatus,
  Theme,
  View
} from './types';
import {
  DATA_KEY,
  LANGUAGE_KEY,
  SESSION_KEY,
  SHARED_DATA_REFRESH_MS,
  THEME_KEY,
  canAuthenticateUser,
  cloneSeedData,
  defaultView,
  fetchSharedData,
  fetchSharedDataUpdatedAt,
  getSchool,
  loadData,
  loadLanguage,
  loadTheme,
  mergeDeletionTombstones,
  promoteLocalDataIfRemoteIsEmpty,
  purgeExpiredTrashedSchools,
  saveSharedData,
  upsertPushToken
} from './data';
import { AppRouter } from './app-router';
import { AppShell } from './app-shell';
import { navItems } from './navigation';
import { LoginPage } from './views/login';

function App() {
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [data, setData] = useState<PlatformData>(loadData);
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [activeView, setActiveView] = useState<View>('overview');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('checking');
  const remoteLoadedRef = useRef(false);
  const remoteEnabledRef = useRef(false);
  const skipNextSharedSaveRef = useRef(false);
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const sharedSaveInFlightRef = useRef(false);
  const sharedRefreshInFlightRef = useRef(false);

  const currentUser = data.users.find((user) => user.id === sessionUserId && canAuthenticateUser(data, user)) ?? null;
  const tabs = currentUser ? navItems[currentUser.role] : [];
  const safeView = tabs.some((tab) => tab.id === activeView) ? activeView : tabs[0]?.id ?? 'overview';
  const currentSchool = currentUser ? getSchool(data, currentUser) : undefined;

  const loginUser = (userId: string) => {
    localStorage.setItem(SESSION_KEY, userId);
    setSessionUserId(userId);
  };

  const logoutUser = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionUserId(null);
  };

  const applySharedData = (nextData: PlatformData) => {
    setData((previous) => {
      const mergedData = mergeDeletionTombstones(nextData, previous);
      if (JSON.stringify(previous) === JSON.stringify(mergedData)) {
        return previous;
      }

      skipNextSharedSaveRef.current = JSON.stringify(mergedData) === JSON.stringify(nextData);
      return mergedData;
    });
  };

  const refreshSharedData = async () => {
    try {
      setSyncStatus('checking');
      const sharedSnapshot = await fetchSharedData();
      if (!sharedSnapshot) {
        remoteEnabledRef.current = false;
        remoteLoadedRef.current = true;
        setSyncStatus('local');
        return data;
      }

      remoteUpdatedAtRef.current = sharedSnapshot.updatedAt;
      const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedSnapshot.data, data);
      remoteEnabledRef.current = true;
      remoteLoadedRef.current = true;
      applySharedData(nextData);
      setSyncStatus('shared');
      return nextData;
    } catch {
      remoteEnabledRef.current = false;
      remoteLoadedRef.current = true;
      setSyncStatus('local');
      return data;
    }
  };

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
        const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedSnapshot.data, data);
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
  }, []);

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
  }, [data]);

  useEffect(() => {
    if (!currentUser) {
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
  }, [currentUser?.id]);

  useEffect(() => {
    const purgeExpiredSchools = () => {
      setData((previous) => purgeExpiredTrashedSchools(previous));
    };

    purgeExpiredSchools();
    const purgeTimer = window.setInterval(purgeExpiredSchools, 60_000);
    return () => window.clearInterval(purgeTimer);
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (sessionUserId) {
      localStorage.setItem(SESSION_KEY, sessionUserId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!currentUser || syncStatus === 'checking' || !Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    const listenerHandles: Array<{ remove: () => Promise<void> }> = [];

    const registerForPush = async () => {
      try {
        let permissions = await PushNotifications.checkPermissions();
        if (permissions.receive === 'prompt') {
          permissions = await PushNotifications.requestPermissions();
        }

        if (permissions.receive !== 'granted') {
          return;
        }

        const registrationHandle = await PushNotifications.addListener('registration', (token: Token) => {
          if (!cancelled) {
            setData((previous) => upsertPushToken(previous, currentUser.id, token.value));
          }
        });
        listenerHandles.push(registrationHandle);

        const errorHandle = await PushNotifications.addListener('registrationError', () => undefined);
        listenerHandles.push(errorHandle);

        await PushNotifications.register();
      } catch {
        // Push registration is best effort; the website must still work normally without it.
      }
    };

    registerForPush();

    return () => {
      cancelled = true;
      listenerHandles.forEach((handle) => {
        handle.remove().catch(() => undefined);
      });
    };
  }, [currentUser?.id, syncStatus]);

  useEffect(() => {
    if (currentUser) {
      setActiveView(defaultView(currentUser.role));
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (sessionUserId && !currentUser) {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser, sessionUserId]);

  if (!currentUser) {
    return (
      <LoginPage
        data={data}
        language={language}
        theme={theme}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onLogin={loginUser}
        onRefreshData={refreshSharedData}
        syncStatus={syncStatus}
      />
    );
  }

  return (
    <AppShell
      currentSchool={currentSchool}
      currentUser={currentUser}
      language={language}
      logoutOpen={logoutOpen}
      safeView={safeView}
      syncStatus={syncStatus}
      tabs={tabs}
      theme={theme}
      onLanguageChange={setLanguage}
      onLogoutCancel={() => setLogoutOpen(false)}
      onLogoutConfirm={() => {
        setLogoutOpen(false);
        logoutUser();
      }}
      onLogoutRequest={() => setLogoutOpen(true)}
      onThemeChange={setTheme}
      onViewChange={setActiveView}
    >
      <AppRouter
        data={data}
        setData={setData}
        currentUser={currentUser}
        language={language}
        theme={theme}
        view={safeView}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onResetDemo={() => {
          setData(cloneSeedData());
          logoutUser();
        }}
      />
    </AppShell>
  );
}

export default App;
