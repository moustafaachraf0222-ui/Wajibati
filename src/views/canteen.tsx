import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Printer, QrCode, ScanLine, Users, Utensils, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { CanteenCard, CanteenMealScan, CanteenScanResult, DataSetter, Language, PlatformData, PlatformUser } from '../types';
import { generateUniqueCode, getSchool, makeId } from '../data';
import { localeNames, roleNames, schoolYearLabel, tr } from '../i18n';
import { secondaryStreamLabel } from '../education';
import { ResponsiveTable } from '../ui';
import { useBackShortcut } from '../back-shortcut';

type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type ScanOutcome = {
  result: CanteenScanResult;
  student?: PlatformUser;
  scan: CanteenMealScan;
};

let cachedJsQrReader: typeof import('jsqr').default | null = null;

async function loadJsQrReader() {
  if (!cachedJsQrReader) {
    cachedJsQrReader = (await import('jsqr')).default;
  }

  return cachedJsQrReader;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function barcodeDetectorConstructor() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

async function readQrCodeFromVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement, detector?: BarcodeDetectorInstance | null) {
  if (detector) {
    try {
      const results = await detector.detect(video);
      const code = results[0]?.rawValue?.trim();
      if (code) {
        return code;
      }
    } catch {
      // Fall back to jsQR below. Some WebViews expose BarcodeDetector but fail on video frames.
    }
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width <= 0 || height <= 0) {
    return '';
  }

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return '';
  }

  context.drawImage(video, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const jsQrReader = await loadJsQrReader();
  return jsQrReader(imageData.data, width, height, { inversionAttempts: 'attemptBoth' })?.data?.trim() ?? '';
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function localMonthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

function formatDate(language: Language, value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(date);
}

function formatDateTime(language: Language, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function sortByName(left: PlatformUser, right: PlatformUser) {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
}

function compareStudents(left: PlatformUser, right: PlatformUser) {
  return (
    (left.schoolYear ?? 999) - (right.schoolYear ?? 999) ||
    (left.stream ?? '').localeCompare(right.stream ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    (left.classGroup ?? '').localeCompare(right.classGroup ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    sortByName(left, right)
  );
}

function classLabel(language: Language, student?: PlatformUser) {
  if (!student) {
    return '-';
  }

  const year = schoolYearLabel(language, student.stage, student.schoolYear);
  const stream = student.stage === 'secondary' && student.stream ? ` - ${secondaryStreamLabel(language, student.stream, student.schoolYear)}` : '';
  const classGroup = student.classGroup?.trim() || '-';
  return `${year}${stream} - ${tr(language, 'classGroup')} ${classGroup}`;
}

function studentForCard(data: PlatformData, card: CanteenCard) {
  return data.users.find((user) => user.id === card.studentId);
}

function cardForStudent(data: PlatformData, studentId: string) {
  return data.canteenCards.find((card) => card.studentId === studentId && card.status === 'active');
}

function studentIsAbsentOn(data: PlatformData, studentId: string, date: string) {
  return data.absenceRecords.some((record) => record.studentId === studentId && record.date === date && !record.deletedAt);
}

function resultLabel(language: Language, result: CanteenScanResult) {
  if (result === 'allowed') {
    return tr(language, 'mealAllowed');
  }

  if (result === 'duplicate') {
    return tr(language, 'mealDuplicate');
  }

  if (result === 'absent') {
    return tr(language, 'mealAbsent');
  }

  return tr(language, 'mealInvalid');
}

function resultClass(result: CanteenScanResult) {
  if (result === 'allowed') {
    return 'success';
  }

  if (result === 'duplicate') {
    return 'warning';
  }

  return 'danger';
}

function evaluateCanteenScan(data: PlatformData, currentUser: PlatformUser, rawCode: string): { data: PlatformData; outcome: ScanOutcome } {
  const code = rawCode.trim();
  const scannedAt = new Date();
  const scannedAtIso = scannedAt.toISOString();
  const date = localDateKey(scannedAt);
  const schoolId = currentUser.schoolId ?? '';
  const card = data.canteenCards.find(
    (candidate) => candidate.schoolId === schoolId && candidate.status === 'active' && candidate.code.toUpperCase() === code.toUpperCase()
  );
  const student = card ? studentForCard(data, card) : undefined;
  let result: CanteenScanResult = 'invalid';

  if (card && student?.status === 'active') {
    if (studentIsAbsentOn(data, student.id, date)) {
      result = 'absent';
    } else if (
      data.canteenMealScans.some(
        (scan) => scan.schoolId === schoolId && scan.studentId === student.id && scan.date === date && scan.result === 'allowed'
      )
    ) {
      result = 'duplicate';
    } else {
      result = 'allowed';
    }
  }

  const scan: CanteenMealScan = {
    id: makeId('meal-scan'),
    schoolId,
    cardId: card?.id,
    studentId: student?.id,
    code,
    scannedBy: currentUser.id,
    scannedAt: scannedAtIso,
    date,
    result
  };

  return {
    data: {
      ...data,
      canteenMealScans: [...data.canteenMealScans, scan]
    },
    outcome: { result, student, scan }
  };
}

function allowedScansForDate(data: PlatformData, schoolId: string | undefined, date: string) {
  const byStudent = new Map<string, CanteenMealScan>();
  data.canteenMealScans
    .filter((scan) => scan.schoolId === schoolId && scan.date === date && scan.result === 'allowed' && scan.studentId)
    .sort((left, right) => left.scannedAt.localeCompare(right.scannedAt))
    .forEach((scan) => {
      if (scan.studentId && !byStudent.has(scan.studentId)) {
        byStudent.set(scan.studentId, scan);
      }
    });

  return [...byStudent.values()];
}

function printFrame(language: Language, title: string, body: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
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
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, Tahoma, sans-serif; direction: ${direction}; }
          header { border-bottom: 3px solid #006233; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0 0 6px; color: #006233; font-size: 22px; }
          p { margin: 0; color: #4b5563; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #d1d5db; padding: 9px 8px; text-align: start; vertical-align: middle; }
          th { background: #f3f4f6; color: #111827; font-weight: 700; }
          tbody tr:nth-child(even) td { background: #fafafa; }
          .card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
          .meal-card { min-height: 270px; border: 2px solid #006233; border-radius: 14px; padding: 14px; text-align: center; break-inside: avoid; }
          .meal-card h2 { margin: 0 0 8px; color: #006233; font-size: 18px; }
          .meal-card img { width: 150px; height: 150px; object-fit: contain; margin: 10px auto; display: block; }
          .meal-card strong { display: block; font-size: 17px; margin-top: 8px; }
          .meal-card code { display: inline-block; margin-top: 10px; padding: 5px 8px; background: #f3f4f6; border-radius: 7px; direction: ltr; }
        </style>
      </head>
      <body>${body}</body>
    </html>`);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  }, 150);
}

async function printCanteenCards(language: Language, data: PlatformData, cards: CanteenCard[]) {
  const school = data.schools.find((candidate) => candidate.id === cards[0]?.schoolId);
  const title = tr(language, 'canteenCards');
  const groups = new Map<string, CanteenCard[]>();
  cards.forEach((card) => {
    const holder = studentForCard(data, card);
    const label = holder && holder.role !== 'student' ? tr(language, 'schoolStaff') : classLabel(language, holder);
    const existing = groups.get(label);
    if (existing) {
      existing.push(card);
    } else {
      groups.set(label, [card]);
    }
  });
  const cardsHtml = await Promise.all(
    [...groups.entries()].map(async ([label, groupCards]) => {
      const groupHtml = await Promise.all(
        groupCards.map(async (card) => {
          const holder = studentForCard(data, card);
          const qrDataUrl = await QRCode.toDataURL(card.code, { width: 190, margin: 1, errorCorrectionLevel: 'M' });
          return `<article class="meal-card">
        <h2>${escapeHtml(tr(language, 'schoolCanteen'))}</h2>
        <p>${escapeHtml(school?.name ?? '-')}</p>
        <img src="${qrDataUrl}" alt="QR" />
        <strong>${escapeHtml(holder?.name ?? '-')}</strong>
        <p>${escapeHtml(holder && holder.role !== 'student' ? tr(language, 'schoolStaff') : classLabel(language, holder))}</p>
        <code>${escapeHtml(card.code)}</code>
      </article>`;
        })
      );

      return `<h2>${escapeHtml(label)}</h2><div class="card-grid">${groupHtml.join('')}</div>`;
    })
  );

  printFrame(
    language,
    title,
    `<header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(school?.name ?? '-')}</p></header>${cardsHtml.join('')}`
  );
}

function printDailyReport(language: Language, data: PlatformData, currentUser: PlatformUser, date: string) {
  const school = getSchool(data, currentUser);
  const scans = allowedScansForDate(data, currentUser.schoolId, date);
  const rows = scans
    .map((scan, index) => {
      const student = scan.studentId ? data.users.find((user) => user.id === scan.studentId) : undefined;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(student?.name ?? '-')}</td>
        <td>${escapeHtml(classLabel(language, student))}</td>
        <td>${escapeHtml(formatDateTime(language, scan.scannedAt))}</td>
      </tr>`;
    })
    .join('');

  const title = tr(language, 'dailyCanteenReport');
  printFrame(
    language,
    title,
    `<header>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(school?.name ?? '-')} - ${escapeHtml(formatDate(language, date))} - ${escapeHtml(tr(language, 'eatingStudentsCount'))}: ${scans.length}</p>
    </header>
    <table>
      <thead><tr><th>#</th><th>${escapeHtml(tr(language, 'fullName'))}</th><th>${escapeHtml(tr(language, 'classGroup'))}</th><th>${escapeHtml(tr(language, 'scannedAt'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  );
}

function monthlyCanteenStats(data: PlatformData, schoolId: string | undefined, month: string, language: Language) {
  const groups = new Map<string, { label: string; mealCount: number; studentIds: Set<string> }>();
  data.canteenMealScans
    .filter((scan) => scan.schoolId === schoolId && scan.result === 'allowed' && scan.date.startsWith(`${month}-`) && scan.studentId)
    .forEach((scan) => {
      const student = scan.studentId ? data.users.find((user) => user.id === scan.studentId) : undefined;
      const key = `${student?.schoolYear ?? ''}|${student?.stream ?? ''}|${(student?.classGroup ?? '').trim().toLowerCase()}`;
      const existing = groups.get(key) ?? { label: classLabel(language, student), mealCount: 0, studentIds: new Set<string>() };
      existing.mealCount += 1;
      if (student?.id) {
        existing.studentIds.add(student.id);
      }
      groups.set(key, existing);
    });

  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' }));
}

function printMonthlyReport(language: Language, data: PlatformData, currentUser: PlatformUser, month: string) {
  const school = getSchool(data, currentUser);
  const stats = monthlyCanteenStats(data, currentUser.schoolId, month, language);
  const rows = stats
    .map(
      (group, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(group.label)}</td>
        <td>${group.mealCount}</td>
        <td>${group.studentIds.size}</td>
      </tr>`
    )
    .join('');

  const title = tr(language, 'monthlyCanteenReport');
  printFrame(
    language,
    title,
    `<header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(school?.name ?? '-')} - ${escapeHtml(month)}</p></header>
    <table>
      <thead><tr><th>#</th><th>${escapeHtml(tr(language, 'classGroup'))}</th><th>${escapeHtml(tr(language, 'mealsCount'))}</th><th>${escapeHtml(tr(language, 'eatingStudentsCount'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
  );
}

function DirectorCanteenView({
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
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [selectedMonth, setSelectedMonth] = useState(localMonthKey());
  const students = useMemo(
    () =>
      data.users
        .filter((user) => user.role === 'student' && user.schoolId === currentUser.schoolId && user.status === 'active')
        .sort(compareStudents),
    [currentUser.schoolId, data.users]
  );
  const cards = useMemo(
    () =>
      data.canteenCards
        .filter((card) => card.schoolId === currentUser.schoolId)
        .sort((left, right) => {
          const leftStudent = studentForCard(data, left);
          const rightStudent = studentForCard(data, right);
          return compareStudents(leftStudent ?? ({ name: '' } as PlatformUser), rightStudent ?? ({ name: '' } as PlatformUser));
        }),
    [currentUser.schoolId, data]
  );
  const staff = useMemo(
    () =>
      data.users
        .filter(
          (user) =>
            (user.role === 'teacher' || user.role === 'supervisor' || user.role === 'lab') &&
            user.schoolId === currentUser.schoolId &&
            user.status === 'active'
        )
        .sort((left, right) => left.role.localeCompare(right.role) || sortByName(left, right)),
    [currentUser.schoolId, data.users]
  );
  const studentClassGroups = useMemo(() => {
    const groups = new Map<string, { label: string; students: PlatformUser[] }>();
    students.forEach((student) => {
      const key = `${student.schoolYear ?? ''}|${student.stream ?? ''}|${(student.classGroup ?? '').trim().toLowerCase()}`;
      const existing = groups.get(key) ?? { label: classLabel(language, student), students: [] };
      existing.students.push(student);
      groups.set(key, existing);
    });
    return [...groups.values()];
  }, [language, students]);
  const staffCards = useMemo(
    () =>
      data.canteenCards
        .filter((card) => card.schoolId === currentUser.schoolId && staff.some((user) => user.id === card.studentId))
        .sort((left, right) => {
          const leftHolder = studentForCard(data, left);
          const rightHolder = studentForCard(data, right);
          return (
            (leftHolder?.role ?? '').localeCompare(rightHolder?.role ?? '') ||
            sortByName(leftHolder ?? ({ name: '' } as PlatformUser), rightHolder ?? ({ name: '' } as PlatformUser))
          );
        }),
    [currentUser.schoolId, data, staff]
  );
  const dailyScans = useMemo(() => allowedScansForDate(data, currentUser.schoolId, selectedDate), [currentUser.schoolId, data, selectedDate]);
  const monthlyStats = useMemo(() => monthlyCanteenStats(data, currentUser.schoolId, selectedMonth, language), [currentUser.schoolId, data, language, selectedMonth]);

  const issueCard = (student: PlatformUser) => {
    setData((previous) => {
      if (cardForStudent(previous, student.id)) {
        return previous;
      }

      const existingCodes = [
        ...previous.canteenCards.map((card) => card.code),
        ...previous.accountCodes,
        ...previous.studentActivations.map((activation) => activation.code)
      ];

      return {
        ...previous,
        canteenCards: [
          ...previous.canteenCards,
          {
            id: makeId('meal-card'),
            schoolId: currentUser.schoolId ?? '',
            studentId: student.id,
            code: generateUniqueCode(existingCodes),
            status: 'active',
            createdBy: currentUser.id,
            createdAt: new Date().toISOString()
          }
        ]
      };
    });
  };

  const toggleCard = (card: CanteenCard) => {
    setData((previous) => ({
      ...previous,
      canteenCards: previous.canteenCards.map((candidate) =>
        candidate.id === card.id
          ? { ...candidate, status: candidate.status === 'active' ? 'disabled' : 'active', updatedAt: new Date().toISOString() }
          : candidate
      )
    }));
  };

  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);

  useBackShortcut(() => {
    if (selectedClassKey) {
      setSelectedClassKey(null);
      return true;
    }
    return false;
  });

  const selectedClassGroup = selectedClassKey ? studentClassGroups.find((group) => group.label === selectedClassKey) : undefined;

  return (
    <section className="content-grid canteen-view">
      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'canteenCardsHint')}</p>
            <h2>{tr(language, 'canteenCards')}</h2>
          </div>
          <QrCode size={24} aria-hidden="true" />
        </div>
        <div className="button-row">
          <button className="button ghost" type="button" disabled={cards.length === 0} onClick={() => void printCanteenCards(language, data, cards)}>
            <Printer size={17} aria-hidden="true" />
            <span>{tr(language, 'printAllCanteenCards')}</span>
          </button>
        </div>
        {!selectedClassKey && (
          <>
            {studentClassGroups.length === 0 && <p className="empty-state">{tr(language, 'noStudentsInSelectedClass')}</p>}
            <div className="user-groups">
              {studentClassGroups.map((group) => {
                const issuedCount = group.students.filter((student) => Boolean(cardForStudent(data, student.id))).length;
                return (
                  <button type="button" className="user-group drill-row" key={group.label} onClick={() => setSelectedClassKey(group.label)}>
                    <span className="user-group-title">
                      <span className="user-group-label">
                        <Users size={16} aria-hidden="true" />
                        <span className="user-group-label-name">{group.label}</span>
                      </span>
                      <span className="user-group-meta">
                        <strong>
                          {tr(language, 'studentCount')}: {group.students.length}
                        </strong>
                        <strong>
                          {tr(language, 'canteenCards')}: {issuedCount}
                        </strong>
                        <ChevronRight size={17} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedClassGroup && (
          <>
            <button type="button" className="back-button full" onClick={() => setSelectedClassKey(null)}>
              <ArrowLeft size={15} aria-hidden="true" />
              <span>{tr(language, 'back')}</span>
            </button>
            <div className="drill-heading">
              <div className="absence-report-actions">
                <button
                  className="button ghost"
                  type="button"
                  disabled={!selectedClassGroup.students.some((student) => Boolean(cardForStudent(data, student.id)))}
                  onClick={() =>
                    void printCanteenCards(
                      language,
                      data,
                      data.canteenCards.filter(
                        (card) => card.schoolId === currentUser.schoolId && selectedClassGroup.students.some((student) => student.id === card.studentId)
                      )
                    )
                  }
                >
                  <Printer size={17} aria-hidden="true" />
                  <span>{tr(language, 'printCanteenCardsForClass')}</span>
                </button>
              </div>
              <h3>{selectedClassGroup.label}</h3>
              <ResponsiveTable
                columns={[tr(language, 'fullName'), tr(language, 'canteenCardCode'), tr(language, 'status'), tr(language, 'actions')]}
                emptyText={tr(language, 'noStudentsInSelectedClass')}
              >
                {selectedClassGroup.students.map((student) => {
                  const card = cardForStudent(data, student.id);
                  return (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td dir="ltr">{card?.code ?? '-'}</td>
                      <td>
                        {card ? (
                          <span className={`status ${card.status}`}>{tr(language, card.status === 'active' ? 'activeCard' : 'disabledCard')}</span>
                        ) : (
                          <span className="muted-cell">-</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {card ? (
                            <>
                              <button className="button ghost small" type="button" onClick={() => void printCanteenCards(language, data, [card])}>
                                <Printer size={15} aria-hidden="true" />
                                <span>{tr(language, 'printCanteenCard')}</span>
                              </button>
                              <button className="button ghost small" type="button" onClick={() => toggleCard(card)}>
                                <span>{card.status === 'active' ? tr(language, 'disable') : tr(language, 'activate')}</span>
                              </button>
                            </>
                          ) : (
                            <button className="button primary small" type="button" onClick={() => issueCard(student)}>
                              <QrCode size={15} aria-hidden="true" />
                              <span>{tr(language, 'issueCanteenCard')}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </ResponsiveTable>
            </div>
          </>
        )}
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'schoolStaffCardsHint')}</p>
            <h2>{tr(language, 'schoolStaff')}</h2>
          </div>
          <Users size={24} aria-hidden="true" />
        </div>
        <div className="button-row">
          <button className="button ghost" type="button" disabled={staffCards.length === 0} onClick={() => void printCanteenCards(language, data, staffCards)}>
            <Printer size={17} aria-hidden="true" />
            <span>{tr(language, 'printAllCanteenCards')}</span>
          </button>
        </div>
        <ResponsiveTable columns={[tr(language, 'fullName'), tr(language, 'role'), tr(language, 'canteenCardCode'), tr(language, 'status'), tr(language, 'actions')]} emptyText={tr(language, 'noStaffCanteenCards')}>
          {staff.map((member) => {
            const card = cardForStudent(data, member.id);
            return (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>{roleNames[language][member.role]}</td>
                <td dir="ltr">{card?.code ?? '-'}</td>
                <td>
                  {card ? (
                    <span className={`status ${card.status}`}>{tr(language, card.status === 'active' ? 'activeCard' : 'disabledCard')}</span>
                  ) : (
                    <span className="muted-cell">-</span>
                  )}
                </td>
                <td>
                  <div className="table-actions">
                    {card ? (
                      <>
                        <button className="button ghost small" type="button" onClick={() => void printCanteenCards(language, data, [card])}>
                          <Printer size={15} aria-hidden="true" />
                          <span>{tr(language, 'printCanteenCard')}</span>
                        </button>
                        <button className="button ghost small" type="button" onClick={() => toggleCard(card)}>
                          <span>{card.status === 'active' ? tr(language, 'disable') : tr(language, 'activate')}</span>
                        </button>
                      </>
                    ) : (
                      <button className="button primary small" type="button" onClick={() => issueCard(member)}>
                        <QrCode size={15} aria-hidden="true" />
                        <span>{tr(language, 'issueCanteenCard')}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </ResponsiveTable>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'dailyCanteenReportHint')}</p>
            <h2>{tr(language, 'dailyCanteenReport')}</h2>
          </div>
          <Utensils size={24} aria-hidden="true" />
        </div>
        <label className="form-field">
          <span>{tr(language, 'mealDate')}</span>
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        </label>
        <div className="absence-report-stats">
          <div className="absence-report-stat">
            <span>{tr(language, 'eatingStudentsCount')}</span>
            <strong>{dailyScans.length}</strong>
          </div>
        </div>
        <button className="button ghost" type="button" disabled={dailyScans.length === 0} onClick={() => printDailyReport(language, data, currentUser, selectedDate)}>
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printDailyReport')}</span>
        </button>
        <ResponsiveTable columns={[tr(language, 'fullName'), tr(language, 'classGroup'), tr(language, 'scannedAt')]} emptyText={tr(language, 'noCanteenScans')}>
          {dailyScans.map((scan) => {
            const student = scan.studentId ? data.users.find((user) => user.id === scan.studentId) : undefined;
            return (
              <tr key={scan.id}>
                <td>{student?.name ?? '-'}</td>
                <td>{classLabel(language, student)}</td>
                <td>{formatDateTime(language, scan.scannedAt)}</td>
              </tr>
            );
          })}
        </ResponsiveTable>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'monthlyCanteenReportHint')}</p>
            <h2>{tr(language, 'monthlyCanteenReport')}</h2>
          </div>
          <Printer size={24} aria-hidden="true" />
        </div>
        <label className="form-field">
          <span>{tr(language, 'reportMonth')}</span>
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
        <button className="button ghost" type="button" disabled={monthlyStats.length === 0} onClick={() => printMonthlyReport(language, data, currentUser, selectedMonth)}>
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printMonthlyReport')}</span>
        </button>
        <ResponsiveTable columns={[tr(language, 'classGroup'), tr(language, 'mealsCount'), tr(language, 'eatingStudentsCount')]} emptyText={tr(language, 'noCanteenScans')}>
          {monthlyStats.map((group) => (
            <tr key={group.label}>
              <td>{group.label}</td>
              <td>{group.mealCount}</td>
              <td>{group.studentIds.size}</td>
            </tr>
          ))}
        </ResponsiveTable>
      </div>
    </section>
  );
}

function CanteenWorkerView({
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
  const [manualCode, setManualCode] = useState('');
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);
  const [scanNotice, setScanNotice] = useState<'idle' | 'success'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const eatenTodayCount = useMemo(() => {
    const eatenStudents = new Set(
      data.canteenMealScans
        .filter(
          (scan) =>
            scan.schoolId === currentUser.schoolId &&
            scan.date === localDateKey() &&
            scan.result === 'allowed' &&
            scan.studentId
        )
        .map((scan) => scan.studentId as string)
    );
    return eatenStudents.size;
  }, [currentUser.schoolId, data.canteenMealScans]);

  const stopScanner = useCallback(() => {
    if (scanTimeoutRef.current) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerActive(false);
  }, []);

  useEffect(() => () => stopScanner(), [stopScanner]);

  useEffect(() => {
    if (scanNotice !== 'success') {
      return undefined;
    }

    const noticeTimer = window.setTimeout(() => setScanNotice('idle'), 2400);
    return () => window.clearTimeout(noticeTimer);
  }, [scanNotice]);

  const processCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) {
        return;
      }

      let nextOutcome: ScanOutcome | null = null;
      setData((previous) => {
        const evaluation = evaluateCanteenScan(previous, currentUser, code);
        nextOutcome = evaluation.outcome;
        return evaluation.data;
      });
      setScanNotice('success');
      setScanOutcome(nextOutcome);
      setManualCode('');
    },
    [currentUser, setData]
  );

  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(tr(language, 'cameraNotAvailable'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Detector = barcodeDetectorConstructor();
      const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
      const scanCanvas = document.createElement('canvas');
      setCameraError('');
      setScanNotice('idle');
      setScannerActive(true);

      const runScan = async () => {
        if (!streamRef.current || !videoRef.current) {
          return;
        }

        try {
          const code = await readQrCodeFromVideo(videoRef.current, scanCanvas, detector);
          const now = Date.now();
          if (code && (!lastScanRef.current || lastScanRef.current.code !== code || now - lastScanRef.current.at > 6000)) {
            lastScanRef.current = { code, at: now };
            processCode(code);
          }
        } catch {
          setCameraError('');
        }

        scanTimeoutRef.current = window.setTimeout(runScan, 450);
      };

      scanTimeoutRef.current = window.setTimeout(runScan, 350);
    } catch {
      setCameraError(tr(language, 'cameraNotAvailable'));
      stopScanner();
    }
  };

  const submitManualCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    processCode(manualCode);
  };

  return (
    <section className="content-grid canteen-view">
      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{formatDate(language, localDateKey())}</p>
            <h2>{tr(language, 'dailyCanteenReport')}</h2>
          </div>
          <Utensils size={24} aria-hidden="true" />
        </div>
        <div className="absence-report-stats">
          <div className="absence-report-stat">
            <span>{tr(language, 'eatingStudentsCount')}</span>
            <strong>{eatenTodayCount}</strong>
          </div>
        </div>
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'mealScannerHint')}</p>
            <h2>{tr(language, 'mealScanner')}</h2>
          </div>
          <ScanLine size={24} aria-hidden="true" />
        </div>
        <div className="canteen-scanner-layout">
          <div className="canteen-camera-box">
            <video ref={videoRef} playsInline muted />
            {scannerActive && (
              <div className={scanNotice === 'success' ? 'canteen-scan-overlay success' : 'canteen-scan-overlay'}>
                <div className="canteen-scan-frame" aria-hidden="true">
                  <span className="canteen-scan-line" />
                  <span className="canteen-scan-label">
                    {tr(language, scanNotice === 'success' ? 'scanSuccess' : 'scannerFrameHint')}
                  </span>
                </div>
              </div>
            )}
            {!scannerActive && (
              <div className="canteen-camera-placeholder">
                <QrCode size={44} aria-hidden="true" />
                <span>{tr(language, 'scannerFrameHint')}</span>
              </div>
            )}
          </div>
          <div className="canteen-scan-controls">
            <div className="button-row">
              {scannerActive ? (
                <button className="button ghost" type="button" onClick={stopScanner}>
                  <XCircle size={17} aria-hidden="true" />
                  <span>{tr(language, 'stopScanner')}</span>
                </button>
              ) : (
                <button className="button primary" type="button" onClick={() => void startScanner()}>
                  <ScanLine size={17} aria-hidden="true" />
                  <span>{tr(language, 'startScanner')}</span>
                </button>
              )}
            </div>
            <form className="form-grid" onSubmit={submitManualCode}>
              <label className="full">
                <span>{tr(language, 'cardCode')}</span>
                <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} dir="ltr" />
              </label>
              <button className="button primary form-submit" type="submit">
                <CheckCircle2 size={17} aria-hidden="true" />
                <span>{tr(language, 'verifyCard')}</span>
              </button>
            </form>
            {cameraError && <p className="form-error">{cameraError}</p>}
            {scanNotice === 'success' && (
              <p className="success-message" aria-live="polite">
                {tr(language, 'scanSuccess')}
              </p>
            )}
            {scanOutcome && (
              <div className={`canteen-result ${resultClass(scanOutcome.result)}`}>
                {scanOutcome.result === 'allowed' ? <CheckCircle2 size={22} aria-hidden="true" /> : scanOutcome.result === 'duplicate' ? <AlertTriangle size={22} aria-hidden="true" /> : <XCircle size={22} aria-hidden="true" />}
                <div>
                  <span>{tr(language, 'scanResult')}</span>
                  <strong>{resultLabel(language, scanOutcome.result)}</strong>
                  <small>{scanOutcome.student?.name ?? scanOutcome.scan.code}</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CanteenView({
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
  if (currentUser.role === 'director') {
    return <DirectorCanteenView data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  return <CanteenWorkerView data={data} setData={setData} currentUser={currentUser} language={language} />;
}
