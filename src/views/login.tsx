import { Info, KeyRound, Moon, ShieldCheck, Sun, Users, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Language, PlatformData, PlatformUser, RememberedAccount, SchoolRecord, SyncStatus, Theme } from '../types';
import { tr } from '../i18n';
import {
  canAuthenticateUser,
  forgetStoredAccount,
  loadRememberedAccounts,
  normalizeEmailDomain,
  pruneRememberedAccounts,
  rememberStoredAccount,
  rememberedAccountListsEqual
} from '../data';
import { AppInfoDialog, LanguageMenu, SyncIndicator } from '../ui';

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

const initialStudentActivationForm = {
  domain: '',
  code: ''
};

function findSchoolByDomain(data: PlatformData, domain: string): SchoolRecord | undefined {
  const normalizedDomain = normalizeEmailDomain(domain);
  if (!normalizedDomain) {
    return undefined;
  }

  return data.schools.find((school) => !school.deletedAt && normalizeEmailDomain(school.domain) === normalizedDomain);
}

function normalizeActivationCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

function findStudentByActivationCode(data: PlatformData, school: SchoolRecord, code: string): PlatformUser | undefined {
  const normalizedCode = normalizeActivationCode(code);
  if (!normalizedCode) {
    return undefined;
  }

  return data.users.find(
    (user) =>
      user.role === 'student' &&
      user.schoolId === school.id &&
      normalizeActivationCode(user.password) === normalizedCode
  );
}

export function LoginPage({ data, language, theme, onLanguageChange, onThemeChange, onLogin, onRefreshData, syncStatus }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(loadRememberedAccounts);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [studentSignupOpen, setStudentSignupOpen] = useState(false);
  const [studentSignupForm, setStudentSignupForm] = useState(initialStudentActivationForm);
  const [studentSignupError, setStudentSignupError] = useState('');
  const [studentSignupSuccess, setStudentSignupSuccess] = useState<{ email: string; password: string } | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
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

  const submitStudentSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStudentSignupError('');
    setStudentSignupSuccess(null);

    if (!studentSignupForm.code.trim()) {
      setStudentSignupError(tr(language, 'activationCodeRequired'));
      return;
    }

    setIsCreatingStudent(true);
    const latestData = await onRefreshData();
    const school = findSchoolByDomain(latestData, studentSignupForm.domain);

    if (!school) {
      setIsCreatingStudent(false);
      setStudentSignupError(tr(language, 'invalidSchoolDomain'));
      return;
    }

    const activatedAccount = findStudentByActivationCode(latestData, school, studentSignupForm.code);
    setIsCreatingStudent(false);

    if (!activatedAccount) {
      setStudentSignupError(tr(language, 'invalidActivationCode'));
      return;
    }

    if (!canAuthenticateUser(latestData, activatedAccount)) {
      setStudentSignupError(tr(language, 'disabledAccount'));
      return;
    }

    rememberAccount(activatedAccount);
    setEmail(activatedAccount.email);
    setPassword(activatedAccount.password);
    setRememberMe(true);
    setStudentSignupSuccess({ email: activatedAccount.email, password: activatedAccount.password });
    setStudentSignupForm(initialStudentActivationForm);
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

          <div className="student-signup-box">
            <button className="button ghost wide" type="button" onClick={() => setStudentSignupOpen((open) => !open)}>
              <KeyRound size={18} aria-hidden="true" />
              <span>{tr(language, 'createStudentAccount')}</span>
            </button>
            {studentSignupOpen && (
              <form className="form-grid login-signup-form" onSubmit={submitStudentSignup}>
                <p className="hint full">{tr(language, 'studentSignupHint')}</p>
                <label className="full">
                  <span>{tr(language, 'schoolDomain')}</span>
                  <input
                    dir="ltr"
                    value={studentSignupForm.domain}
                    onChange={(event) => {
                      setStudentSignupForm({ ...studentSignupForm, domain: event.target.value });
                      setStudentSignupError('');
                      setStudentSignupSuccess(null);
                    }}
                    placeholder="school.dz"
                    required
                  />
                </label>
                <label className="full">
                  <span>{tr(language, 'activationCode')}</span>
                  <input
                    dir="ltr"
                    value={studentSignupForm.code}
                    onChange={(event) => {
                      setStudentSignupForm({ ...studentSignupForm, code: event.target.value });
                      setStudentSignupError('');
                      setStudentSignupSuccess(null);
                    }}
                    autoComplete="one-time-code"
                    placeholder="A1B2C3"
                    required
                  />
                </label>
                {!studentSignupSuccess && <p className="hint full">{tr(language, 'validSchoolDomainHint')}</p>}

                {studentSignupSuccess && (
                  <div className="created-account-box full">
                    <strong>{tr(language, 'studentAccountCreated')}</strong>
                    <span>{tr(language, 'email')}: <b dir="ltr">{studentSignupSuccess.email}</b></span>
                    <span>{tr(language, 'accountCode')}: <b dir="ltr">{studentSignupSuccess.password}</b></span>
                  </div>
                )}
                {studentSignupError && <p className="form-error full">{studentSignupError}</p>}
                <button className="button primary form-submit" type="submit" disabled={isCreatingStudent || !studentSignupForm.domain.trim() || !studentSignupForm.code.trim()}>
                  <KeyRound size={17} aria-hidden="true" />
                  <span>{tr(language, 'activateAccount')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      {infoOpen && <AppInfoDialog language={language} onClose={() => setInfoOpen(false)} />}
    </main>
  );
}
