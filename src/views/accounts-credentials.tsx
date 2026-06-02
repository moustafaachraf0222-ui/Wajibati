import { Database, Printer } from 'lucide-react';
import type { Language, PlatformUser, SchoolRecord } from '../types';
import { localeNames, tr } from '../i18n';
import { ResponsiveTable } from '../ui';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sortedCredentialUsers(users: PlatformUser[], role: 'teacher' | 'student') {
  return users
    .filter((user) => user.role === role)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
}

function printCredentialTable(language: Language, title: string, schoolName: string, users: PlatformUser[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(new Date());
  const rows = users
    .map(
      (user, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(user.name)}</td>
          <td dir="ltr">${escapeHtml(user.email)}</td>
          <td dir="ltr">${escapeHtml(user.password)}</td>
        </tr>`
    )
    .join('');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.inset = 'auto 0 0 auto';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument ?? frame.contentWindow?.document;
  if (!frameDocument || !frame.contentWindow) {
    frame.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write(`<!doctype html>
    <html lang="${language}" dir="${direction}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, Tahoma, sans-serif; direction: ${direction}; }
          header { border-bottom: 3px solid #006233; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0 0 6px; color: #006233; font-size: 22px; }
          p { margin: 0; color: #4b5563; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #d1d5db; padding: 9px 8px; text-align: start; vertical-align: middle; }
          th { background: #f3f4f6; color: #111827; font-weight: 700; }
          tbody tr:nth-child(even) td { background: #fafafa; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(schoolName)} - ${escapeHtml(printedAt)}</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(tr(language, 'fullName'))}</th>
              <th>${escapeHtml(tr(language, 'email'))}</th>
              <th>${escapeHtml(tr(language, 'accountCode'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  }, 120);
}

export function CredentialDatabasePanel({ users, school, language }: { users: PlatformUser[]; school: SchoolRecord | undefined; language: Language }) {
  const teacherUsers = sortedCredentialUsers(users, 'teacher');
  const studentUsers = sortedCredentialUsers(users, 'student');
  const schoolName = school?.name ?? '-';

  return (
    <div className="panel credential-database-panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'credentialsDatabaseHint')}</p>
          <h2>{tr(language, 'credentialsDatabase')}</h2>
        </div>
        <Database size={24} aria-hidden="true" />
      </div>
      <div className="credential-database-grid">
        <CredentialDatabaseCard title={tr(language, 'teacherDatabase')} users={teacherUsers} schoolName={schoolName} language={language} />
        <CredentialDatabaseCard title={tr(language, 'studentDatabase')} users={studentUsers} schoolName={schoolName} language={language} />
      </div>
    </div>
  );
}

function CredentialDatabaseCard({
  title,
  users,
  schoolName,
  language
}: {
  title: string;
  users: PlatformUser[];
  schoolName: string;
  language: Language;
}) {
  const columns = [tr(language, 'fullName'), tr(language, 'email'), tr(language, 'accountCode')];

  return (
    <section className="credential-database-card">
      <div className="credential-database-head">
        <div>
          <h3>{title}</h3>
          <span>{users.length}</span>
        </div>
        <button className="button ghost" type="button" disabled={users.length === 0} onClick={() => printCredentialTable(language, title, schoolName, users)}>
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printTable')}</span>
        </button>
      </div>
      <ResponsiveTable columns={columns} emptyText={tr(language, 'databaseEmpty')}>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td dir="ltr">{user.email}</td>
            <td dir="ltr">{user.password}</td>
          </tr>
        ))}
      </ResponsiveTable>
    </section>
  );
}
