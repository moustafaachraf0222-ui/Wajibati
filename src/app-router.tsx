import type { DataSetter, Language, PlatformData, PlatformUser, Theme, View } from './types';
import { UsersView } from './views/accounts';
import { ExercisesView } from './views/exercises';
import { AnnouncementsView, NotesView } from './views/messages';
import { OverviewView } from './views/overview';
import { SchoolProfileView, SchoolsView } from './views/schools';
import { SettingsView } from './views/settings';

type AppRouterProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  theme: Theme;
  view: View;
  setData: DataSetter;
  onLanguageChange: (language: Language) => void;
  onResetDemo: () => void;
  onThemeChange: (theme: Theme) => void;
};

export function AppRouter({
  data,
  currentUser,
  language,
  theme,
  view,
  setData,
  onLanguageChange,
  onResetDemo,
  onThemeChange
}: AppRouterProps) {
  switch (view) {
    case 'schools':
      return <SchoolsView data={data} setData={setData} currentUser={currentUser} language={language} />;
    case 'users':
      return <UsersView data={data} setData={setData} currentUser={currentUser} language={language} />;
    case 'school':
      return <SchoolProfileView data={data} setData={setData} currentUser={currentUser} language={language} />;
    case 'exercises':
      return <ExercisesView data={data} setData={setData} currentUser={currentUser} language={language} />;
    case 'announcements':
      return <AnnouncementsView data={data} setData={setData} currentUser={currentUser} language={language} />;
    case 'notes':
      return <NotesView data={data} setData={setData} currentUser={currentUser} language={language} />;
    case 'settings':
      return (
        <SettingsView
          data={data}
          setData={setData}
          language={language}
          theme={theme}
          currentUser={currentUser}
          onLanguageChange={onLanguageChange}
          onThemeChange={onThemeChange}
          onResetDemo={onResetDemo}
        />
      );
    case 'overview':
    default:
      return <OverviewView data={data} currentUser={currentUser} language={language} />;
  }
}
