import { CalendarDays, Check, ClipboardCheck, Edit3, FileText, Plus, Printer, Save, Send, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AbsenceRecord,
  AbsenceReport,
  AbsenceSchedule,
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  SecondaryStream,
  Stage
} from '../types';
import { localeNames, schoolYearLabel, tr } from '../i18n';
import { assignedYearClassGroups, assignedYearStreamClassGroups, sameClassGroup, secondaryStreamLabel, uniqueStrings } from '../education';
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

type MonthlyAbsenceStudentSummary = {
  absenceCount: number;
  student: PlatformUser;
};

type MonthlyAbsenceClassSummary = {
  absenceCount: number;
  absenceRate: number;
  classGroup: string;
  key: string;
  possibleMarks: number;
  schoolYear: number;
  sessionCount: number;
  stream?: SecondaryStream;
  studentCount: number;
  students: MonthlyAbsenceStudentSummary[];
};

type AbsenceSessionChoice = {
  key: string;
  schedule: AbsenceSchedule;
  session: AbsenceSchedule['sessions'][number];
};

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

const ABSENCE_REPORT_CURRENT_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SCHOOL_WEEKDAYS = [0, 1, 2, 3, 4];

const weekdayNames: Record<Language, string[]> = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

function localDateIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function todayIso() {
  return localDateIso(new Date());
}

function currentMonthValue() {
  return todayIso().slice(0, 7);
}

function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return todayIso();
  }

  parsed.setDate(parsed.getDate() + days);
  return localDateIso(parsed);
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

function primaryPeriodSessions(language: Language): AbsenceSchedule['sessions'] {
  return [
    { id: 'primary-morning', name: tr(language, 'morningPeriod'), startsAt: '08:00', endsAt: '12:00' },
    { id: 'primary-afternoon', name: tr(language, 'afternoonPeriod'), startsAt: '13:00', endsAt: '17:00' }
  ];
}

function classKey(schoolYear: number, stream: SecondaryStream | undefined, classGroup: string) {
  return `${schoolYear}:${stream ?? ''}:${classGroup.trim().toLowerCase()}`;
}

function reportGroupKey(record: Pick<AbsenceRecord, 'schoolYear' | 'stream' | 'classGroup'>) {
  return classKey(record.schoolYear, record.stream, record.classGroup);
}

function sortByName(left: PlatformUser, right: PlatformUser) {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });
}

function teacherCanMarkStudentAbsence(teacher: PlatformUser, student: PlatformUser) {
  const streamGroups = assignedYearStreamClassGroups(teacher);
  const streamEntries = Object.entries(streamGroups);
  if (streamEntries.length > 0) {
    const yearGroups = streamGroups[String(student.schoolYear)] ?? {};
    if (student.stream) {
      return Boolean(yearGroups[student.stream]?.some((group) => sameClassGroup(group, student.classGroup)));
    }

    return Object.values(yearGroups).some((groups) => groups?.some((group) => sameClassGroup(group, student.classGroup)));
  }

  const classGroups = assignedYearClassGroups(teacher);
  return Boolean(classGroups[String(student.schoolYear)]?.some((group) => sameClassGroup(group, student.classGroup)));
}

function assignedAbsenceGroupsForTeacher(teacher: PlatformUser) {
  const groups = new Map<string, AbsenceClassGroup>();
  const streamGroups = assignedYearStreamClassGroups(teacher);
  const streamEntries = Object.entries(streamGroups);

  if (streamEntries.length > 0) {
    streamEntries.forEach(([year, streams]) => {
      const schoolYear = Number(year);
      if (!Number.isInteger(schoolYear) || schoolYear <= 0) {
        return;
      }

      Object.entries(streams).forEach(([stream, classGroups]) => {
        (classGroups ?? []).forEach((classGroup) => {
          const normalizedClassGroup = classGroup.trim();
          if (!normalizedClassGroup) {
            return;
          }

          const key = classKey(schoolYear, stream as SecondaryStream, normalizedClassGroup);
          groups.set(key, {
            key,
            schoolYear,
            stream: stream as SecondaryStream,
            classGroup: normalizedClassGroup,
            students: []
          });
        });
      });
    });

    return groups;
  }

  Object.entries(assignedYearClassGroups(teacher)).forEach(([year, classGroups]) => {
    const schoolYear = Number(year);
    if (!Number.isInteger(schoolYear) || schoolYear <= 0) {
      return;
    }

    classGroups.forEach((classGroup) => {
      const normalizedClassGroup = classGroup.trim();
      if (!normalizedClassGroup) {
        return;
      }

      const key = classKey(schoolYear, undefined, normalizedClassGroup);
      groups.set(key, {
        key,
        schoolYear,
        classGroup: normalizedClassGroup,
        students: []
      });
    });
  });

  return groups;
}

function classesForAbsences(data: PlatformData, currentUser: PlatformUser): AbsenceClassGroup[] {
  const groups = currentUser.role === 'teacher' ? assignedAbsenceGroupsForTeacher(currentUser) : new Map<string, AbsenceClassGroup>();

  data.users
    .filter(
      (user) =>
        user.role === 'student' &&
        user.schoolId === currentUser.schoolId &&
        user.stage === currentUser.stage &&
        user.schoolYear &&
        user.classGroup?.trim() &&
        (currentUser.role !== 'teacher' || teacherCanMarkStudentAbsence(currentUser, user))
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

function classLabel(language: Language, group: Pick<AbsenceClassGroup, 'schoolYear' | 'stream' | 'classGroup'>, stage?: Stage) {
  const stream = group.stream ? ` - ${secondaryStreamLabel(language, group.stream, group.schoolYear)}` : '';
  return `${schoolYearLabel(language, stage, group.schoolYear)}${stream} - ${tr(language, 'classGroup')} ${group.classGroup}`;
}

function classTargetKey(target: Pick<NonNullable<AbsenceSchedule['targets']>[number], 'schoolYear' | 'stream' | 'classGroup'>) {
  return `${target.schoolYear}|${target.stream ?? ''}|${target.classGroup.trim().toLowerCase()}`;
}

function targetMatchesClass(target: NonNullable<AbsenceSchedule['targets']>[number], group: Pick<AbsenceClassGroup, 'schoolYear' | 'stream' | 'classGroup'>) {
  return target.schoolYear === group.schoolYear && target.stream === group.stream && sameClassGroup(target.classGroup, group.classGroup);
}

function scheduleAppliesToClass(schedule: AbsenceSchedule, group: AbsenceClassGroup) {
  if (schedule.appliesToAll) {
    return true;
  }

  return Boolean(schedule.targets?.some((target) => targetMatchesClass(target, group)));
}

function weekdayForDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getDay();
}

function scheduleAppliesToDate(schedule: AbsenceSchedule, date: string) {
  const weekday = weekdayForDate(date);
  const weekdays = schedule.weekdays?.length ? schedule.weekdays : DEFAULT_SCHOOL_WEEKDAYS;
  return weekday === undefined || weekdays.includes(weekday);
}

function closestScheduleDate(date: string, schedules: AbsenceSchedule[]) {
  for (let offset = 0; offset <= 14; offset += 1) {
    const candidate = addDaysIso(date, offset);
    if (schedules.some((schedule) => scheduleAppliesToDate(schedule, candidate))) {
      return candidate;
    }
  }

  return date;
}

function sessionTimeLabel(choice: AbsenceSessionChoice) {
  return `${choice.session.startsAt}-${choice.session.endsAt}`;
}

function scheduleWeekdayLabel(language: Language, schedule: AbsenceSchedule) {
  return (schedule.weekdays?.length ? schedule.weekdays : DEFAULT_SCHOOL_WEEKDAYS)
    .map((weekday) => weekdayNames[language][weekday] ?? String(weekday))
    .join('، ');
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

function formatAbsenceMonth(language: Language, month: string) {
  const date = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat(localeNames[language], { month: 'long', year: 'numeric' }).format(date);
}

function formatAbsencePercent(language: Language, value: number) {
  return new Intl.NumberFormat(localeNames[language], { maximumFractionDigits: 1 }).format(value);
}

function sessionIdFor(date: string, scheduleId: string, sessionId: string) {
  return `template:${date}:${scheduleId}:${sessionId}`;
}

function scheduleTimestamp(schedule: AbsenceSchedule) {
  const timestamp = Date.parse(schedule.updatedAt ?? schedule.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareSchedulesForClass(group: AbsenceClassGroup) {
  return (left: AbsenceSchedule, right: AbsenceSchedule) => {
    const leftDirectMatch = Boolean(left.targets?.some((target) => targetMatchesClass(target, group)));
    const rightDirectMatch = Boolean(right.targets?.some((target) => targetMatchesClass(target, group)));

    if (leftDirectMatch !== rightDirectMatch) {
      return leftDirectMatch ? -1 : 1;
    }

    return compareSchedulesByNewest(left, right);
  };
}

function compareSchedulesByNewest(left: AbsenceSchedule, right: AbsenceSchedule) {
  return scheduleTimestamp(right) - scheduleTimestamp(left) || right.id.localeCompare(left.id);
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
      const validMarker = marker?.role === 'supervisor' || (marker?.role === 'teacher' && report.stage === 'primary');
      if (!validMarker) {
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

function buildMonthlyAbsenceReport(data: PlatformData, currentUser: PlatformUser, month: string): MonthlyAbsenceClassSummary[] {
  const classGroups = classesForAbsences(data, currentUser);
  const sentRecords = data.absenceRecords.filter(
    (record) => record.schoolId === currentUser.schoolId && record.sentAt && !record.deletedAt && record.date.startsWith(`${month}-`)
  );

  return classGroups.map((group) => {
    const studentIds = new Set(group.students.map((student) => student.id));
    const groupRecords = sentRecords.filter(
      (record) =>
        record.schoolYear === group.schoolYear &&
        record.stream === group.stream &&
        sameClassGroup(record.classGroup, group.classGroup) &&
        studentIds.has(record.studentId)
    );
    const sessionCount = new Set(groupRecords.map((record) => record.sessionId)).size;
    const absenceCounts = new Map<string, number>();

    groupRecords.forEach((record) => {
      absenceCounts.set(record.studentId, (absenceCounts.get(record.studentId) ?? 0) + 1);
    });

    const possibleMarks = group.students.length * sessionCount;
    const absenceCount = groupRecords.length;

    return {
      key: group.key,
      schoolYear: group.schoolYear,
      stream: group.stream,
      classGroup: group.classGroup,
      studentCount: group.students.length,
      sessionCount,
      absenceCount,
      possibleMarks,
      absenceRate: possibleMarks > 0 ? (absenceCount / possibleMarks) * 100 : 0,
      students: group.students
        .map((student) => ({ student, absenceCount: absenceCounts.get(student.id) ?? 0 }))
        .sort((left, right) => right.absenceCount - left.absenceCount || sortByName(left.student, right.student))
    };
  });
}

function printMonthlyAbsenceReport(language: Language, schoolName: string, month: string, classes: MonthlyAbsenceClassSummary[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const reportHtml = classes
    .map((group) => {
      const rows =
        group.students.length === 0
          ? `<tr><td colspan="2">${escapeHtml(tr(language, 'noStudentsInSelectedClass'))}</td></tr>`
          : group.students
              .map(
                (entry) => `
                  <tr>
                    <td>${escapeHtml(entry.student.name)}</td>
                    <td>${entry.absenceCount}</td>
                  </tr>`
              )
              .join('');

      return `
        <section>
          <h2>${escapeHtml(classLabel(language, group, group.students[0]?.student.stage))}</h2>
          <p>
            ${escapeHtml(tr(language, 'studentCount'))}: ${group.studentCount}
            | ${escapeHtml(tr(language, 'recordedSessions'))}: ${group.sessionCount}
            | ${escapeHtml(tr(language, 'absenceMarkCount'))}: ${group.absenceCount}
            | ${escapeHtml(tr(language, 'absenceRate'))}: ${formatAbsencePercent(language, group.absenceRate)}%
          </p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(tr(language, 'fullName'))}</th>
                <th>${escapeHtml(tr(language, 'absentCount'))}</th>
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
        <title>${escapeHtml(tr(language, 'monthlyAbsenceReport'))}</title>
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
          <h1>${escapeHtml(tr(language, 'monthlyAbsenceReport'))}</h1>
          <p>${escapeHtml(schoolName)} - ${escapeHtml(formatAbsenceMonth(language, month))} - ${escapeHtml(printedAt)}</p>
        </header>
        ${reportHtml || `<p>${escapeHtml(tr(language, 'noMonthlyAbsenceReport'))}</p>`}
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
                <strong>{classLabel(language, group, section.report.stage)}</strong>
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

function MonthlyAbsenceReportPanel({
  data,
  currentUser,
  language,
  schoolName
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  schoolName: string;
}) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const monthlyClasses = useMemo(() => buildMonthlyAbsenceReport(data, currentUser, selectedMonth), [currentUser, data, selectedMonth]);
  const totalAbsences = monthlyClasses.reduce((sum, group) => sum + group.absenceCount, 0);
  const totalStudents = monthlyClasses.reduce((sum, group) => sum + group.studentCount, 0);
  const totalPossibleMarks = monthlyClasses.reduce((sum, group) => sum + group.possibleMarks, 0);
  const overallRate = totalPossibleMarks > 0 ? (totalAbsences / totalPossibleMarks) * 100 : 0;

  return (
    <div className="panel full">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'monthlyAbsenceReportHint')}</p>
          <h2>{tr(language, 'monthlyAbsenceReport')}</h2>
        </div>
        <CalendarDays size={24} aria-hidden="true" />
      </div>
      <div className="absence-report-toolbar">
        <label>
          <span>{tr(language, 'reportMonth')}</span>
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value || currentMonthValue())} />
        </label>
        <button
          className="button ghost"
          type="button"
          disabled={monthlyClasses.length === 0}
          onClick={() => printMonthlyAbsenceReport(language, schoolName, selectedMonth, monthlyClasses)}
        >
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printMonthlyAbsenceReport')}</span>
        </button>
      </div>
      <div className="absence-report-stats">
        <div className="absence-report-stat">
          <span>{tr(language, 'reportedClassCount')}</span>
          <strong>{monthlyClasses.length}</strong>
        </div>
        <div className="absence-report-stat">
          <span>{tr(language, 'studentCount')}</span>
          <strong>{totalStudents}</strong>
        </div>
        <div className="absence-report-stat">
          <span>{tr(language, 'absenceMarkCount')}</span>
          <strong>{totalAbsences}</strong>
        </div>
        <div className="absence-report-stat">
          <span>{tr(language, 'absenceRate')}</span>
          <strong>{formatAbsencePercent(language, overallRate)}%</strong>
        </div>
      </div>
      <div className="absence-report-list monthly-absence-list">
        {monthlyClasses.length === 0 && <p className="empty-state">{tr(language, 'noMonthlyAbsenceReport')}</p>}
        {monthlyClasses.map((group) => (
          <details className="absence-report-group" key={`${selectedMonth}-${group.key}`} open={group.absenceCount > 0}>
            <summary>
              <span className="absence-report-group-title">
                <strong>{classLabel(language, group, currentUser.stage)}</strong>
                <small>
                  {tr(language, 'studentCount')}: {group.studentCount} | {tr(language, 'recordedSessions')}: {group.sessionCount} |{' '}
                  {tr(language, 'absenceMarkCount')}: {group.absenceCount}
                </small>
              </span>
              <span className="absence-report-count">{formatAbsencePercent(language, group.absenceRate)}%</span>
            </summary>
            <div className="absence-report-inner">
              <div className="monthly-report-metrics">
                <span className="monthly-report-chip">
                  {tr(language, 'absenceRate')}: <strong>{formatAbsencePercent(language, group.absenceRate)}%</strong>
                </span>
                <span className="monthly-report-chip">
                  {tr(language, 'recordedSessions')}: <strong>{group.sessionCount}</strong>
                </span>
                <span className="monthly-report-chip">
                  {tr(language, 'absenceMarkCount')}: <strong>{group.absenceCount}</strong>
                </span>
              </div>
              <ResponsiveTable columns={[tr(language, 'fullName'), tr(language, 'absentCount')]} emptyText={tr(language, 'noStudentsInSelectedClass')}>
                {group.students.map((entry) => (
                  <tr key={`${selectedMonth}-${group.key}-${entry.student.id}`}>
                    <td>{entry.student.name}</td>
                    <td>{entry.absenceCount}</td>
                  </tr>
                ))}
              </ResponsiveTable>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function AbsencesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'director') {
    return <DirectorAbsenceReports data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'supervisor' || (currentUser.role === 'teacher' && currentUser.stage === 'primary')) {
    return <SupervisorAbsenceWorkspace data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  return <p className="empty-state">{tr(language, 'scopedData')}</p>;
}

function defaultScheduleSessions(): AbsenceSchedule['sessions'] {
  return [{ id: makeId('session'), name: '1', startsAt: '08:00', endsAt: '09:00' }];
}

function sessionTimesAreValid(sessions: AbsenceSchedule['sessions']) {
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  return sessions.every((session) => timePattern.test(session.startsAt) && timePattern.test(session.endsAt) && session.startsAt < session.endsAt);
}

function normalizeTimeInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) {
    return value.trim();
  }

  const hour = Number(match[1]);
  if (hour > 23) {
    return value.trim();
  }

  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

function normalizeScheduleSessions(sessions: AbsenceSchedule['sessions']) {
  return sessions.map((session) => ({
    ...session,
    startsAt: normalizeTimeInput(session.startsAt),
    endsAt: normalizeTimeInput(session.endsAt)
  }));
}

function DirectorScheduleManager({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const classGroups = useMemo(() => classesForAbsences(data, currentUser), [data, currentUser]);
  const schedules = useMemo(
    () => data.absenceSchedules.filter((schedule) => schedule.schoolId === currentUser.schoolId && (!schedule.stage || schedule.stage === currentUser.stage)),
    [currentUser.schoolId, currentUser.stage, data.absenceSchedules]
  );
  const [form, setForm] = useState({
    name: '',
    sessions: defaultScheduleSessions(),
    targetKeys: [] as string[],
    weekdays: [...DEFAULT_SCHOOL_WEEKDAYS],
    appliesToAll: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const updateSession = (index: number, patch: Partial<AbsenceSchedule['sessions'][number]>) => {
    setForm((previous) => ({
      ...previous,
      sessions: previous.sessions.map((session, sessionIndex) => (sessionIndex === index ? { ...session, ...patch } : session))
    }));
  };

  const addSession = () => {
    setForm((previous) => {
      const previousSession = previous.sessions[previous.sessions.length - 1];
      return {
        ...previous,
        sessions: [
          ...previous.sessions,
          {
            id: makeId('session'),
            name: String(previous.sessions.length + 1),
            startsAt: previousSession?.endsAt ?? '08:00',
            endsAt: previousSession?.endsAt ?? '09:00'
          }
        ]
      };
    });
  };

  const removeSession = (index: number) => {
    setForm((previous) => ({
      ...previous,
      sessions: previous.sessions.length > 1 ? previous.sessions.filter((_, sessionIndex) => sessionIndex !== index) : previous.sessions
    }));
  };

  const toggleWeekday = (weekday: number) => {
    setForm((previous) => {
      const weekdays = previous.weekdays.includes(weekday)
        ? previous.weekdays.filter((item) => item !== weekday)
        : [...previous.weekdays, weekday].sort((left, right) => left - right);

      return { ...previous, weekdays: weekdays.length > 0 ? weekdays : previous.weekdays };
    });
  };

  const toggleTarget = (key: string) => {
    setForm((previous) => ({
      ...previous,
      targetKeys: previous.targetKeys.includes(key) ? previous.targetKeys.filter((item) => item !== key) : [...previous.targetKeys, key]
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', sessions: defaultScheduleSessions(), targetKeys: [], weekdays: [...DEFAULT_SCHOOL_WEEKDAYS], appliesToAll: false });
  };

  const editSchedule = (schedule: AbsenceSchedule) => {
    setNotice('');
    setError('');
    setEditingId(schedule.id);
    setForm({
      name: schedule.name,
      sessions: schedule.sessions.map((session) => ({ ...session })),
      targetKeys: schedule.appliesToAll
        ? []
        : classGroups.filter((group) => schedule.targets?.some((target) => targetMatchesClass(target, group))).map((group) => group.key),
      weekdays: schedule.weekdays?.length ? [...schedule.weekdays] : [...DEFAULT_SCHOOL_WEEKDAYS],
      appliesToAll: Boolean(schedule.appliesToAll)
    });
  };

  const saveSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!currentUser.schoolId || !currentUser.stage || !form.name.trim()) {
      setError(tr(language, 'scheduleRequired'));
      return;
    }

    if (form.sessions.length === 0) {
      setError(tr(language, 'sessionRequired'));
      return;
    }

    const normalizedSessions = normalizeScheduleSessions(form.sessions);
    if (!sessionTimesAreValid(normalizedSessions)) {
      setError(tr(language, 'timeFormatRequired'));
      return;
    }

    if (!form.appliesToAll && form.targetKeys.length === 0) {
      setError(tr(language, 'scheduleTargetRequired'));
      return;
    }

    const selectedTargetKeys = form.appliesToAll ? classGroups.map((group) => group.key) : form.targetKeys;
    const targets = classGroups
      .filter((group) => selectedTargetKeys.includes(group.key))
      .map((group) => ({
        schoolYear: group.schoolYear,
        stream: group.stream,
        classGroup: group.classGroup
      }));

    if (!form.appliesToAll && targets.length === 0) {
      setError(tr(language, 'scheduleTargetRequired'));
      return;
    }

    const existingSchedule = editingId ? schedules.find((scheduleItem) => scheduleItem.id === editingId) : undefined;
    const savedAt = new Date().toISOString();
    const schedule: AbsenceSchedule = {
      id: editingId ?? makeId('schedule'),
      schoolId: currentUser.schoolId,
      stage: currentUser.stage,
      name: form.name.trim(),
      sessions: normalizedSessions.map((session) => ({ ...session, name: session.name.trim() || '1' })),
      appliesToAll: form.appliesToAll || undefined,
      targets: form.appliesToAll ? undefined : targets,
      weekdays: [...form.weekdays],
      createdBy: currentUser.id,
      createdAt: existingSchedule?.createdAt ?? savedAt,
      updatedAt: savedAt
    };
    const assignedTargetKeys = new Set(targets.map(classTargetKey));

    setData((previous) => ({
      ...previous,
      absenceSchedules: [
        ...previous.absenceSchedules.map((existingSchedule) => {
          if (existingSchedule.id === schedule.id) {
            return undefined;
          }

          if (
            existingSchedule.schoolId !== currentUser.schoolId ||
            (existingSchedule.stage && existingSchedule.stage !== currentUser.stage)
          ) {
            return existingSchedule;
          }

          if (form.appliesToAll) {
            return undefined;
          }

          if (!existingSchedule.targets?.length) {
            return existingSchedule;
          }

          const nextTargets = existingSchedule.targets.filter((target) => !assignedTargetKeys.has(classTargetKey(target)));
          return nextTargets.length === existingSchedule.targets.length ? existingSchedule : { ...existingSchedule, targets: nextTargets };
        }).filter((scheduleItem): scheduleItem is AbsenceSchedule => Boolean(scheduleItem)),
        schedule
      ]
    }));
    resetForm();
    setNotice(tr(language, editingId ? 'scheduleTemplateUpdated' : 'scheduleTemplateSaved'));
  };

  const deleteSchedule = (scheduleId: string) => {
    const schedule = schedules.find((scheduleItem) => scheduleItem.id === scheduleId);
    const message = `${tr(language, 'deleteScheduleQuestion')}\n\n${schedule?.name ?? tr(language, 'scheduleName')}\n${tr(language, 'deleteScheduleWarning')}`;

    if (!window.confirm(message)) {
      return;
    }

    setData((previous) => ({
      ...previous,
      absenceSchedules: previous.absenceSchedules.filter((schedule) => schedule.id !== scheduleId),
      deletedScheduleIds: uniqueStrings([...previous.deletedScheduleIds, scheduleId])
    }));

    if (editingId === scheduleId) {
      resetForm();
    }
  };

  return (
    <div className="panel full">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'classTimetableHint')}</p>
          <h2>{tr(language, 'classTimetables')}</h2>
        </div>
        <CalendarDays size={24} aria-hidden="true" />
      </div>

      <form className="absence-schedule-form" onSubmit={saveSchedule}>
        <label>
          <span>{tr(language, 'scheduleName')}</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={tr(language, 'dailySchedule')} />
        </label>

        <div className="form-field">
          <span>{tr(language, 'scheduleWeekdays')}</span>
          <div className="checkbox-grid">
            {weekdayNames[language].map((label, weekday) => (
              <label className="check-option" key={label}>
                <input type="checkbox" checked={form.weekdays.includes(weekday)} onChange={() => toggleWeekday(weekday)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-field">
          <span>{tr(language, 'scheduleScope')}</span>
          <label className="check-option inline-check">
            <input
              type="checkbox"
              checked={form.appliesToAll}
              onChange={(event) => setForm({ ...form, appliesToAll: event.target.checked, targetKeys: event.target.checked ? [] : form.targetKeys })}
            />
            <span>{tr(language, 'applyScheduleToSchool')}</span>
          </label>
        </div>

        <div className="form-field">
          <span>{tr(language, 'assignedClasses')}</span>
          <div className="checkbox-grid">
            {classGroups.map((group) => (
              <label className="check-option" key={group.key}>
                <input type="checkbox" checked={form.appliesToAll || form.targetKeys.includes(group.key)} disabled={form.appliesToAll} onChange={() => toggleTarget(group.key)} />
                <span>{classLabel(language, group, currentUser.stage)}</span>
              </label>
            ))}
          </div>
          {classGroups.length === 0 && <p className="empty-state">{tr(language, 'noClassesForAbsence')}</p>}
        </div>

        <div className="schedule-session-editor">
          <div className="schedule-session-heading">
            <span>{tr(language, 'sessions')}</span>
            <button className="button ghost" type="button" onClick={addSession}>
              <Plus size={17} aria-hidden="true" />
              <span>{tr(language, 'addSession')}</span>
            </button>
          </div>
          {form.sessions.map((session, index) => (
            <div className="schedule-session-row" key={session.id}>
              <label>
                <span>{tr(language, 'sessionName')}</span>
                <input value={session.name} onChange={(event) => updateSession(index, { name: event.target.value })} />
              </label>
              <label>
                <span>{tr(language, 'startsAt')}</span>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-2][0-9]:[0-5][0-9]"
                  placeholder="08:00"
                  value={session.startsAt}
                  onBlur={(event) => updateSession(index, { startsAt: normalizeTimeInput(event.target.value) })}
                  onChange={(event) => updateSession(index, { startsAt: event.target.value })}
                />
              </label>
              <label>
                <span>{tr(language, 'endsAt')}</span>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  pattern="[0-2][0-9]:[0-5][0-9]"
                  placeholder="09:00"
                  value={session.endsAt}
                  onBlur={(event) => updateSession(index, { endsAt: normalizeTimeInput(event.target.value) })}
                  onChange={(event) => updateSession(index, { endsAt: event.target.value })}
                />
              </label>
              <button className="icon-button danger" type="button" title={tr(language, 'removeSession')} onClick={() => removeSession(index)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {error && <p className="form-error full">{error}</p>}
        {notice && <p className="success-message full">{notice}</p>}
        <button className="button primary form-submit" type="submit">
          <Save size={17} aria-hidden="true" />
          <span>{tr(language, editingId ? 'updateSchedule' : 'saveSchedule')}</span>
        </button>
        {editingId && (
          <button className="button ghost form-submit" type="button" onClick={resetForm}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancelEdit')}</span>
          </button>
        )}
      </form>

      <div className="schedule-template-list">
        {schedules.length === 0 && <p className="empty-state">{tr(language, 'noSchedules')}</p>}
        {schedules.map((schedule) => (
          <article className="schedule-template-card" key={schedule.id}>
            <div>
              <strong>{schedule.name}</strong>
              <span>{scheduleWeekdayLabel(language, schedule)}</span>
              <small>{schedule.sessions.map((session) => `${session.name} ${session.startsAt}-${session.endsAt}`).join(' | ')}</small>
            </div>
            <div className="schedule-template-targets">
              {schedule.appliesToAll ? (
                <span className="assignment-chip">{tr(language, 'allSchoolClasses')}</span>
              ) : (
                (schedule.targets ?? []).map((target) => (
                  <span className="assignment-chip" key={`${schedule.id}-${target.schoolYear}-${target.stream ?? ''}-${target.classGroup}`}>
                    {classLabel(language, target, currentUser.stage)}
                  </span>
                ))
              )}
            </div>
            <div className="schedule-template-actions">
              <button className="icon-button" type="button" title={tr(language, 'editSchedule')} onClick={() => editSchedule(schedule)}>
                <Edit3 size={16} aria-hidden="true" />
              </button>
              <button className="icon-button danger" type="button" title={tr(language, 'deleteSchedule')} onClick={() => deleteSchedule(schedule.id)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function DirectorAbsenceReports({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
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
      {currentUser.stage !== 'primary' && <DirectorScheduleManager data={data} setData={setData} currentUser={currentUser} language={language} />}

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
            <span>{tr(language, currentUser.stage === 'primary' ? 'reportingTeachers' : 'reportingSupervisors')}</span>
            <strong>{uniqueMarkers.size}</strong>
          </div>
        </div>
      </div>

      <MonthlyAbsenceReportPanel data={data} currentUser={currentUser} language={language} schoolName={school?.name ?? '-'} />

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
  const primaryTeacherMode = currentUser.role === 'teacher' && currentUser.stage === 'primary';
  const classGroups = useMemo(() => classesForAbsences(data, currentUser), [data, currentUser]);
  const schedules = useMemo(
    () =>
      primaryTeacherMode
        ? []
        : data.absenceSchedules.filter((schedule) => schedule.schoolId === currentUser.schoolId && (!schedule.stage || schedule.stage === currentUser.stage)),
    [currentUser.schoolId, currentUser.stage, data.absenceSchedules, primaryTeacherMode]
  );
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedStream, setSelectedStream] = useState<SecondaryStream | ''>('');
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const yearOptions = useMemo(() => [...new Set(classGroups.map((group) => group.schoolYear))].sort((left, right) => left - right), [classGroups]);

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
  const fallbackSchedule = useMemo<AbsenceSchedule>(
    () => ({
      id: primaryTeacherMode ? `primary-fixed:${currentUser.schoolId ?? 'school'}:${selectedClass?.key ?? 'class'}` : `fixed:${currentUser.schoolId ?? 'school'}:${currentUser.stage ?? 'stage'}`,
      schoolId: currentUser.schoolId ?? '',
      stage: currentUser.stage,
      name: tr(language, 'dailySchedule'),
      sessions: primaryTeacherMode ? primaryPeriodSessions(language) : fallbackSessions,
      targets: selectedClass
        ? [
            {
              schoolYear: selectedClass.schoolYear,
              stream: selectedClass.stream,
              classGroup: selectedClass.classGroup
            }
          ]
        : undefined,
      weekdays: DEFAULT_SCHOOL_WEEKDAYS,
      createdBy: 'system',
      createdAt: ''
    }),
    [currentUser.schoolId, currentUser.stage, language, primaryTeacherMode, selectedClass]
  );
  const classSchedules = useMemo(
    () => (selectedClass ? [...schedules].filter((schedule) => scheduleAppliesToClass(schedule, selectedClass)).sort(compareSchedulesForClass(selectedClass)) : []),
    [schedules, selectedClass]
  );

  useEffect(() => {
    if (classSchedules.length === 0 || classSchedules.some((schedule) => scheduleAppliesToDate(schedule, selectedDate))) {
      return;
    }

    const nextDate = closestScheduleDate(selectedDate, classSchedules);
    if (nextDate !== selectedDate) {
      setSelectedDate(nextDate);
    }
  }, [classSchedules, selectedDate]);

  const effectiveSchedule = useMemo(
    () => classSchedules.filter((schedule) => scheduleAppliesToDate(schedule, selectedDate))[0],
    [classSchedules, selectedDate]
  );
  const sessionSchedules = useMemo(
    () => (primaryTeacherMode && selectedClass ? [fallbackSchedule] : effectiveSchedule ? [effectiveSchedule] : schedules.length === 0 && selectedClass ? [fallbackSchedule] : []),
    [effectiveSchedule, fallbackSchedule, primaryTeacherMode, schedules.length, selectedClass]
  );
  const sessionChoices = useMemo<AbsenceSessionChoice[]>(
    () =>
      sessionSchedules.flatMap((schedule) =>
        schedule.sessions.map((session) => ({
          key: `${schedule.id}:${session.id}`,
          schedule,
          session
        }))
      ).sort((left, right) => left.session.startsAt.localeCompare(right.session.startsAt) || left.session.endsAt.localeCompare(right.session.endsAt)),
    [sessionSchedules]
  );
  const selectedSessionChoices = sessionChoices;
  const sessionReady = Boolean(selectedDate && selectedSessionChoices.length > 0);
  const selectedSessionIds = useMemo(
    () => selectedSessionChoices.map((choice) => sessionIdFor(selectedDate, choice.schedule.id, choice.session.id)),
    [selectedDate, selectedSessionChoices]
  );
  const selectedSessionIdSet = useMemo(() => new Set(selectedSessionIds), [selectedSessionIds]);
  const sentSessionIds = useMemo(
    () =>
      new Set(
        data.absenceReports
          .filter(
            (report) =>
              report.schoolId === currentUser.schoolId &&
              report.markedBy === currentUser.id &&
              report.date === selectedDate &&
              selectedSessionIdSet.has(report.sessionId)
          )
          .map((report) => report.sessionId)
      ),
    [currentUser.id, currentUser.schoolId, data.absenceReports, selectedDate, selectedSessionIdSet]
  );
  const sentSelectedSessionCount = selectedSessionChoices.filter((choice) => sentSessionIds.has(sessionIdFor(selectedDate, choice.schedule.id, choice.session.id))).length;
  const allSelectedSessionsSent = selectedSessionChoices.length > 0 && sentSelectedSessionCount === selectedSessionChoices.length;
  const allRecordsForSelectedSessions =
    selectedSessionIdSet.size > 0
      ? data.absenceRecords.filter(
          (record) =>
            record.schoolId === currentUser.schoolId &&
            record.markedBy === currentUser.id &&
            record.date === selectedDate &&
            selectedSessionIdSet.has(record.sessionId)
        )
      : [];
  const recordsForSession = allRecordsForSelectedSessions.filter((record) => !record.deletedAt);
  const recordsForSelection =
    selectedClass && selectedSessionIdSet.size > 0
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
  const selectedClassHasStudents = Boolean(selectedClass?.students.length);
  const selectedSessionAppliesToClass = Boolean(
    selectedClass &&
      selectedSessionChoices.length > 0 &&
      selectedSessionChoices.every((choice) => scheduleAppliesToClass(choice.schedule, selectedClass) && scheduleAppliesToDate(choice.schedule, selectedDate))
  );
  const editableSessionChoices =
    selectedClass && selectedSessionAppliesToClass
      ? selectedSessionChoices.filter((choice) => !sentSessionIds.has(sessionIdFor(selectedDate, choice.schedule.id, choice.session.id)))
      : [];
  const canEditSelectedClass = Boolean(selectedClass && selectedClassHasStudents && sessionReady && selectedSessionAppliesToClass && editableSessionChoices.length > 0);

  const saveClassAbsences = () => {
    setNotice('');
    setError('');

    if (!selectedClass || !sessionReady) {
      setError(tr(language, 'scheduleRequired'));
      return;
    }

    if (!selectedClassHasStudents) {
      setError(tr(language, 'noStudentsInSelectedClass'));
      return;
    }

    if (!selectedSessionAppliesToClass) {
      setError(tr(language, 'sessionNotAssignedToClass'));
      return;
    }

    if (allSelectedSessionsSent) {
      setNotice(tr(language, 'absenceReportAlreadySent'));
      return;
    }

    setNotice(tr(language, 'classAbsencesSaved'));
  };

  const canEditSessionChoice = (choice: AbsenceSessionChoice) =>
    Boolean(
      selectedClass &&
        sessionReady &&
        scheduleAppliesToClass(choice.schedule, selectedClass) &&
        scheduleAppliesToDate(choice.schedule, selectedDate) &&
        !sentSessionIds.has(sessionIdFor(selectedDate, choice.schedule.id, choice.session.id))
    );

  const isAbsent = (studentId: string, choice: AbsenceSessionChoice) => {
    const choiceSessionId = sessionIdFor(selectedDate, choice.schedule.id, choice.session.id);
    return recordsForSelection.some((record) => record.studentId === studentId && record.sessionId === choiceSessionId);
  };

  const toggleAbsence = (student: PlatformUser, choice: AbsenceSessionChoice) => {
    setNotice('');
    setError('');

    if (!selectedClass || !currentUser.schoolId || !currentUser.stage || !canEditSessionChoice(choice)) {
      return;
    }

    const choiceSessionId = sessionIdFor(selectedDate, choice.schedule.id, choice.session.id);
    const choiceSessionName = choice.session.name;

    setData((previous) => {
      const existing = previous.absenceRecords.find(
        (record) =>
          record.studentId === student.id &&
          recordMatchesSession(record, currentUser.schoolId!, currentUser.id, selectedDate, choiceSessionId) &&
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
                scheduleId: choice.schedule.id,
                sessionName: choiceSessionName,
                startsAt: choice.session.startsAt,
                endsAt: choice.session.endsAt,
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
            sessionId: choiceSessionId,
            scheduleId: choice.schedule.id,
            sessionName: choiceSessionName,
            startsAt: choice.session.startsAt,
            endsAt: choice.session.endsAt,
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

    if (!currentUser.schoolId || !currentUser.stage || !sessionReady) {
      setError(tr(language, 'scheduleRequired'));
      return;
    }

    if (allSelectedSessionsSent) {
      setNotice(tr(language, 'absenceReportAlreadySent'));
      return;
    }

    const sentAt = new Date().toISOString();
    const unsentAbsenceSessionIds = new Set(recordsForSession.filter((record) => !record.sentAt).map((record) => record.sessionId));
    const reportChoices = selectedSessionChoices.filter((choice) => {
      const choiceSessionId = sessionIdFor(selectedDate, choice.schedule.id, choice.session.id);
      return unsentAbsenceSessionIds.has(choiceSessionId) && !sentSessionIds.has(choiceSessionId);
    });

    if (reportChoices.length === 0) {
      setError(tr(language, 'noUnsentAbsences'));
      return;
    }

    const reports = reportChoices.map<AbsenceReport>((choice) => ({
      id: makeId('absence-report'),
      schoolId: currentUser.schoolId!,
      stage: currentUser.stage!,
      date: selectedDate,
      sessionId: sessionIdFor(selectedDate, choice.schedule.id, choice.session.id),
      scheduleId: choice.schedule.id,
      sessionName: choice.session.name,
      startsAt: choice.session.startsAt,
      endsAt: choice.session.endsAt,
      markedBy: currentUser.id,
      createdAt: sentAt
    }));
    const reportsBySessionId = new Map(reports.map((report) => [report.sessionId, report]));
    const choicesBySessionId = new Map(reportChoices.map((choice) => [sessionIdFor(selectedDate, choice.schedule.id, choice.session.id), choice]));

    setData((previous) => ({
      ...previous,
      absenceReports: [...previous.absenceReports, ...reports],
      absenceRecords: previous.absenceRecords.map((record) =>
        record.schoolId === currentUser.schoolId &&
        record.markedBy === currentUser.id &&
        record.date === selectedDate &&
        choicesBySessionId.has(record.sessionId) &&
        !record.sentAt &&
        !record.deletedAt
          ? (() => {
              const choice = choicesBySessionId.get(record.sessionId)!;
              return {
                ...record,
                reportId: reportsBySessionId.get(record.sessionId)?.id,
                sentAt,
                scheduleId: choice.schedule.id,
                sessionName: choice.session.name,
                startsAt: choice.session.startsAt,
                endsAt: choice.session.endsAt
              };
            })()
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
        <p className="hint">{tr(language, primaryTeacherMode ? 'primaryTeacherAbsenceFlowHint' : 'supervisorAbsenceFlowHint')}</p>
        <div className="absence-target-grid with-date">
          <label>
            <span>{tr(language, 'absenceDate')}</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
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
            <p>{selectedClass ? classLabel(language, selectedClass, currentUser.stage) : tr(language, 'chooseAbsenceTarget')}</p>
            <h2>{tr(language, 'dailySchedule')}</h2>
          </div>
          <CalendarDays size={24} aria-hidden="true" />
        </div>
        <div className="supervisor-session-templates">
          {sessionSchedules.map((schedule) => (
            <article className="schedule-template-card supervisor-schedule-card" key={schedule.id}>
              <div>
                <strong>{schedule.name}</strong>
                <span>{scheduleWeekdayLabel(language, schedule)}</span>
                <small>{formatAbsenceDate(language, selectedDate)}</small>
              </div>
              <div className="checkbox-grid">
                {schedule.sessions.map((session) => (
                  <span className="timetable-session-chip" key={`${schedule.id}:${session.id}`}>
                    <strong>{session.name}</strong>
                    <small>{session.startsAt}-{session.endsAt}</small>
                  </span>
                ))}
              </div>
            </article>
          ))}
          {selectedClass && sessionSchedules.length === 0 && (
            <p className="empty-state">{tr(language, classSchedules.length > 0 ? 'scheduleNotActiveOnDate' : 'noScheduleForClassDay')}</p>
          )}
        </div>
        <div className="absence-flow-summary">
          <span>{tr(language, 'draftAbsenceCount')}: {draftAbsenceCount}</span>
          <span>{tr(language, 'reportedClassCount')}: {draftClassCount}</span>
          <strong>{allSelectedSessionsSent ? tr(language, 'absenceReportAlreadySent') : tr(language, 'draftReport')}</strong>
          <button className="button primary" type="button" disabled={!sessionReady || allSelectedSessionsSent || draftAbsenceCount === 0} onClick={sendAbsenceReport}>
            <Send size={17} aria-hidden="true" />
            <span>{tr(language, 'sendAbsenceReport')}</span>
          </button>
        </div>
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{selectedClass ? classLabel(language, selectedClass, currentUser.stage) : tr(language, 'selectedClass')}</p>
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
          {allSelectedSessionsSent
            ? tr(language, 'absenceReportAlreadySent')
            : selectedClass && !selectedClassHasStudents
              ? tr(language, 'noStudentsInSelectedClass')
            : selectedClass && selectedSessionChoices.length > 0 && !selectedSessionAppliesToClass
              ? tr(language, 'sessionNotAssignedToClass')
              : tr(language, 'absenceGridHint')}
        </p>
        {error && <p className="form-error">{error}</p>}
        {notice && <p className="success-message">{notice}</p>}
        {selectedClass ? (
          <ResponsiveTable
            columns={[tr(language, 'fullName'), ...selectedSessionChoices.map(sessionTimeLabel)]}
            emptyText={tr(language, 'noStudentsInSelectedClass')}
          >
            {selectedClass.students.map((student) => {
              return (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  {selectedSessionChoices.map((choice) => {
                    const checked = isAbsent(student.id, choice);
                    const editable = canEditSelectedClass && canEditSessionChoice(choice);
                    return (
                      <td key={`${student.id}-${choice.key}`}>
                        <label className={checked ? 'absence-check absent' : 'absence-check'}>
                          <input type="checkbox" checked={checked} disabled={!editable} onChange={() => toggleAbsence(student, choice)} />
                          <span>
                            {checked ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                            {tr(language, checked ? 'absent' : 'present')}
                          </span>
                        </label>
                      </td>
                    );
                  })}
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
