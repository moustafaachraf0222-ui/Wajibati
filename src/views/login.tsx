import { Info, Moon, ShieldCheck, Sun, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser, RememberedAccount, SchoolRecord, SecondaryStream, SyncStatus, Theme } from '../types';
import { schoolYearNames, stageNames, tr } from '../i18n';
import {
  canAuthenticateUser,
  forgetStoredAccount,
  generateAccountCode,
  generateSchoolEmail,
  loadRememberedAccounts,
  makeId,
  normalizeEmailDomain,
  pruneRememberedAccounts,
  rememberStoredAccount,
  rememberedAccountListsEqual
} from '../data';
import { defaultClassGroups, normalizeClassGroup, secondaryStreamLabel, secondaryStreamsForYear } from '../education';
import { AppInfoDialog, LanguageMenu, SyncIndicator } from '../ui';

type LoginProps = {
  data: PlatformData;
  setData: DataSetter;
  language: Language;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onLogin: (userId: string) => void;
  onRefreshData: () => Promise<PlatformData>;
  syncStatus: SyncStatus;
};

const initialStudentSignupForm = {
  name: '',
  domain: '',
  schoolYear: 1,
  stream: '' as SecondaryStream | '',
  classChoice: '1',
  customClassGroup: ''
};

function findSchoolByDomain(data: PlatformData, domain: string): SchoolRecord | undefined {
  const normalizedDomain = normalizeEmailDomain(domain);
  if (!normalizedDomain) {
    return undefined;
  }

  return data.schools.find((school) => !school.deletedAt && normalizeEmailDomain(school.domain) === normalizedDomain);
}

export function LoginPage({ data, setData, language, theme, onLanguageChange, onThemeChange, onLogin, onRefreshData, syncStatus }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(loadRememberedAccounts);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [studentSignupOpen, setStudentSignupOpen] = useState(false);
  const [studentSignupForm, setStudentSignupForm] = useState(initialStudentSignupForm);
  const [studentSignupError, setStudentSignupError] = useState('');
  const [studentSignupSuccess, setStudentSignupSuccess] = useState<{ email: string; password: string } | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const visibleRememberedAccounts = rememberedAccounts
    .map((remembered) => data.users.find((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase()))
    .filter((user): user is PlatformUser => Boolean(user && canAuthenticateUser(data, user)));
  const signupSchool = useMemo(() => findSchoolByDomain(data, studentSignupForm.domain), [data, studentSignupForm.domain]);
  const signupStreamOptions = useMemo(
    () => secondaryStreamsForYear(signupSchool, studentSignupForm.schoolYear),
    [signupSchool, studentSignupForm.schoolYear]
  );
  const signupEmailPreview =
    signupSchool && studentSignupForm.name.trim() ? generateSchoolEmail(studentSignupForm.name, 'student', signupSchool.domain, data.users) : '';

  useEffect(() => {
    const next = pruneRememberedAccounts(data.users);
    setRememberedAccounts((previous) => (rememberedAccountListsEqual(previous, next) ? previous : next));
  }, [data]);

  useEffect(() => {
    if (!signupSchool) {
      return;
    }

    setStudentSignupForm((previous) => {
      const yearCount = schoolYearNames[language][signupSchool.stage].length;
      const schoolYear = previous.schoolYear >= 1 && previous.schoolYear <= yearCount ? previous.schoolYear : 1;
      const streamOptions = secondaryStreamsForYear(signupSchool, schoolYear);
      const stream =
        signupSchool.stage === 'secondary'
          ? streamOptions.includes(previous.stream as SecondaryStream)
            ? previous.stream
            : streamOptions[0] ?? ''
          : '';

      return schoolYear === previous.schoolYear && stream === previous.stream ? previous : { ...previous, schoolYear, stream };
    });
  }, [language, signupSchool]);

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

    const accountName = studentSignupForm.name.trim();
    if (!accountName) {
      setStudentSignupError(tr(language, 'nameRequired'));
      return;
    }

    setIsCreatingStudent(true);
    const latestData = await onRefreshData();
    const school = findSchoolByDomain(latestData, studentSignupForm.domain);
    setIsCreatingStudent(false);

    if (!school) {
      setStudentSignupError(tr(language, 'invalidSchoolDomain'));
      return;
    }

    const classGroup = studentSignupForm.classChoice === 'custom' ? normalizeClassGroup(studentSignupForm.customClassGroup) : studentSignupForm.classChoice;
    if (!classGroup.trim()) {
      setStudentSignupError(tr(language, 'classRequired'));
      return;
    }

    const streamOptions = secondaryStreamsForYear(school, studentSignupForm.schoolYear);
    if (school.stage === 'secondary' && streamOptions.length === 0) {
      setStudentSignupError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (school.stage === 'secondary' && (!studentSignupForm.stream || !streamOptions.includes(studentSignupForm.stream))) {
      setStudentSignupError(tr(language, 'streamRequired'));
      return;
    }

    const studentStream: SecondaryStream | undefined = school.stage === 'secondary' ? (studentSignupForm.stream as SecondaryStream) : undefined;
    const accountCode = generateAccountCode();
    const createdAccount: PlatformUser = {
      id: makeId('student'),
      name: accountName,
      email: generateSchoolEmail(accountName, 'student', school.domain, latestData.users),
      password: accountCode,
      role: 'student',
      status: 'active',
      schoolId: school.id,
      stage: school.stage,
      schoolYear: studentSignupForm.schoolYear,
      classGroup: classGroup.trim(),
      stream: studentStream,
      createdBy: 'self-registration'
    };

    setData((previous) => ({ ...previous, users: [...previous.users, createdAccount] }));
    rememberAccount(createdAccount);
    setEmail(createdAccount.email);
    setPassword(createdAccount.password);
    setRememberMe(true);
    setStudentSignupSuccess({ email: createdAccount.email, password: createdAccount.password });
    setStudentSignupForm(initialStudentSignupForm);
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
              <UserPlus size={18} aria-hidden="true" />
              <span>{tr(language, 'createStudentAccount')}</span>
            </button>
            {studentSignupOpen && (
              <form className="form-grid login-signup-form" onSubmit={submitStudentSignup}>
                <p className="hint full">{tr(language, 'studentSignupHint')}</p>
                <label className="full">
                  <span>{tr(language, 'fullName')}</span>
                  <input
                    value={studentSignupForm.name}
                    onChange={(event) => setStudentSignupForm({ ...studentSignupForm, name: event.target.value })}
                    autoComplete="name"
                    required
                  />
                </label>
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

                {signupSchool ? (
                  <>
                    <div className="signup-school-strip full">
                      <span>{signupSchool.name}</span>
                      <span>{stageNames[language][signupSchool.stage]}</span>
                      <span dir="ltr">@{signupSchool.domain}</span>
                    </div>
                    {signupEmailPreview && (
                      <p className="hint full">
                        <span>{tr(language, 'generatedEmailPreview')}: </span>
                        <strong dir="ltr">{signupEmailPreview}</strong>
                      </p>
                    )}
                    <label>
                      <span>{tr(language, 'schoolYear')}</span>
                      <select
                        value={studentSignupForm.schoolYear}
                        onChange={(event) => {
                          const schoolYear = Number(event.target.value);
                          const streamsForYear = secondaryStreamsForYear(signupSchool, schoolYear);
                          const stream =
                            signupSchool.stage === 'secondary'
                              ? streamsForYear.includes(studentSignupForm.stream as SecondaryStream)
                                ? studentSignupForm.stream
                                : streamsForYear[0] ?? ''
                              : '';
                          setStudentSignupForm({ ...studentSignupForm, schoolYear, stream });
                        }}
                      >
                        {schoolYearNames[language][signupSchool.stage].map((label, index) => (
                          <option value={index + 1} key={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {signupSchool.stage === 'secondary' && (
                      <label>
                        <span>{tr(language, 'stream')}</span>
                        <select
                          value={studentSignupForm.stream}
                          disabled={signupStreamOptions.length === 0}
                          onChange={(event) => setStudentSignupForm({ ...studentSignupForm, stream: event.target.value as SecondaryStream | '' })}
                        >
                          <option value="">{signupStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                          {signupStreamOptions.map((stream) => (
                            <option value={stream} key={stream}>
                              {secondaryStreamLabel(language, stream, studentSignupForm.schoolYear)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      <span>{tr(language, 'classGroup')}</span>
                      <select value={studentSignupForm.classChoice} onChange={(event) => setStudentSignupForm({ ...studentSignupForm, classChoice: event.target.value })}>
                        {defaultClassGroups.map((classGroup) => (
                          <option value={classGroup} key={classGroup}>
                            {classGroup}
                          </option>
                        ))}
                        <option value="custom">{tr(language, 'customClass')}</option>
                      </select>
                    </label>
                    {studentSignupForm.classChoice === 'custom' && (
                      <label>
                        <span>{tr(language, 'customClass')}</span>
                        <input
                          value={studentSignupForm.customClassGroup}
                          onChange={(event) => setStudentSignupForm({ ...studentSignupForm, customClassGroup: event.target.value })}
                          required
                        />
                      </label>
                    )}
                    <p className="hint full">{tr(language, 'autoGeneratedCodeHint')}</p>
                  </>
                ) : studentSignupSuccess ? null : studentSignupForm.domain.trim() ? (
                  <p className="form-error full">{tr(language, 'invalidSchoolDomain')}</p>
                ) : (
                  <p className="hint full">{tr(language, 'validSchoolDomainHint')}</p>
                )}

                {studentSignupSuccess && (
                  <div className="created-account-box full">
                    <strong>{tr(language, 'studentAccountCreated')}</strong>
                    <span>{tr(language, 'email')}: <b dir="ltr">{studentSignupSuccess.email}</b></span>
                    <span>{tr(language, 'accountCode')}: <b dir="ltr">{studentSignupSuccess.password}</b></span>
                  </div>
                )}
                {studentSignupError && <p className="form-error full">{studentSignupError}</p>}
                <button className="button primary form-submit" type="submit" disabled={isCreatingStudent || !signupSchool}>
                  <UserPlus size={17} aria-hidden="true" />
                  <span>{tr(language, 'create')}</span>
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
