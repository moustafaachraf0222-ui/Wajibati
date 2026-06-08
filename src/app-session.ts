import { useCallback, useEffect, useState } from 'react';
import type { PlatformData, View } from './types';
import { SESSION_KEY, canAuthenticateUser, defaultView, getSchool } from './data';
import { useSessionPersistence } from './app-effects';
import { navItemsForUser } from './navigation';

export function useAppSession(data: PlatformData) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [activeView, setActiveView] = useState<View>('overview');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const currentUser = data.users.find((user) => user.id === sessionUserId && canAuthenticateUser(data, user)) ?? null;
  const tabs = currentUser ? navItemsForUser(currentUser) : [];
  const safeView = tabs.some((tab) => tab.id === activeView) ? activeView : tabs[0]?.id ?? 'overview';
  const currentSchool = currentUser ? getSchool(data, currentUser) : undefined;

  const loginUser = useCallback((userId: string) => {
    localStorage.setItem(SESSION_KEY, userId);
    setSessionUserId(userId);
  }, []);

  const logoutUser = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSessionUserId(null);
  }, []);

  const requestLogout = useCallback(() => setLogoutOpen(true), []);
  const cancelLogout = useCallback(() => setLogoutOpen(false), []);
  const confirmLogout = useCallback(() => {
    setLogoutOpen(false);
    logoutUser();
  }, [logoutUser]);

  useSessionPersistence(sessionUserId);

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

  return {
    activeView,
    cancelLogout,
    confirmLogout,
    currentSchool,
    currentUser,
    loginUser,
    logoutOpen,
    logoutUser,
    requestLogout,
    safeView,
    setActiveView,
    sessionUserId,
    tabs
  };
}
