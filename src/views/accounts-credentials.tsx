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
          <td style="text-align:center;color:#9aa3ad;">${index + 1}</td>
          <td>${escapeHtml(credential.name)}</td>
          <td dir="ltr" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${escapeHtml(credential.email)}</td>
          <td dir="ltr" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight:800; letter-spacing:1px; text-align:center;">${escapeHtml(credential.code)}</td>
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
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; padding: 16px; background: #0b0d10; color: #f2f4f7; font-family: "Segoe UI", Tahoma, Arial, sans-serif; direction: ${direction}; }
          .card { border: 1px solid #262b33; border-radius: 12px; overflow: hidden; background: #131619; }
          .card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; background:#0f1216; border-bottom:1px solid #262b33; }
          .card-head h3 { margin:0; font-size:1.05rem; font-weight:800; color:#f2f4f7; }
          .card-head .count { min-width:32px; min-height:26px; padding:3px 10px; border-radius:999px; background:#151f45; color:#7d9bff; display:inline-grid; place-items:center; font-weight:800; font-size:0.86rem; }
          .card-head .meta { color:#9aa3ad; font-size:0.82rem; }
          table { width:100%; border-collapse:collapse; font-size:0.9rem; }
          th { background:#0f1216; color:#9aa3ad; font-weight:700; font-size:0.82rem; text-align:start; padding:12px 10px; border-bottom:1px solid #262b33; white-space:nowrap; }
          td { padding:13px 10px; border-bottom:1px solid #1e232b; text-align:start; vertical-align:middle; color:#f2f4f7; }
          tbody tr:last-child td { border-bottom:none; }
          .footer { margin-top:12px; text-align:center; color:#6b7280; font-size:0.75rem; padding-top:10px; border-top:1px solid #262b33; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="card-head">
            <div style="display:flex; align-items:center; gap:10px;">
              <h3>${escapeHtml(title)}</h3>
              <span class="count">${credentials.length}</span>
            </div>
            <span class="meta">${escapeHtml(schoolName)} — ${escapeHtml(printedAt)}</span>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th style="width:48px; text-align:center;">#</th>
                  <th>${escapeHtml(tr(language, 'fullName'))}</th>
                  <th>${escapeHtml(tr(language, 'email'))}</th>
                  <th style="text-align:center;">${escapeHtml(tr(language, 'accountCode'))}</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="4" style="text-align:center; color:#9aa3ad; padding:22px;">${escapeHtml(tr(language, 'databaseEmpty'))}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
        <div class="footer">${escapeHtml(tr(language, 'appName'))} — ${escapeHtml(schoolName)} — ${escapeHtml(printedAt)}</div>
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
  const schoolName = school?.name ?? '-';
  const rows = activations
    .map(
      (activation, index) => {
        const statusClass = activation.activatedUserId ? 'active' : 'disabled';
        const statusText = escapeHtml(tr(language, activation.activatedUserId ? 'activated' : 'pendingActivation'));
        return `
        <tr>
          <td style="text-align:center; color:#9aa3ad; width:42px;">${index + 1}</td>
          <td style="font-weight:600;">${escapeHtml(activation.name)}</td>
          <td>${escapeHtml(schoolYearLabel(language, activation.stage, activation.schoolYear))}</td>
          <td>${activation.stream ? escapeHtml(secondaryStreamLabel(language, activation.stream, activation.schoolYear)) : '<span style="color:#6b7280;">-</span>'}</td>
          <td style="text-align:center;">${escapeHtml(activation.classGroup ?? '-') === '-' ? '<span style="color:#6b7280;">-</span>' : escapeHtml(activation.classGroup ?? '-')}</td>
          <td dir="ltr" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; letter-spacing: 1px; text-align:center; font-size:13px;">${escapeHtml(activation.code)}</td>
          <td style="text-align:center;"><span class="status ${statusClass}">${statusText}</span></td>
        </tr>`;
      }
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
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; padding: 16px; background: #0b0d10; color: #f2f4f7; font-family: "Segoe UI", Tahoma, Arial, sans-serif; direction: ${direction}; }
          .card { border: 1px solid #262b33; border-radius: 12px; overflow: hidden; background: #131619; }
          .card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; background:#0f1216; border-bottom:1px solid #262b33; }
          .card-head h3 { margin:0; font-size:1.05rem; font-weight:800; color:#f2f4f7; }
          .card-head .count { min-width:32px; min-height:26px; padding:3px 10px; border-radius:999px; background:#151f45; color:#7d9bff; display:inline-grid; place-items:center; font-weight:800; font-size:0.86rem; }
          .card-head .meta { color:#9aa3ad; font-size:0.82rem; white-space:nowrap; }
          table { width:100%; border-collapse:collapse; font-size:0.88rem; }
          th { background:#0f1216; color:#9aa3ad; font-weight:700; font-size:0.78rem; text-align:start; padding:11px 10px; border-bottom:1px solid #262b33; white-space:nowrap; }
          th:last-child, td:last-child { text-align:center; }
          td { padding:12px 10px; border-bottom:1px solid #1e232b; text-align:start; vertical-align:middle; color:#f2f4f7; }
          tbody tr:last-child td { border-bottom:none; }
          .status { display:inline-flex; min-height:26px; align-items:center; justify-content:center; border-radius:999px; padding:3px 12px; font-size:0.80rem; font-weight:700; white-space:nowrap; }
          .status.active { background:#0c2a3a; color:#6bb8ff; border:1px solid #1e4a6b; }
          .status.disabled { background:#2e151b; color:#ff8a94; border:1px solid #5a1e2a; }
          .footer { margin-top:12px; text-align:center; color:#6b7280; font-size:0.74rem; padding-top:10px; border-top:1px solid #262b33; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="card-head">
            <div style="display:flex; align-items:center; gap:10px;">
              <h3>${escapeHtml(title)}</h3>
              <span class="count">${activations.length}</span>
            </div>
            <span class="meta">${escapeHtml(schoolName)} — ${escapeHtml(printedAt)}</span>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th style="width:42px; text-align:center;">#</th>
                  <th>${escapeHtml(tr(language, 'fullName'))}</th>
                  <th>${escapeHtml(tr(language, 'schoolYear'))}</th>
                  <th>${escapeHtml(tr(language, 'stream'))}</th>
                  <th style="text-align:center;">${escapeHtml(tr(language, 'classGroup'))}</th>
                  <th style="text-align:center;">${escapeHtml(tr(language, 'activationCode'))}</th>
                  <th style="text-align:center;">${escapeHtml(tr(language, 'activationStatus'))}</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="7" style="text-align:center; color:#9aa3ad; padding:28px;">${escapeHtml(tr(language, 'databaseEmpty'))}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
        <div class="footer">${escapeHtml(tr(language, 'appName'))} — ${escapeHtml(schoolName)} — ${escapeHtml(printedAt)}</div>
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
      .map((c, i) => `<tr><td style="text-align:center;color:#9aa3ad;">${i + 1}</td><td>${esc(c.name)}</td><td dir="ltr" style="font-family: ui-monospace, monospace;">${esc(c.email)}</td><td dir="ltr" style="font-family: ui-monospace, monospace; font-weight:800; letter-spacing:1px; text-align:center;">${esc(c.code)}</td></tr>`)
      .join('') || `<tr><td colspan="4" style="text-align:center;color:#9aa3ad; padding:18px;">${esc(tr(language, 'databaseEmpty'))}</td></tr>`;
  const activationRows =
    activations
      .map(
        (a, i) => {
          const cls = a.activatedUserId ? 'active' : 'disabled';
          const txt = esc(tr(language, a.activatedUserId ? 'activated' : 'pendingActivation'));
          return `<tr><td style="text-align:center;color:#9aa3ad;">${i + 1}</td><td>${esc(a.name)}</td><td dir="ltr" style="font-family: ui-monospace, monospace; font-weight:800; letter-spacing:1px; text-align:center;">${esc(a.code)}</td><td style="text-align:center;"><span class="status ${cls}">${txt}</span></td></tr>`;
        }
      )
      .join('') || `<tr><td colspan="4" style="text-align:center;color:#9aa3ad; padding:18px;">${esc(tr(language, 'databaseEmpty'))}</td></tr>`;

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
        @page { size: A4; margin: 10mm; }
        *{box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact;}
        body{margin:0; padding:16px; background:#0b0d10; color:#f2f4f7; font-family:"Segoe UI", Tahoma, Arial, sans-serif; direction:${direction}; font-size:0.88rem;}
        .page-head{border:1px solid #262b33; border-radius:12px; background:#131619; padding:16px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; gap:12px;}
        .page-head h1{margin:0; color:#f2f4f7; font-size:1.15rem;}
        .page-head p{margin:4px 0 0; color:#9aa3ad; font-size:0.82rem;}
        h2{margin:16px 0 8px; color:#f2f4f7; font-size:1rem; display:flex; align-items:center; gap:8px;}
        h2 .count{background:#151f45; color:#7d9bff; border-radius:999px; padding:2px 9px; font-size:0.82rem; font-weight:800;}
        table{width:100%; border-collapse:collapse; font-size:0.84rem; border:1px solid #262b33; border-radius:8px; overflow:hidden;}
        th{background:#0f1216; color:#9aa3ad; font-weight:700; font-size:0.78rem; padding:10px 8px; border-bottom:1px solid #262b33; text-align:start; white-space:nowrap;}
        td{padding:11px 8px; border-bottom:1px solid #1e232b; text-align:start; vertical-align:middle; color:#f2f4f7;}
        tbody tr:last-child td{border-bottom:none;}
        .status{display:inline-flex; min-height:24px; align-items:center; justify-content:center; border-radius:999px; padding:2px 10px; font-size:0.78rem; font-weight:700; white-space:nowrap;}
        .status.active{background:#0c2a3a; color:#6bb8ff; border:1px solid #1e4a6b;}
        .status.disabled{background:#2e151b; color:#ff8a94; border:1px solid #5a1e2a;}
        footer{margin-top:14px; padding-top:10px; border-top:1px solid #262b33; color:#6b7280; font-size:0.74rem; text-align:center;}
      </style></head>
      <body>
        <div class="page-head"><div><h1>${esc(tr(language, 'credentialsDatabase'))}</h1><p>${esc(schoolName)} — ${esc(printedAt)}</p></div><div style="text-align:end; color:#9aa3ad; font-size:0.82rem;">${esc(tr(language, 'appName'))}</div></div>
        <h2>${esc(tr(language, 'supervisorDatabase'))} <span class="count">${supervisorCredentials.length}</span></h2>
        <table><thead><tr><th style="width:42px; text-align:center;">#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'email'))}</th><th style="text-align:center;">${esc(tr(language,'accountCode'))}</th></tr></thead><tbody>${buildRows(supervisorCredentials)}</tbody></table>
        <h2>${esc(tr(language, 'labDatabase'))} <span class="count">${labCredentials.length}</span></h2>
        <table><thead><tr><th style="width:42px; text-align:center;">#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'email'))}</th><th style="text-align:center;">${esc(tr(language,'accountCode'))}</th></tr></thead><tbody>${buildRows(labCredentials)}</tbody></table>
        <h2>${esc(tr(language, 'teacherDatabase'))} <span class="count">${teacherCredentials.length}</span></h2>
        <table><thead><tr><th style="width:42px; text-align:center;">#</th><th>${esc(tr(language,'fullName'))}</th><th>${esc(tr(language,'email'))}</th><th style="text-align:center;">${esc(tr(language,'accountCode'))}</th></tr></thead><tbody>${buildRows(teacherCredentials)}</tbody></table>
        <h2>${esc(tr(language, 'studentActivationDatabase'))} <span class="count">${activations.length}</span></h2>
        <table><thead><tr><th style="width:42px; text-align:center;">#</th><th>${esc(tr(language,'fullName'))}</th><th style="text-align:center;">${esc(tr(language,'activationCode'))}</th><th style="text-align:center;">${esc(tr(language,'activationStatus'))}</th></tr></thead><tbody>${activationRows}</tbody></table>
        <footer>${esc(tr(language,'appName'))} — ${esc(schoolName)} — ${esc(printedAt)}</footer>
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
