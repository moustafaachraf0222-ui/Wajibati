import { useState } from 'react';
import type {
  Language,
  PlatformData,
  Theme
} from './types';
import {
  cloneSeedData,
  loadData,
  loadLanguage,
  loadTheme
} from './data';
import {
  useExpiredSchoolTrashPurge,
  useLanguagePreference,
  usePushRegistration,
  useThemePreference
} from './app-effects';
import { useAppSession } from './app-session';
import { useSharedDataSync } from './app-sync';
import { AppRouter } from './app-router';
import { AppShell } from './app-shell';
import { LoginPage } from './views/login';

function App() {
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [data, setData] = useState<PlatformData>(loadData);
  const session = useAppSession(data);
  const currentUser = session.currentUser;
  const { refreshSharedData, syncStatus } = useSharedDataSync(data, setData, currentUser?.id);

  useExpiredSchoolTrashPurge(setData);
  useLanguagePreference(language);
  useThemePreference(theme);
  usePushRegistration(currentUser, syncStatus, setData);

  if (!currentUser) {
    return (
      <LoginPage
        data={data}
        setData={setData}
        language={language}
        theme={theme}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onLogin={session.loginUser}
        onRefreshData={refreshSharedData}
        syncStatus={syncStatus}
      />
    );
  }

  return (
    <AppShell
      currentSchool={session.currentSchool}
      currentUser={currentUser}
      language={language}
      logoutOpen={session.logoutOpen}
      safeView={session.safeView}
      syncStatus={syncStatus}
      tabs={session.tabs}
      theme={theme}
      onLanguageChange={setLanguage}
      onLogoutCancel={session.cancelLogout}
      onLogoutConfirm={session.confirmLogout}
      onLogoutRequest={session.requestLogout}
      onThemeChange={setTheme}
      onViewChange={session.setActiveView}
    >
      <AppRouter
        data={data}
        setData={setData}
        currentUser={currentUser}
        language={language}
        theme={theme}
        view={session.safeView}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onResetDemo={() => {
          setData(cloneSeedData());
          session.logoutUser();
        }}
      />
    </AppShell>
  );
}

export default App;
