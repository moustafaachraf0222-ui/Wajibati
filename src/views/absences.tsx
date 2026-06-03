import { CalendarDays, Check, ClipboardCheck, FileText, Printer, Save, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  AbsenceRecord,
  AbsenceReport,
  AbsenceSchedule,
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  SecondaryStream
} from '../types';
import { localeNames, schoolYearLabel, tr } from '../i18n';
import { sameClassGroup, secondaryStreamLabel } from '../education';
import { getSchool, makeId } from '../data';
import { ResponsiveTable } from '../ui';

type AbsenceClassGroup = {
  key: string;
  schoolYear: number;
  stream?: SecondaryStream;
  classGroup: string;
  students: PlatformUser[];
};

type AbsenceReportEntry = {
  marker: PlatformUser;
  record: AbsenceRecord;
  report: AbsenceReport;
  student: PlatformUser;
};

type AbsenceReportGroup = {
  key: string;
  schoolYear: number;
  stream?: SecondaryStream;
  classGroup: string;
  entries: AbsenceReportEntry[];
};

type AbsenceReportSection = {
  entries: AbsenceReportEntry[];
  marker: PlatformUser;
  report: AbsenceReport;
};

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

const ABSENCE_REPORT_CURRENT_MS = 24 * 60 * 60 * 1000;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const fallbackSessions = [
  { id: 'session-1', name: '1', startsAt: '08:00', endsAt: '09:00' },
  { id: 'session-2', name: '2', startsAt: '09:00', endsAt: '10:00' },
  { id: 'session-3', name: '3', startsAt: '10:00', endsAt: '11:00' },
  { id: 'session-4', name: '4', startsAt: '11:00', endsAt: '12:00' },
  { id: 'session-5', name: '5', startsAt: '13:00', endsAt: '14:00' },
  { id: 'session-6', name: '6', startsAt: '14:00', endsAt: '15:00' },
  { id: 'session-7', name: '7', startsAt: '15:00', endsAt: '16:00' },
  { id: 'session-8', name: '8', startsAt: '16:00', endsAt: '17:00' }
];

function classKey(schoolYear: number, stream: SecondaryStream | undefined, classGroup: string) {
  return `${schoolYear}:${stream ?? ''}:${classGroup.trim().toLowerCase()}`;
}

function reportGroupKey(record: Pick<AbsenceRecord, 'schoolYear' | 'stream' | 'classGroup'>) {
  return classKey(record.schoolYear, record.stream, record.classGroup);
}

function sortByName(left: PlatformUser, right: PlatformUser) {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
}

function classesForAbsences(data: PlatformData, currentUser: PlatformUser): AbsenceClassGroup[] {
  const groups = new Map<string, AbsenceClassGroup>();

  data.users
    .filter(
      (user) =>
        user.role === 'student' &&
        user.schoolId === currentUser.schoolId &&
        user.stage === currentUser.stage &&
        user.schoolYear &&
        user.classGroup?.trim()
    )
    .forEach((student) => {
      const schoolYear = student.schoolYear!;
      const classGroup = student.classGroup!.trim();
      const key = classKey(schoolYear, student.stream, classGroup);
      const existing = groups.get(key);

      if (existing) {
        existing.students.push(student);
        return;
      }

      groups.set(key, {
        key,
        schoolYear,
        stream: student.stream,
        classGroup,
        students: [student]
      });
    });

  return [...groups.values()]
    .map((group) => ({ ...group, students: [...group.students].sort(sortByName) }))
    .sort(
      (left, right) =>
        left.schoolYear - right.schoolYear ||
        (left.stream ?? '').localeCompare(right.stream ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
        left.classGroup.localeCompare(right.classGroup, undefined, { numeric: true, sensitivity: 'base' })
    );
}

function classLabel(language: Language, group: Pick<AbsenceClassGroup, 'schoolYear' | 'stream' | 'classGroup'>) {
  const stream = group.stream ? ` - ${secondaryStreamLabel(language, group.stream, group.schoolYear)}` : '';
  return `${schoolYearLabel(language, undefined, group.schoolYear)}${stream} - ${tr(language, 'classGroup')} ${group.classGroup}`;
}

function targetMatchesClass(target: NonNullable<AbsenceSchedule['targets']>[number], group: Pick<AbsenceClassGroup, 'schoolYear' | 'stream' | 'classGroup'>) {
  return target.schoolYear === group.schoolYear && target.stream === group.stream && sameClassGroup(target.classGroup, group.classGroup);
}

function scheduleAppliesToClass(schedule: AbsenceSchedule, group: AbsenceClassGroup) {
  return !schedule.targets?.length || schedule.targets.some((target) => targetMatchesClass(target, group));
}

function scheduleSessionLabel(schedule: AbsenceSchedule, session: AbsenceSchedule['sessions'][number]) {
  return `${schedule.name} - ${session.name} ${session.startsAt}-${session.endsAt}`;
}

function formatAbsenceDate(language: Language, value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(date);
}

function formatAbsenceDateTime(language: Language, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function sessionIdFor(date: string, scheduleId: string, sessionId: string) {
  return `template:${date}:${scheduleId}:${sessionId}`;
}

function reportSessionLabel(report: AbsenceReport) {
  return `${report.sessionName} ${report.startsAt}-${report.endsAt}`;
}

function reportIsCurrent(report: AbsenceReport, now = Date.now()) {
  const createdAt = Date.parse(report.createdAt);
  return !Number.isFinite(createdAt) || now - createdAt < ABSENCE_REPORT_CURRENT_MS;
}

function recordMatchesSession(record: AbsenceRecord, schoolId: string, markedBy: string, date: string, sessionId: string) {
  return record.schoolId === schoolId && record.markedBy === markedBy && record.date === date && record.sessionId === sessionId;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAbsenceReportGroups(entries: AbsenceReportEntry[]) {
  const groups = new Map<string, AbsenceReportGroup>();

  entries.forEach((entry) => {
    const key = reportGroupKey(entry.record);
    const existing = groups.get(key);

    if (existing) {
      existing.entries.push(entry);
      return;
    }

    groups.set(key, {
      key,
      schoolYear: entry.record.schoolYear,
      stream: entry.record.stream,
      classGroup: entry.record.classGroup,
      entries: [entry]
    });
  });

  return [...groups.values()]
    .map((group) => ({ ...group, entries: [...group.entries].sort((left, right) => sortByName(left.student, right.student)) }))
    .sort(
      (left, right) =>
        left.schoolYear - right.schoolYear ||
        (left.stream ?? '').localeCompare(right.stream ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
        left.classGroup.localeCompare(right.classGroup, undefined, { numeric: true, sensitivity: 'base' })
    );
}

function reportSectionsForDirector(data: PlatformData, currentUser: PlatformUser, selectedDate: string): AbsenceReportSection[] {
  return data.absenceReports
    .filter((report) => report.schoolId === currentUser.schoolId && report.stage === currentUser.stage)
    .filter((report) => selectedDate === 'all' || report.date === selectedDate)
    .map((report) => {
      const marker = data.users.find((user) => user.id === report.markedBy);
      if (marker?.role !== 'supervisor') {
        return null;
      }

      const entries = data.absenceRecords
        .filter((record) => record.reportId === report.id && !record.deletedAt)
        .map((record) => {
          const student = data.users.find((user) => user.id === record.studentId);
          if (!student) {
            return null;
          }

          return { marker, record, report, student };
        })
        .filter((entry): entry is AbsenceReportEntry => Boolean(entry))
        .sort((left, right) => sortByName(left.student, right.student));

      return { entries, marker, report };
    })
    .filter((section): section is AbsenceReportSection => Boolean(section))
    .sort((left, right) => right.report.createdAt.localeCompare(left.report.createdAt));
}

function printAbsenceReports(language: Language, schoolName: string, sections: AbsenceReportSection[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const reportHtml = sections
    .map((section) => {
      const rows =
        section.entries.length === 0
          ? `<tr><td colspan="4">${escapeHtml(tr(language, 'noAbsenceReports'))}</td></tr>`
          : section.entries
              .map(
                (entry) => `
                  <tr>
                    <td>${escapeHtml(entry.student.name)}</td>
                    <td>${escapeHtml(schoolYearLabel(language, section.report.stage, entry.record.schoolYear))}</td>
                    <td>${entry.record.stream ? escapeHtml(secondaryStreamLabel(language, entry.record.stream, entry.record.schoolYear)) : '-'}</td>
                    <td>${escapeHtml(entry.record.classGroup)}</td>
                  </tr>`
              )
              .join('');

      return `
        <section>
          <h2>${escapeHtml(formatAbsenceDate(language, section.report.date))} - ${escapeHtml(reportSessionLabel(section.report))}</h2>
          <p>${escapeHtml(tr(language, 'reportedBy'))}: ${escapeHtml(section.marker.name)} | ${escapeHtml(tr(language, 'sentAt'))}: ${escapeHtml(formatAbsenceDateTime(language, section.report.createdAt))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(tr(language, 'fullName'))}</th>
                <th>${escapeHtml(tr(language, 'schoolYear'))}</th>
                <th>${escapeHtml(tr(language, 'stream'))}</th>
                <th>${escapeHtml(tr(language, 'classGroup'))}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
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
        <title>${escapeHtml(tr(language, 'finalAbsenceReport'))}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, Tahoma, sans-serif; direction: ${direction}; }
          header { border-bottom: 3px solid #006233; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0 0 6px; color: #006233; font-size: 22px; }
          h2 { margin: 22px 0 6px; color: #111827; font-size: 17px; }
          p { margin: 0 0 10px; color: #4b5563; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 9px 8px; text-align: start; vertical-align: middle; }
          th { background: #f3f4f6; color: #111827; font-weight: 700; }
          tbody tr:nth-child(even) td { background: #fafafa; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(tr(language, 'finalAbsenceReport'))}</h1>
          <p>${escapeHtml(schoolName)} - ${escapeHtml(printedAt)}</p>
        </header>
        ${reportHtml || `<p>${escapeHtml(tr(language, 'noAbsenceReports'))}</p>`}
      </body>
    </html>`);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  }, 120);
}

function AbsenceReportList({
  emptyText,
  language,
  schoolName,
  sections
}: {
  emptyText: string;
  language: Language;
  schoolName: string;
  sections: AbsenceReportSection[];
}) {
  return (
    <div className="absence-report-list">
      {sections.length === 0 && <p className="empty-state">{emptyText}</p>}
      {sections.map((section) => (
        <details className="absence-report-group" key={section.report.id} open>
          <summary>
            <span className="absence-report-group-title">
              <strong>{formatAbsenceDate(language, section.report.date)} - {reportSessionLabel(section.report)}</strong>
              <small>
                {tr(language, 'reportedBy')}: {section.marker.name} | {tr(language, 'sentAt')}: {formatAbsenceDateTime(language, section.report.createdAt)}
              </small>
            </span>
            <span className="absence-report-count">{section.entries.length}</span>
          </summary>
          <div className="absence-report-inner">
            <div className="absence-report-actions">
              <button className="button ghost" type="button" onClick={() => printAbsenceReports(language, schoolName, [section])}>
                <Printer size={17} aria-hidden="true" />
                <span>{tr(language, 'printAbsenceReport')}</span>
              </button>
            </div>
            {section.entries.length === 0 && <p className="empty-state">{tr(language, 'noAbsenceReports')}</p>}
            {buildAbsenceReportGroups(section.entries).map((group) => (
              <div className="absence-report-class" key={`${section.report.id}-${group.key}`}>
                <strong>{classLabel(language, group)}</strong>
                <ResponsiveTable columns={[tr(language, 'fullName'), tr(language, 'session')]} emptyText={tr(language, 'noAbsenceReports')}>
                  {group.entries.map((entry) => (
                    <tr key={entry.record.id}>
                      <td>{entry.student.name}</td>
                      <td>{reportSessionLabel(section.report)}</td>
                    </tr>
                  ))}
                </ResponsiveTable>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function AbsencesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'director') {
    return <DirectorAbsenceReports data={data} currentUser={currentUser} language={language} />;
  }

  return <SupervisorAbsenceWorkspace data={data} setData={setData} currentUser={currentUser} language={language} />;
}

function DirectorAbsenceReports({ data, currentUser, language }: CommonViewProps) {
  const school = getSchool(data, currentUser);
  const [selectedDate, setSelectedDate] = useState('all');
  const [now, setNow] = useState(() => Date.now());
  const dateOptions = useMemo(
    () =>
      [...new Set(data.absenceReports.filter((report) => report.schoolId === currentUser.schoolId && report.stage === currentUser.stage).map((report) => report.date))].sort(
        (left, right) => right.localeCompare(left)
      ),
    [currentUser.schoolId, currentUser.stage, data.absenceReports]
  );
  const reportSections = useMemo(() => reportSectionsForDirector(data, currentUser, selectedDate), [currentUser, data, selectedDate]);
  const currentReportSections = useMemo(() => reportSections.filter((section) => reportIsCurrent(section.report, now)), [now, reportSections]);
  const historyReportSections = useMemo(() => reportSections.filter((section) => !reportIsCurrent(section.report, now)), [now, reportSections]);
  const currentReportEntries = currentReportSections.flatMap((section) => section.entries);
  const uniqueClasses = new Set(currentReportEntries.map((entry) => reportGroupKey(entry.record)));
  const uniqueStudents = new Set(currentReportEntries.map((entry) => entry.student.id));
  const uniqueMarkers = new Set(currentReportSections.map((section) => section.marker.id));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedDate !== 'all' && !dateOptions.includes(selectedDate)) {
      setSelectedDate('all');
    }
  }, [dateOptions, selectedDate]);

  return (
    <section className="content-grid absences-view">
      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{school?.name ?? tr(language, 'school')}</p>
            <h2>{tr(language, 'finalAbsenceReport')}</h2>
          </div>
          <FileText size={24} aria-hidden="true" />
        </div>
        <p className="hint">{tr(language, 'directorAbsenceReportHint')}</p>
        <div className="absence-report-toolbar">
          <label>
            <span>{tr(language, 'reportDateFilter')}</span>
            <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}>
              <option value="all">{tr(language, 'allDates')}</option>
              {dateOptions.map((date) => (
                <option value={date} key={date}>
                  {formatAbsenceDate(language, date)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button ghost"
            type="button"
            disabled={currentReportSections.length === 0}
            onClick={() => printAbsenceReports(language, school?.name ?? '-', currentReportSections)}
          >
            <Printer size={17} aria-hidden="true" />
            <span>{tr(language, 'printCurrentAbsenceReports')}</span>
          </button>
        </div>
        <div className="absence-report-stats">
          <div className="absence-report-stat">
            <span>{tr(language, 'currentAbsenceReports')}</span>
            <strong>{currentReportSections.length}</strong>
          </div>
          <div className="absence-report-stat">
            <span>{tr(language, 'absenceMarkCount')}</span>
            <strong>{currentReportEntries.length}</strong>
          </div>
          <div className="absence-report-stat">
            <span>{tr(language, 'reportedClassCount')}</span>
            <strong>{uniqueClasses.size}</strong>
          </div>
          <div className="absence-report-stat">
            <span>{tr(language, 'reportedStudentCount')}</span>
            <strong>{uniqueStudents.size}</strong>
          </div>
          <div className="absence-report-stat">
            <span>{tr(language, 'reportingSupervisors')}</span>
            <strong>{uniqueMarkers.size}</strong>
          </div>
        </div>
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'currentAbsenceReportsHint')}</p>
            <h2>{tr(language, 'currentAbsenceReports')}</h2>
          </div>
          <ClipboardCheck size={24} aria-hidden="true" />
        </div>
        <AbsenceReportList
          emptyText={tr(language, 'noCurrentAbsenceReports')}
          language={language}
          schoolName={school?.name ?? '-'}
          sections={currentReportSections}
        />
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'absenceHistoryHint')}</p>
            <h2>{tr(language, 'absenceHistory')}</h2>
          </div>
          <FileText size={24} aria-hidden="true" />
        </div>
        <div className="absence-report-toolbar compact">
          <button
            className="button ghost"
            type="button"
            disabled={historyReportSections.length === 0}
            onClick={() => printAbsenceReports(language, school?.name ?? '-', historyReportSections)}
          >
            <Printer size={17} aria-hidden="true" />
            <span>{tr(language, 'printHistoryAbsenceReports')}</span>
          </button>
        </div>
        <AbsenceReportList
          emptyText={tr(language, 'noAbsenceHistory')}
          language={language}
          schoolName={school?.name ?? '-'}
          sections={historyReportSections}
        />
      </div>
    </section>
  );
}

function SupervisorAbsenceWorkspace({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const classGroups = useMemo(() => classesForAbsences(data, currentUser), [data, currentUser]);
  const schedules = useMemo(
    () => data.absenceSchedules.filter((schedule) => schedule.schoolId === currentUser.schoolId && (!schedule.stage || schedule.stage === currentUser.stage)),
    [currentUser.schoolId, currentUser.stage, data.absenceSchedules]
  );
  const fallbackSchedule = useMemo<AbsenceSchedule>(
    () => ({
      id: `fixed:${currentUser.schoolId ?? 'school'}:${currentUser.stage ?? 'stage'}`,
      schoolId: currentUser.schoolId ?? '',
      stage: currentUser.stage,
      name: tr(language, 'dailySchedule'),
      sessions: fallbackSessions,
      createdBy: 'system',
      createdAt: ''
    }),
    [currentUser.schoolId, currentUser.stage, language]
  );
  const effectiveSchedules = schedules.length > 0 ? schedules : [fallbackSchedule];
  const sessionChoices = useMemo(
    () =>
      effectiveSchedules.flatMap((schedule) =>
        schedule.sessions.map((session) => ({
          key: `${schedule.id}:${session.id}`,
          schedule,
          session
        }))
      ),
    [effectiveSchedules]
  );
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedSessionKey, setSelectedSessionKey] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedStream, setSelectedStream] = useState<SecondaryStream | ''>('');
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const yearOptions = useMemo(() => [...new Set(classGroups.map((group) => group.schoolYear))].sort((left, right) => left - right), [classGroups]);

  useEffect(() => {
    if (!sessionChoices.some((choice) => choice.key === selectedSessionKey)) {
      setSelectedSessionKey(sessionChoices[0]?.key ?? '');
    }
  }, [selectedSessionKey, sessionChoices]);

  useEffect(() => {
    if ((!selectedYear || !yearOptions.includes(selectedYear)) && yearOptions[0]) {
      setSelectedYear(yearOptions[0]);
    }
  }, [selectedYear, yearOptions]);

  const streamOptions = useMemo(() => {
    if (currentUser.stage !== 'secondary' || !selectedYear) {
      return [];
    }

    return [...new Set(classGroups.filter((group) => group.schoolYear === selectedYear).map((group) => group.stream).filter((stream): stream is SecondaryStream => Boolean(stream)))];
  }, [classGroups, currentUser.stage, selectedYear]);

  useEffect(() => {
    if (currentUser.stage !== 'secondary') {
      if (selectedStream) {
        setSelectedStream('');
      }
      return;
    }

    if ((!selectedStream || !streamOptions.includes(selectedStream)) && streamOptions[0]) {
      setSelectedStream(streamOptions[0]);
    }
  }, [currentUser.stage, selectedStream, streamOptions]);

  const classOptions = useMemo(
    () =>
      classGroups.filter(
        (group) =>
          group.schoolYear === selectedYear &&
          (currentUser.stage !== 'secondary' || (selectedStream ? group.stream === selectedStream : true))
      ),
    [classGroups, currentUser.stage, selectedStream, selectedYear]
  );

  useEffect(() => {
    if (!classOptions.some((group) => group.key === selectedClassKey)) {
      setSelectedClassKey(classOptions[0]?.key ?? '');
    }
  }, [classOptions, selectedClassKey]);

  const selectedClass = classOptions.find((group) => group.key === selectedClassKey);
  const selectedSessionChoice = sessionChoices.find((choice) => choice.key === selectedSessionKey);
  const selectedSchedule = selectedSessionChoice?.schedule;
  const selectedSession = selectedSessionChoice?.session;
  const sessionReady = Boolean(selectedDate && selectedSchedule && selectedSession);
  const currentSessionName = selectedSession?.name ?? tr(language, 'session');
  const currentSessionId = selectedSchedule && selectedSession ? sessionIdFor(selectedDate, selectedSchedule.id, selectedSession.id) : '';
  const sentReport = currentSessionId
    ? data.absenceReports.find(
        (report) =>
          report.schoolId === currentUser.schoolId &&
          report.markedBy === currentUser.id &&
          report.date === selectedDate &&
          report.sessionId === currentSessionId
      )
    : undefined;
  const allRecordsForSession = currentSessionId
    ? data.absenceRecords.filter((record) => recordMatchesSession(record, currentUser.schoolId ?? '', currentUser.id, selectedDate, currentSessionId))
    : [];
  const recordsForSession = allRecordsForSession.filter((record) => !record.deletedAt);
  const recordsForSelection =
    selectedClass && currentSessionId
      ? recordsForSession.filter(
          (record) =>
            record.schoolYear === selectedClass.schoolYear &&
            record.stream === selectedClass.stream &&
            sameClassGroup(record.classGroup, selectedClass.classGroup)
        )
      : [];
  const draftAbsenceCount = recordsForSession.filter((record) => !record.sentAt).length;
  const draftClassCount = new Set(recordsForSession.map(reportGroupKey)).size;
  const absentCount = recordsForSelection.length;
  const selectedSessionAppliesToClass = Boolean(selectedClass && selectedSchedule && scheduleAppliesToClass(selectedSchedule, selectedClass));
  const canEditSelectedClass = Boolean(selectedClass && sessionReady && selectedSessionAppliesToClass && !sentReport);

  const saveClassAbsences = () => {
    setNotice('');
    setError('');

    if (!selectedClass || !sessionReady) {
      setError(tr(language, 'scheduleRequired'));
      return;
    }

    if (!selectedSessionAppliesToClass) {
      setError(tr(language, 'sessionNotAssignedToClass'));
      return;
    }

    if (sentReport) {
      setNotice(tr(language, 'absenceReportAlreadySent'));
      return;
    }

    setNotice(tr(language, 'classAbsencesSaved'));
  };

  const isAbsent = (studentId: string) => recordsForSelection.some((record) => record.studentId === studentId);

  const toggleAbsence = (student: PlatformUser) => {
    setNotice('');
    setError('');

    if (!canEditSelectedClass || !selectedClass || !selectedSchedule || !selectedSession || !currentUser.schoolId || !currentUser.stage || !currentSessionId) {
      return;
    }

    setData((previous) => {
      const existing = previous.absenceRecords.find(
        (record) =>
          record.studentId === student.id &&
          recordMatchesSession(record, currentUser.schoolId!, currentUser.id, selectedDate, currentSessionId) &&
          record.schoolYear === selectedClass.schoolYear &&
          record.stream === selectedClass.stream &&
          sameClassGroup(record.classGroup, selectedClass.classGroup)
      );

      if (existing?.sentAt) {
        return previous;
      }

      if (existing) {
        return {
          ...previous,
          absenceRecords: previous.absenceRecords.map((record) => {
            if (record.id !== existing.id) {
              return record;
            }

            const updatedAt = new Date().toISOString();
            if (existing.deletedAt) {
              const { deletedAt: _deletedAt, ...restoredRecord } = record;
              return {
                ...restoredRecord,
                scheduleId: selectedSchedule.id,
                sessionName: currentSessionName,
                startsAt: selectedSession.startsAt,
                endsAt: selectedSession.endsAt,
                updatedAt
              };
            }

            return {
              ...record,
              deletedAt: updatedAt,
              updatedAt
            };
          })
        };
      }

      return {
        ...previous,
        absenceRecords: [
          ...previous.absenceRecords,
          {
            id: makeId('absence'),
            schoolId: currentUser.schoolId!,
            schoolYear: selectedClass.schoolYear,
            stream: selectedClass.stream,
            classGroup: selectedClass.classGroup,
            date: selectedDate,
            sessionId: currentSessionId,
            scheduleId: selectedSchedule.id,
            sessionName: currentSessionName,
            startsAt: selectedSession.startsAt,
            endsAt: selectedSession.endsAt,
            studentId: student.id,
            markedBy: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    });
  };

  const sendAbsenceReport = () => {
    setNotice('');
    setError('');

    if (!currentUser.schoolId || !currentUser.stage || !selectedSchedule || !selectedSession || !sessionReady || !currentSessionId) {
      setError(tr(language, 'scheduleRequired'));
      return;
    }

    if (sentReport) {
      setNotice(tr(language, 'absenceReportAlreadySent'));
      return;
    }

    const sentAt = new Date().toISOString();
    const report: AbsenceReport = {
      id: makeId('absence-report'),
      schoolId: currentUser.schoolId,
      stage: currentUser.stage,
      date: selectedDate,
      sessionId: currentSessionId,
      scheduleId: selectedSchedule.id,
      sessionName: currentSessionName,
      startsAt: selectedSession.startsAt,
      endsAt: selectedSession.endsAt,
      markedBy: currentUser.id,
      createdAt: sentAt
    };

    setData((previous) => ({
      ...previous,
      absenceReports: [...previous.absenceReports, report],
      absenceRecords: previous.absenceRecords.map((record) =>
        recordMatchesSession(record, currentUser.schoolId!, currentUser.id, selectedDate, currentSessionId) && !record.sentAt && !record.deletedAt
          ? {
              ...record,
              reportId: report.id,
              sentAt,
              scheduleId: selectedSchedule.id,
              sessionName: currentSessionName,
              startsAt: selectedSession.startsAt,
              endsAt: selectedSession.endsAt
            }
          : record
      )
    }));
    setNotice(tr(language, 'absenceReportSent'));
  };

  return (
    <section className="content-grid absences-view">
      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{school?.name ?? tr(language, 'school')}</p>
            <h2>{tr(language, 'absenceTracking')}</h2>
          </div>
          <ClipboardCheck size={24} aria-hidden="true" />
        </div>
        <p className="hint">{tr(language, 'supervisorAbsenceFlowHint')}</p>
        <div className="absence-session-grid">
          <label>
            <span>{tr(language, 'absenceDate')}</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <div className="form-field absence-session-choice">
            <span>{tr(language, 'session')}</span>
            <div className="checkbox-grid">
              {sessionChoices.map((choice) => (
                <label className="check-option" key={choice.key}>
                  <input
                    type="radio"
                    name="absence-session"
                    value={choice.key}
                    checked={selectedSessionKey === choice.key}
                    disabled={sessionChoices.length === 0}
                    onChange={(event) => setSelectedSessionKey(event.target.value)}
                  />
                  <span>{scheduleSessionLabel(choice.schedule, choice.session)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="absence-flow-summary">
          <span>{tr(language, 'draftAbsenceCount')}: {draftAbsenceCount}</span>
          <span>{tr(language, 'reportedClassCount')}: {draftClassCount}</span>
          <strong>{sentReport ? tr(language, 'absenceReportAlreadySent') : tr(language, 'draftReport')}</strong>
          <button className="button primary" type="button" disabled={!sessionReady || Boolean(sentReport)} onClick={sendAbsenceReport}>
            <Send size={17} aria-hidden="true" />
            <span>{tr(language, 'sendAbsenceReport')}</span>
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'chooseAbsenceTarget')}</p>
            <h2>{tr(language, 'absenceClasses')}</h2>
          </div>
          <CalendarDays size={24} aria-hidden="true" />
        </div>
        <div className="absence-target-grid">
          <label>
            <span>{tr(language, 'schoolYear')}</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {yearOptions.map((year) => (
                <option value={year} key={year}>
                  {schoolYearLabel(language, currentUser.stage, year)}
                </option>
              ))}
            </select>
          </label>
          {currentUser.stage === 'secondary' && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select value={selectedStream} onChange={(event) => setSelectedStream(event.target.value as SecondaryStream)}>
                {streamOptions.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, Number(selectedYear))}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{tr(language, 'classGroup')}</span>
            <select value={selectedClassKey} onChange={(event) => setSelectedClassKey(event.target.value)}>
              {classOptions.map((group) => (
                <option value={group.key} key={group.key}>
                  {group.classGroup}
                </option>
              ))}
            </select>
          </label>
        </div>
        {classGroups.length === 0 && <p className="empty-state">{tr(language, 'noClassesForAbsence')}</p>}
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{selectedClass ? classLabel(language, selectedClass) : tr(language, 'selectedClass')}</p>
            <h2>{tr(language, 'markAbsences')}</h2>
          </div>
          <ClipboardCheck size={24} aria-hidden="true" />
        </div>
        <div className="absence-summary-row">
          <div className="absence-summary">
            <span>{tr(language, 'studentCount')}: {selectedClass?.students.length ?? 0}</span>
            <strong>{tr(language, 'absentCount')}: {absentCount}</strong>
          </div>
          <div className="button-row">
            <button className="button ghost" type="button" disabled={!canEditSelectedClass} onClick={saveClassAbsences}>
              <Save size={17} aria-hidden="true" />
              <span>{tr(language, 'saveClassAbsences')}</span>
            </button>
          </div>
        </div>
        <p className="hint">
          {sentReport
            ? tr(language, 'absenceReportAlreadySent')
            : selectedClass && !selectedSessionAppliesToClass
              ? tr(language, 'sessionNotAssignedToClass')
              : tr(language, 'absenceGridHint')}
        </p>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="success-message">{notice}</p>}
        {selectedClass ? (
          <ResponsiveTable columns={[tr(language, 'absent'), tr(language, 'fullName')]} emptyText={tr(language, 'noRecords')}>
            {selectedClass.students.map((student) => {
              const checked = isAbsent(student.id);
              return (
                <tr key={student.id}>
                  <td>
                    <label className={checked ? 'absence-check absent' : 'absence-check'}>
                      <input type="checkbox" checked={checked} disabled={!canEditSelectedClass} onChange={() => toggleAbsence(student)} />
                      <span>
                        {checked ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                        {tr(language, checked ? 'absent' : 'present')}
                      </span>
                    </label>
                  </td>
                  <td>{student.name}</td>
                </tr>
              );
            })}
          </ResponsiveTable>
        ) : (
          <p className="empty-state">{tr(language, 'noClassesForAbsence')}</p>
        )}
      </div>
    </section>
  );
}
