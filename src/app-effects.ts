import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { useEffect } from 'react';
import type { DataSetter, Language, PlatformUser, SyncStatus, Theme } from './types';
import { LANGUAGE_KEY, SESSION_KEY, THEME_KEY, purgeExpiredAbsenceJustifications, purgeExpiredTrashedSchools, upsertPushToken } from './data';

export function useLanguagePreference(language: Language) {
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);
}

export function useThemePreference(theme: Theme) {
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}

export function useSessionPersistence(sessionUserId: string | null) {
  useEffect(() => {
    if (sessionUserId) {
      localStorage.setItem(SESSION_KEY, sessionUserId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [sessionUserId]);
}

export function useExpiredSchoolTrashPurge(setData: DataSetter) {
  useEffect(() => {
    const purgeExpiredData = () => {
      setData((previous) => purgeExpiredAbsenceJustifications(purgeExpiredTrashedSchools(previous)));
    };

    purgeExpiredData();
    const purgeTimer = window.setInterval(purgeExpiredData, 60_000);
    return () => window.clearInterval(purgeTimer);
  }, [setData]);
}

export function usePushRegistration(currentUser: PlatformUser | null, syncStatus: SyncStatus, setData: DataSetter) {
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
  }, [currentUser, syncStatus, setData]);
}
