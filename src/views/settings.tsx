import { useEffect, useState, type FormEvent } from 'react';
import { Globe2, Phone, Settings, Trash2 } from 'lucide-react';
import type { DataSetter, Language, PlatformData, PlatformUser, Theme } from '../types';
import { languageFlags, languageNames, tr } from '../i18n';
import { Field, languages } from '../ui';
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
  const [guardianPhone, setGuardianPhone] = useState(currentUser.guardianPhone ?? '');
  const [studentSaved, setStudentSaved] = useState(false);

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

      {currentUser.role === 'student' && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'guardianPhoneHint')}</p>
              <h2>{tr(language, 'guardianPhone')}</h2>
            </div>
            <Phone size={24} aria-hidden="true" />
          </div>
          <form className="form-grid" onSubmit={saveGuardianPhone}>
            <Field label={tr(language, 'guardianPhone')} value={guardianPhone} type="tel" onChange={setGuardianPhone} />
            <button className="button primary form-submit" type="submit">
              <Phone size={17} aria-hidden="true" />
              <span>{tr(language, 'save')}</span>
            </button>
            {studentSaved && <p className="success-message full">{tr(language, 'saved')}</p>}
          </form>
        </div>
      )}

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
