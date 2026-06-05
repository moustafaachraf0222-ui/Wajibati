import { Info, KeyRound, Moon, ShieldCheck, Sun, Users, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  RememberedAccount,
  SchoolRecord,
  SecondaryStream,
  StudentActivationRecord,
  SyncStatus,
  Theme
} from '../types';
import { schoolYearNames, tr } from '../i18n';
import {
  canAuthenticateUser,
  forgetStoredAccount,
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

const initialStudentActivationForm = {
  name: '',
  domain: '',
  code: '',
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

function normalizeActivationCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

function normalizeFullName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function findStudentActivationRecord(
  data: PlatformData,
  school: SchoolRecord,
  name: string,
  code: string
): StudentActivationRecord | undefined {
  const normalizedCode = normalizeActivationCode(code);
  const normalizedName = normalizeFullName(name);
  if (!normalizedCode || !normalizedName) {
    return undefined;
  }

  return data.studentActivations.find(
    (activation) =>
      activation.schoolId === school.id &&
      normalizeActivationCode(activation.code) === normalizedCode &&
      normalizeFullName(activation.name) === normalizedName
  );
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
  const [studentSignupForm, setStudentSignupForm] = useState(initialStudentActivationForm);
  const [studentSignupError, setStudentSignupError] = useState('');
  const [studentSignupSuccess, setStudentSignupSuccess] = useState<{ email: string; password: string } | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const visibleRememberedAccounts = rememberedAccounts
    .map((remembered) => data.users.find((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase()))
    .filter((user): user is PlatformUser => Boolean(user && canAuthenticateUser(data, user)));
  const activationSchool = findSchoolByDomain(data, studentSignupForm.domain);
  const activationStreamOptions = secondaryStreamsForYear(activationSchool, studentSignupForm.schoolYear);

  useEffect(() => {
    const next = pruneRememberedAccounts(data.users);
    setRememberedAccounts((previous) => (rememberedAccountListsEqual(previous, next) ? previous : next));
  }, [data]);

  useEffect(() => {
    if (!activationSchool) {
      return;
    }

    setStudentSignupForm((previous) => {
      const yearCount = schoolYearNames[language][activationSchool.stage].length;
      const schoolYear = previous.schoolYear >= 1 && previous.schoolYear <= yearCount ? previous.schoolYear : 1;
      const streamOptions = secondaryStreamsForYear(activationSchool, schoolYear);
      const stream =
        activationSchool.stage === 'secondary'
          ? streamOptions.includes(previous.stream as SecondaryStream)
            ? previous.stream
            : streamOptions[0] ?? ''
          : '';

      return schoolYear === previous.schoolYear && stream === previous.stream ? previous : { ...previous, schoolYear, stream };
    });
  }, [activationSchool, language]);

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

    if (!studentSignupForm.name.trim()) {
      setStudentSignupError(tr(language, 'nameRequired'));
      return;
    }

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

    const activationRecord = findStudentActivationRecord(latestData, school, studentSignupForm.name, studentSignupForm.code);
    setIsCreatingStudent(false);

    if (!activationRecord) {
      setStudentSignupError(tr(language, 'invalidActivationCode'));
      return;
    }

    const existingAccount = activationRecord.activatedUserId
      ? latestData.users.find((user) => user.id === activationRecord.activatedUserId)
      : undefined;
    if (existingAccount) {
      if (!canAuthenticateUser(latestData, existingAccount)) {
        setStudentSignupError(tr(language, 'disabledAccount'));
        return;
      }

      rememberAccount(existingAccount);
      setEmail(existingAccount.email);
      setPassword(existingAccount.password);
      setRememberMe(true);
      setStudentSignupSuccess({ email: existingAccount.email, password: existingAccount.password });
      setStudentSignupForm(initialStudentActivationForm);
      onLogin(existingAccount.id);
      return;
    }

    if (activationRecord.activatedUserId) {
      setStudentSignupError(tr(language, 'activationCodeUsed'));
      return;
    }

    const classGroup =
      studentSignupForm.classChoice === 'custom' ? normalizeClassGroup(studentSignupForm.customClassGroup) : studentSignupForm.classChoice;
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

    const activatedAccount: PlatformUser = {
      id: makeId('student'),
      name: activationRecord.name,
      email: generateSchoolEmail(activationRecord.name, 'student', school.domain, latestData.users),
      password: activationRecord.code,
      role: 'student',
      status: 'active',
      schoolId: school.id,
      stage: school.stage,
      schoolYear: studentSignupForm.schoolYear,
      classGroup: classGroup.trim(),
      stream: school.stage === 'secondary' && studentSignupForm.stream ? studentSignupForm.stream : undefined,
      createdBy: 'student-activation'
    };

    if (!canAuthenticateUser(latestData, activatedAccount)) {
      setStudentSignupError(tr(language, 'disabledAccount'));
      return;
    }

    setData((previous) => ({
      ...previous,
      users: previous.users.some((user) => user.id === activatedAccount.id) ? previous.users : [...previous.users, activatedAccount],
      studentActivations: previous.studentActivations.map((activation) =>
        activation.id === activationRecord.id
          ? {
              ...activation,
              schoolYear: activatedAccount.schoolYear,
              classGroup: activatedAccount.classGroup,
              stream: activatedAccount.stream,
              activatedUserId: activatedAccount.id,
              activatedAt: new Date().toISOString()
            }
          : activation
      )
    }));
    rememberAccount(activatedAccount);
    setEmail(activatedAccount.email);
    setPassword(activatedAccount.password);
    setRememberMe(true);
    setStudentSignupSuccess({ email: activatedAccount.email, password: activatedAccount.password });
    setStudentSignupForm(initialStudentActivationForm);
    onLogin(activatedAccount.id);
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
                  <span>{tr(language, 'fullName')}</span>
                  <input
                    value={studentSignupForm.name}
                    onChange={(event) => {
                      setStudentSignupForm({ ...studentSignupForm, name: event.target.value });
                      setStudentSignupError('');
                      setStudentSignupSuccess(null);
                    }}
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
                {activationSchool && (
                  <>
                    <label>
                      <span>{tr(language, 'schoolYear')}</span>
                      <select
                        value={studentSignupForm.schoolYear}
                        onChange={(event) => {
                          const schoolYear = Number(event.target.value);
                          const streamsForYear = secondaryStreamsForYear(activationSchool, schoolYear);
                          const stream =
                            activationSchool.stage === 'secondary'
                              ? streamsForYear.includes(studentSignupForm.stream as SecondaryStream)
                                ? studentSignupForm.stream
                                : streamsForYear[0] ?? ''
                              : '';
                          setStudentSignupForm({ ...studentSignupForm, schoolYear, stream });
                        }}
                      >
                        {schoolYearNames[language][activationSchool.stage].map((label, index) => (
                          <option value={index + 1} key={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {activationSchool.stage === 'secondary' && (
                      <label>
                        <span>{tr(language, 'stream')}</span>
                        <select
                          value={studentSignupForm.stream}
                          disabled={activationStreamOptions.length === 0}
                          onChange={(event) => setStudentSignupForm({ ...studentSignupForm, stream: event.target.value as SecondaryStream | '' })}
                        >
                          <option value="">{activationStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                          {activationStreamOptions.map((stream) => (
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
                  </>
                )}
                {!studentSignupSuccess && <p className="hint full">{tr(language, 'validSchoolDomainHint')}</p>}

                {studentSignupSuccess && (
                  <div className="created-account-box full">
                    <strong>{tr(language, 'studentAccountCreated')}</strong>
                    <span>{tr(language, 'email')}: <b dir="ltr">{studentSignupSuccess.email}</b></span>
                    <span>{tr(language, 'accountCode')}: <b dir="ltr">{studentSignupSuccess.password}</b></span>
                  </div>
                )}
                {studentSignupError && <p className="form-error full">{studentSignupError}</p>}
                <button
                  className="button primary form-submit"
                  type="submit"
                  disabled={
                    isCreatingStudent ||
                    !activationSchool ||
                    !studentSignupForm.name.trim() ||
                    !studentSignupForm.domain.trim() ||
                    !studentSignupForm.code.trim()
                  }
                >
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
