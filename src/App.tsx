import {
  Archive,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleOff,
  Download,
  Globe2,
  GraduationCap,
  Info,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  RotateCcw,
  Save,
  School,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type {
  Announcement,
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  RememberedAccount,
  Role,
  SchoolRecord,
  SecondaryStream,
  SyncStatus,
  TeacherNote,
  Theme,
  UploadedAttachment,
  View
} from './types';
import {
  languageFlags,
  languageNames,
  localeNames,
  schoolYearLabel,
  secondaryStreamNames,
  stageNames,
  statusNames,
  subjectNames,
  tr
} from './i18n';
import {
  assignedClassGroups,
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  classGroupsLabel,
  sameClassGroup,
  schoolYearsLabel,
  secondaryStreams,
  secondaryStreamsForYear,
  secondaryStreamLabel,
  teacherSubjectForYear,
  teacherSubjectsLabel,
  uniqueStrings,
  yearClassGroupsLabel
} from './education';
import {
  DATA_KEY,
  LANGUAGE_KEY,
  SESSION_KEY,
  SHARED_DATA_REFRESH_MS,
  THEME_KEY,
  applyDeletedNoteTombstones,
  canAuthenticateUser,
  cloneSeedData,
  defaultView,
  deleteSchoolRecords,
  fetchSharedData,
  fetchSharedDataUpdatedAt,
  forgetStoredAccount,
  getSchool,
  loadData,
  loadLanguage,
  loadRememberedAccounts,
  loadTheme,
  makeId,
  mergeDeletionTombstones,
  promoteLocalDataIfRemoteIsEmpty,
  pruneRememberedAccounts,
  purgeExpiredTrashedSchools,
  rememberStoredAccount,
  rememberedAccountListsEqual,
  restoreSchoolRecords,
  saveSharedData,
  schoolIsTrashed,
  schoolTrashExpiresAt,
  scopedAnnouncements,
  scopedExercises,
  scopedNotes,
  scopedUsers,
  trashSchoolRecords,
  upsertPushToken,
  userCanSeeSchool
} from './data';
import {
  AppInfoDialog,
  AttachmentPreview,
  ConfirmDialog,
  Field,
  LanguageMenu,
  ResponsiveTable,
  RoleLabel,
  StatCard,
  SyncIndicator,
  languages
} from './ui';
import { UsersView } from './views/accounts';
import { ExercisesView } from './views/exercises';
import {
  completionRateForExercises,
  reportLinesForDirector,
  todayIso,
  topSubjectByHomework,
  topTeacherByActivity,
  weekRangeLabel
} from './homework';

const MAX_ATTACHMENT_SIZE = 1_000_000;
const ANNOUNCEMENT_ACTIVE_MS = 72 * 60 * 60 * 1000;
const NOTE_ACTIVE_MS = 72 * 60 * 60 * 1000;

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

function formatDateTime(language: Language, value?: string | Date | null) {
  if (!value) {
    return '-';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function announcementExpiresAt(announcement: Announcement) {
  const createdAt = Date.parse(announcement.createdAt);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return new Date(createdAt + ANNOUNCEMENT_ACTIVE_MS);
}

function isAnnouncementArchived(announcement: Announcement, now = Date.now()) {
  const expiresAt = announcementExpiresAt(announcement);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

function canViewAnnouncementArchive(user: PlatformUser) {
  return user.role === 'admin' || user.role === 'director';
}

function noteExpiresAt(note: TeacherNote) {
  const createdAt = Date.parse(note.createdAt);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return new Date(createdAt + NOTE_ACTIVE_MS);
}

function isNoteArchived(note: TeacherNote, now = Date.now()) {
  const expiresAt = noteExpiresAt(note);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign
) {
  const words = text.split(/\s+/);
  let line = '';
  let nextY = y;

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, nextY);
      line = word;
      nextY += lineHeight;
      return;
    }

    line = candidate;
  });

  if (line) {
    context.fillText(line, x, nextY);
    nextY += lineHeight;
  }

  context.textAlign = align;
  return nextY;
}

function canvasToPdfBlob(canvas: HTMLCanvasElement) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
  const imageBinary = atob(imageBase64);
  const imageBytes = new Uint8Array(imageBinary.length);

  for (let index = 0; index < imageBinary.length; index += 1) {
    imageBytes[index] = imageBinary.charCodeAt(index);
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;

  const append = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    offset += bytes.length;
  };

  const addObject = (id: number, body: string) => {
    offsets[id] = offset;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };

  append('%PDF-1.4\n');
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );

  offsets[4] = offset;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  append(imageBytes);
  append('\nendstream\nendobj\n');

  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  addObject(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);

  const xrefOffset = offset;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id += 1) {
    append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfBytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let position = 0;
  chunks.forEach((chunk) => {
    pdfBytes.set(chunk, position);
    position += chunk.length;
  });

  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

function createReportPdfBlob(title: string, lines: string[], language: Language) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;

  const context = canvas.getContext('2d');
  if (!context) {
    return new Blob([], { type: 'application/pdf' });
  }

  const isRtl = language === 'ar';
  const margin = 96;
  const contentWidth = canvas.width - margin * 2;
  const textX = isRtl ? canvas.width - margin : margin;
  const align: CanvasTextAlign = isRtl ? 'right' : 'left';

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#006233';
  context.fillRect(0, 0, canvas.width, 18);
  context.fillStyle = '#d21034';
  context.fillRect(0, 18, canvas.width, 7);
  context.direction = isRtl ? 'rtl' : 'ltr';
  context.textAlign = align;
  context.textBaseline = 'top';

  context.fillStyle = '#006233';
  context.font = '700 48px "Segoe UI", Tahoma, Arial, sans-serif';
  let y = drawWrappedCanvasText(context, title, textX, 86, contentWidth, 64, align);

  context.fillStyle = '#5f7168';
  context.font = '600 26px "Segoe UI", Tahoma, Arial, sans-serif';
  y = drawWrappedCanvasText(context, weekRangeLabel(language), textX, y + 12, contentWidth, 40, align);

  context.fillStyle = '#111f18';
  context.font = '600 31px "Segoe UI", Tahoma, Arial, sans-serif';
  y += 46;

  lines.forEach((line, index) => {
    const cardTop = y - 14;
    context.fillStyle = index % 2 === 0 ? '#f4f8f5' : '#ffffff';
    context.strokeStyle = '#dbe8df';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(margin, cardTop, contentWidth, 76, 12);
    context.fill();
    context.stroke();

    context.fillStyle = '#111f18';
    drawWrappedCanvasText(context, line, textX, y, contentWidth - 34, 40, align);
    y += 92;
  });

  context.fillStyle = '#006233';
  context.font = '700 24px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(new Date().toLocaleDateString(localeNames[language]), textX, canvas.height - 96);

  return canvasToPdfBlob(canvas);
}

function readAttachmentFromInput(
  event: ChangeEvent<HTMLInputElement>,
  onReady: (attachment: UploadedAttachment) => void,
  onTooLarge: () => void
) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    event.target.value = '';
    onTooLarge();
    return;
  }

  const reader = new FileReader();
  reader.onload = () =>
    onReady({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result)
    });
  reader.readAsDataURL(file);
}

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

function OverviewView({ data, currentUser, language }: CommonViewProps) {
  const school = getSchool(data, currentUser);
  const users = scopedUsers(data, currentUser);
  const exercises = scopedExercises(data, currentUser);
  const activeCount = users.filter((user) => user.status === 'active').length;
  const disabledCount = users.filter((user) => user.status === 'disabled').length;
  const completed = currentUser.role === 'student' ? data.completions[currentUser.id]?.length ?? 0 : 0;
  const directorCompletion = currentUser.role === 'director' ? completionRateForExercises(data, exercises) : { total: 0, completed: 0 };
  const directorCompletionPercent = directorCompletion.total > 0 ? Math.round((directorCompletion.completed / directorCompletion.total) * 100) : 0;
  const topTeacher = currentUser.role === 'director' ? topTeacherByActivity(data, exercises, language) : null;
  const topSubject = currentUser.role === 'director' ? topSubjectByHomework(exercises, language) : null;

  return (
    <section className="content-grid">
      <div className="stats-grid">
        <StatCard icon={Users} label={tr(language, 'activeUsers')} value={activeCount.toString()} tone="teal" />
        <StatCard icon={CircleOff} label={tr(language, 'disabledUsers')} value={disabledCount.toString()} tone="amber" />
        <StatCard icon={BookOpen} label={tr(language, 'totalExercises')} value={exercises.length.toString()} tone="blue" />
        {currentUser.role === 'student' && (
          <StatCard icon={CheckCircle2} label={tr(language, 'completedExercises')} value={completed.toString()} tone="green" />
        )}
        {currentUser.role === 'director' && topTeacher && (
          <StatCard icon={Trophy} label={tr(language, 'topTeacher')} value={`${topTeacher.name} (${topTeacher.count})`} tone="green" />
        )}
        {currentUser.role === 'director' && topSubject && (
          <StatCard icon={BookOpen} label={tr(language, 'topSubject')} value={`${topSubject.name} (${topSubject.count})`} tone="blue" />
        )}
        {currentUser.role === 'director' && (
          <StatCard icon={BarChart3} label={tr(language, 'generalCompletion')} value={`${directorCompletionPercent}%`} tone="teal" />
        )}
      </div>

      <div className="panel overview-context">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'visibleScope')}</p>
            <h2>
              <RoleLabel role={currentUser.role} language={language} />
            </h2>
          </div>
          <LockKeyhole size={24} aria-hidden="true" />
        </div>
        <dl className="detail-list">
          {school && (
            <>
              <div>
                <dt>{tr(language, 'connectedSchool')}</dt>
                <dd>{school.name}</dd>
              </div>
              <div>
                <dt>{tr(language, 'connectedStage')}</dt>
                <dd>{stageNames[language][school.stage]}</dd>
              </div>
            </>
          )}
          {currentUser.subject && (
            <div>
              <dt>{tr(language, 'subject')}</dt>
              <dd>{currentUser.role === 'teacher' ? teacherSubjectsLabel(language, currentUser) : subjectNames[language][currentUser.subject]}</dd>
            </div>
          )}
          {assignedSchoolYears(currentUser).length > 0 && (
            <div>
              <dt>{currentUser.role === 'teacher' ? tr(language, 'schoolYears') : tr(language, 'schoolYear')}</dt>
              <dd>{schoolYearsLabel(language, currentUser)}</dd>
            </div>
          )}
          {assignedClassGroups(currentUser).length > 0 && (
            <div>
              <dt>{currentUser.role === 'teacher' ? tr(language, 'classGroups') : tr(language, 'classGroup')}</dt>
              <dd>{currentUser.role === 'teacher' ? yearClassGroupsLabel(language, currentUser) : classGroupsLabel(currentUser)}</dd>
            </div>
          )}
          {currentUser.stream && (
            <div>
              <dt>{tr(language, 'stream')}</dt>
              <dd>{secondaryStreamLabel(language, currentUser.stream, currentUser.schoolYear)}</dd>
            </div>
          )}
          <div>
            <dt>{tr(language, 'status')}</dt>
            <dd>{statusNames[language][currentUser.status]}</dd>
          </div>
        </dl>
      </div>
      {currentUser.role === 'director' && <DirectorWeeklyReport data={data} currentUser={currentUser} language={language} />}
    </section>
  );
}

function DirectorWeeklyReport({ data, currentUser, language }: CommonViewProps) {
  const lines = reportLinesForDirector(data, currentUser, language);
  const reportTitle = `${tr(language, 'weeklyDirectorReport')} - ${weekRangeLabel(language)}`;
  const downloadReport = () => {
    const blob = createReportPdfBlob(reportTitle, lines, language);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-report-${todayIso()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel overview-context">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'weeklyReportReady')}</p>
          <h2>{tr(language, 'weeklyDirectorReport')}</h2>
        </div>
        <CalendarDays size={24} aria-hidden="true" />
      </div>
      <div className="weekly-report">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <button className="button primary" type="button" onClick={downloadReport}>
        <Download size={17} aria-hidden="true" />
        <span>{tr(language, 'sendWeeklyReport')}</span>
      </button>
    </div>
  );
}

function SchoolsView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const schools = data.schools.filter((school) => userCanSeeSchool(currentUser, school));
  const trashedSchools = currentUser.role === 'admin' ? data.schools.filter(schoolIsTrashed) : [];
  const [pendingDeleteSchool, setPendingDeleteSchool] = useState<SchoolRecord | null>(null);
  const [pendingForceDeleteSchool, setPendingForceDeleteSchool] = useState<SchoolRecord | null>(null);
  const canDeleteSchools = currentUser.role === 'admin';
  const columns = [tr(language, 'schoolName'), tr(language, 'stage'), tr(language, 'domain'), tr(language, 'city'), tr(language, 'director'), tr(language, 'users')];
  const trashColumns = [...columns, tr(language, 'deletedAt'), tr(language, 'deletesAt'), tr(language, 'actions')];

  if (canDeleteSchools) {
    columns.push(tr(language, 'actions'));
  }

  const deleteSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => trashSchoolRecords(previous, school));
    setPendingDeleteSchool(null);
  };

  const forceDeleteSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => deleteSchoolRecords(previous, school));
    setPendingForceDeleteSchool(null);
  };

  const restoreSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => restoreSchoolRecords(previous, school));
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'allSchools')}</p>
            <h2>{tr(language, 'schools')}</h2>
          </div>
          <School size={24} aria-hidden="true" />
        </div>
        <ResponsiveTable columns={columns} emptyText={tr(language, 'noRecords')}>
          {schools.map((school) => {
            const director = data.users.find((user) => user.id === school.directorId);
            const userCount = data.users.filter((user) => user.schoolId === school.id).length;
            return (
              <tr key={school.id}>
                <td>{school.name}</td>
                <td>{stageNames[language][school.stage]}</td>
                <td>{school.domain}</td>
                <td>{school.city}</td>
                <td>{director?.name ?? '-'}</td>
                <td>{userCount}</td>
                {canDeleteSchools && (
                  <td>
                    <div className="table-actions">
                      <button className="icon-button danger" type="button" title={tr(language, 'delete')} onClick={() => setPendingDeleteSchool(school)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </ResponsiveTable>
      </div>
      {canDeleteSchools && (
        <div className="panel trash-panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'trashHint')}</p>
              <h2>{tr(language, 'schoolTrash')}</h2>
            </div>
            <Trash2 size={24} aria-hidden="true" />
          </div>
          <ResponsiveTable columns={trashColumns} emptyText={tr(language, 'noRecords')}>
            {trashedSchools.map((school) => {
              const director = data.users.find((user) => user.id === school.directorId);
              const userCount = data.users.filter((user) => user.schoolId === school.id).length;
              return (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>{stageNames[language][school.stage]}</td>
                  <td>{school.domain}</td>
                  <td>{school.city}</td>
                  <td>{director?.name ?? '-'}</td>
                  <td>{userCount}</td>
                  <td>{formatDateTime(language, school.deletedAt)}</td>
                  <td>{formatDateTime(language, schoolTrashExpiresAt(school))}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-button" type="button" title={tr(language, 'restoreSchool')} onClick={() => restoreSchool(school)}>
                        <RotateCcw size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        title={tr(language, 'forceDelete')}
                        onClick={() => setPendingForceDeleteSchool(school)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </ResponsiveTable>
        </div>
      )}
      {pendingDeleteSchool && (
        <SchoolDeleteDialog
          school={pendingDeleteSchool}
          userCount={data.users.filter((user) => user.schoolId === pendingDeleteSchool.id).length}
          language={language}
          mode="trash"
          onCancel={() => setPendingDeleteSchool(null)}
          onConfirm={() => deleteSchool(pendingDeleteSchool)}
        />
      )}
      {pendingForceDeleteSchool && (
        <SchoolDeleteDialog
          school={pendingForceDeleteSchool}
          userCount={data.users.filter((user) => user.schoolId === pendingForceDeleteSchool.id).length}
          language={language}
          mode="permanent"
          onCancel={() => setPendingForceDeleteSchool(null)}
          onConfirm={() => forceDeleteSchool(pendingForceDeleteSchool)}
        />
      )}
    </section>
  );
}

function SchoolDeleteDialog({
  school,
  userCount,
  language,
  mode,
  onConfirm,
  onCancel
}: {
  school: SchoolRecord;
  userCount: number;
  language: Language;
  mode: 'trash' | 'permanent';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isPermanent = mode === 'permanent';

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="delete-school-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <Trash2 size={30} aria-hidden="true" />
        <div>
          <h2 id="delete-school-title">{tr(language, isPermanent ? 'forceDeleteSchoolTitle' : 'deleteSchoolTitle')}</h2>
          <p className="modal-copy">{tr(language, isPermanent ? 'forceDeleteSchoolQuestion' : 'deleteSchoolQuestion')}</p>
        </div>
        <div className="delete-target-card">
          <strong>{school.name}</strong>
          <span dir="ltr">{school.domain}</span>
          <small>
            {stageNames[language][school.stage]} - {tr(language, 'linkedAccounts')}: {userCount}
          </small>
        </div>
        <p className="modal-warning">{tr(language, isPermanent ? 'forceDeleteSchoolWarning' : 'deleteSchoolWarning')}</p>
        <div className="button-row center">
          <button className="button danger" type="button" onClick={onConfirm}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, isPermanent ? 'forceDelete' : 'delete')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onCancel}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SchoolProfileView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const [form, setForm] = useState({
    city: school?.city ?? '',
    address: school?.address ?? '',
    phone: school?.phone ?? ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ city: school?.city ?? '', address: school?.address ?? '', phone: school?.phone ?? '' });
  }, [school?.id, school?.city, school?.address, school?.phone]);

  if (!school) {
    return <p className="empty-state">{tr(language, 'noRecords')}</p>;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((record) => (record.id === school.id ? { ...record, ...form } : record))
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const toggleStream = (stream: SecondaryStream) => {
    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((record) => {
        if (record.id !== school.id) {
          return record;
        }

        const currentStreams = record.streams ?? [];
        const nextStreams = currentStreams.includes(stream)
          ? currentStreams.filter((item) => item !== stream)
          : [...currentStreams, stream];

        return { ...record, streams: nextStreams };
      })
    }));
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'lockedScope')}</p>
          <h2>{tr(language, 'schoolProfile')}</h2>
        </div>
        <School size={24} aria-hidden="true" />
      </div>
      <div className="locked-strip">
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedSchool')}: {school.name}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedStage')}: {stageNames[language][school.stage]}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedDomain')}: @{school.domain}
        </span>
      </div>
      {school.stage === 'secondary' && (
        <div className="form-field stream-settings">
          <span>{tr(language, 'secondaryStreams')}</span>
          <div className="checkbox-grid">
            {secondaryStreams.map((stream) => (
              <label className="check-option" key={stream}>
                <input type="checkbox" checked={(school.streams ?? []).includes(stream)} onChange={() => toggleStream(stream)} />
                <span>{secondaryStreamNames[language][stream]}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <form className="form-grid" onSubmit={submit}>
        <Field label={tr(language, 'city')} value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
        <Field label={tr(language, 'address')} value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
        <Field label={tr(language, 'phone')} value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
        {saved && <p className="success-message full">{tr(language, 'saved')}</p>}
        <button className="button primary form-submit" type="submit">
          <Save size={17} aria-hidden="true" />
          <span>{tr(language, 'save')}</span>
        </button>
      </form>
    </section>
  );
}

function useTimeTick(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function AnnouncementsView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const scopedAnnouncementList = scopedAnnouncements(data, currentUser);
  const activeAnnouncements = scopedAnnouncementList
    .filter((announcement) => !isAnnouncementArchived(announcement))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const archivedAnnouncements = canViewAnnouncementArchive(currentUser)
    ? scopedAnnouncementList.filter((announcement) => isAnnouncementArchived(announcement)).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    : [];
  const [form, setForm] = useState<{ title: string; body: string; image: UploadedAttachment | null }>({ title: '', body: '', image: null });
  const [error, setError] = useState('');

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    readAttachmentFromInput(
      event,
      (image) => {
        setForm((previous) => ({ ...previous, image }));
        setError('');
      },
      () => setError(tr(language, 'fileTooLarge'))
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentUser.role !== 'director' || !currentUser.schoolId) {
      return;
    }

    setData((previous) => ({
      ...previous,
      announcements: [
        ...previous.announcements,
        {
          id: makeId('announcement'),
          schoolId: currentUser.schoolId!,
          authorId: currentUser.id,
          title: form.title.trim(),
          body: form.body.trim(),
          image: form.image ?? undefined,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setForm({ title: '', body: '', image: null });
    setError('');
  };

  const renderAnnouncementCard = (announcement: Announcement, archived = false) => {
    const author = data.users.find((user) => user.id === announcement.authorId);
    const announcementSchool = data.schools.find((record) => record.id === announcement.schoolId);
    const expiresAt = announcementExpiresAt(announcement);

    return (
      <article className={archived ? 'message-card archived-message-card' : 'message-card'} key={announcement.id}>
        <div className="message-card-head">
          <h3>{announcement.title}</h3>
          <small>{formatDateTime(language, announcement.createdAt)}</small>
        </div>
        <div className="message-meta">
          {currentUser.role === 'admin' && announcementSchool && <span>{announcementSchool.name}</span>}
          <span>{author?.name ?? '-'}</span>
          <span>{tr(language, archived ? 'archivedAt' : 'visibleUntil')}: {formatDateTime(language, expiresAt)}</span>
        </div>
        <p>{announcement.body}</p>
        {announcement.image && <AttachmentPreview attachment={announcement.image} language={language} />}
      </article>
    );
  };

  return (
    <section className="content-grid">
      {currentUser.role === 'director' && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{school?.name ?? tr(language, 'schoolAnnouncements')}</p>
              <h2>{tr(language, 'announcements')}</h2>
            </div>
            <MessageSquare size={24} aria-hidden="true" />
          </div>
          <form className="form-stack" onSubmit={submit}>
            <Field label={tr(language, 'announcementTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <label>
              <span>{tr(language, 'announcementBody')}</span>
              <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
            </label>
            <label className="file-field">
              <span>{tr(language, 'uploadImage')}</span>
              <input type="file" accept="image/*" onChange={readImage} />
              <Upload size={18} aria-hidden="true" />
            </label>
            {form.image && <AttachmentPreview attachment={form.image} language={language} />}
            {error && <p className="form-error">{error}</p>}
            <button className="button primary" type="submit">
              <Plus size={17} aria-hidden="true" />
              <span>{tr(language, 'publishAnnouncement')}</span>
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{school?.name ?? tr(language, 'scopedData')}</p>
            <h2>{tr(language, 'activeAnnouncements')}</h2>
          </div>
          <MessageSquare size={24} aria-hidden="true" />
        </div>
        <div className="message-list">
          {activeAnnouncements.length === 0 && <p className="empty-state">{tr(language, 'noAnnouncements')}</p>}
          {activeAnnouncements.map((announcement) => renderAnnouncementCard(announcement))}
        </div>
      </div>

      {canViewAnnouncementArchive(currentUser) && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'announcementArchiveHint')}</p>
              <h2>{tr(language, 'announcementArchive')}</h2>
            </div>
            <Archive size={24} aria-hidden="true" />
          </div>
          <div className="message-list">
            {archivedAnnouncements.length === 0 && <p className="empty-state">{tr(language, 'noArchivedAnnouncements')}</p>}
            {archivedAnnouncements.map((announcement) => renderAnnouncementCard(announcement, true))}
          </div>
        </div>
      )}
    </section>
  );
}

function NotesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'teacher') {
    return <TeacherNotes data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'student') {
    return <StudentNotes data={data} currentUser={currentUser} language={language} />;
  }

  return <p className="empty-state">{tr(language, 'scopedData')}</p>;
}

function TeacherNotes({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const now = useTimeTick();
  const teacherYearClassGroups = assignedYearClassGroups(currentUser);
  const teacherYearStreamClassGroups = assignedYearStreamClassGroups(currentUser);
  const hasStreamAssignments = Object.keys(teacherYearStreamClassGroups).length > 0;
  const teacherYears = assignedSchoolYears(currentUser);
  const firstYear = teacherYears[0] ?? 1;
  const teacherClassesForYear = (year: number) => teacherYearClassGroups[String(year)] ?? [];
  const teacherStreamsForYear = (year: number) => {
    const streamsForYear = secondaryStreamsForYear(school, year);
    const assignedStreams = Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}) as SecondaryStream[];
    return currentUser.stage === 'secondary' ? assignedStreams.filter((stream) => streamsForYear.includes(stream)) : [];
  };
  const teacherClassesForYearAndStream = (year: number, stream: SecondaryStream | '') =>
    stream && hasStreamAssignments ? teacherYearStreamClassGroups[String(year)]?.[stream] ?? [] : teacherClassesForYear(year);
  const firstStream = teacherStreamsForYear(firstYear)[0] ?? '';
  const [form, setForm] = useState({
    title: '',
    body: '',
    targetSchoolYear: firstYear,
    targetStream: firstStream as SecondaryStream | '',
    targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
    attachment: null as UploadedAttachment | null
  });
  const [error, setError] = useState('');
  const notes = scopedNotes(data, currentUser).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const activeNotes = notes.filter((note) => !isNoteArchived(note, now));
  const archivedNotes = notes.filter((note) => isNoteArchived(note, now));
  const streamOptionsForSelectedYear = teacherStreamsForYear(form.targetSchoolYear);
  const streamRequired = currentUser.stage === 'secondary';

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    readAttachmentFromInput(
      event,
      (attachment) => {
        setForm((previous) => ({ ...previous, attachment }));
        setError('');
      },
      () => setError(tr(language, 'fileTooLarge'))
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const classGroup = form.targetClassGroup.trim();
    const targetSubject = teacherSubjectForYear(currentUser, form.targetSchoolYear);
    const targetStream =
      form.targetStream && streamOptionsForSelectedYear.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : undefined;
    const targetClasses =
      currentUser.stage === 'secondary' && targetStream
        ? teacherClassesForYearAndStream(form.targetSchoolYear, targetStream)
        : teacherClassesForYear(form.targetSchoolYear);

    if (
      !currentUser.schoolId ||
      !currentUser.stage ||
      !teacherYears.includes(form.targetSchoolYear) ||
      !targetClasses.some((assignedClass) => sameClassGroup(assignedClass, classGroup)) ||
      (streamRequired && !targetStream)
    ) {
      return;
    }

    setData((previous) => ({
      ...previous,
      notes: [
        ...previous.notes,
        {
          id: makeId('note'),
          schoolId: currentUser.schoolId!,
          stage: currentUser.stage!,
          teacherId: currentUser.id,
          subject: targetSubject,
          title: form.title.trim(),
          body: form.body.trim(),
          schoolYear: form.targetSchoolYear,
          classGroup,
          stream: targetStream,
          attachment: form.attachment ?? undefined,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setForm({
      title: '',
      body: '',
      targetSchoolYear: firstYear,
      targetStream: firstStream as SecondaryStream | '',
      targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
      attachment: null
    });
    setError('');
  };

  const deleteNote = (note: TeacherNote) => {
    if (note.teacherId !== currentUser.id) {
      return;
    }

    setData((previous) =>
      applyDeletedNoteTombstones({
        ...previous,
        deletedNoteIds: uniqueStrings([...previous.deletedNoteIds, note.id])
      })
    );
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'targetGroup')}</p>
            <h2>{tr(language, 'teacherNotes')}</h2>
          </div>
          <MessageSquare size={24} aria-hidden="true" />
        </div>
        <form className="form-stack" onSubmit={submit}>
          <Field label={tr(language, 'noteTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <label>
            <span>{tr(language, 'noteBody')}</span>
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
          </label>
          <label>
            <span>{tr(language, 'schoolYear')}</span>
            <select
              value={form.targetSchoolYear}
              onChange={(event) => {
                const year = Number(event.target.value);
                const streams = teacherStreamsForYear(year);
                const nextStream = streams.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : streams[0] ?? '';
                const classes =
                  currentUser.stage === 'secondary' && nextStream ? teacherClassesForYearAndStream(year, nextStream) : teacherClassesForYear(year);
                setForm({ ...form, targetSchoolYear: year, targetStream: nextStream, targetClassGroup: classes[0] ?? '' });
              }}
            >
              {teacherYears.map((year) => (
                <option value={year} key={year}>
                  {schoolYearLabel(language, currentUser.stage, year)}
                </option>
              ))}
            </select>
          </label>
          {streamRequired && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={form.targetStream}
                onChange={(event) => {
                  const stream = event.target.value as SecondaryStream | '';
                  const classes = teacherClassesForYearAndStream(form.targetSchoolYear, stream);
                  setForm({ ...form, targetStream: stream, targetClassGroup: classes[0] ?? '' });
                }}
              >
                {streamOptionsForSelectedYear.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, form.targetSchoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{tr(language, 'classGroup')}</span>
            <select value={form.targetClassGroup} onChange={(event) => setForm({ ...form, targetClassGroup: event.target.value })}>
              {(streamRequired && form.targetStream
                ? teacherClassesForYearAndStream(form.targetSchoolYear, form.targetStream as SecondaryStream)
                : teacherClassesForYear(form.targetSchoolYear)
              ).map((classGroup) => (
                <option value={classGroup} key={classGroup}>
                  {classGroup}
                </option>
              ))}
            </select>
          </label>
          <label className="file-field">
            <span>{tr(language, 'uploadFile')}</span>
            <input type="file" onChange={readFile} />
            <Upload size={18} aria-hidden="true" />
          </label>
          {form.attachment && <AttachmentPreview attachment={form.attachment} language={language} />}
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'publishNote')}</span>
          </button>
        </form>
      </div>
      <NotesList notes={activeNotes} data={data} language={language} titleKey="activeNotes" emptyKey="noNotes" archived={false} onDelete={deleteNote} />
      <NotesList
        notes={archivedNotes}
        data={data}
        language={language}
        titleKey="noteArchive"
        subtitleKey="noteArchiveHint"
        emptyKey="noArchivedNotes"
        archived
        onDelete={deleteNote}
      />
    </section>
  );
}

function StudentNotes({ data, currentUser, language }: CommonViewProps) {
  const now = useTimeTick();
  const notes = scopedNotes(data, currentUser)
    .filter((note) => !isNoteArchived(note, now))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <section className="content-grid">
      <NotesList notes={notes} data={data} language={language} titleKey="activeNotes" emptyKey="noNotes" archived={false} />
    </section>
  );
}

function NotesList({
  notes,
  data,
  language,
  titleKey = 'teacherNotes',
  subtitleKey = 'scopedData',
  emptyKey = 'noNotes',
  archived = false,
  onDelete
}: {
  notes: TeacherNote[];
  data: PlatformData;
  language: Language;
  titleKey?: string;
  subtitleKey?: string;
  emptyKey?: string;
  archived?: boolean;
  onDelete?: (note: TeacherNote) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, subtitleKey)}</p>
          <h2>{tr(language, titleKey)}</h2>
        </div>
        {archived ? <Archive size={24} aria-hidden="true" /> : <MessageSquare size={24} aria-hidden="true" />}
      </div>
      <div className="message-list">
        {notes.length === 0 && <p className="empty-state">{tr(language, emptyKey)}</p>}
        {notes.map((note) => {
          const teacher = data.users.find((user) => user.id === note.teacherId);
          return (
            <article className={archived ? 'message-card archived-message-card' : 'message-card'} key={note.id}>
              <div className="message-card-head">
                <h3>{note.title}</h3>
                <small>{formatDateTime(language, note.createdAt)}</small>
              </div>
              <div className="message-meta">
                {note.subject && <span>{subjectNames[language][note.subject]}</span>}
                {note.schoolYear && <span>{schoolYearLabel(language, note.stage, note.schoolYear)}</span>}
                {note.stream && <span>{secondaryStreamLabel(language, note.stream, note.schoolYear)}</span>}
                {note.classGroup && <span>{tr(language, 'classGroup')} {note.classGroup}</span>}
                <span>{tr(language, archived ? 'archivedAt' : 'visibleUntil')}: {formatDateTime(language, noteExpiresAt(note))}</span>
              </div>
              <p>{note.body}</p>
              {note.attachment && <AttachmentPreview attachment={note.attachment} language={language} />}
              <small>{teacher?.name ?? '-'}</small>
              {onDelete && (
                <div className="button-row">
                  <button className="button danger" type="button" onClick={() => onDelete(note)}>
                    <Trash2 size={16} aria-hidden="true" />
                    <span>{tr(language, 'delete')}</span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

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
