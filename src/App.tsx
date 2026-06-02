import {
  BookOpen,
  Building2,
  Globe2,
  GraduationCap,
  Info,
  LogOut,
  MessageSquare,
  Moon,
  School,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type {
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  RememberedAccount,
  Role,
  SyncStatus,
  Theme,
  View
} from './types';
import {
  languageFlags,
  languageNames,
  stageNames,
  tr
} from './i18n';
import {
  assignedClassGroups,
  assignedSchoolYears,
  classGroupsLabel,
  schoolYearsLabel,
  secondaryStreamLabel,
  yearClassGroupsLabel
} from './education';
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
  forgetStoredAccount,
  getSchool,
  loadData,
  loadLanguage,
  loadRememberedAccounts,
  loadTheme,
  mergeDeletionTombstones,
  promoteLocalDataIfRemoteIsEmpty,
  pruneRememberedAccounts,
  purgeExpiredTrashedSchools,
  rememberStoredAccount,
  rememberedAccountListsEqual,
  saveSharedData,
  upsertPushToken
} from './data';
import {
  AppInfoDialog,
  ConfirmDialog,
  LanguageMenu,
  RoleLabel,
  SyncIndicator,
  languages
} from './ui';
import { UsersView } from './views/accounts';
import { ExercisesView } from './views/exercises';
import { AnnouncementsView, NotesView } from './views/messages';
import { OverviewView } from './views/overview';
import { SchoolProfileView, SchoolsView } from './views/schools';

const navItems: Record<Role, Array<{ id: View; labelKey: string; icon: LucideIcon }>> = {
  admin: [
    { id: 'overview', labelKey: 'overview', icon: ShieldCheck },
    { id: 'schools', labelKey: 'schools', icon: School },
    { id: 'users', labelKey: 'users', icon: Users },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  director: [
    { id: 'overview', labelKey: 'overview', icon: Building2 },
    { id: 'school', labelKey: 'school', icon: School },
    { id: 'users', labelKey: 'users', icon: UserPlus },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  teacher: [
    { id: 'overview', labelKey: 'overview', icon: GraduationCap },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'exercises', labelKey: 'exercises', icon: BookOpen },
    { id: 'notes', labelKey: 'notes', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  student: [
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'exercises', labelKey: 'exercises', icon: BookOpen },
    { id: 'notes', labelKey: 'notes', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ]
};

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

  const renderView = () => {
    switch (safeView) {
      case 'schools':
        return <SchoolsView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'users':
        return <UsersView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'school':
        return <SchoolProfileView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'exercises':
        return <ExercisesView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'announcements':
        return <AnnouncementsView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'notes':
        return <NotesView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'settings':
        return (
          <SettingsView
            data={data}
            setData={setData}
            language={language}
            theme={theme}
            currentUser={currentUser}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
            onResetDemo={() => {
              setData(cloneSeedData());
              logoutUser();
            }}
          />
        );
      case 'overview':
      default:
        return <OverviewView data={data} currentUser={currentUser} language={language} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <School size={25} aria-hidden="true" />
          </div>
          <div>
            <strong>{tr(language, 'appTitle')}</strong>
            <span>{tr(language, 'appSubtitle')}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={safeView === item.id ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tr(language, item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        <div className="scope-card">
          <span>{tr(language, 'visibleScope')}</span>
          <strong>
            <RoleLabel role={currentUser.role} language={language} />
          </strong>
          {currentSchool && <small>{currentSchool.name}</small>}
          {currentUser.stage && <small>{stageNames[language][currentUser.stage]}</small>}
          {assignedSchoolYears(currentUser).length > 0 && <small>{schoolYearsLabel(language, currentUser)}</small>}
          {assignedClassGroups(currentUser).length > 0 && (
            <small>
              {tr(language, currentUser.role === 'teacher' ? 'classGroups' : 'classGroup')}{' '}
              {currentUser.role === 'teacher' ? yearClassGroupsLabel(language, currentUser) : classGroupsLabel(currentUser)}
            </small>
          )}
          {currentUser.stream && <small>{secondaryStreamLabel(language, currentUser.stream, currentUser.schoolYear)}</small>}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p>{tr(language, safeView)}</p>
            <h1>{currentUser.name}</h1>
          </div>
          <div className="topbar-actions">
            <SyncIndicator status={syncStatus} language={language} />
            <LanguageMenu language={language} onLanguageChange={setLanguage} />
            <button
              className="icon-text-button"
              type="button"
              title={theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
              <span>{theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}</span>
            </button>
            <button className="button ghost" type="button" onClick={() => setLogoutOpen(true)}>
              <LogOut size={17} aria-hidden="true" />
              <span>{tr(language, 'logout')}</span>
            </button>
          </div>
        </header>

        {renderView()}
      </main>

      {logoutOpen && (
        <ConfirmDialog
          language={language}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false);
            logoutUser();
          }}
        />
      )}
    </div>
  );
}

type LoginProps = {
  data: PlatformData;
  language: Language;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onLogin: (userId: string) => void;
  onRefreshData: () => Promise<PlatformData>;
  syncStatus: SyncStatus;
};

function LoginPage({ data, language, theme, onLanguageChange, onThemeChange, onLogin, onRefreshData, syncStatus }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(loadRememberedAccounts);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const visibleRememberedAccounts = rememberedAccounts
    .map((remembered) => data.users.find((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase()))
    .filter((user): user is PlatformUser => Boolean(user && canAuthenticateUser(data, user)));

  useEffect(() => {
    const next = pruneRememberedAccounts(data.users);
    setRememberedAccounts((previous) => (rememberedAccountListsEqual(previous, next) ? previous : next));
  }, [data]);

  const rememberAccount = (account: PlatformUser) => {
    const next = rememberStoredAccount(account);
    setRememberedAccounts(next);
  };

  const loginWithRememberedAccount = (account: PlatformUser) => {
    if (!canAuthenticateUser(data, account)) {
      setError(tr(language, 'disabledAccount'));
      return;
    }

    rememberAccount(account);
    setEmail(account.email);
    setPassword('');
    setRememberMe(true);
    setError('');
    onLogin(account.id);
  };

  const forgetRememberedAccount = (account: PlatformUser) => {
    const next = forgetStoredAccount(account);
    setRememberedAccounts(next);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const shouldRemember = rememberMe || formData.get('remember') === 'on';
    setIsSubmitting(true);
    const latestData = await onRefreshData();
    const account = latestData.users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
    setIsSubmitting(false);

    if (!account || account.password !== password) {
      setError(tr(language, 'invalidCredentials'));
      return;
    }

    if (!canAuthenticateUser(latestData, account)) {
      setError(tr(language, 'disabledAccount'));
      return;
    }

    if (shouldRemember) {
      rememberAccount(account);
    }

    setError('');
    onLogin(account.id);
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-corner-actions">
          <button
            className="corner-icon-button info-button"
            type="button"
            title={tr(language, 'appInfo')}
            aria-label={tr(language, 'appInfo')}
            onClick={() => setInfoOpen(true)}
          >
            <Info size={18} aria-hidden="true" />
          </button>
          <LanguageMenu language={language} onLanguageChange={onLanguageChange} variant="corner" />
          <button
            className="corner-icon-button"
            type="button"
            title={theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
        <div className="login-copy">
          <div className="login-hero">
            <h1 className="login-hero-title">
              <span>{tr(language, 'loginHeroTitle')}</span>
            </h1>
            <p className="login-hero-lead">{tr(language, 'loginHeroSubtitle')}</p>
            <p className="login-hero-copy">{tr(language, 'loginHeroText')}</p>
          </div>

          <SyncIndicator status={syncStatus} language={language} compact />

          {visibleRememberedAccounts.length > 0 && (
            <div className="remembered-box">
              <span className="remembered-title">{tr(language, 'rememberedAccounts')}</span>
              <div className="remembered-list">
                {visibleRememberedAccounts.map((account) => (
                  <div className="remembered-account" key={account.id}>
                    <button className="remembered-main" type="button" title={tr(language, 'useRememberedAccount')} onClick={() => loginWithRememberedAccount(account)}>
                      <Users size={17} aria-hidden="true" />
                      <span>
                        <strong>{account.name}</strong>
                        <small>{account.email}</small>
                      </span>
                    </button>
                    <button className="remembered-remove" type="button" title={tr(language, 'forgetAccount')} onClick={() => forgetRememberedAccount(account)}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form className="form-stack" onSubmit={submitLogin}>
            <label>
              <span>{tr(language, 'email')}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="off" />
            </label>
            <label>
              <span>{tr(language, 'password')}</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" />
            </label>
            <label className="remember-row">
              <input name="remember" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>{tr(language, 'rememberMe')}</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button primary wide" type="submit" disabled={isSubmitting}>
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{tr(language, 'signIn')}</span>
            </button>
          </form>
        </div>
      </section>
      {infoOpen && <AppInfoDialog language={language} onClose={() => setInfoOpen(false)} />}
    </main>
  );
}

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

function SettingsView({
  data,
  setData,
  currentUser,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
  onResetDemo
}: CommonViewProps & {
  setData: DataSetter;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onResetDemo: () => void;
}) {
  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'settingsLanguageText')}</p>
            <h2>{tr(language, 'chooseLanguage')}</h2>
          </div>
          <Globe2 size={24} aria-hidden="true" />
        </div>
        <div className="segmented">
          {languages.map((option) => (
            <button
              key={option}
              type="button"
              className={language === option ? 'active' : ''}
              onClick={() => onLanguageChange(option)}
            >
              <span className="language-flag" aria-hidden="true">{languageFlags[option]}</span>
              <span>{languageNames[option]}</span>
            </button>
          ))}
        </div>
        <label className="toggle-row settings-toggle">
          <span>{tr(language, 'darkMode')}</span>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={(event) => onThemeChange(event.target.checked ? 'dark' : 'light')}
          />
        </label>
      </div>

      {currentUser.role === 'admin' && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'adminPower')}</p>
              <h2>{tr(language, 'systemSettings')}</h2>
            </div>
            <Settings size={24} aria-hidden="true" />
          </div>
          <label className="toggle-row">
            <span>{tr(language, 'allowImages')}</span>
            <input
              type="checkbox"
              checked={data.settings.allowExerciseImages}
              onChange={(event) =>
                setData((previous) => ({
                  ...previous,
                  settings: { ...previous.settings, allowExerciseImages: event.target.checked }
                }))
              }
            />
          </label>
          <label className="toggle-row">
            <span>{tr(language, 'maintenanceMode')}</span>
            <input
              type="checkbox"
              checked={data.settings.maintenanceMode}
              onChange={(event) =>
                setData((previous) => ({
                  ...previous,
                  settings: { ...previous.settings, maintenanceMode: event.target.checked }
                }))
              }
            />
          </label>
          <button className="button danger" type="button" onClick={onResetDemo}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, 'resetDemo')}</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default App;
