import { ArrowLeft, LogOut, Moon, School, Sun } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import type { Language, PlatformUser, SchoolRecord, SyncStatus, Theme, View } from './types';
import { stageNames, tr } from './i18n';
import {
  assignedClassGroups,
  assignedSchoolYears,
  classGroupsLabel,
  schoolYearsLabel,
  secondaryStreamLabel,
  yearClassGroupsLabel
} from './education';
import { ConfirmDialog, LanguageMenu, RoleLabel, SyncIndicator } from './ui';
import type { NavItem } from './navigation';
import { canGoBack as stackCanGoBack, topView, type NavStack } from './nav-stack';
import { triggerBackShortcut } from './back-shortcut';

type AppShellProps = {
  children: ReactNode;
  currentSchool?: SchoolRecord;
  currentUser: PlatformUser;
  language: Language;
  logoutOpen: boolean;
  navBadges?: Partial<Record<View, number>>;
  stack: NavStack;
  syncStatus: SyncStatus;
  tabs: NavItem[];
  theme: Theme;
  onBack: () => void;
  onLanguageChange: (language: Language) => void;
  onLogoutCancel: () => void;
  onLogoutConfirm: () => void;
  onLogoutRequest: () => void;
  onThemeChange: (theme: Theme) => void;
  onViewChange: (view: View) => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

function visibleButtons(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLButtonElement>('button')].filter((button) => !button.disabled && button.offsetParent !== null);
}

function moveFocusWithArrows(key: string) {
  const active = document.activeElement;
  let items: HTMLElement[] = [];
  if (active instanceof HTMLElement && active.tagName === 'BUTTON' && active.parentElement) {
    items = visibleButtons(active.parentElement);
  }
  if (items.length === 0) {
    const first = document.querySelector<HTMLElement>(
      '.screen-view .user-groups button, .screen-view .stats-grid button, .nav-list button'
    );
    first?.focus();
    return;
  }

  const direction = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
  const currentIndex = items.indexOf(active as HTMLElement);
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  items[nextIndex].focus();
}

export function AppShell({
  children,
  currentSchool,
  currentUser,
  language,
  logoutOpen,
  navBadges,
  stack,
  syncStatus,
  tabs,
  theme,
  onBack,
  onLanguageChange,
  onLogoutCancel,
  onLogoutConfirm,
  onLogoutRequest,
  onThemeChange,
  onViewChange
}: AppShellProps) {
  const activeView: View = topView(stack);
  const canGoBackNow = stackCanGoBack(stack);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        if (triggerBackShortcut()) {
          return;
        }
        if (canGoBackNow) {
          onBack();
        }
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveFocusWithArrows(event.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBackNow, onBack]);

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
            const badge = navBadges?.[item.id] ?? 0;
            return (
              <button
                key={item.id}
                className={activeView === item.id ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => onViewChange(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tr(language, item.labelKey)}</span>
                {badge > 0 && <span className="nav-badge">{badge}</span>}
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
          <div className="topbar-title">
            {canGoBackNow && (
              <button
                className="back-button"
                type="button"
                onClick={onBack}
                aria-label={tr(language, 'back')}
                title={tr(language, 'back')}
              >
                <ArrowLeft size={20} aria-hidden="true" />
                <span>{tr(language, 'back')}</span>
              </button>
            )}
            <div>
              <p>{tr(language, activeView)}</p>
              <h1>{currentUser.email}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <SyncIndicator status={syncStatus} language={language} />
            <LanguageMenu language={language} onLanguageChange={onLanguageChange} />
            <button
              className="icon-text-button"
              type="button"
              title={theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}
              onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
              <span>{theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}</span>
            </button>
            <button className="button ghost" type="button" onClick={onLogoutRequest}>
              <LogOut size={17} aria-hidden="true" />
              <span>{tr(language, 'logout')}</span>
            </button>
          </div>
        </header>

        <div className="screen-view" key={`${stack.length}:${activeView}`}>
          {children}
        </div>
      </main>

      {logoutOpen && <ConfirmDialog language={language} onCancel={onLogoutCancel} onConfirm={onLogoutConfirm} />}
    </div>
  );
}
