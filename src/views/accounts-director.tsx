import { ArrowLeft, BookOpen, ChevronRight, ClipboardCheck, Database, FlaskConical, GraduationCap, Plus, Users, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser, Role } from '../types';
import { roleNames, schoolYearLabel, tr } from '../i18n';
import { secondaryStreamLabel } from '../education';
import { canDeleteUser, canToggleUser, deleteUserRecords, getSchool, scopedUsers } from '../data';
import { RoleLabel } from '../ui';
import { CredentialDatabasePanel } from './accounts-credentials';
import { AccountEditPanel } from './accounts-edit';
import { DirectorCreateAccountPanel } from './accounts-director-create';
import { UsersTable } from './accounts-table';
import { useBackShortcut } from '../back-shortcut';

const directorRoleIcons: Partial<Record<Role, LucideIcon>> = {
  supervisor: ClipboardCheck,
  lab: FlaskConical,
  teacher: BookOpen,
  student: GraduationCap,
  canteen: Utensils
};

export function DirectorUsersPanel({
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
  const school = getSchool(data, currentUser);
  const [accountMode, setAccountMode] = useState<'create' | 'view' | 'database'>('view');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [drillRole, setDrillRole] = useState<Role | null>(null);
  const [drillClassKey, setDrillClassKey] = useState<string | null>(null);

  useBackShortcut(() => {
    if (drillClassKey) {
      setDrillClassKey(null);
      return true;
    }
    if (drillRole) {
      setDrillRole(null);
      return true;
    }
    return false;
  });

  const schoolUsers = scopedUsers(data, currentUser);
  const roleUsers = (role: Role) => schoolUsers.filter((user) => user.role === role);

  const directorRoles = (['lab', 'teacher', 'student', 'canteen'] as Role[]).concat(schoolUsers.some((user) => user.role === 'supervisor') ? (['supervisor'] as Role[]) : []);

  const studentClassKey = (user: PlatformUser) => `${user.schoolYear ?? ''}|${user.stream ?? ''}|${(user.classGroup ?? '').trim().toLowerCase()}`;
  const studentClassLabel = (user: PlatformUser) => {
    const year = schoolYearLabel(language, user.stage, user.schoolYear);
    const stream = user.stage === 'secondary' && user.stream ? ` - ${secondaryStreamLabel(language, user.stream, user.schoolYear)}` : '';
    const classGroup = user.classGroup?.trim() || '-';
    return `${year}${stream} - ${tr(language, 'classGroup')} ${classGroup}`;
  };
  const compareStudentsByClass = (left: PlatformUser, right: PlatformUser) =>
    (left.schoolYear ?? 999) - (right.schoolYear ?? 999) ||
    (left.stream ?? '').localeCompare(right.stream ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    (left.classGroup ?? '').localeCompare(right.classGroup ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });

  const studentClassGroups = (() => {
    const groups = new Map<string, { key: string; label: string; users: PlatformUser[] }>();
    for (const student of [...roleUsers('student')].sort(compareStudentsByClass)) {
      const key = studentClassKey(student);
      const existing = groups.get(key);
      if (existing) {
        existing.users.push(student);
      } else {
        groups.set(key, { key, label: studentClassLabel(student), users: [student] });
      }
    }
    return [...groups.values()];
  })();

  const drillClassUsers = drillClassKey ? studentClassGroups.find((group) => group.key === drillClassKey)?.users ?? [] : [];

  const switchAccountMode = (mode: 'create' | 'view' | 'database') => {
    setAccountMode(mode);
    setDrillRole(null);
    setDrillClassKey(null);
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
          <button type="button" className={accountMode === 'view' ? 'active' : ''} onClick={() => switchAccountMode('view')}>
            <Users size={16} aria-hidden="true" />
            <span>{tr(language, 'viewAccountsTab')}</span>
          </button>
          <button type="button" className={accountMode === 'database' ? 'active' : ''} onClick={() => switchAccountMode('database')}>
            <Database size={16} aria-hidden="true" />
            <span>{tr(language, 'databaseTab')}</span>
          </button>
          <button type="button" className={accountMode === 'create' ? 'active' : ''} onClick={() => switchAccountMode('create')}>
            <Plus size={16} aria-hidden="true" />
            <span>{tr(language, 'createAccountTab')}</span>
          </button>
        </div>
      </div>

      {accountMode === 'create' && (
        <DirectorCreateAccountPanel data={data} setData={setData} currentUser={currentUser} language={language} school={school} />
      )}

      {accountMode === 'database' && (
        <CredentialDatabasePanel
          users={schoolUsers}
          studentActivations={data.studentActivations.filter((activation) => activation.schoolId === currentUser.schoolId)}
          school={school}
          language={language}
        />
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

      {accountMode === 'view' && !drillRole && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{school?.name ?? tr(language, 'scopedData')}</p>
              <h2>{tr(language, 'schoolUsers')}</h2>
            </div>
            <Users size={24} aria-hidden="true" />
          </div>
          <div className="stats-grid">
            {directorRoles.map((role) => {
              const Icon = directorRoleIcons[role] ?? Users;
              return (
                <button
                  type="button"
                  className="stat-card stage-picker-card green"
                  key={role}
                  onClick={() => {
                    setDrillRole(role);
                    setDrillClassKey(null);
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{roleNames[language][role]}</span>
                  <strong>{roleUsers(role).length}</strong>
                  <small className="stage-picker-count-label">{tr(language, 'schoolUsers')}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {accountMode === 'view' && drillRole === 'student' && !drillClassKey && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{school?.name ?? tr(language, 'scopedData')}</p>
              <h2>{tr(language, 'classGroups')}</h2>
            </div>
            <GraduationCap size={24} aria-hidden="true" />
          </div>
          <button type="button" className="back-button" onClick={() => setDrillRole(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="user-groups">
            {studentClassGroups.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
            {studentClassGroups.map((group) => (
              <button type="button" className="user-group drill-row" key={group.key} onClick={() => setDrillClassKey(group.key)}>
                <span className="user-group-title">
                  <span className="user-group-label">
                    <GraduationCap size={16} aria-hidden="true" />
                    <span className="user-group-label-name">{group.label}</span>
                  </span>
                  <span className="user-group-meta">
                    <strong>{group.users.length}</strong>
                    <ChevronRight size={17} aria-hidden="true" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {accountMode === 'view' && drillRole && drillRole !== 'student' && (
        <>
          <button type="button" className="back-button full" onClick={() => setDrillRole(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <UsersTable
            title={roleNames[language][drillRole]}
            data={data}
            users={roleUsers(drillRole)}
            currentUser={currentUser}
            language={language}
            onToggle={toggleStatus}
            onDelete={deleteUser}
            onEdit={(target) => setEditingUser(target)}
          />
        </>
      )}

      {accountMode === 'view' && drillRole === 'student' && drillClassKey && (
        <>
          <button type="button" className="back-button full" onClick={() => setDrillClassKey(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <UsersTable
            title={`${studentClassGroups.find((group) => group.key === drillClassKey)?.label ?? tr(language, 'classGroups')} - ${tr(language, 'schoolUsers')}`}
            data={data}
            users={drillClassUsers}
            currentUser={currentUser}
            language={language}
            onToggle={toggleStatus}
            onDelete={deleteUser}
            onEdit={(target) => setEditingUser(target)}
          />
        </>
      )}
    </section>
  );
}
