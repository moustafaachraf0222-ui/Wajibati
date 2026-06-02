import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Database,
  Edit3,
  LockKeyhole,
  Plus,
  Save,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  AccountEditState,
  AccountStatus,
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  Role,
  SecondaryStream,
  Stage,
  Subject,
  YearStreamClassGroups
} from '../types';
import {
  schoolYearLabel,
  schoolYearNames,
  stageNames,
  statusNames,
  subjectNames,
  tr
} from '../i18n';
import {
  assignmentSummaryLabel,
  defaultClassGroups,
  hasAccountDetails,
  normalizeClassGroup,
  normalizeTeacherSubjectsByYear,
  normalizeYearClassGroups,
  normalizeYearStreamClassGroups,
  sameClassGroup,
  secondaryStreams,
  secondaryStreamLabel,
  secondaryStreamsForYear,
  stages,
  subjectOptionsForTeacherYear,
  teacherSubjectsLabel,
  uniqueNumbers
} from '../education';
import {
  canDeleteUser,
  canEditUser,
  canToggleUser,
  deleteUserRecords,
  generateAccountCode,
  generateSchoolEmail,
  getSchool,
  makeAccountEditState,
  makeId,
  scopedUsers
} from '../data';
import { AccountAssignmentDetails, Field, ResponsiveTable, RoleLabel } from '../ui';
import { CredentialDatabasePanel } from './accounts-credentials';

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

export function UsersView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'admin') {
    return <AdminUsersPanel data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'director') {
    return <DirectorUsersPanel data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  return (
    <section className="panel">
      <p className="empty-state">{tr(language, 'scopedData')}</p>
    </section>
  );
}

function AdminUsersPanel({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
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

function DirectorUsersPanel({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const [accountMode, setAccountMode] = useState<'create' | 'view' | 'database'>('view');
  const [form, setForm] = useState({
    role: 'teacher' as 'teacher' | 'student',
    name: '',
    subject: 'math' as Subject,
    subjectsByYear: {} as Record<string, Subject | ''>,
    schoolYear: 1,
    classGroup: '',
    schoolYears: [] as number[],
    yearClassGroups: {} as Record<string, string[]>,
    yearStreamClassGroups: {} as YearStreamClassGroups,
    classChoice: '1',
    customClassGroup: '',
    streamChoiceByYear: {} as Record<string, SecondaryStream | ''>,
    classChoiceByYear: {} as Record<string, string>,
    customClassByYear: {} as Record<string, string>,
    stream: '' as SecondaryStream | ''
  });
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);

  const createAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!school || !currentUser.stage) {
      return;
    }

    const accountName = form.name.trim();
    if (!accountName) {
      setError(tr(language, 'nameRequired'));
      return;
    }

    const teacherYearClassGroups = normalizeYearClassGroups(form.yearClassGroups);
    const teacherYearStreamClassGroups = normalizeYearStreamClassGroups(form.yearStreamClassGroups);
    const teacherSubjectsByYear = normalizeTeacherSubjectsByYear(school, form.schoolYears, teacherYearStreamClassGroups, form.subjectsByYear, form.subject);
    const studentClassGroup = form.classChoice === 'custom' ? normalizeClassGroup(form.customClassGroup) : form.classChoice;
    const studentStreamsForYear = secondaryStreamsForYear(school, form.schoolYear);

    if (form.role === 'teacher' && form.schoolYears.length === 0) {
      setError(tr(language, 'yearRequired'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => secondaryStreamsForYear(school, year).length === 0)
    ) {
      setError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).length === 0)
    ) {
      setError(tr(language, 'classesRequired'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => {
        const streamsForYear = secondaryStreamsForYear(school, year);
        return Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).some((stream) => !streamsForYear.includes(stream as SecondaryStream));
      })
    ) {
      setError(tr(language, 'streamRequired'));
      return;
    }

    if (form.role === 'teacher' && currentUser.stage !== 'secondary' && form.schoolYears.some((year) => (teacherYearClassGroups[String(year)] ?? []).length === 0)) {
      setError(tr(language, 'classesRequired'));
      return;
    }

    if (form.role === 'teacher' && form.schoolYears.some((year) => !teacherSubjectsByYear[String(year)])) {
      setError(tr(language, 'subjectRequired'));
      return;
    }

    if (form.role === 'student' && !studentClassGroup.trim()) {
      setError(tr(language, 'classRequired'));
      return;
    }

    if (form.role === 'student' && currentUser.stage === 'secondary' && studentStreamsForYear.length === 0) {
      setError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (form.role === 'student' && currentUser.stage === 'secondary' && (!form.stream || !studentStreamsForYear.includes(form.stream))) {
      setError(tr(language, 'streamRequired'));
      return;
    }

    const primaryYear = form.role === 'teacher' ? form.schoolYears[0] : form.schoolYear;
    const primarySubject = form.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      form.role === 'teacher' && currentUser.stage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : form.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : studentClassGroup.trim();
    const accountCode = generateAccountCode();

    setData((previous) => ({
      ...previous,
      users: [
        ...previous.users,
        {
          id: makeId(form.role),
          name: accountName,
          email: generateSchoolEmail(accountName, form.role, school.domain, previous.users),
          password: accountCode,
          role: form.role,
          status: 'active',
          schoolId: currentUser.schoolId,
          stage: currentUser.stage,
          subject: primarySubject,
          subjectsByYear: form.role === 'teacher' ? teacherSubjectsByYear : undefined,
          schoolYear: primaryYear,
          classGroup: primaryClassGroup,
          schoolYears: form.role === 'teacher' ? form.schoolYears : undefined,
          classGroups: undefined,
          yearClassGroups: form.role === 'teacher' && currentUser.stage !== 'secondary' ? teacherYearClassGroups : undefined,
          yearStreamClassGroups: form.role === 'teacher' && currentUser.stage === 'secondary' ? teacherYearStreamClassGroups : undefined,
          stream: form.role === 'student' && form.stream ? form.stream : undefined,
          createdBy: currentUser.id
        }
      ]
    }));

    setForm({
      role: 'teacher',
      name: '',
      subject: 'math',
      subjectsByYear: {},
      schoolYear: 1,
      classGroup: '',
      schoolYears: [],
      yearClassGroups: {},
      yearStreamClassGroups: {},
      classChoice: '1',
      customClassGroup: '',
      streamChoiceByYear: {},
      classChoiceByYear: {},
      customClassByYear: {},
      stream: ''
    });
    setError('');
  };

  const schoolUsers = scopedUsers(data, currentUser);
  const availableYearLabels = currentUser.stage ? schoolYearNames[language][currentUser.stage] : [];
  const studentStreamOptions = secondaryStreamsForYear(school, form.schoolYear);
  const generatedEmailPreview = school && form.name.trim() ? generateSchoolEmail(form.name, form.role, school.domain, data.users) : '';
  useEffect(() => {
    if (form.role !== 'teacher') {
      return;
    }

    setForm((previous) => {
      const nextSubjects = { ...previous.subjectsByYear };
      let changed = false;

      Object.keys(nextSubjects).forEach((year) => {
        if (!previous.schoolYears.includes(Number(year))) {
          delete nextSubjects[year];
          changed = true;
        }
      });

      previous.schoolYears.forEach((year) => {
        const key = String(year);
        const options = subjectOptionsForTeacherYear(school, previous.yearStreamClassGroups, year);
        const selected = nextSubjects[key];

        if (!selected || !options.includes(selected as Subject)) {
          nextSubjects[key] = options[0] ?? '';
          changed = true;
        }
      });

      const firstSubject = previous.schoolYears.map((year) => nextSubjects[String(year)]).find(Boolean) as Subject | undefined;
      if (firstSubject && previous.subject !== firstSubject) {
        changed = true;
      }

      return changed ? { ...previous, subjectsByYear: nextSubjects, subject: firstSubject ?? previous.subject } : previous;
    });
  }, [form.role, form.schoolYears, form.yearStreamClassGroups, school]);

  useEffect(() => {
    if (form.role !== 'student' || currentUser.stage !== 'secondary') {
      return;
    }

    const nextStream = studentStreamOptions.includes(form.stream as SecondaryStream) ? form.stream : studentStreamOptions[0] ?? '';

    if (nextStream !== form.stream) {
      setForm((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [currentUser.stage, form.role, form.schoolYear, form.stream, studentStreamOptions]);

  const toggleTeacherYear = (year: number) => {
    setForm((previous) => {
      const years = previous.schoolYears.includes(year)
        ? previous.schoolYears.filter((selected) => selected !== year)
        : uniqueNumbers([...previous.schoolYears, year]);

      const yearClassGroups = { ...previous.yearClassGroups };
      const yearStreamClassGroups = { ...previous.yearStreamClassGroups };
      if (years.includes(year) && !yearClassGroups[String(year)]) {
        yearClassGroups[String(year)] = ['1'];
      }
      const streamsForYear = secondaryStreamsForYear(school, year);
      const streamChoiceByYear = { ...previous.streamChoiceByYear };
      if (years.includes(year) && currentUser.stage === 'secondary' && streamsForYear[0] && !streamChoiceByYear[String(year)]) {
        streamChoiceByYear[String(year)] = streamsForYear[0];
      }
      if (!years.includes(year)) {
        delete yearClassGroups[String(year)];
        delete yearStreamClassGroups[String(year)];
        delete streamChoiceByYear[String(year)];
      }

      return { ...previous, schoolYears: years, yearClassGroups, yearStreamClassGroups, streamChoiceByYear };
    });
  };

  const addTeacherStreamClassForYear = (year: number) => {
    setForm((previous) => {
      const yearKey = String(year);
      const streamOptionsForYear = secondaryStreamsForYear(school, year);
      const savedStream = previous.streamChoiceByYear[yearKey];
      const stream = savedStream && streamOptionsForYear.includes(savedStream) ? savedStream : streamOptionsForYear[0];
      if (!stream) {
        return previous;
      }

      const classKey = `${yearKey}:${stream}`;
      const choice = previous.classChoiceByYear[classKey] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[classKey] ?? '') : choice;
      if (!nextClass) {
        return previous;
      }

      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const existing = currentYear[stream] ?? [];
      if (existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: {
            ...currentYear,
            [stream]: [...existing, nextClass]
          }
        },
        customClassByYear: {
          ...previous.customClassByYear,
          [classKey]: ''
        }
      };
    });
  };

  const removeTeacherStreamClassForYear = (year: number, stream: SecondaryStream, classGroup: string) => {
    setForm((previous) => {
      const yearKey = String(year);
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const nextClasses = (currentYear[stream] ?? []).filter((group) => !sameClassGroup(group, classGroup));
      const nextYear = { ...currentYear };

      if (nextClasses.length > 0) {
        nextYear[stream] = nextClasses;
      } else {
        delete nextYear[stream];
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: nextYear
        }
      };
    });
  };

  const addTeacherClassForYear = (year: number) => {
    setForm((previous) => {
      const key = String(year);
      const choice = previous.classChoiceByYear[key] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[key] ?? '') : choice;

      if (!nextClass) {
        return previous;
      }

      const existing = previous.yearClassGroups[key] ?? [];
      if (existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: [...existing, nextClass]
        },
        customClassByYear: {
          ...previous.customClassByYear,
          [key]: ''
        }
      };
    });
  };

  const removeTeacherClassForYear = (year: number, classGroup: string) => {
    setForm((previous) => {
      const key = String(year);
      const nextGroups = (previous.yearClassGroups[key] ?? []).filter((group) => !sameClassGroup(group, classGroup));

      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: nextGroups
        }
      };
    });
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

  return (
    <section className="content-grid">
      <div className="account-mode-switch full">
        <div className="segmented">
          <button type="button" className={accountMode === 'view' ? 'active' : ''} onClick={() => setAccountMode('view')}>
            <Users size={16} aria-hidden="true" />
            <span>{tr(language, 'viewAccountsTab')}</span>
          </button>
          <button type="button" className={accountMode === 'database' ? 'active' : ''} onClick={() => setAccountMode('database')}>
            <Database size={16} aria-hidden="true" />
            <span>{tr(language, 'databaseTab')}</span>
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
            <p>{tr(language, 'lockedScope')}</p>
            <h2>{tr(language, 'createSchoolAccounts')}</h2>
          </div>
          <UserPlus size={24} aria-hidden="true" />
        </div>
        <div className="locked-strip">
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {school?.name}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {currentUser.stage && stageNames[language][currentUser.stage]}
          </span>
        </div>
        <form className="form-grid" onSubmit={createAccount}>
          <label>
            <span>{tr(language, 'accountType')}</span>
            <select
              value={form.role}
              onChange={(event) => {
                const role = event.target.value as 'teacher' | 'student';
                const streamsForYear = secondaryStreamsForYear(school, form.schoolYear);
                const defaultStream = streamsForYear.includes(form.stream as SecondaryStream) ? form.stream : streamsForYear[0] ?? '';
                setForm({
                  ...form,
                  role,
                  stream: role === 'student' && currentUser.stage === 'secondary' ? defaultStream : form.stream
                });
              }}
            >
              <option value="teacher">{tr(language, 'teacher')}</option>
              <option value="student">{tr(language, 'student')}</option>
            </select>
          </label>
          <Field label={tr(language, 'fullName')} value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <p className="hint full">{tr(language, 'autoGeneratedEmailHint')}</p>
          {generatedEmailPreview && (
            <p className="hint full">
              <span>{tr(language, 'generatedEmailPreview')}: </span>
              <strong dir="ltr">{generatedEmailPreview}</strong>
            </p>
          )}
          <p className="hint full">{tr(language, 'autoGeneratedCodeHint')}</p>
          {currentUser.stage && form.role === 'student' && (
            <label>
              <span>{tr(language, 'schoolYear')}</span>
              <select
                value={form.schoolYear}
                onChange={(event) => {
                  const schoolYear = Number(event.target.value);
                  const streamsForYear = secondaryStreamsForYear(school, schoolYear);
                  const nextStream = streamsForYear.includes(form.stream as SecondaryStream) ? form.stream : streamsForYear[0] ?? '';
                  setForm({ ...form, schoolYear, stream: currentUser.stage === 'secondary' ? nextStream : form.stream });
                }}
              >
                {schoolYearNames[language][currentUser.stage].map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentUser.stage === 'secondary' && form.role === 'student' && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={form.stream}
                disabled={studentStreamOptions.length === 0}
                onChange={(event) => setForm({ ...form, stream: event.target.value as SecondaryStream | '' })}
              >
                <option value="">{studentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                {studentStreamOptions.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, form.schoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentUser.stage && form.role === 'teacher' && (
            <div className="form-field full">
              <span>{tr(language, 'schoolYears')}</span>
              <div className="checkbox-grid">
                {availableYearLabels.map((label, index) => {
                  const year = index + 1;
                  return (
                    <label className="check-option" key={label}>
                      <input type="checkbox" checked={form.schoolYears.includes(year)} onChange={() => toggleTeacherYear(year)} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {form.role === 'teacher' ? (
            <>
              <div className="year-class-list full">
                {form.schoolYears.map((year) => {
                  const key = String(year);
                  const isSecondaryTeacher = currentUser.stage === 'secondary';
                  const streamOptionsForYear = secondaryStreamsForYear(school, year);
                  const savedStreamChoice = form.streamChoiceByYear[key];
                  const streamChoice =
                    savedStreamChoice && streamOptionsForYear.includes(savedStreamChoice) ? savedStreamChoice : streamOptionsForYear[0] || '';
                  const streamClassKey = `${key}:${streamChoice}`;
                  const classChoiceKey = isSecondaryTeacher ? streamClassKey : key;
                  const choice = form.classChoiceByYear[classChoiceKey] ?? '1';
                  const selectedClasses = form.yearClassGroups[key] ?? [];
                  const selectedStreamClasses = form.yearStreamClassGroups[key] ?? {};
                  const subjectOptionsForYear = subjectOptionsForTeacherYear(school, form.yearStreamClassGroups, year);
                  const subjectChoice = form.subjectsByYear[key] || subjectOptionsForYear[0] || '';
                  return (
                    <div className="year-class-row" key={year}>
                      <strong>{schoolYearLabel(language, currentUser.stage, year)}</strong>
                      {isSecondaryTeacher ? (
                        <>
                          <div className="class-picker-row">
                            <select
                              value={streamChoice}
                              disabled={streamOptionsForYear.length === 0}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  streamChoiceByYear: { ...form.streamChoiceByYear, [key]: event.target.value as SecondaryStream }
                                })
                              }
                            >
                              {streamOptionsForYear.map((stream) => (
                                <option value={stream} key={stream}>
                                  {secondaryStreamLabel(language, stream, year)}
                                </option>
                              ))}
                            </select>
                            <select
                              value={choice}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  classChoiceByYear: { ...form.classChoiceByYear, [classChoiceKey]: event.target.value }
                                })
                              }
                            >
                              {defaultClassGroups.map((classGroup) => (
                                <option value={classGroup} key={classGroup}>
                                  {classGroup}
                                </option>
                              ))}
                              <option value="custom">{tr(language, 'customClass')}</option>
                            </select>
                            {choice === 'custom' && (
                              <input
                                value={form.customClassByYear[classChoiceKey] ?? ''}
                                placeholder={tr(language, 'customClass')}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    customClassByYear: { ...form.customClassByYear, [classChoiceKey]: event.target.value }
                                  })
                                }
                              />
                            )}
                            <button className="button ghost" type="button" onClick={() => addTeacherStreamClassForYear(year)}>
                              <Plus size={16} aria-hidden="true" />
                              <span>{tr(language, 'addClass')}</span>
                            </button>
                          </div>
                          <div className="chip-row">
                            {Object.entries(selectedStreamClasses).flatMap(([stream, classes]) =>
                              (classes ?? []).map((classGroup) => (
                                <button
                                  className="chip-button"
                                  type="button"
                                  key={`${stream}-${classGroup}`}
                                  onClick={() => removeTeacherStreamClassForYear(year, stream as SecondaryStream, classGroup)}
                                >
                                  <span>{secondaryStreamLabel(language, stream as SecondaryStream, year)}: {classGroup}</span>
                                  <X size={13} aria-hidden="true" />
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="class-picker-row">
                            <select
                              value={choice}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  classChoiceByYear: { ...form.classChoiceByYear, [key]: event.target.value }
                                })
                              }
                            >
                              {defaultClassGroups.map((classGroup) => (
                                <option value={classGroup} key={classGroup}>
                                  {classGroup}
                                </option>
                              ))}
                              <option value="custom">{tr(language, 'customClass')}</option>
                            </select>
                            {choice === 'custom' && (
                              <input
                                value={form.customClassByYear[key] ?? ''}
                                placeholder={tr(language, 'customClass')}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    customClassByYear: { ...form.customClassByYear, [key]: event.target.value }
                                  })
                                }
                              />
                            )}
                            <button className="button ghost" type="button" onClick={() => addTeacherClassForYear(year)}>
                              <Plus size={16} aria-hidden="true" />
                              <span>{tr(language, 'addClass')}</span>
                            </button>
                          </div>
                          <div className="chip-row">
                            {selectedClasses.map((classGroup) => (
                              <button className="chip-button" type="button" key={classGroup} onClick={() => removeTeacherClassForYear(year, classGroup)}>
                                <span>{classGroup}</span>
                                <X size={13} aria-hidden="true" />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <label className="year-subject-select">
                        <span>{tr(language, 'subject')}</span>
                        <select
                          value={subjectChoice}
                          disabled={subjectOptionsForYear.length === 0}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              subjectsByYear: { ...form.subjectsByYear, [key]: event.target.value as Subject }
                            })
                          }
                        >
                          {subjectOptionsForYear.length === 0 && (
                            <option value="">{tr(language, isSecondaryTeacher ? 'chooseStreamFirst' : 'subjectRequired')}</option>
                          )}
                          {subjectOptionsForYear.map((subject) => (
                            <option value={subject} key={subject}>
                              {subjectNames[language][subject]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="hint full">{tr(language, currentUser.stage === 'secondary' ? 'streamClassesHint' : 'classesHint')}</p>
            </>
          ) : (
            <>
              <label>
                <span>{tr(language, 'classGroup')}</span>
                <select value={form.classChoice} onChange={(event) => setForm({ ...form, classChoice: event.target.value })}>
                  {defaultClassGroups.map((classGroup) => (
                    <option value={classGroup} key={classGroup}>
                      {classGroup}
                    </option>
                  ))}
                  <option value="custom">{tr(language, 'customClass')}</option>
                </select>
              </label>
              {form.classChoice === 'custom' && (
                <Field label={tr(language, 'customClass')} value={form.customClassGroup} onChange={(value) => setForm({ ...form, customClassGroup: value })} required />
              )}
            </>
          )}
          {form.role === 'teacher' && form.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
          <p className="hint full">{tr(language, 'createOnlyTeacherStudent')}</p>
          {error && <p className="form-error full">{error}</p>}
          <button className="button primary form-submit" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'create')}</span>
          </button>
        </form>
      </div>
      )}

      {accountMode === 'database' && <CredentialDatabasePanel users={schoolUsers} school={school} language={language} />}

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
          title={tr(language, 'schoolUsers')}
          data={data}
          users={schoolUsers}
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

function AccountEditPanel({
  data,
  setData,
  currentUser,
  target,
  language,
  onClose,
  onSaved
}: CommonViewProps & {
  setData: DataSetter;
  target: PlatformUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const targetSchool = getSchool(data, target);
  const [edit, setEdit] = useState<AccountEditState>(() => makeAccountEditState(target, data));
  const [error, setError] = useState('');
  const editStage = target.role === 'director' ? edit.stage : target.stage ?? targetSchool?.stage ?? 'middle';
  const studentStreamOptions = secondaryStreamsForYear(targetSchool, edit.schoolYear);
  const availableYearLabels = schoolYearNames[language][editStage];

  useEffect(() => {
    setEdit(makeAccountEditState(target, data));
    setError('');
  }, [target.id, data]);

  useEffect(() => {
    if (target.role !== 'teacher') {
      return;
    }

    setEdit((previous) => {
      const nextSubjects = { ...previous.subjectsByYear };
      let changed = false;

      Object.keys(nextSubjects).forEach((year) => {
        if (!previous.schoolYears.includes(Number(year))) {
          delete nextSubjects[year];
          changed = true;
        }
      });

      previous.schoolYears.forEach((year) => {
        const key = String(year);
        const options = subjectOptionsForTeacherYear(targetSchool, previous.yearStreamClassGroups, year);
        const selected = nextSubjects[key];

        if (!selected || !options.includes(selected as Subject)) {
          nextSubjects[key] = options[0] ?? '';
          changed = true;
        }
      });

      const firstSubject = previous.schoolYears.map((year) => nextSubjects[String(year)]).find(Boolean) as Subject | undefined;
      if (firstSubject && previous.subject !== firstSubject) {
        changed = true;
      }

      return changed ? { ...previous, subjectsByYear: nextSubjects, subject: firstSubject ?? previous.subject } : previous;
    });
  }, [target.role, targetSchool, edit.schoolYears, edit.yearStreamClassGroups]);

  useEffect(() => {
    if (target.role !== 'student' || editStage !== 'secondary') {
      return;
    }

    const nextStream = studentStreamOptions.includes(edit.stream as SecondaryStream) ? edit.stream : studentStreamOptions[0] ?? '';

    if (nextStream !== edit.stream) {
      setEdit((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [edit.schoolYear, edit.stream, editStage, studentStreamOptions, target.role]);

  const toggleTeacherYear = (year: number) => {
    setEdit((previous) => {
      const years = previous.schoolYears.includes(year)
        ? previous.schoolYears.filter((selected) => selected !== year)
        : uniqueNumbers([...previous.schoolYears, year]);
      const yearClassGroups = { ...previous.yearClassGroups };
      const yearStreamClassGroups = { ...previous.yearStreamClassGroups };

      if (years.includes(year) && !yearClassGroups[String(year)]) {
        yearClassGroups[String(year)] = ['1'];
      }
      const streamsForYear = secondaryStreamsForYear(targetSchool, year);
      const streamChoiceByYear = { ...previous.streamChoiceByYear };
      if (years.includes(year) && editStage === 'secondary' && streamsForYear[0] && !streamChoiceByYear[String(year)]) {
        streamChoiceByYear[String(year)] = streamsForYear[0];
      }
      if (!years.includes(year)) {
        delete yearClassGroups[String(year)];
        delete yearStreamClassGroups[String(year)];
        delete streamChoiceByYear[String(year)];
      }

      return { ...previous, schoolYears: years, yearClassGroups, yearStreamClassGroups, streamChoiceByYear };
    });
  };

  const addTeacherClassForYear = (year: number) => {
    setEdit((previous) => {
      const key = String(year);
      const choice = previous.classChoiceByYear[key] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[key] ?? '') : choice;
      if (!nextClass || (previous.yearClassGroups[key] ?? []).some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearClassGroups: { ...previous.yearClassGroups, [key]: [...(previous.yearClassGroups[key] ?? []), nextClass] },
        customClassByYear: { ...previous.customClassByYear, [key]: '' }
      };
    });
  };

  const removeTeacherClassForYear = (year: number, classGroup: string) => {
    setEdit((previous) => {
      const key = String(year);
      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: (previous.yearClassGroups[key] ?? []).filter((group) => !sameClassGroup(group, classGroup))
        }
      };
    });
  };

  const addTeacherStreamClassForYear = (year: number) => {
    setEdit((previous) => {
      const yearKey = String(year);
      const streamOptionsForYear = secondaryStreamsForYear(targetSchool, year);
      const savedStream = previous.streamChoiceByYear[yearKey];
      const stream = savedStream && streamOptionsForYear.includes(savedStream) ? savedStream : streamOptionsForYear[0];
      if (!stream) {
        return previous;
      }

      const classKey = `${yearKey}:${stream}`;
      const choice = previous.classChoiceByYear[classKey] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[classKey] ?? '') : choice;
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const existing = currentYear[stream] ?? [];
      if (!nextClass || existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: { ...currentYear, [stream]: [...existing, nextClass] }
        },
        customClassByYear: { ...previous.customClassByYear, [classKey]: '' }
      };
    });
  };

  const removeTeacherStreamClassForYear = (year: number, stream: SecondaryStream, classGroup: string) => {
    setEdit((previous) => {
      const yearKey = String(year);
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const nextClasses = (currentYear[stream] ?? []).filter((group) => !sameClassGroup(group, classGroup));
      const nextYear = { ...currentYear };

      if (nextClasses.length > 0) {
        nextYear[stream] = nextClasses;
      } else {
        delete nextYear[stream];
      }

      return { ...previous, yearStreamClassGroups: { ...previous.yearStreamClassGroups, [yearKey]: nextYear } };
    });
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditUser(currentUser, target)) {
      return;
    }

    const normalizedEmail = edit.email.trim().toLowerCase();
    if (data.users.some((user) => user.id !== target.id && user.email.toLowerCase() === normalizedEmail)) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    const teacherYearClassGroups = normalizeYearClassGroups(edit.yearClassGroups);
    const teacherYearStreamClassGroups = normalizeYearStreamClassGroups(edit.yearStreamClassGroups);
    const teacherSubjectsByYear = normalizeTeacherSubjectsByYear(targetSchool, edit.schoolYears, teacherYearStreamClassGroups, edit.subjectsByYear, edit.subject);
    const studentClassGroup = edit.classChoice === 'custom' ? normalizeClassGroup(edit.customClassGroup) : edit.classChoice;

    if (target.role === 'teacher') {
      if (edit.schoolYears.length === 0) {
        setError(tr(language, 'yearRequired'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => secondaryStreamsForYear(targetSchool, year).length === 0)
      ) {
        setError(tr(language, 'noStreamsEnabled'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).length === 0)
      ) {
        setError(tr(language, 'classesRequired'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => {
          const streamsForYear = secondaryStreamsForYear(targetSchool, year);
          return Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).some((stream) => !streamsForYear.includes(stream as SecondaryStream));
        })
      ) {
        setError(tr(language, 'streamRequired'));
        return;
      }
      if (editStage !== 'secondary' && edit.schoolYears.some((year) => (teacherYearClassGroups[String(year)] ?? []).length === 0)) {
        setError(tr(language, 'classesRequired'));
        return;
      }
      if (edit.schoolYears.some((year) => !teacherSubjectsByYear[String(year)])) {
        setError(tr(language, 'subjectRequired'));
        return;
      }
    }

    if (target.role === 'student') {
      if (!studentClassGroup.trim()) {
        setError(tr(language, 'classRequired'));
        return;
      }
      if (editStage === 'secondary' && studentStreamOptions.length === 0) {
        setError(tr(language, 'noStreamsEnabled'));
        return;
      }
      if (editStage === 'secondary' && (!edit.stream || !studentStreamOptions.includes(edit.stream))) {
        setError(tr(language, 'streamRequired'));
        return;
      }
    }

    const primaryYear = target.role === 'teacher' ? edit.schoolYears[0] : edit.schoolYear;
    const primarySubject = target.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      target.role === 'teacher' && editStage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : target.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : studentClassGroup.trim();

    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((school) =>
        target.role === 'director' && school.id === target.schoolId
          ? {
              ...school,
              name: edit.schoolName.trim(),
              stage: edit.stage,
              domain: edit.domain.replace(/^@/, '').trim(),
              streams: edit.stage === 'secondary' ? (school.streams?.length ? school.streams : [...secondaryStreams]) : undefined
            }
          : school
      ),
      users: previous.users.map((user) => {
        if (target.role === 'director' && user.schoolId === target.schoolId && user.id !== target.id) {
          return { ...user, stage: edit.stage, stream: edit.stage === 'secondary' ? user.stream : undefined };
        }

        if (user.id !== target.id) {
          return user;
        }

        const base = {
          ...user,
          name: edit.name.trim(),
          email: edit.email.trim(),
          password: edit.password,
          status: edit.status
        };

        if (target.role === 'director') {
          return { ...base, stage: edit.stage };
        }

        if (target.role === 'teacher') {
          return {
            ...base,
            subject: primarySubject,
            subjectsByYear: teacherSubjectsByYear,
            schoolYear: primaryYear,
            classGroup: primaryClassGroup,
            schoolYears: edit.schoolYears,
            yearClassGroups: editStage === 'secondary' ? undefined : teacherYearClassGroups,
            yearStreamClassGroups: editStage === 'secondary' ? teacherYearStreamClassGroups : undefined,
            stream: undefined
          };
        }

        if (target.role === 'student') {
          return {
            ...base,
            schoolYear: edit.schoolYear,
            classGroup: primaryClassGroup,
            stream: editStage === 'secondary' ? edit.stream || undefined : undefined
          };
        }

        return base;
      })
    }));

    setError('');
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>
            <RoleLabel role={target.role} language={language} />
          </p>
          <h2>{tr(language, 'editUser')}</h2>
        </div>
        <Edit3 size={24} aria-hidden="true" />
      </div>
      <form className="form-grid" onSubmit={saveEdit}>
        <Field label={tr(language, 'fullName')} value={edit.name} onChange={(value) => setEdit({ ...edit, name: value })} required />
        <Field label={tr(language, 'email')} value={edit.email} onChange={(value) => setEdit({ ...edit, email: value })} type="email" required />
        <Field label={tr(language, 'passwordDefault')} value={edit.password} onChange={(value) => setEdit({ ...edit, password: value })} required />
        <label>
          <span>{tr(language, 'status')}</span>
          <select value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as AccountStatus })}>
            <option value="active">{statusNames[language].active}</option>
            <option value="disabled">{statusNames[language].disabled}</option>
          </select>
        </label>

        {target.role === 'director' && currentUser.role === 'admin' && targetSchool && (
          <>
            <Field label={tr(language, 'schoolName')} value={edit.schoolName} onChange={(value) => setEdit({ ...edit, schoolName: value })} required />
            <label>
              <span>{tr(language, 'stage')}</span>
              <select value={edit.stage} onChange={(event) => setEdit({ ...edit, stage: event.target.value as Stage })}>
                {stages.map((stage) => (
                  <option value={stage} key={stage}>
                    {stageNames[language][stage]}
                  </option>
                ))}
              </select>
            </label>
            <Field label={tr(language, 'domain')} value={edit.domain} onChange={(value) => setEdit({ ...edit, domain: value })} required />
          </>
        )}

        {target.role === 'student' && (
          <>
            <label>
              <span>{tr(language, 'schoolYear')}</span>
              <select
                value={edit.schoolYear}
                onChange={(event) => {
                  const schoolYear = Number(event.target.value);
                  const streamsForYear = secondaryStreamsForYear(targetSchool, schoolYear);
                  const nextStream = streamsForYear.includes(edit.stream as SecondaryStream) ? edit.stream : streamsForYear[0] ?? '';
                  setEdit({ ...edit, schoolYear, stream: editStage === 'secondary' ? nextStream : edit.stream });
                }}
              >
                {availableYearLabels.map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {editStage === 'secondary' && (
              <label>
                <span>{tr(language, 'stream')}</span>
                <select
                  value={edit.stream}
                  disabled={studentStreamOptions.length === 0}
                  onChange={(event) => setEdit({ ...edit, stream: event.target.value as SecondaryStream | '' })}
                >
                  <option value="">{studentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                  {studentStreamOptions.map((stream) => (
                    <option value={stream} key={stream}>
                      {secondaryStreamLabel(language, stream, edit.schoolYear)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>{tr(language, 'classGroup')}</span>
              <select value={edit.classChoice} onChange={(event) => setEdit({ ...edit, classChoice: event.target.value })}>
                {defaultClassGroups.map((classGroup) => (
                  <option value={classGroup} key={classGroup}>
                    {classGroup}
                  </option>
                ))}
                <option value="custom">{tr(language, 'customClass')}</option>
              </select>
            </label>
            {edit.classChoice === 'custom' && (
              <Field label={tr(language, 'customClass')} value={edit.customClassGroup} onChange={(value) => setEdit({ ...edit, customClassGroup: value })} required />
            )}
          </>
        )}

        {target.role === 'teacher' && (
          <>
            <div className="form-field full">
              <span>{tr(language, 'schoolYears')}</span>
              <div className="checkbox-grid">
                {availableYearLabels.map((label, index) => {
                  const year = index + 1;
                  return (
                    <label className="check-option" key={label}>
                      <input type="checkbox" checked={edit.schoolYears.includes(year)} onChange={() => toggleTeacherYear(year)} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="year-class-list full">
              {edit.schoolYears.map((year) => {
                const key = String(year);
                const isSecondaryTeacher = editStage === 'secondary';
                const streamOptionsForYear = secondaryStreamsForYear(targetSchool, year);
                const savedStreamChoice = edit.streamChoiceByYear[key];
                const streamChoice =
                  savedStreamChoice && streamOptionsForYear.includes(savedStreamChoice) ? savedStreamChoice : streamOptionsForYear[0] || '';
                const streamClassKey = `${key}:${streamChoice}`;
                const classChoiceKey = isSecondaryTeacher ? streamClassKey : key;
                const choice = edit.classChoiceByYear[classChoiceKey] ?? '1';
                const selectedClasses = edit.yearClassGroups[key] ?? [];
                const selectedStreamClasses = edit.yearStreamClassGroups[key] ?? {};
                const subjectOptionsForYear = subjectOptionsForTeacherYear(targetSchool, edit.yearStreamClassGroups, year);
                const subjectChoice = edit.subjectsByYear[key] || subjectOptionsForYear[0] || '';

                return (
                  <div className="year-class-row" key={year}>
                    <strong>{schoolYearLabel(language, editStage, year)}</strong>
                    {isSecondaryTeacher ? (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={streamChoice}
                            disabled={streamOptionsForYear.length === 0}
                            onChange={(event) =>
                              setEdit({ ...edit, streamChoiceByYear: { ...edit.streamChoiceByYear, [key]: event.target.value as SecondaryStream } })
                            }
                          >
                            {streamOptionsForYear.map((stream) => (
                              <option value={stream} key={stream}>
                                {secondaryStreamLabel(language, stream, year)}
                              </option>
                            ))}
                          </select>
                          <select
                            value={choice}
                            onChange={(event) => setEdit({ ...edit, classChoiceByYear: { ...edit.classChoiceByYear, [classChoiceKey]: event.target.value } })}
                          >
                            {defaultClassGroups.map((classGroup) => (
                              <option value={classGroup} key={classGroup}>
                                {classGroup}
                              </option>
                            ))}
                            <option value="custom">{tr(language, 'customClass')}</option>
                          </select>
                          {choice === 'custom' && (
                            <input
                              value={edit.customClassByYear[classChoiceKey] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) =>
                                setEdit({ ...edit, customClassByYear: { ...edit.customClassByYear, [classChoiceKey]: event.target.value } })
                              }
                            />
                          )}
                          <button className="button ghost" type="button" onClick={() => addTeacherStreamClassForYear(year)}>
                            <Plus size={16} aria-hidden="true" />
                            <span>{tr(language, 'addClass')}</span>
                          </button>
                        </div>
                        <div className="chip-row">
                          {Object.entries(selectedStreamClasses).flatMap(([stream, classes]) =>
                            (classes ?? []).map((classGroup) => (
                              <button
                                className="chip-button"
                                type="button"
                                key={`${stream}-${classGroup}`}
                                onClick={() => removeTeacherStreamClassForYear(year, stream as SecondaryStream, classGroup)}
                              >
                                <span>{secondaryStreamLabel(language, stream as SecondaryStream, year)}: {classGroup}</span>
                                <X size={13} aria-hidden="true" />
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={choice}
                            onChange={(event) => setEdit({ ...edit, classChoiceByYear: { ...edit.classChoiceByYear, [key]: event.target.value } })}
                          >
                            {defaultClassGroups.map((classGroup) => (
                              <option value={classGroup} key={classGroup}>
                                {classGroup}
                              </option>
                            ))}
                            <option value="custom">{tr(language, 'customClass')}</option>
                          </select>
                          {choice === 'custom' && (
                            <input
                              value={edit.customClassByYear[key] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) => setEdit({ ...edit, customClassByYear: { ...edit.customClassByYear, [key]: event.target.value } })}
                            />
                          )}
                          <button className="button ghost" type="button" onClick={() => addTeacherClassForYear(year)}>
                            <Plus size={16} aria-hidden="true" />
                            <span>{tr(language, 'addClass')}</span>
                          </button>
                        </div>
                        <div className="chip-row">
                          {selectedClasses.map((classGroup) => (
                            <button className="chip-button" type="button" key={classGroup} onClick={() => removeTeacherClassForYear(year, classGroup)}>
                              <span>{classGroup}</span>
                              <X size={13} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <label className="year-subject-select">
                      <span>{tr(language, 'subject')}</span>
                      <select
                        value={subjectChoice}
                        disabled={subjectOptionsForYear.length === 0}
                        onChange={(event) =>
                          setEdit({
                            ...edit,
                            subjectsByYear: { ...edit.subjectsByYear, [key]: event.target.value as Subject }
                          })
                        }
                      >
                        {subjectOptionsForYear.length === 0 && (
                          <option value="">{tr(language, isSecondaryTeacher ? 'chooseStreamFirst' : 'subjectRequired')}</option>
                        )}
                        {subjectOptionsForYear.map((subject) => (
                          <option value={subject} key={subject}>
                            {subjectNames[language][subject]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
            {edit.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
          </>
        )}

        {error && <p className="form-error full">{error}</p>}
        <div className="button-row full">
          <button className="button primary" type="submit">
            <Save size={17} aria-hidden="true" />
            <span>{tr(language, 'save')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onClose}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersTable({
  title,
  data,
  users,
  currentUser,
  language,
  onToggle,
  onDelete,
  onEdit,
  groupByRole = false
}: {
  title: string;
  data: PlatformData;
  users: PlatformUser[];
  currentUser: PlatformUser;
  language: Language;
  onToggle: (user: PlatformUser) => void;
  onDelete: (user: PlatformUser) => void;
  onEdit?: (user: PlatformUser) => void;
  groupByRole?: boolean;
}) {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [pendingDeleteUser, setPendingDeleteUser] = useState<PlatformUser | null>(null);
  const columns = [
    tr(language, 'fullName'),
    tr(language, 'email'),
    tr(language, 'role'),
    tr(language, 'school'),
    tr(language, 'subject'),
    tr(language, 'status'),
    tr(language, 'assignments'),
    tr(language, 'actions')
  ];
  const rowsForUsers = (tableUsers: PlatformUser[]) =>
    tableUsers.flatMap((user) => {
      const school = getSchool(data, user);
      const detailsOpen = Boolean(expandedUsers[user.id]);
      const detailsAvailable = hasAccountDetails(user);
      const row = (
        <tr key={user.id}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>
            <RoleLabel role={user.role} language={language} />
          </td>
          <td>{school?.name ?? '-'}</td>
          <td>{user.role === 'teacher' ? teacherSubjectsLabel(language, user) : user.subject ? subjectNames[language][user.subject] : '-'}</td>
          <td>
            <span className={`status ${user.status}`}>{statusNames[language][user.status]}</span>
          </td>
          <td>
            {detailsAvailable ? (
              <button
                className="assignment-summary-button"
                type="button"
                title={detailsOpen ? tr(language, 'hideDetails') : tr(language, 'showDetails')}
                onClick={() => setExpandedUsers((previous) => ({ ...previous, [user.id]: !previous[user.id] }))}
              >
                <BookOpen size={15} aria-hidden="true" />
                <span>{assignmentSummaryLabel(language, user)}</span>
              </button>
            ) : (
              <span className="muted-cell">{assignmentSummaryLabel(language, user)}</span>
            )}
          </td>
          <td>
            <div className="table-actions">
              {onEdit && canEditUser(currentUser, user) && (
                <button className="icon-button" type="button" title={tr(language, 'edit')} onClick={() => onEdit(user)}>
                  <Edit3 size={16} aria-hidden="true" />
                </button>
              )}
              <button
                className="icon-button"
                type="button"
                title={user.status === 'active' ? tr(language, 'disable') : tr(language, 'activate')}
                disabled={!canToggleUser(currentUser, user)}
                onClick={() => onToggle(user)}
              >
                {user.status === 'active' ? <CircleOff size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              </button>
              <button
                className="icon-button danger"
                type="button"
                title={tr(language, 'delete')}
                disabled={!canDeleteUser(currentUser, user)}
                onClick={() => setPendingDeleteUser(user)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      );

      if (!detailsOpen || !detailsAvailable) {
        return [row];
      }

      return [
        row,
        <tr className="account-details-row" key={`${user.id}-details`}>
          <td colSpan={columns.length}>
            <AccountAssignmentDetails user={user} language={language} />
          </td>
        </tr>
      ];
    });
  const renderTable = (tableUsers: PlatformUser[]) => (
    <ResponsiveTable columns={columns} emptyText={tr(language, 'noRecords')}>
      {rowsForUsers(tableUsers)}
    </ResponsiveTable>
  );
  const groupedUsers = (['admin', 'director', 'teacher', 'student'] as Role[])
    .map((role) => ({ role, users: users.filter((user) => user.role === role) }))
    .filter((group) => group.users.length > 0);

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'scopedData')}</p>
          <h2>{title}</h2>
        </div>
        <Users size={24} aria-hidden="true" />
      </div>
      {groupByRole ? (
        <div className="user-groups">
          {groupedUsers.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {groupedUsers.map((group) =>
            group.users.length > 1 ? (
              <details className="user-group" key={group.role}>
                <summary>
                  <span className="user-group-label">
                    <RoleLabel role={group.role} language={language} />
                  </span>
                  <span className="user-group-meta">
                    <strong>{group.users.length}</strong>
                    <ChevronDown size={17} aria-hidden="true" />
                  </span>
                </summary>
                {renderTable(group.users)}
              </details>
            ) : (
              <div className="user-group single" key={group.role}>
                <div className="user-group-title">
                  <span className="user-group-label">
                    <RoleLabel role={group.role} language={language} />
                  </span>
                  <span className="user-group-meta">
                    <strong>{group.users.length}</strong>
                  </span>
                </div>
                {renderTable(group.users)}
              </div>
            )
          )}
        </div>
      ) : (
        renderTable(users)
      )}
      {pendingDeleteUser && (
        <AccountDeleteDialog
          user={pendingDeleteUser}
          language={language}
          onCancel={() => setPendingDeleteUser(null)}
          onConfirm={() => {
            onDelete(pendingDeleteUser);
            setPendingDeleteUser(null);
          }}
        />
      )}
    </div>
  );
}

function AccountDeleteDialog({
  user,
  language,
  onConfirm,
  onCancel
}: {
  user: PlatformUser;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <Trash2 size={30} aria-hidden="true" />
        <div>
          <h2 id="delete-account-title">{tr(language, 'deleteAccountTitle')}</h2>
          <p className="modal-copy">{tr(language, 'deleteAccountQuestion')}</p>
        </div>
        <div className="delete-target-card">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <small>
            <RoleLabel role={user.role} language={language} />
          </small>
        </div>
        <p className="modal-warning">{tr(language, 'deleteAccountWarning')}</p>
        <div className="button-row center">
          <button className="button danger" type="button" onClick={onConfirm}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, 'delete')}</span>
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
