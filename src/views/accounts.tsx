import type { DataSetter, Language, PlatformData, PlatformUser } from '../types';
import { tr } from '../i18n';
import { AdminUsersPanel } from './accounts-admin';
import { DirectorUsersPanel } from './accounts-director';

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
