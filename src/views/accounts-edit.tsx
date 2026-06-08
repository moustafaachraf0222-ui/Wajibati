import { Edit3, Plus, Save, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  AccountEditState,
  AccountStatus,
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  SecondaryStream,
  Stage,
  Subject
} from '../types';
import {
  schoolYearLabel,
  schoolYearNames,
  stageNames,
  statusNames,
  tr
} from '../i18n';
import {
  defaultClassGroups,
  normalizeClassGroup,
  normalizeTeacherSubjectsByYear,
  normalizeYearClassGroups,
  normalizeYearStreamClassGroups,
  sameClassGroup,
  secondaryStreams,
  secondaryStreamLabel,
  secondaryStreamsForYear,
  stages,
  subjectOptionLabel,
  subjectOptionsForTeacherYear,
  uniqueNumbers
} from '../education';
import { canEditUser, getSchool, makeAccountEditState } from '../data';
import { Field, RoleLabel } from '../ui';

export function AccountEditPanel({
  data,
  setData,
  currentUser,
  target,
  language,
  onClose,
  onSaved
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  target: PlatformUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const targetSchool = getSchool(data, target);
  const [edit, setEdit] = useState<AccountEditState>(() => makeAccountEditState(target, data));
  const [error, setError] = useState('');
  const editStage = target.role === 'director' ? edit.stage : target.stage ?? targetSchool?.stage ?? 'middle';
  const studentStreamOptions = secondaryStreamsForYear(targetSchool, edit.schoolYear);
  const availableYearLabels = schoolYearNames[language][editStage];

  useEffect(() => {
    setEdit(makeAccountEditState(target, data));
    setError('');
  }, [target.id, data]);

  useEffect(() => {
    if (target.role !== 'teacher') {
      return;
    }

    setEdit((previous) => {
      const nextSubjects = { ...previous.subjectsByYear };
      let changed = false;

      Object.keys(nextSubjects).forEach((year) => {
        if (!previous.schoolYears.includes(Number(year))) {
          delete nextSubjects[year];
          changed = true;
        }
      });

      previous.schoolYears.forEach((year) => {
        const key = String(year);
        const options = subjectOptionsForTeacherYear(targetSchool, previous.yearStreamClassGroups, year);
        const selected = nextSubjects[key];

        if (!selected || !options.includes(selected as Subject)) {
          nextSubjects[key] = options[0] ?? '';
          changed = true;
        }
      });

      const firstSubject = previous.schoolYears.map((year) => nextSubjects[String(year)]).find(Boolean) as Subject | undefined;
      if (firstSubject && previous.subject !== firstSubject) {
        changed = true;
      }

      return changed ? { ...previous, subjectsByYear: nextSubjects, subject: firstSubject ?? previous.subject } : previous;
    });
  }, [target.role, targetSchool, edit.schoolYears, edit.yearStreamClassGroups]);

  useEffect(() => {
    if (target.role !== 'student' || editStage !== 'secondary') {
      return;
    }

    const nextStream = studentStreamOptions.includes(edit.stream as SecondaryStream) ? edit.stream : studentStreamOptions[0] ?? '';

    if (nextStream !== edit.stream) {
      setEdit((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [edit.schoolYear, edit.stream, editStage, studentStreamOptions, target.role]);

  const toggleTeacherYear = (year: number) => {
    setEdit((previous) => {
      const years = previous.schoolYears.includes(year)
        ? previous.schoolYears.filter((selected) => selected !== year)
        : uniqueNumbers([...previous.schoolYears, year]);
      const yearClassGroups = { ...previous.yearClassGroups };
      const yearStreamClassGroups = { ...previous.yearStreamClassGroups };

      if (years.includes(year) && !yearClassGroups[String(year)]) {
        yearClassGroups[String(year)] = ['1'];
      }
      const streamsForYear = secondaryStreamsForYear(targetSchool, year);
      const streamChoiceByYear = { ...previous.streamChoiceByYear };
      if (years.includes(year) && editStage === 'secondary' && streamsForYear[0] && !streamChoiceByYear[String(year)]) {
        streamChoiceByYear[String(year)] = streamsForYear[0];
      }
      if (!years.includes(year)) {
        delete yearClassGroups[String(year)];
        delete yearStreamClassGroups[String(year)];
        delete streamChoiceByYear[String(year)];
      }

      return { ...previous, schoolYears: years, yearClassGroups, yearStreamClassGroups, streamChoiceByYear };
    });
  };

  const addTeacherClassForYear = (year: number) => {
    setEdit((previous) => {
      const key = String(year);
      const choice = previous.classChoiceByYear[key] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[key] ?? '') : choice;
      if (!nextClass || (previous.yearClassGroups[key] ?? []).some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearClassGroups: { ...previous.yearClassGroups, [key]: [...(previous.yearClassGroups[key] ?? []), nextClass] },
        customClassByYear: { ...previous.customClassByYear, [key]: '' }
      };
    });
  };

  const removeTeacherClassForYear = (year: number, classGroup: string) => {
    setEdit((previous) => {
      const key = String(year);
      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: (previous.yearClassGroups[key] ?? []).filter((group) => !sameClassGroup(group, classGroup))
        }
      };
    });
  };

  const addTeacherStreamClassForYear = (year: number) => {
    setEdit((previous) => {
      const yearKey = String(year);
      const streamOptionsForYear = secondaryStreamsForYear(targetSchool, year);
      const savedStream = previous.streamChoiceByYear[yearKey];
      const stream = savedStream && streamOptionsForYear.includes(savedStream) ? savedStream : streamOptionsForYear[0];
      if (!stream) {
        return previous;
      }

      const classKey = `${yearKey}:${stream}`;
      const choice = previous.classChoiceByYear[classKey] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[classKey] ?? '') : choice;
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const existing = currentYear[stream] ?? [];
      if (!nextClass || existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: { ...currentYear, [stream]: [...existing, nextClass] }
        },
        customClassByYear: { ...previous.customClassByYear, [classKey]: '' }
      };
    });
  };

  const removeTeacherStreamClassForYear = (year: number, stream: SecondaryStream, classGroup: string) => {
    setEdit((previous) => {
      const yearKey = String(year);
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const nextClasses = (currentYear[stream] ?? []).filter((group) => !sameClassGroup(group, classGroup));
      const nextYear = { ...currentYear };

      if (nextClasses.length > 0) {
        nextYear[stream] = nextClasses;
      } else {
        delete nextYear[stream];
      }

      return { ...previous, yearStreamClassGroups: { ...previous.yearStreamClassGroups, [yearKey]: nextYear } };
    });
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditUser(currentUser, target)) {
      return;
    }

    const normalizedEmail = edit.email.trim().toLowerCase();
    if (data.users.some((user) => user.id !== target.id && user.email.toLowerCase() === normalizedEmail)) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    const teacherYearClassGroups = normalizeYearClassGroups(edit.yearClassGroups);
    const teacherYearStreamClassGroups = normalizeYearStreamClassGroups(edit.yearStreamClassGroups);
    const teacherSubjectsByYear = normalizeTeacherSubjectsByYear(targetSchool, edit.schoolYears, teacherYearStreamClassGroups, edit.subjectsByYear, edit.subject);
    const studentClassGroup = edit.classChoice === 'custom' ? normalizeClassGroup(edit.customClassGroup) : edit.classChoice;

    if (target.role === 'teacher') {
      if (edit.schoolYears.length === 0) {
        setError(tr(language, 'yearRequired'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => secondaryStreamsForYear(targetSchool, year).length === 0)
      ) {
        setError(tr(language, 'noStreamsEnabled'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).length === 0)
      ) {
        setError(tr(language, 'classesRequired'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => {
          const streamsForYear = secondaryStreamsForYear(targetSchool, year);
          return Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).some((stream) => !streamsForYear.includes(stream as SecondaryStream));
        })
      ) {
        setError(tr(language, 'streamRequired'));
        return;
      }
      if (editStage !== 'secondary' && edit.schoolYears.some((year) => (teacherYearClassGroups[String(year)] ?? []).length === 0)) {
        setError(tr(language, 'classesRequired'));
        return;
      }
      if (edit.schoolYears.some((year) => !teacherSubjectsByYear[String(year)])) {
        setError(tr(language, 'subjectRequired'));
        return;
      }
    }

    if (target.role === 'student') {
      if (!studentClassGroup.trim()) {
        setError(tr(language, 'classRequired'));
        return;
      }
      if (editStage === 'secondary' && studentStreamOptions.length === 0) {
        setError(tr(language, 'noStreamsEnabled'));
        return;
      }
      if (editStage === 'secondary' && (!edit.stream || !studentStreamOptions.includes(edit.stream))) {
        setError(tr(language, 'streamRequired'));
        return;
      }
    }

    const primaryYear = target.role === 'teacher' ? edit.schoolYears[0] : edit.schoolYear;
    const primarySubject = target.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      target.role === 'teacher' && editStage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : target.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : studentClassGroup.trim();

    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((school) =>
        target.role === 'director' && school.id === target.schoolId
          ? {
              ...school,
              name: edit.schoolName.trim(),
              stage: edit.stage,
              domain: edit.domain.replace(/^@/, '').trim(),
              streams: edit.stage === 'secondary' ? (school.streams?.length ? school.streams : [...secondaryStreams]) : undefined
            }
          : school
      ),
      users: previous.users.map((user) => {
        if (target.role === 'director' && user.schoolId === target.schoolId && user.id !== target.id) {
          return { ...user, stage: edit.stage, stream: edit.stage === 'secondary' ? user.stream : undefined };
        }

        if (user.id !== target.id) {
          return user;
        }

        const base = {
          ...user,
          name: edit.name.trim(),
          email: edit.email.trim(),
          password: edit.password,
          status: edit.status
        };

        if (target.role === 'director') {
          return { ...base, stage: edit.stage };
        }

        if (target.role === 'teacher') {
          return {
            ...base,
            subject: primarySubject,
            subjectsByYear: teacherSubjectsByYear,
            schoolYear: primaryYear,
            classGroup: primaryClassGroup,
            schoolYears: edit.schoolYears,
            yearClassGroups: editStage === 'secondary' ? undefined : teacherYearClassGroups,
            yearStreamClassGroups: editStage === 'secondary' ? teacherYearStreamClassGroups : undefined,
            stream: undefined
          };
        }

        if (target.role === 'student') {
          return {
            ...base,
            schoolYear: edit.schoolYear,
            classGroup: primaryClassGroup,
            stream: editStage === 'secondary' ? edit.stream || undefined : undefined
          };
        }

        return base;
      })
    }));

    setError('');
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>
            <RoleLabel role={target.role} language={language} />
          </p>
          <h2>{tr(language, 'editUser')}</h2>
        </div>
        <Edit3 size={24} aria-hidden="true" />
      </div>
      <form className="form-grid" onSubmit={saveEdit}>
        <Field label={tr(language, 'fullName')} value={edit.name} onChange={(value) => setEdit({ ...edit, name: value })} required />
        <Field label={tr(language, 'email')} value={edit.email} onChange={(value) => setEdit({ ...edit, email: value })} type="email" required />
        <Field label={tr(language, 'passwordDefault')} value={edit.password} onChange={(value) => setEdit({ ...edit, password: value })} required />
        <label>
          <span>{tr(language, 'status')}</span>
          <select value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as AccountStatus })}>
            <option value="active">{statusNames[language].active}</option>
            <option value="disabled">{statusNames[language].disabled}</option>
          </select>
        </label>

        {target.role === 'director' && currentUser.role === 'admin' && targetSchool && (
          <>
            <Field label={tr(language, 'schoolName')} value={edit.schoolName} onChange={(value) => setEdit({ ...edit, schoolName: value })} required />
            <label>
              <span>{tr(language, 'stage')}</span>
              <select value={edit.stage} onChange={(event) => setEdit({ ...edit, stage: event.target.value as Stage })}>
                {stages.map((stage) => (
                  <option value={stage} key={stage}>
                    {stageNames[language][stage]}
                  </option>
                ))}
              </select>
            </label>
            <Field label={tr(language, 'domain')} value={edit.domain} onChange={(value) => setEdit({ ...edit, domain: value })} required />
          </>
        )}

        {target.role === 'student' && (
          <>
            <label>
              <span>{tr(language, 'schoolYear')}</span>
              <select
                value={edit.schoolYear}
                onChange={(event) => {
                  const schoolYear = Number(event.target.value);
                  const streamsForYear = secondaryStreamsForYear(targetSchool, schoolYear);
                  const nextStream = streamsForYear.includes(edit.stream as SecondaryStream) ? edit.stream : streamsForYear[0] ?? '';
                  setEdit({ ...edit, schoolYear, stream: editStage === 'secondary' ? nextStream : edit.stream });
                }}
              >
                {availableYearLabels.map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {editStage === 'secondary' && (
              <label>
                <span>{tr(language, 'stream')}</span>
                <select
                  value={edit.stream}
                  disabled={studentStreamOptions.length === 0}
                  onChange={(event) => setEdit({ ...edit, stream: event.target.value as SecondaryStream | '' })}
                >
                  <option value="">{studentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                  {studentStreamOptions.map((stream) => (
                    <option value={stream} key={stream}>
                      {secondaryStreamLabel(language, stream, edit.schoolYear)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>{tr(language, 'classGroup')}</span>
              <select value={edit.classChoice} onChange={(event) => setEdit({ ...edit, classChoice: event.target.value })}>
                {defaultClassGroups.map((classGroup) => (
                  <option value={classGroup} key={classGroup}>
                    {classGroup}
                  </option>
                ))}
                <option value="custom">{tr(language, 'customClass')}</option>
              </select>
            </label>
            {edit.classChoice === 'custom' && (
              <Field label={tr(language, 'customClass')} value={edit.customClassGroup} onChange={(value) => setEdit({ ...edit, customClassGroup: value })} required />
            )}
          </>
        )}

        {target.role === 'teacher' && (
          <>
            <div className="form-field full">
              <span>{tr(language, 'schoolYears')}</span>
              <div className="checkbox-grid">
                {availableYearLabels.map((label, index) => {
                  const year = index + 1;
                  return (
                    <label className="check-option" key={label}>
                      <input type="checkbox" checked={edit.schoolYears.includes(year)} onChange={() => toggleTeacherYear(year)} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="year-class-list full">
              {edit.schoolYears.map((year) => {
                const key = String(year);
                const isSecondaryTeacher = editStage === 'secondary';
                const streamOptionsForYear = secondaryStreamsForYear(targetSchool, year);
                const savedStreamChoice = edit.streamChoiceByYear[key];
                const streamChoice =
                  savedStreamChoice && streamOptionsForYear.includes(savedStreamChoice) ? savedStreamChoice : streamOptionsForYear[0] || '';
                const streamClassKey = `${key}:${streamChoice}`;
                const classChoiceKey = isSecondaryTeacher ? streamClassKey : key;
                const choice = edit.classChoiceByYear[classChoiceKey] ?? '1';
                const selectedClasses = edit.yearClassGroups[key] ?? [];
                const selectedStreamClasses = edit.yearStreamClassGroups[key] ?? {};
                const subjectOptionsForYear = subjectOptionsForTeacherYear(targetSchool, edit.yearStreamClassGroups, year);
                const subjectChoice = edit.subjectsByYear[key] || subjectOptionsForYear[0] || '';

                return (
                  <div className="year-class-row" key={year}>
                    <strong>{schoolYearLabel(language, editStage, year)}</strong>
                    {isSecondaryTeacher ? (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={streamChoice}
                            disabled={streamOptionsForYear.length === 0}
                            onChange={(event) =>
                              setEdit({ ...edit, streamChoiceByYear: { ...edit.streamChoiceByYear, [key]: event.target.value as SecondaryStream } })
                            }
                          >
                            {streamOptionsForYear.map((stream) => (
                              <option value={stream} key={stream}>
                                {secondaryStreamLabel(language, stream, year)}
                              </option>
                            ))}
                          </select>
                          <select
                            value={choice}
                            onChange={(event) => setEdit({ ...edit, classChoiceByYear: { ...edit.classChoiceByYear, [classChoiceKey]: event.target.value } })}
                          >
                            {defaultClassGroups.map((classGroup) => (
                              <option value={classGroup} key={classGroup}>
                                {classGroup}
                              </option>
                            ))}
                            <option value="custom">{tr(language, 'customClass')}</option>
                          </select>
                          {choice === 'custom' && (
                            <input
                              value={edit.customClassByYear[classChoiceKey] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) =>
                                setEdit({ ...edit, customClassByYear: { ...edit.customClassByYear, [classChoiceKey]: event.target.value } })
                              }
                            />
                          )}
                          <button className="button ghost" type="button" onClick={() => addTeacherStreamClassForYear(year)}>
                            <Plus size={16} aria-hidden="true" />
                            <span>{tr(language, 'addClass')}</span>
                          </button>
                        </div>
                        <div className="chip-row">
                          {Object.entries(selectedStreamClasses).flatMap(([stream, classes]) =>
                            (classes ?? []).map((classGroup) => (
                              <button
                                className="chip-button"
                                type="button"
                                key={`${stream}-${classGroup}`}
                                onClick={() => removeTeacherStreamClassForYear(year, stream as SecondaryStream, classGroup)}
                              >
                                <span>{secondaryStreamLabel(language, stream as SecondaryStream, year)}: {classGroup}</span>
                                <X size={13} aria-hidden="true" />
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={choice}
                            onChange={(event) => setEdit({ ...edit, classChoiceByYear: { ...edit.classChoiceByYear, [key]: event.target.value } })}
                          >
                            {defaultClassGroups.map((classGroup) => (
                              <option value={classGroup} key={classGroup}>
                                {classGroup}
                              </option>
                            ))}
                            <option value="custom">{tr(language, 'customClass')}</option>
                          </select>
                          {choice === 'custom' && (
                            <input
                              value={edit.customClassByYear[key] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) => setEdit({ ...edit, customClassByYear: { ...edit.customClassByYear, [key]: event.target.value } })}
                            />
                          )}
                          <button className="button ghost" type="button" onClick={() => addTeacherClassForYear(year)}>
                            <Plus size={16} aria-hidden="true" />
                            <span>{tr(language, 'addClass')}</span>
                          </button>
                        </div>
                        <div className="chip-row">
                          {selectedClasses.map((classGroup) => (
                            <button className="chip-button" type="button" key={classGroup} onClick={() => removeTeacherClassForYear(year, classGroup)}>
                              <span>{classGroup}</span>
                              <X size={13} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <label className="year-subject-select">
                      <span>{tr(language, 'subject')}</span>
                      <select
                        value={subjectChoice}
                        disabled={subjectOptionsForYear.length === 0}
                        onChange={(event) =>
                          setEdit({
                            ...edit,
                            subjectsByYear: { ...edit.subjectsByYear, [key]: event.target.value as Subject }
                          })
                        }
                      >
                        {subjectOptionsForYear.length === 0 && (
                          <option value="">{tr(language, isSecondaryTeacher ? 'chooseStreamFirst' : 'subjectRequired')}</option>
                        )}
                        {subjectOptionsForYear.map((subject) => (
                          <option value={subject} key={subject}>
                            {subjectOptionLabel(language, subject, targetSchool)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
            {edit.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
          </>
        )}

        {error && <p className="form-error full">{error}</p>}
        <div className="button-row full">
          <button className="button primary" type="submit">
            <Save size={17} aria-hidden="true" />
            <span>{tr(language, 'save')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onClose}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
