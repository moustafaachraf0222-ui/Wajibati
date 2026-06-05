import { LockKeyhole, Plus, UserPlus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  SchoolRecord,
  SecondaryStream,
  Subject,
  YearStreamClassGroups
} from '../types';
import {
  schoolYearLabel,
  schoolYearNames,
  stageNames,
  subjectNames,
  tr
} from '../i18n';
import {
  defaultClassGroups,
  normalizeClassGroup,
  normalizeTeacherSubjectsByYear,
  normalizeYearClassGroups,
  normalizeYearStreamClassGroups,
  sameClassGroup,
  secondaryStreamLabel,
  secondaryStreamsForYear,
  subjectOptionsForTeacherYear,
  uniqueNumbers
} from '../education';
import { generateSchoolEmail, generateUniqueAccountCode, makeId } from '../data';
import { Field, RoleLabel } from '../ui';

const initialBulkStudentForm = {
  names: '',
  schoolYear: 1,
  classChoice: '1',
  customClassGroup: '',
  stream: '' as SecondaryStream | ''
};

function parseStudentNameList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[\).-])\s*/, '').trim())
    .filter(Boolean);
}

function createStudentAccount({
  name,
  school,
  currentUser,
  schoolYear,
  classGroup,
  stream,
  users
}: {
  name: string;
  school: SchoolRecord;
  currentUser: PlatformUser;
  schoolYear: number;
  classGroup: string;
  stream?: SecondaryStream;
  users: PlatformUser[];
}): PlatformUser {
  return {
    id: makeId('student'),
    name,
    email: generateSchoolEmail(name, 'student', school.domain, users),
    password: generateUniqueAccountCode(users),
    role: 'student',
    status: 'active',
    schoolId: currentUser.schoolId,
    stage: currentUser.stage,
    schoolYear,
    classGroup,
    stream,
    createdBy: currentUser.id
  };
}

export function DirectorCreateAccountPanel({
  data,
  setData,
  currentUser,
  language,
  school
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  school: SchoolRecord | undefined;
}) {
  const [form, setForm] = useState({
    role: 'teacher' as 'supervisor' | 'teacher' | 'student',
    name: '',
    subject: 'math' as Subject,
    subjectsByYear: {} as Record<string, Subject | ''>,
    schoolYear: 1,
    classGroup: '',
    schoolYears: [] as number[],
    yearClassGroups: {} as Record<string, string[]>,
    yearStreamClassGroups: {} as YearStreamClassGroups,
    classChoice: '1',
    customClassGroup: '',
    streamChoiceByYear: {} as Record<string, SecondaryStream | ''>,
    classChoiceByYear: {} as Record<string, string>,
    customClassByYear: {} as Record<string, string>,
    stream: '' as SecondaryStream | ''
  });
  const [error, setError] = useState('');
  const [bulkForm, setBulkForm] = useState(initialBulkStudentForm);
  const [bulkError, setBulkError] = useState('');
  const [bulkCreatedCount, setBulkCreatedCount] = useState(0);

  const createAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!school || !currentUser.stage) {
      return;
    }

    const accountName = form.name.trim();
    if (!accountName) {
      setError(tr(language, 'nameRequired'));
      return;
    }

    const teacherYearClassGroups = normalizeYearClassGroups(form.yearClassGroups);
    const teacherYearStreamClassGroups = normalizeYearStreamClassGroups(form.yearStreamClassGroups);
    const teacherSubjectsByYear = normalizeTeacherSubjectsByYear(school, form.schoolYears, teacherYearStreamClassGroups, form.subjectsByYear, form.subject);
    const studentClassGroup = form.classChoice === 'custom' ? normalizeClassGroup(form.customClassGroup) : form.classChoice;
    const studentStreamsForYear = secondaryStreamsForYear(school, form.schoolYear);

    if (form.role === 'teacher' && form.schoolYears.length === 0) {
      setError(tr(language, 'yearRequired'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => secondaryStreamsForYear(school, year).length === 0)
    ) {
      setError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).length === 0)
    ) {
      setError(tr(language, 'classesRequired'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => {
        const streamsForYear = secondaryStreamsForYear(school, year);
        return Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).some((stream) => !streamsForYear.includes(stream as SecondaryStream));
      })
    ) {
      setError(tr(language, 'streamRequired'));
      return;
    }

    if (form.role === 'teacher' && currentUser.stage !== 'secondary' && form.schoolYears.some((year) => (teacherYearClassGroups[String(year)] ?? []).length === 0)) {
      setError(tr(language, 'classesRequired'));
      return;
    }

    if (form.role === 'teacher' && form.schoolYears.some((year) => !teacherSubjectsByYear[String(year)])) {
      setError(tr(language, 'subjectRequired'));
      return;
    }

    if (form.role === 'student' && !studentClassGroup.trim()) {
      setError(tr(language, 'classRequired'));
      return;
    }

    if (form.role === 'student' && currentUser.stage === 'secondary' && studentStreamsForYear.length === 0) {
      setError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (form.role === 'student' && currentUser.stage === 'secondary' && (!form.stream || !studentStreamsForYear.includes(form.stream))) {
      setError(tr(language, 'streamRequired'));
      return;
    }

    const primaryYear = form.role === 'teacher' ? form.schoolYears[0] : form.role === 'student' ? form.schoolYear : undefined;
    const primarySubject = form.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      form.role === 'teacher' && currentUser.stage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : form.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : form.role === 'student'
            ? studentClassGroup.trim()
            : undefined;
    setData((previous) => {
      const users = [...previous.users];
      const nextUser: PlatformUser =
        form.role === 'student'
          ? createStudentAccount({
              name: accountName,
              school,
              currentUser,
              schoolYear: form.schoolYear,
              classGroup: primaryClassGroup ?? '',
              stream: form.stream || undefined,
              users
            })
          : {
              id: makeId(form.role),
              name: accountName,
              email: generateSchoolEmail(accountName, form.role, school.domain, users),
              password: generateUniqueAccountCode(users),
              role: form.role,
              status: 'active',
              schoolId: currentUser.schoolId,
              stage: currentUser.stage,
              subject: primarySubject,
              subjectsByYear: form.role === 'teacher' ? teacherSubjectsByYear : undefined,
              schoolYear: primaryYear,
              classGroup: primaryClassGroup,
              schoolYears: form.role === 'teacher' ? form.schoolYears : undefined,
              classGroups: undefined,
              yearClassGroups: form.role === 'teacher' && currentUser.stage !== 'secondary' ? teacherYearClassGroups : undefined,
              yearStreamClassGroups: form.role === 'teacher' && currentUser.stage === 'secondary' ? teacherYearStreamClassGroups : undefined,
              createdBy: currentUser.id
            };

      return {
        ...previous,
        users: [...users, nextUser]
      };
    });

    setForm({
      role: 'teacher',
      name: '',
      subject: 'math',
      subjectsByYear: {},
      schoolYear: 1,
      classGroup: '',
      schoolYears: [],
      yearClassGroups: {},
      yearStreamClassGroups: {},
      classChoice: '1',
      customClassGroup: '',
      streamChoiceByYear: {},
      classChoiceByYear: {},
      customClassByYear: {},
      stream: ''
    });
    setError('');
  };

  const importStudentList = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!school || !currentUser.stage) {
      return;
    }

    const studentNames = parseStudentNameList(bulkForm.names);
    if (studentNames.length === 0) {
      setBulkError(tr(language, 'studentListRequired'));
      setBulkCreatedCount(0);
      return;
    }

    const classGroup = bulkForm.classChoice === 'custom' ? normalizeClassGroup(bulkForm.customClassGroup) : bulkForm.classChoice;
    if (!classGroup.trim()) {
      setBulkError(tr(language, 'classRequired'));
      setBulkCreatedCount(0);
      return;
    }

    const streamOptions = secondaryStreamsForYear(school, bulkForm.schoolYear);
    if (currentUser.stage === 'secondary' && streamOptions.length === 0) {
      setBulkError(tr(language, 'noStreamsEnabled'));
      setBulkCreatedCount(0);
      return;
    }

    if (currentUser.stage === 'secondary' && (!bulkForm.stream || !streamOptions.includes(bulkForm.stream))) {
      setBulkError(tr(language, 'streamRequired'));
      setBulkCreatedCount(0);
      return;
    }

    setData((previous) => {
      const users = [...previous.users];
      studentNames.forEach((name) => {
        users.push(
          createStudentAccount({
            name,
            school,
            currentUser,
            schoolYear: bulkForm.schoolYear,
            classGroup: classGroup.trim(),
            stream: currentUser.stage === 'secondary' && bulkForm.stream ? bulkForm.stream : undefined,
            users
          })
        );
      });

      return { ...previous, users };
    });

    setBulkForm((previous) => ({ ...previous, names: '' }));
    setBulkCreatedCount(studentNames.length);
    setBulkError('');
  };

  const availableYearLabels = currentUser.stage ? schoolYearNames[language][currentUser.stage] : [];
  const studentStreamOptions = secondaryStreamsForYear(school, form.schoolYear);
  const bulkStudentStreamOptions = secondaryStreamsForYear(school, bulkForm.schoolYear);
  const generatedEmailPreview = school && form.name.trim() ? generateSchoolEmail(form.name, form.role, school.domain, data.users) : '';

  const chooseAccountRole = (role: 'supervisor' | 'teacher' | 'student') => {
    const streamsForYear = secondaryStreamsForYear(school, form.schoolYear);
    const defaultStream = streamsForYear.includes(form.stream as SecondaryStream) ? form.stream : streamsForYear[0] ?? '';

    setForm({
      ...form,
      role,
      stream: role === 'student' && currentUser.stage === 'secondary' ? defaultStream : form.stream
    });
  };

  useEffect(() => {
    if (form.role !== 'teacher') {
      return;
    }

    setForm((previous) => {
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
        const options = subjectOptionsForTeacherYear(school, previous.yearStreamClassGroups, year);
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
  }, [form.role, form.schoolYears, form.yearStreamClassGroups, school]);

  useEffect(() => {
    if (form.role !== 'student' || currentUser.stage !== 'secondary') {
      return;
    }

    const nextStream = studentStreamOptions.includes(form.stream as SecondaryStream) ? form.stream : studentStreamOptions[0] ?? '';

    if (nextStream !== form.stream) {
      setForm((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [currentUser.stage, form.role, form.schoolYear, form.stream, studentStreamOptions]);

  useEffect(() => {
    if (currentUser.stage !== 'secondary') {
      return;
    }

    const nextStream = bulkStudentStreamOptions.includes(bulkForm.stream as SecondaryStream) ? bulkForm.stream : bulkStudentStreamOptions[0] ?? '';

    if (nextStream !== bulkForm.stream) {
      setBulkForm((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [bulkForm.schoolYear, bulkForm.stream, bulkStudentStreamOptions, currentUser.stage]);

  const toggleTeacherYear = (year: number) => {
    setForm((previous) => {
      const years = previous.schoolYears.includes(year)
        ? previous.schoolYears.filter((selected) => selected !== year)
        : uniqueNumbers([...previous.schoolYears, year]);

      const yearClassGroups = { ...previous.yearClassGroups };
      const yearStreamClassGroups = { ...previous.yearStreamClassGroups };
      if (years.includes(year) && !yearClassGroups[String(year)]) {
        yearClassGroups[String(year)] = ['1'];
      }
      const streamsForYear = secondaryStreamsForYear(school, year);
      const streamChoiceByYear = { ...previous.streamChoiceByYear };
      if (years.includes(year) && currentUser.stage === 'secondary' && streamsForYear[0] && !streamChoiceByYear[String(year)]) {
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

  const addTeacherStreamClassForYear = (year: number) => {
    setForm((previous) => {
      const yearKey = String(year);
      const streamOptionsForYear = secondaryStreamsForYear(school, year);
      const savedStream = previous.streamChoiceByYear[yearKey];
      const stream = savedStream && streamOptionsForYear.includes(savedStream) ? savedStream : streamOptionsForYear[0];
      if (!stream) {
        return previous;
      }

      const classKey = `${yearKey}:${stream}`;
      const choice = previous.classChoiceByYear[classKey] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[classKey] ?? '') : choice;
      if (!nextClass) {
        return previous;
      }

      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const existing = currentYear[stream] ?? [];
      if (existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: {
            ...currentYear,
            [stream]: [...existing, nextClass]
          }
        },
        customClassByYear: {
          ...previous.customClassByYear,
          [classKey]: ''
        }
      };
    });
  };

  const removeTeacherStreamClassForYear = (year: number, stream: SecondaryStream, classGroup: string) => {
    setForm((previous) => {
      const yearKey = String(year);
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const nextClasses = (currentYear[stream] ?? []).filter((group) => !sameClassGroup(group, classGroup));
      const nextYear = { ...currentYear };

      if (nextClasses.length > 0) {
        nextYear[stream] = nextClasses;
      } else {
        delete nextYear[stream];
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: nextYear
        }
      };
    });
  };

  const addTeacherClassForYear = (year: number) => {
    setForm((previous) => {
      const key = String(year);
      const choice = previous.classChoiceByYear[key] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[key] ?? '') : choice;

      if (!nextClass) {
        return previous;
      }

      const existing = previous.yearClassGroups[key] ?? [];
      if (existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: [...existing, nextClass]
        },
        customClassByYear: {
          ...previous.customClassByYear,
          [key]: ''
        }
      };
    });
  };

  const removeTeacherClassForYear = (year: number, classGroup: string) => {
    setForm((previous) => {
      const key = String(year);
      const nextGroups = (previous.yearClassGroups[key] ?? []).filter((group) => !sameClassGroup(group, classGroup));

      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: nextGroups
        }
      };
    });
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'lockedScope')}</p>
          <h2>{tr(language, 'createSchoolAccounts')}</h2>
        </div>
        <UserPlus size={24} aria-hidden="true" />
      </div>
      <div className="locked-strip">
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {school?.name}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {currentUser.stage && stageNames[language][currentUser.stage]}
        </span>
      </div>
      <form className="form-grid" onSubmit={createAccount}>
        <div className="form-field full">
          <span>{tr(language, 'accountType')}</span>
          <div className="account-type-grid" role="group" aria-label={tr(language, 'accountType')}>
            {(['supervisor', 'teacher', 'student'] as const).map((role) => (
              <button
                className={form.role === role ? 'account-type-option active' : 'account-type-option'}
                key={role}
                type="button"
                onClick={() => chooseAccountRole(role)}
              >
                <RoleLabel role={role} language={language} />
              </button>
            ))}
          </div>
        </div>
        <Field label={tr(language, 'fullName')} value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
        <p className="hint full">{tr(language, 'autoGeneratedEmailHint')}</p>
        {generatedEmailPreview && (
          <p className="hint full">
            <span>{tr(language, 'generatedEmailPreview')}: </span>
            <strong dir="ltr">{generatedEmailPreview}</strong>
          </p>
        )}
        <p className="hint full">{tr(language, 'autoGeneratedCodeHint')}</p>
        {currentUser.stage && form.role === 'student' && (
          <label>
            <span>{tr(language, 'schoolYear')}</span>
            <select
              value={form.schoolYear}
              onChange={(event) => {
                const schoolYear = Number(event.target.value);
                const streamsForYear = secondaryStreamsForYear(school, schoolYear);
                const nextStream = streamsForYear.includes(form.stream as SecondaryStream) ? form.stream : streamsForYear[0] ?? '';
                setForm({ ...form, schoolYear, stream: currentUser.stage === 'secondary' ? nextStream : form.stream });
              }}
            >
              {schoolYearNames[language][currentUser.stage].map((label, index) => (
                <option value={index + 1} key={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {currentUser.stage === 'secondary' && form.role === 'student' && (
          <label>
            <span>{tr(language, 'stream')}</span>
            <select
              value={form.stream}
              disabled={studentStreamOptions.length === 0}
              onChange={(event) => setForm({ ...form, stream: event.target.value as SecondaryStream | '' })}
            >
              <option value="">{studentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
              {studentStreamOptions.map((stream) => (
                <option value={stream} key={stream}>
                  {secondaryStreamLabel(language, stream, form.schoolYear)}
                </option>
              ))}
            </select>
          </label>
        )}
        {currentUser.stage && form.role === 'teacher' && (
          <div className="form-field full">
            <span>{tr(language, 'schoolYears')}</span>
            <div className="checkbox-grid">
              {availableYearLabels.map((label, index) => {
                const year = index + 1;
                return (
                  <label className="check-option" key={label}>
                    <input type="checkbox" checked={form.schoolYears.includes(year)} onChange={() => toggleTeacherYear(year)} />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
        {form.role === 'teacher' ? (
          <>
            <div className="year-class-list full">
              {form.schoolYears.map((year) => {
                const key = String(year);
                const isSecondaryTeacher = currentUser.stage === 'secondary';
                const streamOptionsForYear = secondaryStreamsForYear(school, year);
                const savedStreamChoice = form.streamChoiceByYear[key];
                const streamChoice =
                  savedStreamChoice && streamOptionsForYear.includes(savedStreamChoice) ? savedStreamChoice : streamOptionsForYear[0] || '';
                const streamClassKey = `${key}:${streamChoice}`;
                const classChoiceKey = isSecondaryTeacher ? streamClassKey : key;
                const choice = form.classChoiceByYear[classChoiceKey] ?? '1';
                const selectedClasses = form.yearClassGroups[key] ?? [];
                const selectedStreamClasses = form.yearStreamClassGroups[key] ?? {};
                const subjectOptionsForYear = subjectOptionsForTeacherYear(school, form.yearStreamClassGroups, year);
                const subjectChoice = form.subjectsByYear[key] || subjectOptionsForYear[0] || '';
                return (
                  <div className="year-class-row" key={year}>
                    <strong>{schoolYearLabel(language, currentUser.stage, year)}</strong>
                    {isSecondaryTeacher ? (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={streamChoice}
                            disabled={streamOptionsForYear.length === 0}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                streamChoiceByYear: { ...form.streamChoiceByYear, [key]: event.target.value as SecondaryStream }
                              })
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
                            onChange={(event) =>
                              setForm({
                                ...form,
                                classChoiceByYear: { ...form.classChoiceByYear, [classChoiceKey]: event.target.value }
                              })
                            }
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
                              value={form.customClassByYear[classChoiceKey] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  customClassByYear: { ...form.customClassByYear, [classChoiceKey]: event.target.value }
                                })
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
                            onChange={(event) =>
                              setForm({
                                ...form,
                                classChoiceByYear: { ...form.classChoiceByYear, [key]: event.target.value }
                              })
                            }
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
                              value={form.customClassByYear[key] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  customClassByYear: { ...form.customClassByYear, [key]: event.target.value }
                                })
                              }
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
                          setForm({
                            ...form,
                            subjectsByYear: { ...form.subjectsByYear, [key]: event.target.value as Subject }
                          })
                        }
                      >
                        {subjectOptionsForYear.length === 0 && (
                          <option value="">{tr(language, isSecondaryTeacher ? 'chooseStreamFirst' : 'subjectRequired')}</option>
                        )}
                        {subjectOptionsForYear.map((subject) => (
                          <option value={subject} key={subject}>
                            {subjectNames[language][subject]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
            <p className="hint full">{tr(language, currentUser.stage === 'secondary' ? 'streamClassesHint' : 'classesHint')}</p>
          </>
        ) : form.role === 'student' ? (
          <>
            <label>
              <span>{tr(language, 'classGroup')}</span>
              <select value={form.classChoice} onChange={(event) => setForm({ ...form, classChoice: event.target.value })}>
                {defaultClassGroups.map((classGroup) => (
                  <option value={classGroup} key={classGroup}>
                    {classGroup}
                  </option>
                ))}
                <option value="custom">{tr(language, 'customClass')}</option>
              </select>
            </label>
            {form.classChoice === 'custom' && (
              <Field label={tr(language, 'customClass')} value={form.customClassGroup} onChange={(value) => setForm({ ...form, customClassGroup: value })} required />
            )}
          </>
        ) : null}
        {form.role === 'teacher' && form.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
        <p className="hint full">{tr(language, 'createOnlyTeacherStudent')}</p>
        {error && <p className="form-error full">{error}</p>}
        <button className="button primary form-submit" type="submit">
          <Plus size={17} aria-hidden="true" />
          <span>{tr(language, 'create')}</span>
        </button>
      </form>
      <section className="bulk-student-import">
        <div className="bulk-student-import-head">
          <div>
            <p>{tr(language, 'bulkStudentImportHint')}</p>
            <h3>{tr(language, 'bulkStudentImport')}</h3>
          </div>
          <UserPlus size={20} aria-hidden="true" />
        </div>
        <form className="form-grid" onSubmit={importStudentList}>
          {currentUser.stage && (
            <label>
              <span>{tr(language, 'schoolYear')}</span>
              <select
                value={bulkForm.schoolYear}
                onChange={(event) => {
                  const schoolYear = Number(event.target.value);
                  const streamsForYear = secondaryStreamsForYear(school, schoolYear);
                  const nextStream = streamsForYear.includes(bulkForm.stream as SecondaryStream) ? bulkForm.stream : streamsForYear[0] ?? '';
                  setBulkForm({ ...bulkForm, schoolYear, stream: currentUser.stage === 'secondary' ? nextStream : bulkForm.stream });
                }}
              >
                {schoolYearNames[language][currentUser.stage].map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentUser.stage === 'secondary' && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={bulkForm.stream}
                disabled={bulkStudentStreamOptions.length === 0}
                onChange={(event) => setBulkForm({ ...bulkForm, stream: event.target.value as SecondaryStream | '' })}
              >
                <option value="">{bulkStudentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                {bulkStudentStreamOptions.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, bulkForm.schoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{tr(language, 'classGroup')}</span>
            <select value={bulkForm.classChoice} onChange={(event) => setBulkForm({ ...bulkForm, classChoice: event.target.value })}>
              {defaultClassGroups.map((classGroup) => (
                <option value={classGroup} key={classGroup}>
                  {classGroup}
                </option>
              ))}
              <option value="custom">{tr(language, 'customClass')}</option>
            </select>
          </label>
          {bulkForm.classChoice === 'custom' && (
            <Field label={tr(language, 'customClass')} value={bulkForm.customClassGroup} onChange={(value) => setBulkForm({ ...bulkForm, customClassGroup: value })} required />
          )}
          <label className="full">
            <span>{tr(language, 'studentNamesList')}</span>
            <textarea
              value={bulkForm.names}
              onChange={(event) => {
                setBulkForm({ ...bulkForm, names: event.target.value });
                setBulkError('');
                setBulkCreatedCount(0);
              }}
              placeholder={tr(language, 'studentNamesPlaceholder')}
              rows={7}
              required
            />
          </label>
          <p className="hint full">{tr(language, 'bulkActivationCodeHint')}</p>
          {bulkCreatedCount > 0 && (
            <p className="success-message full">
              {tr(language, 'studentsImported')} {tr(language, 'studentsImportedCount')}: <strong>{bulkCreatedCount}</strong>
            </p>
          )}
          {bulkError && <p className="form-error full">{bulkError}</p>}
          <button className="button primary form-submit" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'importStudents')}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
