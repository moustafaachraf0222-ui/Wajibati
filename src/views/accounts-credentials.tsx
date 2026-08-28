import { Database, Printer } from 'lucide-react';
import type { AccountCredential, Language, PlatformUser, SchoolRecord, StudentActivationRecord } from '../types';
import { localeNames, schoolYearLabel, tr } from '../i18n';
import { secondaryStreamLabel } from '../education';
import { ResponsiveTable } from '../ui';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sortedCredentials(credentials: AccountCredential[], role: AccountCredential['role']) {
  return credentials
    .filter((credential) => credential.role === role)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
}

function printCredentialTable(language: Language, title: string, schoolName: string, credentials: AccountCredential[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(new Date());
  const rows = credentials
    .map(
      (credential, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(credential.name)}</td>
          <td dir="ltr">${escapeHtml(credential.email)}</td>
          <td dir="ltr">${escapeHtml(credential.code)}</td>
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

function sortedStudentActivations(activations: StudentActivationRecord[]) {
  return [...activations].sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
}

function printActivationTable(language: Language, title: string, school: SchoolRecord | undefined, activations: StudentActivationRecord[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(new Date());
  const rows = activations
    .map(
      (activation, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(activation.name)}</td>
          <td>${escapeHtml(schoolYearLabel(language, activation.stage, activation.schoolYear))}</td>
          <td>${activation.stream ? escapeHtml(secondaryStreamLabel(language, activation.stream, activation.schoolYear)) : '-'}</td>
          <td>${escapeHtml(activation.classGroup ?? '-')}</td>
          <td dir="ltr" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; letter-spacing: 1px; font-size: 14px;">${escapeHtml(activation.code)}</td>
          <td>${escapeHtml(tr(language, activation.activatedUserId ? 'activated' : 'pendingActivation'))}</td>
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
          @page { size: A4 landscape; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, Tahoma, sans-serif; direction: ${direction}; }
          header { border-bottom: 3px solid #006233; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
          header div:first-child { flex: 1; }
          h1 { margin: 0 0 6px; color: #006233; font-size: 20px; }
          p { margin: 0; color: #4b5563; font-size: 12px; }
          .summary { display: inline-flex; gap: 8px; align-items: center; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 12px; }
          .summary strong { color: #006233; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 7px; text-align: start; vertical-align: middle; }
          th { background: #006233; color: #fff; font-weight: 700; }
          tbody tr:nth-child(even) td { background: #fafafa; }
          .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; letter-spacing: 1px; }
          footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #d1d5db; color: #6b7280; font-size: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(school?.name ?? '-')} - ${escapeHtml(printedAt)}</p>
          </div>
          <div class="summary"><span>${escapeHtml(tr(language, 'studentsImportedCount'))}:</span> <strong>${activations.length}</strong></div>
        </header>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(tr(language, 'fullName'))}</th>
              <th>${escapeHtml(tr(language, 'schoolYear'))}</th>
              <th>${escapeHtml(tr(language, 'stream'))}</th>
              <th>${escapeHtml(tr(language, 'classGroup'))}</th>
              <th>${escapeHtml(tr(language, 'activationCode'))}</th>
              <th>${escapeHtml(tr(language, 'activationStatus'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>${escapeHtml(tr(language, 'appName'))} - ${escapeHtml(school?.name ?? '')} - ${escapeHtml(printedAt)}</footer>
      </body>
    </html>`);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  }, 120);
}

function printAllDatabases(
  language: Language,
  school: SchoolRecord | undefined,
  teacherCredentials: AccountCredential[],
  supervisorCredentials: AccountCredential[],
  labCredentials: AccountCredential[],
  activations: StudentActivationRecord[]
) {
  if (typeof document === 'undefined') return;
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(new Date());
  const schoolName = school?.name ?? '-';
  const esc = escapeHtml;
  const buildRows = (creds: AccountCredential[]) =>
    creds
      .map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td dir="ltr">${esc(c.email)}</td><td dir="ltr" style="font-family: ui-monospace, monospace; font-weight:800; letter-spacing:1px;">${esc(c.code)}</td></tr>`)
      .join('') || `<tr><td colspan="4" style="text-align:center;color:#6b7280;">${esc(tr(language, 'databaseEmpty'))}</td></tr>`;
  const activationRows =
    activations
      .map(
        (a, i) => `<tr><td>${i + 1}</td><td>${esc(a.name)}</td><td dir="ltr" style="font-family: ui-monospace, monospace; font-weight:800; letter-spacing:1px;">${esc(a.code)}</td><td>${esc(tr(language, a.activatedUserId ? 'activated' : 'pendingActivation'))}</td></tr>`
      )
      .join('') || `<tr><td colspan="4" style="text-align:center;color:#6b7280;">${esc(tr(language, 'databaseEmpty'))}</td></tr>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.inset = 'auto 0 0 auto';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument ?? frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) { frame.remove(); return; }
  doc.open();
  doc.write(`<!doctype html>
    <html lang="${language}" dir="${direction}">
      <head><meta charset="utf-8" /><title>${esc(tr(language, 'credentialsDatabase'))}</title><style>
        @page { size: A4; margin: 12mm; }
        *{box-sizing:border-box} body{margin:0;color:#111827;font-family:Arial,Tahoma,sans-serif;direction:${direction};font-size:12px}
        header{border-bottom:3px solid #006233;padding-bottom:10px;margin-bottom:14px}
        h1{margin:0 0 4px;color:#006233;font-size:20px} h2{margin:14px 0 8px;color:#006233;font-size:15px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
        p{margin:0;color:#4b5563;font-size:11px}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}
        th,td{border:1px solid #d1d5db;padding:7px 6px;text-align:start;vertical-align:middle}
        th{background:#006233;color:#fff;font-weight:700}
        tbody tr:nth-child(even) td{background:#fafafa}
        footer{margin-top:10px;padding-top:8px;border-top:1px solid #d1d5db;color:#6b7280;font-size:10px;text-align:center}
      </style></head>
      <body>
        <header><h1>${esc(tr(language, 'credentialsDatabase'))}</h1><p>${esc(schoolName)} - ${esc(printedAt)}</p></header>
        <h2>${esc(tr(language, 'supervisorDatabase'))} (${supervisorCredentials.length})</h2>
        <table><thead><tr><th>#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'email'))}</th><th>${esc(tr(language,'accountCode'))}</th></tr></thead><tbody>${buildRows(supervisorCredentials)}</tbody></table>
        <h2>${esc(tr(language, 'labDatabase'))} (${labCredentials.length})</h2>
        <table><thead><tr><th>#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'email'))}</th><th>${esc(tr(language,'accountCode'))}</th></tr></thead><tbody>${buildRows(labCredentials)}</tbody></table>
        <h2>${esc(tr(language, 'teacherDatabase'))} (${teacherCredentials.length})</h2>
        <table><thead><tr><th>#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'email'))}</th><th>${esc(tr(language,'accountCode'))}</th></tr></thead><tbody>${buildRows(teacherCredentials)}</tbody></table>
        <h2>${esc(tr(language, 'studentActivationDatabase'))} (${activations.length})</h2>
        <table><thead><tr><th>#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'activationCode'))}</th><th>${esc(tr(language,'activationStatus'))}</th></tr></thead><tbody>${activationRows}</tbody></table>
        <footer>${esc(tr(language,'appName'))} - ${esc(schoolName)} - ${esc(printedAt)}</footer>
      </body>
    </html>`);
  doc.close();
  setTimeout(()=>{ frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(()=>frame.remove(),500); },120);
}

export function CredentialDatabasePanel({
  credentials,
  studentActivations,
  school,
  language
}: {
  credentials: AccountCredential[];
  studentActivations: StudentActivationRecord[];
  school: SchoolRecord | undefined;
  language: Language;
}) {
  const teacherCredentials = sortedCredentials(credentials, 'teacher');
  const supervisorCredentials = sortedCredentials(credentials, 'supervisor');
  const labCredentials = sortedCredentials(credentials, 'lab');
  const activationRecords = sortedStudentActivations(studentActivations);
  const schoolName = school?.name ?? '-';
  const hasAnyData = teacherCredentials.length + supervisorCredentials.length + labCredentials.length + activationRecords.length > 0;

  return (
    <div className="panel credential-database-panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'credentialsDatabaseHint')}</p>
          <h2>{tr(language, 'credentialsDatabase')}</h2>
        </div>
        <Database size={24} aria-hidden="true" />
      </div>
      <div className="credential-database-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '12px', borderBottom: '1px solid var(--line)', background: 'var(--paper-soft)', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <strong style={{ fontSize: '0.95rem' }}>{tr(language, 'studentActivationDatabase')}: {activationRecords.length}</strong>
          <span className="hint" style={{ margin: 0 }}>{tr(language, 'printAllActivationCodesHint')}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="button primary" type="button" disabled={activationRecords.length === 0} onClick={() => printActivationTable(language, tr(language, 'studentActivationDatabase'), school, activationRecords)}>
            <Printer size={17} aria-hidden="true" />
            <span>{tr(language, 'printAllActivationCodes')}</span>
          </button>
          <button className="button ghost" type="button" disabled={!hasAnyData} onClick={() => printAllDatabases(language, school, teacherCredentials, supervisorCredentials, labCredentials, activationRecords)}>
            <Database size={17} aria-hidden="true" />
            <span>{tr(language, 'printTable')} - {tr(language, 'credentialsDatabase')}</span>
          </button>
        </div>
      </div>
      <div className="credential-database-grid">
        <CredentialDatabaseCard title={tr(language, 'supervisorDatabase')} credentials={supervisorCredentials} schoolName={schoolName} language={language} />
        <CredentialDatabaseCard title={tr(language, 'labDatabase')} credentials={labCredentials} schoolName={schoolName} language={language} />
        <CredentialDatabaseCard title={tr(language, 'teacherDatabase')} credentials={teacherCredentials} schoolName={schoolName} language={language} />
        <StudentActivationDatabaseCard title={tr(language, 'studentActivationDatabase')} activations={activationRecords} school={school} language={language} />
      </div>
    </div>
  );
}

function StudentActivationDatabaseCard({
  title,
  activations,
  school,
  language
}: {
  title: string;
  activations: StudentActivationRecord[];
  school: SchoolRecord | undefined;
  language: Language;
}) {
  const columns = [
    tr(language, 'fullName'),
    tr(language, 'schoolYear'),
    tr(language, 'stream'),
    tr(language, 'classGroup'),
    tr(language, 'activationCode'),
    tr(language, 'activationStatus')
  ];

  return (
    <section className="credential-database-card">
      <div className="credential-database-head">
        <div>
          <h3>{title}</h3>
          <span>{activations.length}</span>
        </div>
        <button className="button ghost" type="button" disabled={activations.length === 0} onClick={() => printActivationTable(language, title, school, activations)}>
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printTable')}</span>
        </button>
      </div>
      <ResponsiveTable columns={columns} emptyText={tr(language, 'databaseEmpty')}>
        {activations.map((activation) => (
          <tr key={activation.id}>
            <td>{activation.name}</td>
            <td>{schoolYearLabel(language, activation.stage, activation.schoolYear)}</td>
            <td>{activation.stream ? secondaryStreamLabel(language, activation.stream, activation.schoolYear) : '-'}</td>
            <td>{activation.classGroup ?? '-'}</td>
            <td dir="ltr">{activation.code}</td>
            <td>
              <span className={activation.activatedUserId ? 'status active' : 'status disabled'}>
                {tr(language, activation.activatedUserId ? 'activated' : 'pendingActivation')}
              </span>
            </td>
          </tr>
        ))}
      </ResponsiveTable>
    </section>
  );
}

function CredentialDatabaseCard({
  title,
  credentials,
  schoolName,
  language
}: {
  title: string;
  credentials: AccountCredential[];
  schoolName: string;
  language: Language;
}) {
  const columns = [tr(language, 'fullName'), tr(language, 'email'), tr(language, 'accountCode')];

  return (
    <section className="credential-database-card">
      <div className="credential-database-head">
        <div>
          <h3>{title}</h3>
          <span>{credentials.length}</span>
        </div>
        <button
          className="button ghost"
          type="button"
          disabled={credentials.length === 0}
          onClick={() => printCredentialTable(language, title, schoolName, credentials)}
        >
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printTable')}</span>
        </button>
      </div>
      <ResponsiveTable columns={columns} emptyText={tr(language, 'databaseEmpty')}>
        {credentials.map((credential) => (
          <tr key={credential.id}>
            <td>{credential.name}</td>
            <td dir="ltr">{credential.email}</td>
            <td dir="ltr">{credential.code}</td>
          </tr>
        ))}
      </ResponsiveTable>
    </section>
  );
}
