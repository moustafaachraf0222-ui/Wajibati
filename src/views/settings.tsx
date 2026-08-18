import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Globe2, KeyRound, Moon, Palette, Phone, Save, Settings, Sun, Trash2 } from 'lucide-react';
import type { Accent, DataSetter, Language, PlatformData, PlatformUser, Theme } from '../types';
import { languageNames, tr } from '../i18n';
import { Field, languages } from '../ui';
import { hashPassword, verifyPassword } from '../password';

const accentOptions: Accent[] = ['green', 'navy', 'teal', 'amber', 'crimson', 'violet'];

type SettingsSection = 'language' | 'appearance' | 'guardian' | 'password' | 'system';

function accentKey(accent: Accent) {
  return {
    green: 'accentGreen',
    navy: 'accentNavy',
    teal: 'accentTeal',
    amber: 'accentAmber',
    crimson: 'accentCrimson',
    violet: 'accentViolet'
  }[accent];
}
type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

export function SettingsView({
  data,
  setData,
  currentUser,
  language,
  theme,
  accent,
  onLanguageChange,
  onThemeChange,
  onAccentChange,
  onResetDemo
}: CommonViewProps & {
  setData: DataSetter;
  theme: Theme;
  accent: Accent;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onAccentChange: (accent: Accent) => void;
  onResetDemo: () => void;
}) {
  const [guardianPhone, setGuardianPhone] = useState(currentUser.guardianPhone ?? '');
  const [studentSaved, setStudentSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('language');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    setGuardianPhone(currentUser.guardianPhone ?? '');
    setStudentSaved(false);
  }, [currentUser.id, currentUser.guardianPhone]);

  const saveGuardianPhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = guardianPhone.trim();

    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) => (user.id === currentUser.id ? { ...user, guardianPhone: normalizedPhone } : user))
    }));
    setGuardianPhone(normalizedPhone);
    setStudentSaved(true);
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordChanged(false);

    const matches = await verifyPassword(currentPassword, currentUser.password);
    if (!matches) {
      setPasswordError(tr(language, 'wrongCurrentPassword'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(tr(language, 'passwordTooShort'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(tr(language, 'passwordsDoNotMatch'));
      return;
    }

    const hashedPassword = await hashPassword(newPassword);
    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) => (user.id === currentUser.id ? { ...user, password: hashedPassword } : user)),
      accountCredentials: previous.accountCredentials.map((credential) =>
        credential.userId === currentUser.id ? { ...credential, code: newPassword } : credential
      )
    }));
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    setPasswordChanged(true);
  };

  const visibleSections: { id: SettingsSection; labelKey: string; icon: ReactNode }[] = [
    { id: 'language', labelKey: 'chooseLanguage', icon: <Globe2 aria-hidden="true" /> },
    { id: 'appearance', labelKey: 'appearance', icon: <Palette aria-hidden="true" /> }
  ];
  if (currentUser.role === 'student') {
    visibleSections.push({ id: 'guardian', labelKey: 'guardianPhone', icon: <Phone aria-hidden="true" /> });
  }
  if (currentUser.role !== 'admin') {
    visibleSections.push({ id: 'password', labelKey: 'changePassword', icon: <KeyRound aria-hidden="true" /> });
  }
  if (currentUser.role === 'admin') {
    visibleSections.push({ id: 'system', labelKey: 'systemSettings', icon: <Settings aria-hidden="true" /> });
  }
  const currentSection = visibleSections.some((section) => section.id === activeSection) ? activeSection : 'language';

  return (
    <section className="settings-view">
      <div className="settings-page-head">
        <div>
          <div className="ov-eyebrow">{tr(language, 'settings')}</div>
          <h1 className="ov-h1">{tr(language, 'settings')}</h1>
        </div>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {visibleSections.map((section) => (
            <button
              type="button"
              key={section.id}
              className={currentSection === section.id ? 'active' : ''}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{tr(language, section.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="settings-pane">
          {currentSection === 'language' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <div className="settings-card-icon">
                  <Globe2 aria-hidden="true" />
                </div>
                <div>
                  <h2>{tr(language, 'chooseLanguage')}</h2>
                  <p>{tr(language, 'settingsLanguageText')}</p>
                </div>
              </div>
              <div className="settings-lang-row">
                {languages.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`settings-lang-btn ${language === option ? 'active' : ''}`}
                    onClick={() => onLanguageChange(option)}
                  >
                    {languageNames[option]}
                    {language === option && <span className="settings-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'appearance' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <div className="settings-card-icon">
                  {theme === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
                </div>
                <div>
                  <h2>{tr(language, 'appearance')}</h2>
                  <p>{theme === 'dark' ? tr(language, 'darkMode') : tr(language, 'lightMode')}</p>
                </div>
              </div>
              <div className="settings-theme-toggle">
                <button
                  type="button"
                  className={`settings-theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => onThemeChange('light')}
                >
                  <Sun aria-hidden="true" />
                  <span>{tr(language, 'lightMode')}</span>
                </button>
                <button
                  type="button"
                  className={`settings-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => onThemeChange('dark')}
                >
                  <Moon aria-hidden="true" />
                  <span>{tr(language, 'darkMode')}</span>
                </button>
              </div>
              <label className="settings-accent-field">
                <span className="settings-accent-label">
                  <Palette size={15} aria-hidden="true" />
                  {tr(language, 'themeColor')}
                </span>
                <select
                  value={accent}
                  onChange={(event) => onAccentChange(event.target.value as Accent)}
                >
                  {accentOptions.map((option) => (
                    <option value={option} key={option}>
                      {tr(language, accentKey(option))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {currentSection === 'guardian' && currentUser.role === 'student' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <div className="settings-card-icon">
                  <Phone aria-hidden="true" />
                </div>
                <div>
                  <h2>{tr(language, 'guardianPhone')}</h2>
                  <p>{tr(language, 'guardianPhoneHint')}</p>
                </div>
              </div>
              <form className="settings-form" onSubmit={saveGuardianPhone}>
                <div className="settings-input">
                  <Field label={tr(language, 'guardianPhone')} value={guardianPhone} type="tel" onChange={setGuardianPhone} />
                </div>
                <div className="settings-form-foot">
                  <button className="button primary" type="submit">
                    <Save size={15} aria-hidden="true" />
                    <span>{tr(language, 'save')}</span>
                  </button>
                  {studentSaved && <span className="settings-saved">{tr(language, 'saved')}</span>}
                </div>
              </form>
            </div>
          )}

          {currentSection === 'password' && currentUser.role !== 'admin' && (
            <div className="settings-card">
              <div className="settings-card-head">
                <div className="settings-card-icon">
                  <KeyRound aria-hidden="true" />
                </div>
                <div>
                  <h2>{tr(language, 'changePassword')}</h2>
                  <p>{tr(language, 'changePasswordHint')}</p>
                </div>
              </div>
              <form className="settings-form" onSubmit={changePassword}>
                <div className="settings-input">
                  <Field label={tr(language, 'currentPassword')} value={currentPassword} type="password" required onChange={setCurrentPassword} />
                </div>
                <div className="settings-input">
                  <Field label={tr(language, 'newPassword')} value={newPassword} type="password" required onChange={setNewPassword} />
                </div>
                <div className="settings-input">
                  <Field label={tr(language, 'confirmNewPassword')} value={confirmNewPassword} type="password" required onChange={setConfirmNewPassword} />
                </div>
                {passwordError && <div className="settings-error">{passwordError}</div>}
                <div className="settings-form-foot">
                  <button className="button primary" type="submit">
                    <Save size={15} aria-hidden="true" />
                    <span>{tr(language, 'changePassword')}</span>
                  </button>
                  {passwordChanged && <span className="settings-saved">{tr(language, 'passwordChanged')}</span>}
                </div>
              </form>
            </div>
          )}

          {currentSection === 'system' && currentUser.role === 'admin' && (
            <div className="settings-card admin">
              <div className="settings-card-head">
                <div className="settings-card-icon admin">
                  <Settings aria-hidden="true" />
                </div>
                <div>
                  <h2>{tr(language, 'systemSettings')}</h2>
                  <p>{tr(language, 'adminPower')}</p>
                </div>
              </div>
              <div className="settings-toggles">
                <label className="settings-toggle">
                  <div>
                    <strong>{tr(language, 'allowImages')}</strong>
                  </div>
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
                <label className="settings-toggle">
                  <div>
                    <strong>{tr(language, 'maintenanceMode')}</strong>
                  </div>
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
              </div>
              <div className="settings-card-foot">
                <button className="button danger" type="button" onClick={onResetDemo}>
                  <Trash2 size={15} aria-hidden="true" />
                  <span>{tr(language, 'resetDemo')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
