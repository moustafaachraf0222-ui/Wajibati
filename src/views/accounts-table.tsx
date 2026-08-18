import {
  ArrowRightLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Edit3,
  School,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useState } from 'react';
import type { Language, PlatformData, PlatformUser, Role, SchoolRecord } from '../types';
import { schoolYearLabel, stageNames, statusNames, tr } from '../i18n';
import { assignmentSummaryLabel, hasAccountDetails, secondaryStreamLabel, teacherSubjectsLabel } from '../education';
import { canDeleteUser, canEditUser, canToggleUser, getSchool } from '../data';
import { schoolIsTrashed } from '../data-tombstones';
import { AccountAssignmentDetails, ResponsiveTable, RoleLabel } from '../ui';

export function UsersTable({
  title,
  data,
  users,
  currentUser,
  language,
  onToggle,
  onDelete,
  onEdit,
  onMove,
  groupByRole = false,
  groupBySchool = false,
  groupStudentsByClass = false
}: {
  title: string;
  data: PlatformData;
  users: PlatformUser[];
  currentUser: PlatformUser;
  language: Language;
  onToggle: (user: PlatformUser) => void;
  onDelete: (user: PlatformUser) => void;
  onEdit?: (user: PlatformUser) => void;
  onMove?: (user: PlatformUser) => void;
  groupByRole?: boolean;
  groupBySchool?: boolean;
  groupStudentsByClass?: boolean;
}) {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [pendingDeleteUser, setPendingDeleteUser] = useState<PlatformUser | null>(null);
  const subjectColumnIsVisible = (tableUsers: PlatformUser[]) => tableUsers.some((user) => user.role === 'teacher' || user.role === 'student');

  const columnsForUsers = (tableUsers: PlatformUser[]) => {
    const showSubjectColumn = subjectColumnIsVisible(tableUsers);
    const hasStudents = tableUsers.some((user) => user.role === 'student');
    const hasNonStudents = tableUsers.some((user) => user.role !== 'student');
    const subjectColumn = hasStudents && !hasNonStudents
      ? tr(language, 'guardianPhone')
      : hasStudents
        ? tr(language, 'subjectOrGuardianPhone')
        : tr(language, 'subject');

    return [
      tr(language, 'fullName'),
      tr(language, 'email'),
      tr(language, 'role'),
      tr(language, 'school'),
      ...(showSubjectColumn ? [subjectColumn] : []),
      tr(language, 'status'),
      tr(language, 'assignments'),
      tr(language, 'actions')
    ];
  };

  const subjectCellForUser = (user: PlatformUser) => {
    if (user.role === 'student') {
      return user.guardianPhone?.trim() || '-';
    }

    return user.role === 'teacher' ? teacherSubjectsLabel(language, user) : '-';
  };

  const rowsForUsers = (tableUsers: PlatformUser[], tableColumns: string[], showSubjectColumn: boolean) =>
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
          {showSubjectColumn && <td>{subjectCellForUser(user)}</td>}
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
              {onMove && currentUser.role === 'admin' && (
                <button className="icon-button" type="button" title={tr(language, 'moveAccount')} onClick={() => onMove(user)}>
                  <ArrowRightLeft size={16} aria-hidden="true" />
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
          <td colSpan={tableColumns.length}>
            <AccountAssignmentDetails user={user} language={language} />
          </td>
        </tr>
      ];
    });

  const renderTable = (tableUsers: PlatformUser[]) => {
    const tableColumns = columnsForUsers(tableUsers);
    const showSubjectColumn = subjectColumnIsVisible(tableUsers);

    return (
      <ResponsiveTable columns={tableColumns} emptyText={tr(language, 'noRecords')}>
        {rowsForUsers(tableUsers, tableColumns, showSubjectColumn)}
      </ResponsiveTable>
    );
  };

  const compareStudentsByClass = (left: PlatformUser, right: PlatformUser) =>
    (left.schoolYear ?? 999) - (right.schoolYear ?? 999) ||
    (left.stream ?? '').localeCompare(right.stream ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    (left.classGroup ?? '').localeCompare(right.classGroup ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });

  const studentClassKey = (user: PlatformUser) => `${user.schoolYear ?? ''}|${user.stream ?? ''}|${(user.classGroup ?? '').trim().toLowerCase()}`;
  const studentClassLabel = (user: PlatformUser) => {
    const year = schoolYearLabel(language, user.stage, user.schoolYear);
    const stream = user.stage === 'secondary' && user.stream ? ` - ${secondaryStreamLabel(language, user.stream, user.schoolYear)}` : '';
    const classGroup = user.classGroup?.trim() || '-';
    return `${year}${stream} - ${tr(language, 'classGroup')} ${classGroup}`;
  };

  const renderStudentClassGroups = (studentUsers: PlatformUser[]) => {
    const groups = [...studentUsers].sort(compareStudentsByClass).reduce<Array<{ key: string; label: string; users: PlatformUser[] }>>((accumulator, user) => {
      const key = studentClassKey(user);
      const existing = accumulator.find((group) => group.key === key);
      if (existing) {
        existing.users.push(user);
        return accumulator;
      }

      accumulator.push({ key, label: studentClassLabel(user), users: [user] });
      return accumulator;
    }, []);

    return (
      <div className="student-class-groups">
        {groups.map((group) => (
          <details className="user-group student-class-group" key={group.key} open>
            <summary>
              <span className="user-group-label">{group.label}</span>
              <span className="user-group-meta">
                <strong>{group.users.length}</strong>
                <ChevronDown size={17} aria-hidden="true" />
              </span>
            </summary>
            {renderTable(group.users)}
          </details>
        ))}
      </div>
    );
  };

  const groupedUsers = (['admin', 'director', 'supervisor', 'lab', 'canteen', 'teacher', 'student'] as Role[])
    .map((role) => ({ role, users: users.filter((user) => user.role === role) }))
    .filter((group) => group.users.length > 0);

  const renderRoleGroup = (group: { role: Role; users: PlatformUser[] }, key: string) => {
    if (group.users.length === 0) {
      return null;
    }

    if (group.users.length > 1) {
      return (
        <details className="user-group user-group-nested" key={key}>
          <summary>
            <span className="user-group-label">
              <RoleLabel role={group.role} language={language} />
            </span>
            <span className="user-group-meta">
              <strong>{group.users.length}</strong>
              <ChevronDown size={17} aria-hidden="true" />
            </span>
          </summary>
          {groupStudentsByClass && group.role === 'student' ? renderStudentClassGroups(group.users) : renderTable(group.users)}
        </details>
      );
    }

    return (
      <div className="user-group single user-group-nested" key={key}>
        <div className="user-group-title">
          <span className="user-group-label">
            <RoleLabel role={group.role} language={language} />
          </span>
          <span className="user-group-meta">
            <strong>{group.users.length}</strong>
          </span>
        </div>
        {groupStudentsByClass && group.role === 'student' ? renderStudentClassGroups(group.users) : renderTable(group.users)}
      </div>
    );
  };

  const groupedByRoleForUsers = (groupUsers: PlatformUser[]) =>
    (['admin', 'director', 'supervisor', 'lab', 'canteen', 'teacher', 'student'] as Role[])
      .map((role) => ({ role, users: groupUsers.filter((user) => user.role === role) }))
      .filter((group) => group.users.length > 0);

  type SchoolGroup = {
    key: string;
    school: SchoolRecord | null;
    users: PlatformUser[];
  };

  const groupedSchools = (() => {
    if (!groupBySchool) {
      return null;
    }

    const bySchoolId = new Map<string, PlatformUser[]>();
    const adminsWithoutSchool: PlatformUser[] = [];

    for (const user of users) {
      if (!user.schoolId) {
        adminsWithoutSchool.push(user);
        continue;
      }
      const list = bySchoolId.get(user.schoolId) ?? [];
      list.push(user);
      bySchoolId.set(user.schoolId, list);
    }

    const knownSchoolIds = new Set(data.schools.map((school) => school.id));
    const groups: SchoolGroup[] = [];

    if (adminsWithoutSchool.length > 0) {
      groups.push({ key: 'admins', school: null, users: adminsWithoutSchool });
    }

    const sortedSchools = [...data.schools]
      .filter((school) => !schoolIsTrashed(school))
      .sort((a, b) => a.name.localeCompare(b.name, language === 'ar' ? 'ar' : undefined, { sensitivity: 'base' }));

    for (const school of sortedSchools) {
      const schoolUsers = bySchoolId.get(school.id);
      if (!schoolUsers || schoolUsers.length === 0) {
        continue;
      }
      groups.push({ key: `school:${school.id}`, school, users: schoolUsers });
    }

    for (const [schoolId, schoolUsers] of bySchoolId) {
      if (knownSchoolIds.has(schoolId)) {
        continue;
      }
      groups.push({ key: `orphan:${schoolId}`, school: null, users: schoolUsers });
    }

    return groups;
  })();

  const schoolGroupSummary = (group: SchoolGroup) => {
    if (group.school) {
      return (
        <span className="user-group-label">
          <School size={18} aria-hidden="true" />
          <span className="user-group-label-name">{group.school.name}</span>
          {group.school.city ? <span className="user-group-label-meta">{group.school.city}</span> : null}
          <span className="user-group-label-stage">{stageNames[language][group.school.stage]}</span>
        </span>
      );
    }
    if (group.key === 'admins') {
      return (
        <span className="user-group-label">
          <ShieldCheck size={18} aria-hidden="true" />
          <span className="user-group-label-name">{tr(language, 'platformAdministrators')}</span>
        </span>
      );
    }
    return (
      <span className="user-group-label">
        <School size={18} aria-hidden="true" />
        <span className="user-group-label-name">{tr(language, 'schoolGroupFallback')}</span>
      </span>
    );
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'scopedData')}</p>
          <h2>{title}</h2>
        </div>
        <Users size={24} aria-hidden="true" />
      </div>
      {groupBySchool && groupedSchools ? (
        <div className="user-groups user-groups-schools">
          {groupedSchools.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {groupedSchools.map((group) => {
            const innerGroups = groupedByRoleForUsers(group.users);
            return (
              <details className="user-group user-group-school" key={group.key} open>
                <summary>
                  {schoolGroupSummary(group)}
                  <span className="user-group-meta">
                    <strong>{group.users.length}</strong>
                    <ChevronDown size={17} aria-hidden="true" />
                  </span>
                </summary>
                <div className="user-groups user-groups-roles">
                  {innerGroups.map((innerGroup) => renderRoleGroup(innerGroup, `${group.key}:${innerGroup.role}`))}
                </div>
              </details>
            );
          })}
        </div>
      ) : groupByRole ? (
        <div className="user-groups">
          {groupedUsers.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {groupedUsers.map((group) => renderRoleGroup(group, group.role))}
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
