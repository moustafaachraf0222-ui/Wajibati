import { useEffect, useState } from 'react';
import type {
  Language,
  PlatformData,
  Theme,
  View
} from './types';
import {
  SESSION_KEY,
  canAuthenticateUser,
  cloneSeedData,
  defaultView,
  getSchool,
  loadData,
  loadLanguage,
  loadTheme
} from './data';
import {
  useExpiredSchoolTrashPurge,
  useLanguagePreference,
  usePushRegistration,
  useSessionPersistence,
  useThemePreference
} from './app-effects';
import { useSharedDataSync } from './app-sync';
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
  const currentUser = data.users.find((user) => user.id === sessionUserId && canAuthenticateUser(data, user)) ?? null;
  const { refreshSharedData, syncStatus } = useSharedDataSync(data, setData, currentUser?.id);
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

  useExpiredSchoolTrashPurge(setData);
  useLanguagePreference(language);
  useThemePreference(theme);
  useSessionPersistence(sessionUserId);
  usePushRegistration(currentUser, syncStatus, setData);

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
