import { useState } from 'react';
import type {
  Accent,
  Language,
  PlatformData,
  Theme,
  View
} from './types';
import {
  cloneSeedData,
  loadAccent,
  loadData,
  loadLanguage,
  loadTheme
} from './data';
import {
  useAccentPreference,
  useExpiredSchoolTrashPurge,
  useLanguagePreference,
  usePushRegistration,
  useThemePreference
} from './app-effects';
import { useAppSession } from './app-session';
import { useSharedDataSync } from './app-sync';
import { transferBadgeCount } from './views/accounts-transfers';
import { AppRouter } from './app-router';
import { AppShell } from './app-shell';
import { LoginPage } from './views/login';

function App() {
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [accent, setAccent] = useState<Accent>(loadAccent);
  const [data, setData] = useState<PlatformData>(loadData);
  const session = useAppSession(data);
  const currentUser = session.currentUser;
  const { refreshSharedData, syncStatus } = useSharedDataSync(data, setData, currentUser?.id);

  const navBadges: Partial<Record<View, number>> = {};
  if (currentUser?.role === 'director') {
    const pendingIncoming = transferBadgeCount(data, currentUser);
    if (pendingIncoming > 0) {
      navBadges.users = pendingIncoming;
    }
  }

  useExpiredSchoolTrashPurge(setData);
  useLanguagePreference(language);
  useThemePreference(theme);
  useAccentPreference(accent);
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
      navBadges={navBadges}
      stack={session.stack}
      syncStatus={syncStatus}
      tabs={session.tabs}
      theme={theme}
      onBack={session.popView}
      onLanguageChange={setLanguage}
      onLogoutCancel={session.cancelLogout}
      onLogoutConfirm={session.confirmLogout}
      onLogoutRequest={session.requestLogout}
      onThemeChange={setTheme}
      onViewChange={session.pushView}
    >
      <AppRouter
        data={data}
        setData={setData}
        currentUser={currentUser}
        language={language}
        theme={theme}
        accent={accent}
        stack={session.stack}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onAccentChange={setAccent}
        onViewChange={session.pushView}
        syncStatus={syncStatus}
        onResetDemo={() => {
          setData(cloneSeedData());
          session.logoutUser();
        }}
      />
    </AppShell>
  );
}

export default App;
