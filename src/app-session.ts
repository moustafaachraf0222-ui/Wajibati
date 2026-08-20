import { useCallback, useEffect, useState } from 'react';
import type { PlatformData, View } from './types';
import { SESSION_KEY, canAuthenticateUser, defaultView, getSchool } from './data';
import { useSessionPersistence } from './app-effects';
import { navItemsForUser } from './navigation';
import {
  canGoBack,
  popEntry,
  popToRoot,
  pushEntry,
  replaceTopEntry,
  resetStack,
  topView,
  type NavStack
} from './nav-stack';

export function useAppSession(data: PlatformData) {
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [stack, setStack] = useState<NavStack>([{ view: 'overview' }]);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const currentUser = data.users.find((user) => user.id === sessionUserId && canAuthenticateUser(data, user)) ?? null;
  const tabs = currentUser ? navItemsForUser(currentUser) : [];
  const activeView = topView(stack);
  const canShowView = (view: View) => tabs.some((tab) => tab.id === view) || (view === 'labDevices' && currentUser?.role === 'lab');
  const safeView: View = canShowView(activeView) ? activeView : tabs[0]?.id ?? 'overview';
  const stackIsSafe = stack.length > 0 && topView(stack) === safeView;
  const safeStack: NavStack = stackIsSafe
    ? stack
    : stack.length > 0
      ? [...stack.slice(0, -1), { view: safeView }]
      : [{ view: safeView }];
  const canGoBackNow = canGoBack(safeStack);
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

  const pushView = useCallback((view: View) => {
    setStack((previous) => pushEntry(previous, { view }));
  }, []);

  const popView = useCallback(() => {
    setStack((previous) => popEntry(previous));
  }, []);

  const popToRootView = useCallback(() => {
    setStack((previous) => popToRoot(previous));
  }, []);

  const replaceTopView = useCallback((view: View) => {
    setStack((previous) => replaceTopEntry(previous, { view }));
  }, []);

  const resetToView = useCallback((view: View) => {
    setStack(resetStack({ view }));
  }, []);

  useSessionPersistence(sessionUserId);

  useEffect(() => {
    if (currentUser) {
      setStack(resetStack({ view: defaultView() }));
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (sessionUserId && !currentUser) {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser, sessionUserId]);

  return {
    cancelLogout,
    canGoBack: canGoBackNow,
    confirmLogout,
    currentSchool,
    currentUser,
    loginUser,
    logoutOpen,
    logoutUser,
    popToRoot: popToRootView,
    popView,
    pushView,
    replaceTop: replaceTopView,
    requestLogout,
    resetToView,
    safeView,
    sessionUserId,
    stack: safeStack,
    tabs
  };
}
