import { Edit3, Plus, Save, UserCog, Users, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser, Stage } from '../types';
import { stageNames, tr } from '../i18n';
import { secondaryStreams, stages } from '../education';
import { canDeleteUser, canToggleUser, deleteUserRecords, makeId } from '../data';
import { Field } from '../ui';
import { AccountEditPanel } from './accounts-edit';
import { UsersTable } from './accounts-table';

export function AdminUsersPanel({
  data,
  setData,
  currentUser,
  language
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
}) {
  const [accountMode, setAccountMode] = useState<'create' | 'view'>('view');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    schoolName: '',
    stage: 'middle' as Stage,
    domain: '',
    city: ''
  });
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [directorEdit, setDirectorEdit] = useState<null | {
    id: string;
    schoolId: string;
    name: string;
    email: string;
    schoolName: string;
    stage: Stage;
    domain: string;
  }>(null);

  const createDirector = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (data.users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    const schoolId = makeId('school');
    const directorId = makeId('director');
    const domain = form.domain.replace(/^@/, '').trim();

    setData((previous) => ({
      ...previous,
      schools: [
        ...previous.schools,
        {
          id: schoolId,
          name: form.schoolName.trim(),
          stage: form.stage,
          domain,
          city: form.city.trim(),
          address: '',
          phone: '',
          directorId,
          streams: form.stage === 'secondary' ? [...secondaryStreams] : undefined
        }
      ],
      users: [
        ...previous.users,
        {
          id: directorId,
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'director',
          status: 'active',
          schoolId,
          stage: form.stage
        }
      ]
    }));

    setForm({ name: '', email: '', password: '', schoolName: '', stage: 'middle', domain: '', city: '' });
    setError('');
  };

  const toggleStatus = (target: PlatformUser) => {
    if (!canToggleUser(currentUser, target)) {
      return;
    }

    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) =>
        user.id === target.id ? { ...user, status: user.status === 'active' ? 'disabled' : 'active' } : user
      )
    }));
  };

  const deleteUser = (target: PlatformUser) => {
    if (!canDeleteUser(currentUser, target)) {
      return;
    }

    setData((previous) => deleteUserRecords(previous, target));
    if (editingUser?.id === target.id) {
      setEditingUser(null);
    }
  };

  const saveDirectorEdit = () => {
    if (!directorEdit) {
      return;
    }

    const normalizedEmail = directorEdit.email.trim().toLowerCase();
    if (data.users.some((user) => user.id !== directorEdit.id && user.email.toLowerCase() === normalizedEmail)) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((school) =>
        school.id === directorEdit.schoolId
          ? {
              ...school,
              name: directorEdit.schoolName.trim(),
              stage: directorEdit.stage,
              domain: directorEdit.domain.replace(/^@/, '').trim(),
              streams: directorEdit.stage === 'secondary' ? (school.streams?.length ? school.streams : [...secondaryStreams]) : undefined
            }
          : school
      ),
      users: previous.users.map((user) =>
        user.id === directorEdit.id
          ? { ...user, name: directorEdit.name.trim(), email: directorEdit.email.trim(), stage: directorEdit.stage }
          : user.schoolId === directorEdit.schoolId
            ? { ...user, stage: directorEdit.stage, stream: directorEdit.stage === 'secondary' ? user.stream : undefined }
          : user
      )
    }));
    setDirectorEdit(null);
    setError('');
  };

  return (
    <section className="content-grid">
      <div className="account-mode-switch full">
        <div className="segmented">
          <button type="button" className={accountMode === 'view' ? 'active' : ''} onClick={() => setAccountMode('view')}>
            <Users size={16} aria-hidden="true" />
            <span>{tr(language, 'viewAccountsTab')}</span>
          </button>
          <button type="button" className={accountMode === 'create' ? 'active' : ''} onClick={() => setAccountMode('create')}>
            <Plus size={16} aria-hidden="true" />
            <span>{tr(language, 'createAccountTab')}</span>
          </button>
        </div>
      </div>

      {accountMode === 'create' && (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'adminPower')}</p>
            <h2>{tr(language, 'createDirector')}</h2>
          </div>
          <UserCog size={24} aria-hidden="true" />
        </div>
        <form className="form-grid" onSubmit={createDirector}>
          <Field label={tr(language, 'fullName')} value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Field label={tr(language, 'email')} value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" required />
          <Field label={tr(language, 'passwordDefault')} value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
          <Field label={tr(language, 'schoolName')} value={form.schoolName} onChange={(value) => setForm({ ...form, schoolName: value })} required />
          <label>
            <span>{tr(language, 'stage')}</span>
            <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as Stage })}>
              {stages.map((stage) => (
                <option value={stage} key={stage}>
                  {stageNames[language][stage]}
                </option>
              ))}
            </select>
          </label>
          <Field label={tr(language, 'domain')} value={form.domain} onChange={(value) => setForm({ ...form, domain: value })} required />
          <Field label={tr(language, 'city')} value={form.city} onChange={(value) => setForm({ ...form, city: value })} required />
          {error && <p className="form-error full">{error}</p>}
          <button className="button primary form-submit" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'create')}</span>
          </button>
        </form>
      </div>
      )}

      {accountMode === 'view' && directorEdit && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'directorEdit')}</p>
              <h2>{directorEdit.email}</h2>
            </div>
            <Edit3 size={24} aria-hidden="true" />
          </div>
          <div className="form-grid">
            <Field label={tr(language, 'fullName')} value={directorEdit.name} onChange={(value) => setDirectorEdit({ ...directorEdit, name: value })} />
            <Field label={tr(language, 'email')} value={directorEdit.email} onChange={(value) => setDirectorEdit({ ...directorEdit, email: value })} type="email" />
            <Field label={tr(language, 'schoolName')} value={directorEdit.schoolName} onChange={(value) => setDirectorEdit({ ...directorEdit, schoolName: value })} />
            <label>
              <span>{tr(language, 'stage')}</span>
              <select value={directorEdit.stage} onChange={(event) => setDirectorEdit({ ...directorEdit, stage: event.target.value as Stage })}>
                {stages.map((stage) => (
                  <option value={stage} key={stage}>
                    {stageNames[language][stage]}
                  </option>
                ))}
              </select>
            </label>
            <Field label={tr(language, 'domain')} value={directorEdit.domain} onChange={(value) => setDirectorEdit({ ...directorEdit, domain: value })} />
            <div className="button-row full">
              <button className="button primary" type="button" onClick={saveDirectorEdit}>
                <Save size={17} aria-hidden="true" />
                <span>{tr(language, 'save')}</span>
              </button>
              <button className="button ghost" type="button" onClick={() => setDirectorEdit(null)}>
                <X size={17} aria-hidden="true" />
                <span>{tr(language, 'cancel')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {accountMode === 'view' && editingUser && (
        <AccountEditPanel
          data={data}
          setData={setData}
          currentUser={currentUser}
          target={editingUser}
          language={language}
          onClose={() => setEditingUser(null)}
          onSaved={() => setEditingUser(null)}
        />
      )}

      {accountMode === 'view' && (
        <UsersTable
          title={tr(language, 'allUsers')}
          data={data}
          users={data.users}
          currentUser={currentUser}
          language={language}
          onToggle={toggleStatus}
          onDelete={deleteUser}
          onEdit={(target) => setEditingUser(target)}
          groupByRole
        />
      )}
    </section>
  );
}
