import { CalendarDays, Check, ClipboardCheck, Clock, FileText, Plus, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AbsenceRecord, AbsenceSchedule, AbsenceSession, DataSetter, Language, PlatformData, PlatformUser, SecondaryStream } from '../types';
import { localeNames, schoolYearLabel, tr } from '../i18n';
import { sameClassGroup, secondaryStreamLabel } from '../education';
import { getSchool, makeId } from '../data';
import { Field, ResponsiveTable } from '../ui';

type AbsenceClassGroup = {
  key: string;
  schoolYear: number;
  stream?: SecondaryStream;
  classGroup: string;
  students: PlatformUser[];
};

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

type AbsenceReportEntry = {
  marker: PlatformUser;
  record: AbsenceRecord;
  schedule: AbsenceSchedule | undefined;
  session: AbsenceSession | undefined;
  student: PlatformUser;
};

type AbsenceReportGroup = {
  key: string;
  date: string;
  schoolYear: number;
  stream?: SecondaryStream;
  classGroup: string;
  entries: AbsenceReportEntry[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function classKey(schoolYear: number, stream: SecondaryStream | undefined, classGroup: string) {
  return `${schoolYear}:${stream ?? ''}:${classGroup.trim().toLowerCase()}`;
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
    .sort((left, right) => left.schoolYear - right.schoolYear || left.classGroup.localeCompare(right.classGroup, undefined, { numeric: true }));
}

function classLabel(language: Language, group: Pick<AbsenceClassGroup, 'schoolYear' | 'stream' | 'classGroup'>) {
  const stream = group.stream ? ` - ${secondaryStreamLabel(language, group.stream, group.schoolYear)}` : '';
  return `${schoolYearLabel(language, undefined, group.schoolYear)}${stream} - ${tr(language, 'classGroup')} ${group.classGroup}`;
}

function makeDraftSession(index: number): AbsenceSession {
  return {
    id: makeId('session'),
    name: String(index),
    startsAt: '',
    endsAt: ''
  };
}

function scheduleLabel(schedule: AbsenceSchedule) {
  return `${schedule.name} (${schedule.sessions.length})`;
}

export function AbsencesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'director') {
    return <DirectorAbsenceReports data={data} currentUser={currentUser} language={language} />;
  }

  return <SupervisorAbsenceWorkspace data={data} setData={setData} currentUser={currentUser} language={language} />;
}

function formatAbsenceDate(language: Language, value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(date);
}

function reportGroupKey(record: AbsenceRecord) {
  return `${record.date}:${record.schoolYear}:${record.stream ?? ''}:${record.classGroup.trim().toLowerCase()}`;
}

function reportSessionLabel(language: Language, entry: AbsenceReportEntry) {
  if (!entry.session) {
    return entry.record.sessionId;
  }

  return `${entry.session.name} ${entry.session.startsAt}-${entry.session.endsAt}`;
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
      date: entry.record.date,
      schoolYear: entry.record.schoolYear,
      stream: entry.record.stream,
      classGroup: entry.record.classGroup,
      entries: [entry]
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort(
        (left, right) =>
          left.student.name.localeCompare(right.student.name, undefined, { numeric: true, sensitivity: 'base' }) ||
          reportSessionLabel('ar', left).localeCompare(reportSessionLabel('ar', right), undefined, { numeric: true, sensitivity: 'base' })
      )
    }))
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.schoolYear - right.schoolYear ||
        left.classGroup.localeCompare(right.classGroup, undefined, { numeric: true, sensitivity: 'base' })
    );
}

function DirectorAbsenceReports({ data, currentUser, language }: CommonViewProps) {
  const school = getSchool(data, currentUser);
  const [selectedDate, setSelectedDate] = useState('all');
  const sessionLookup = useMemo(() => {
    const lookup = new Map<string, { schedule: AbsenceSchedule; session: AbsenceSession }>();
    data.absenceSchedules
      .filter((schedule) => schedule.schoolId === currentUser.schoolId)
      .forEach((schedule) => {
        schedule.sessions.forEach((session) => {
          lookup.set(session.id, { schedule, session });
        });
      });

    return lookup;
  }, [currentUser.schoolId, data.absenceSchedules]);

  const reportEntries = useMemo(
    () =>
      data.absenceRecords
        .map((record) => {
          const student = data.users.find((user) => user.id === record.studentId);
          if (!student || student.schoolId !== currentUser.schoolId || student.stage !== currentUser.stage) {
            return null;
          }

          const marker = data.users.find((user) => user.id === record.markedBy);
          if (marker?.role !== 'supervisor') {
            return null;
          }

          const sessionInfo = sessionLookup.get(record.sessionId);
          return {
            marker,
            record,
            schedule: sessionInfo?.schedule,
            session: sessionInfo?.session,
            student
          };
        })
        .filter((entry): entry is AbsenceReportEntry => Boolean(entry)),
    [currentUser.schoolId, currentUser.stage, data.absenceRecords, data.users, sessionLookup]
  );

  const dateOptions = useMemo(() => [...new Set(reportEntries.map((entry) => entry.record.date))].sort((left, right) => right.localeCompare(left)), [reportEntries]);
  const filteredEntries = selectedDate === 'all' ? reportEntries : reportEntries.filter((entry) => entry.record.date === selectedDate);
  const reportGroups = buildAbsenceReportGroups(filteredEntries);
  const uniqueClasses = new Set(filteredEntries.map((entry) => reportGroupKey(entry.record)));
  const uniqueStudents = new Set(filteredEntries.map((entry) => entry.student.id));
  const uniqueMarkers = new Set(filteredEntries.map((entry) => entry.marker.id));

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
        </div>
        <div className="absence-report-stats">
          <div className="absence-report-stat">
            <span>{tr(language, 'absenceMarkCount')}</span>
            <strong>{filteredEntries.length}</strong>
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
            <p>{tr(language, 'directorAbsenceReportHint')}</p>
            <h2>{tr(language, 'finalAbsenceReport')}</h2>
          </div>
          <ClipboardCheck size={24} aria-hidden="true" />
        </div>
        <div className="absence-report-list">
          {reportGroups.length === 0 && <p className="empty-state">{tr(language, 'noAbsenceReports')}</p>}
          {reportGroups.map((group) => (
            <details className="absence-report-group" key={group.key} open>
              <summary>
                <span className="absence-report-group-title">
                  <strong>{classLabel(language, group)}</strong>
                  <small>{formatAbsenceDate(language, group.date)}</small>
                </span>
                <span className="absence-report-count">{group.entries.length}</span>
              </summary>
              <ResponsiveTable
                columns={[tr(language, 'fullName'), tr(language, 'session'), tr(language, 'reportedBy'), tr(language, 'absenceDate')]}
                emptyText={tr(language, 'noAbsenceReports')}
              >
                {group.entries.map((entry) => (
                  <tr key={entry.record.id}>
                    <td>{entry.student.name}</td>
                    <td>{reportSessionLabel(language, entry)}</td>
                    <td>{entry.marker?.name ?? '-'}</td>
                    <td>{formatAbsenceDate(language, entry.record.date)}</td>
                  </tr>
                ))}
              </ResponsiveTable>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupervisorAbsenceWorkspace({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const classGroups = useMemo(() => classesForAbsences(data, currentUser), [data, currentUser]);
  const schedules = data.absenceSchedules.filter((schedule) => schedule.schoolId === currentUser.schoolId);
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [draftSchedule, setDraftSchedule] = useState(() => ({
    name: '',
    sessions: [makeDraftSession(1)]
  }));

  useEffect(() => {
    if (!selectedClassKey && classGroups[0]) {
      setSelectedClassKey(classGroups[0].key);
    }
  }, [classGroups, selectedClassKey]);

  useEffect(() => {
    if (selectedScheduleId && schedules.some((schedule) => schedule.id === selectedScheduleId)) {
      return;
    }

    setSelectedScheduleId(schedules[0]?.id ?? '');
  }, [schedules, selectedScheduleId]);

  const selectedClass = classGroups.find((group) => group.key === selectedClassKey) ?? classGroups[0];
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);
  const absenceRecordsForSelection = selectedClass
    ? data.absenceRecords.filter(
        (record) =>
          record.schoolId === currentUser.schoolId &&
          record.date === selectedDate &&
          record.schoolYear === selectedClass.schoolYear &&
          record.stream === selectedClass.stream &&
          sameClassGroup(record.classGroup, selectedClass.classGroup)
      )
    : [];
  const absentCount = absenceRecordsForSelection.length;

  const updateDraftSession = (sessionId: string, patch: Partial<AbsenceSession>) => {
    setDraftSchedule((previous) => ({
      ...previous,
      sessions: previous.sessions.map((session) => (session.id === sessionId ? { ...session, ...patch } : session))
    }));
  };

  const removeDraftSession = (sessionId: string) => {
    setDraftSchedule((previous) => ({
      ...previous,
      sessions: previous.sessions.length > 1 ? previous.sessions.filter((session) => session.id !== sessionId) : previous.sessions
    }));
  };

  const saveSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser.schoolId) {
      return;
    }

    const sessions = draftSchedule.sessions
      .map((session, index) => ({
        ...session,
        name: session.name.trim() || String(index + 1),
        startsAt: session.startsAt.trim(),
        endsAt: session.endsAt.trim()
      }))
      .filter((session) => session.startsAt && session.endsAt);

    if (sessions.length === 0) {
      setScheduleError(tr(language, 'sessionRequired'));
      return;
    }

    const schedule: AbsenceSchedule = {
      id: makeId('schedule'),
      schoolId: currentUser.schoolId,
      name: draftSchedule.name.trim() || tr(language, 'dailySchedule'),
      sessions,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };

    setData((previous) => ({
      ...previous,
      absenceSchedules: [...previous.absenceSchedules, schedule]
    }));
    setSelectedScheduleId(schedule.id);
    setDraftSchedule({ name: '', sessions: [makeDraftSession(1)] });
    setScheduleError('');
  };

  const isAbsent = (studentId: string, sessionId: string) =>
    Boolean(absenceRecordsForSelection.find((record) => record.studentId === studentId && record.sessionId === sessionId));

  const toggleAbsence = (student: PlatformUser, session: AbsenceSession) => {
    if (!selectedClass || !currentUser.schoolId) {
      return;
    }
    const schoolId = currentUser.schoolId;

    setData((previous) => {
      const existing = previous.absenceRecords.find(
        (record) =>
          record.studentId === student.id &&
          record.sessionId === session.id &&
          record.date === selectedDate &&
          record.schoolId === schoolId &&
          record.schoolYear === selectedClass.schoolYear &&
          record.stream === selectedClass.stream &&
          sameClassGroup(record.classGroup, selectedClass.classGroup)
      );

      if (existing) {
        return {
          ...previous,
          absenceRecords: previous.absenceRecords.filter((record) => record.id !== existing.id)
        };
      }

      return {
        ...previous,
        absenceRecords: [
          ...previous.absenceRecords,
          {
            id: makeId('absence'),
            schoolId,
            schoolYear: selectedClass.schoolYear,
            stream: selectedClass.stream,
            classGroup: selectedClass.classGroup,
            date: selectedDate,
            sessionId: session.id,
            studentId: student.id,
            markedBy: currentUser.id,
            createdAt: new Date().toISOString()
          }
        ]
      };
    });
  };

  return (
    <section className="content-grid absences-view">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{school?.name ?? tr(language, 'school')}</p>
            <h2>{tr(language, 'absenceTracking')}</h2>
          </div>
          <ClipboardCheck size={24} aria-hidden="true" />
        </div>
        <p className="hint">{tr(language, 'absenceClassList')}</p>
        <div className="absence-class-list">
          {classGroups.length === 0 && <p className="empty-state">{tr(language, 'noClassesForAbsence')}</p>}
          {classGroups.map((group) => (
            <button
              className={group.key === selectedClass?.key ? 'absence-class-button active' : 'absence-class-button'}
              type="button"
              key={group.key}
              onClick={() => setSelectedClassKey(group.key)}
            >
              <strong>{classLabel(language, group)}</strong>
              <span>
                {tr(language, 'studentCount')}: {group.students.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'reuseScheduleHint')}</p>
            <h2>{tr(language, 'scheduleReference')}</h2>
          </div>
          <Clock size={24} aria-hidden="true" />
        </div>
        <form className="schedule-editor" onSubmit={saveSchedule}>
          <Field label={tr(language, 'scheduleName')} value={draftSchedule.name} onChange={(value) => setDraftSchedule({ ...draftSchedule, name: value })} />
          <div className="schedule-session-list">
            {draftSchedule.sessions.map((session, index) => (
              <div className="schedule-session-row" key={session.id}>
                <input
                  aria-label={tr(language, 'sessionName')}
                  value={session.name}
                  placeholder={`${tr(language, 'sessionName')} ${index + 1}`}
                  onChange={(event) => updateDraftSession(session.id, { name: event.target.value })}
                />
                <input
                  aria-label={tr(language, 'startsAt')}
                  type="time"
                  value={session.startsAt}
                  onChange={(event) => updateDraftSession(session.id, { startsAt: event.target.value })}
                />
                <input
                  aria-label={tr(language, 'endsAt')}
                  type="time"
                  value={session.endsAt}
                  onChange={(event) => updateDraftSession(session.id, { endsAt: event.target.value })}
                />
                <button className="icon-button danger" type="button" title={tr(language, 'removeSession')} onClick={() => removeDraftSession(session.id)}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {scheduleError && <p className="form-error">{scheduleError}</p>}
          <div className="button-row">
            <button
              className="button ghost"
              type="button"
              onClick={() => setDraftSchedule((previous) => ({ ...previous, sessions: [...previous.sessions, makeDraftSession(previous.sessions.length + 1)] }))}
            >
              <Plus size={17} aria-hidden="true" />
              <span>{tr(language, 'addSession')}</span>
            </button>
            <button className="button primary" type="submit">
              <Save size={17} aria-hidden="true" />
              <span>{tr(language, 'saveSchedule')}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="panel full">
        <div className="panel-heading">
          <div>
            <p>{selectedClass ? classLabel(language, selectedClass) : tr(language, 'selectedClass')}</p>
            <h2>{tr(language, 'markAbsences')}</h2>
          </div>
          <CalendarDays size={24} aria-hidden="true" />
        </div>
        <div className="absence-toolbar">
          <label>
            <span>{tr(language, 'absenceDate')}</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
          <label>
            <span>{tr(language, 'dailySchedule')}</span>
            <select value={selectedScheduleId} onChange={(event) => setSelectedScheduleId(event.target.value)}>
              <option value="">{schedules.length === 0 ? tr(language, 'noSchedules') : tr(language, 'scheduleReference')}</option>
              {schedules.map((schedule) => (
                <option value={schedule.id} key={schedule.id}>
                  {scheduleLabel(schedule)}
                </option>
              ))}
            </select>
          </label>
          <div className="absence-summary">
            <span>{tr(language, 'studentCount')}: {selectedClass?.students.length ?? 0}</span>
            <strong>{tr(language, 'absentCount')}: {absentCount}</strong>
          </div>
        </div>
        <p className="hint">{selectedSchedule ? tr(language, 'absenceGridHint') : tr(language, 'scheduleRequired')}</p>
        {selectedClass && selectedSchedule ? (
          <ResponsiveTable
            columns={[tr(language, 'fullName'), ...selectedSchedule.sessions.map((session) => `${session.name} ${session.startsAt}-${session.endsAt}`)]}
            emptyText={tr(language, 'noRecords')}
          >
            {selectedClass.students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                {selectedSchedule.sessions.map((session) => {
                  const checked = isAbsent(student.id, session.id);
                  return (
                    <td key={`${student.id}-${session.id}`}>
                      <label className={checked ? 'absence-check absent' : 'absence-check'}>
                        <input type="checkbox" checked={checked} onChange={() => toggleAbsence(student, session)} />
                        <span>
                          {checked ? <X size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                          {tr(language, checked ? 'absent' : 'present')}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </ResponsiveTable>
        ) : (
          <p className="empty-state">{selectedClass ? tr(language, 'scheduleRequired') : tr(language, 'noClassesForAbsence')}</p>
        )}
      </div>
    </section>
  );
}
