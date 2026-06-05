import { Database, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser } from '../types';
import { tr } from '../i18n';
import { canDeleteUser, canToggleUser, deleteUserRecords, getSchool, scopedUsers } from '../data';
import { CredentialDatabasePanel } from './accounts-credentials';
import { AccountEditPanel } from './accounts-edit';
import { DirectorCreateAccountPanel } from './accounts-director-create';
import { UsersTable } from './accounts-table';

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

  const schoolUsers = scopedUsers(data, currentUser);
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
