import { ArrowLeft, BookOpen, Building2, ChevronRight, Edit3, Eye, FlaskConical, GraduationCap, Plus, Save, School, UserCog, Users, UtensilsCrossed, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser, Role, Stage } from '../types';
import { roleNames, stageNames, tr } from '../i18n';
import { secondaryStreams, secondaryStreamLabel, stages } from '../education';
import { canDeleteUser, canToggleUser, compactEmailLocalPart, deleteUserRecords, makeId } from '../data';
import { schoolIsTrashed } from '../data-tombstones';
import { Field } from '../ui';
import { hashPassword } from '../password';
import { AccountEditPanel } from './accounts-edit';
import { MoveAccountPanel } from './accounts-move';
import { UsersTable } from './accounts-table';
import { useBackShortcut } from '../back-shortcut';

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
    password: '',
    schoolName: '',
    stage: 'middle' as Stage,
    city: ''
  });
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [movingUser, setMovingUser] = useState<PlatformUser | null>(null);
  const [directorEdit, setDirectorEdit] = useState<null | {
    id: string;
    schoolId: string;
    name: string;
    email: string;
    schoolName: string;
    stage: Stage;
    domain: string;
  }>(null);
  const [drillStage, setDrillStage] = useState<Stage | null>(null);
  const [drillSchoolId, setDrillSchoolId] = useState<string | null>(null);
  const [drillCategory, setDrillCategory] = useState<Role | null>(null);
  const [drillStudentGroup, setDrillStudentGroup] = useState<string | null>(null);

  useBackShortcut(() => {
    if (drillStudentGroup) {
      setDrillStudentGroup(null);
      return true;
    }
    if (drillCategory) {
      setDrillCategory(null);
      return true;
    }
    if (drillSchoolId) {
      setDrillSchoolId(null);
      return true;
    }
    if (drillStage) {
      setDrillStage(null);
      return true;
    }
    return false;
  });

  const liveSchools = data.schools.filter((school) => !schoolIsTrashed(school));
  const stageSchools = (stage: Stage) =>
    liveSchools
      .filter((school) => school.stage === stage)
      .sort((a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : undefined, { sensitivity: 'base' }));
  const accountsOfSchool = (schoolId: string) => data.users.filter((user) => user.schoolId === schoolId);
  const drillSchool = drillSchoolId ? data.schools.find((school) => school.id === drillSchoolId) : null;

  const switchAccountMode = (mode: 'create' | 'view') => {
    setAccountMode(mode);
    setDrillStage(null);
    setDrillSchoolId(null);
    setDrillCategory(null);
    setDrillStudentGroup(null);
  };

  const stageIcon = (stage: Stage) =>
    stage === 'primary' ? <GraduationCap size={16} aria-hidden="true" /> : stage === 'middle' ? <BookOpen size={16} aria-hidden="true" /> : <Building2 size={16} aria-hidden="true" />;

  const schoolCategoryIcon = (role: Role) =>
    role === 'director' ? (
      <UserCog size={18} aria-hidden="true" />
    ) : role === 'cafeteria' || role === 'canteen' ? (
      <UtensilsCrossed size={18} aria-hidden="true" />
    ) : role === 'teacher' ? (
      <GraduationCap size={18} aria-hidden="true" />
    ) : role === 'lab' ? (
      <FlaskConical size={18} aria-hidden="true" />
    ) : role === 'supervisor' ? (
      <Eye size={18} aria-hidden="true" />
    ) : (
      <Users size={18} aria-hidden="true" />
    );

  const schoolCategoryRoles: Role[] = ['director', 'cafeteria', 'supervisor', 'teacher', 'lab', 'student'];

  const studentGroups = (() => {
    const groups = new Map<string, PlatformUser[]>();
    for (const user of accountsOfSchool(drillSchool?.id ?? '').filter((candidate) => candidate.role === 'student')) {
      const key = `${user.stream ?? 'none'}|${user.classGroup?.trim() || 'unassigned'}`;
      const list = groups.get(key) ?? [];
      list.push(user);
      groups.set(key, list);
    }
    return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  })();

  const studentGroupLabel = (key: string, members: PlatformUser[]) => {
    const className = key.split('|')[1];
    if (className === 'unassigned') {
      return tr(language, 'unassignedStudents');
    }
    const first = members[0];
    return first?.stream ? `${secondaryStreamLabel(language, first.stream, first.schoolYear ?? 1)} ${className}` : className;
  };

  const createDirector = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const localPart = compactEmailLocalPart(form.schoolName.trim()) || 'school';
    const domain = 'wajibati.dz';
    const directorEmail = `${localPart}@${domain}`;
    const cafeteriaEmail = `cafeteria.${localPart}@${domain}`;
    if (data.users.some((user) => user.email.toLowerCase() === directorEmail) || data.users.some((user) => user.email.toLowerCase() === cafeteriaEmail)) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    const hashedPassword = await hashPassword(form.password);
    const schoolId = makeId('school');
    const directorId = makeId('director');

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
          email: directorEmail,
          password: hashedPassword,
          role: 'director',
          status: 'active',
          schoolId,
          stage: form.stage
        },
        {
          id: `cafeteria-${schoolId}`,
          name: `${form.schoolName.trim()} - Cafeteria`,
          email: cafeteriaEmail,
          password: hashedPassword,
          role: 'cafeteria',
          status: 'active',
          schoolId,
          stage: form.stage
        }
      ]
    }));

    setForm({ name: '', password: '', schoolName: '', stage: 'middle', city: '' });
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
          <button type="button" className={accountMode === 'view' ? 'active' : ''} onClick={() => switchAccountMode('view')}>
            <Users size={16} aria-hidden="true" />
            <span>{tr(language, 'viewAccountsTab')}</span>
          </button>
          <button type="button" className={accountMode === 'create' ? 'active' : ''} onClick={() => switchAccountMode('create')}>
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
          <Field label={tr(language, 'passwordDefault')} value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
          <Field label={tr(language, 'schoolName')} value={form.schoolName} onChange={(value) => setForm({ ...form, schoolName: value })} required />
          <p className="hint full">
            {tr(language, 'directorEmailAuto')} <span dir="ltr">{(compactEmailLocalPart(form.schoolName.trim()) || 'school')}@wajibati.dz</span>
          </p>
          <p className="hint full">
            {tr(language, 'cafeteriaEmailAuto')} <span dir="ltr">cafeteria.{(compactEmailLocalPart(form.schoolName.trim()) || 'school')}@wajibati.dz</span>
          </p>
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

      {accountMode === 'view' && movingUser && (
        <MoveAccountPanel
          data={data}
          setData={setData}
          target={movingUser}
          currentUser={currentUser}
          language={language}
          onClose={() => setMovingUser(null)}
        />
      )}

      {accountMode === 'view' && !drillStage && !drillSchoolId && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'accountsByStage')}</p>
              <h2>{tr(language, 'viewAccountsTab')}</h2>
            </div>
            <Users size={24} aria-hidden="true" />
          </div>
          <div className="stats-grid">
            {stages.map((stage) => {
              const schools = stageSchools(stage);
              return (
                <button
                  type="button"
                  className="stat-card stage-picker-card green"
                  key={stage}
                  onClick={() => {
                    setDrillStage(stage);
                    setDrillSchoolId(null);
                  }}
                >
                  {stageIcon(stage)}
                  <span>{stageNames[language][stage]}</span>
                  <strong>{schools.length}</strong>
                  <small className="stage-picker-count-label">{tr(language, 'schools')}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {accountMode === 'view' && drillStage && !drillSchoolId && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'schoolsOfStage')}</p>
              <h2>{stageNames[language][drillStage]}</h2>
            </div>
            <School size={24} aria-hidden="true" />
          </div>
          <button
            type="button"
            className="back-button"
            onClick={() => {
              setDrillStage(null);
              setDrillSchoolId(null);
              setDrillCategory(null);
              setDrillStudentGroup(null);
            }}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="user-groups user-groups-schools">
            {stageSchools(drillStage).length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
            {stageSchools(drillStage).map((school) => (
              <button
type="button"
                  className="user-group user-group-school drill-row"
                  key={school.id}
                  onClick={() => {
                    setDrillSchoolId(school.id);
                    setDrillCategory(null);
                    setDrillStudentGroup(null);
                  }}
                >
                <span className="user-group-title">
                  <span className="user-group-label">
                    <School size={18} aria-hidden="true" />
                    <span className="user-group-label-name">{school.name}</span>
                    {school.city ? <span className="user-group-label-meta">{school.city}</span> : null}
                  </span>
                  <span className="user-group-meta">
                    <strong>{accountsOfSchool(school.id).length}</strong>
                    <span className="user-group-label-stage">{tr(language, 'schoolAccountsCount')}</span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {accountMode === 'view' && drillStage && drillSchoolId && drillSchool && !drillCategory && (
        <>
          <button type="button" className="back-button full" onClick={() => setDrillSchoolId(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>{tr(language, 'schoolAccountsCount')}</p>
                <h2>{drillSchool.name}</h2>
              </div>
              <School size={24} aria-hidden="true" />
            </div>
            <div className="user-groups">
              {schoolCategoryRoles.map((role) => {
                const users = accountsOfSchool(drillSchool.id).filter((user) => user.role === role);
                if (users.length === 0 && role !== 'student') {
                  return null;
                }
                return (
                  <button
                    type="button"
                    className="user-group drill-row"
                    key={role}
                    onClick={() => {
                      setDrillCategory(role);
                      setDrillStudentGroup(null);
                    }}
                  >
                    <span className="user-group-title">
                      <span className="user-group-label">
                        {schoolCategoryIcon(role)}
                        <span className="user-group-label-name">{roleNames[language][role]}</span>
                      </span>
                      <span className="user-group-meta">
                        <strong>{users.length}</strong>
                        <span className="user-group-label-stage">{tr(language, 'schoolAccountsCount')}</span>
                        <ChevronRight size={17} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {accountMode === 'view' && drillStage && drillSchoolId && drillSchool && drillCategory === 'student' && !drillStudentGroup && (
        <>
          <button type="button" className="back-button full" onClick={() => setDrillCategory(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>{roleNames[language].student}</p>
                <h2>{drillSchool.name}</h2>
              </div>
              <Users size={24} aria-hidden="true" />
            </div>
            <div className="user-groups">
              {studentGroups.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
              {studentGroups.map(([key, members]) => (
                <button
                  type="button"
                  className="user-group drill-row"
                  key={key}
                  onClick={() => setDrillStudentGroup(key)}
                >
                  <span className="user-group-title">
                    <span className="user-group-label">
                      <BookOpen size={18} aria-hidden="true" />
                      <span className="user-group-label-name">{studentGroupLabel(key, members)}</span>
                    </span>
                    <span className="user-group-meta">
                      <strong>{members.length}</strong>
                      <span className="user-group-label-stage">{tr(language, 'schoolAccountsCount')}</span>
                      <ChevronRight size={17} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {accountMode === 'view' && drillStage && drillSchoolId && drillSchool && drillCategory && drillCategory !== 'student' && (
        <>
          <button type="button" className="back-button full" onClick={() => setDrillCategory(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <UsersTable
            title={`${drillSchool.name} - ${roleNames[language][drillCategory]}`}
            data={data}
            users={accountsOfSchool(drillSchool.id).filter((user) => user.role === drillCategory)}
            currentUser={currentUser}
            language={language}
            onToggle={toggleStatus}
            onDelete={deleteUser}
            onEdit={(target) => setEditingUser(target)}
            onMove={(target) => setMovingUser(target)}
          />
        </>
      )}

      {accountMode === 'view' && drillStage && drillSchoolId && drillSchool && drillCategory === 'student' && drillStudentGroup && (
        <>
          <button type="button" className="back-button full" onClick={() => setDrillStudentGroup(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <UsersTable
            title={`${drillSchool.name} - ${studentGroupLabel(drillStudentGroup, studentGroups.find(([key]) => key === drillStudentGroup)?.[1] ?? [])}`}
            data={data}
            users={studentGroups.find(([key]) => key === drillStudentGroup)?.[1] ?? []}
            currentUser={currentUser}
            language={language}
            onToggle={toggleStatus}
            onDelete={deleteUser}
            onEdit={(target) => setEditingUser(target)}
            onMove={(target) => setMovingUser(target)}
          />
        </>
      )}
    </section>
  );
}
