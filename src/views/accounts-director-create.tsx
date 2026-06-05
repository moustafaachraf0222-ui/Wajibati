import { LockKeyhole, Plus, UserPlus, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  DataSetter,
  Language,
  PlatformData,
  PlatformUser,
  SchoolRecord,
  SecondaryStream,
  StudentActivationRecord,
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
import { generateSchoolEmail, generateUniqueCode, makeId } from '../data';
import { Field, RoleLabel } from '../ui';

const initialBulkStudentForm = {
  names: ''
};

function parseStudentNameList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[\).-])\s*/, '').trim())
    .filter(Boolean);
}

function createStudentActivationRecord({
  name,
  currentUser,
  existingCodes
}: {
  name: string;
  currentUser: PlatformUser;
  existingCodes: string[];
}): StudentActivationRecord {
  return {
    id: makeId('activation'),
    name,
    code: generateUniqueCode(existingCodes),
    schoolId: currentUser.schoolId ?? '',
    stage: currentUser.stage ?? 'middle',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString()
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

    if (form.role === 'student') {
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

    const primaryYear = form.role === 'teacher' ? form.schoolYears[0] : undefined;
    const primarySubject = form.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      form.role === 'teacher' && currentUser.stage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : form.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : undefined;
    setData((previous) => {
      const users = [...previous.users];
      const existingCodes = [...users.map((user) => user.password), ...previous.studentActivations.map((activation) => activation.code)];
      const nextUser: PlatformUser = {
        id: makeId(form.role),
        name: accountName,
        email: generateSchoolEmail(accountName, form.role, school.domain, users),
        password: generateUniqueCode(existingCodes),
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

    setData((previous) => {
      const studentActivations = [...previous.studentActivations];
      const usedCodes = [...previous.users.map((user) => user.password), ...studentActivations.map((activation) => activation.code)];
      studentNames.forEach((name) => {
        const activation = createStudentActivationRecord({
          name,
          currentUser,
          existingCodes: usedCodes
        });
        studentActivations.push(activation);
        usedCodes.push(activation.code);
      });

      return { ...previous, studentActivations };
    });

    setBulkForm((previous) => ({ ...previous, names: '' }));
    setBulkCreatedCount(studentNames.length);
    setBulkError('');
  };

  const availableYearLabels = currentUser.stage ? schoolYearNames[language][currentUser.stage] : [];
  const generatedEmailPreview = school && form.name.trim() ? generateSchoolEmail(form.name, form.role, school.domain, data.users) : '';

  const chooseAccountRole = (role: 'supervisor' | 'teacher' | 'student') => {
    setForm({
      ...form,
      role
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
        {form.role !== 'student' && (
          <>
            <Field label={tr(language, 'fullName')} value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <p className="hint full">{tr(language, 'autoGeneratedEmailHint')}</p>
            {generatedEmailPreview && (
              <p className="hint full">
                <span>{tr(language, 'generatedEmailPreview')}: </span>
                <strong dir="ltr">{generatedEmailPreview}</strong>
              </p>
            )}
            <p className="hint full">{tr(language, 'autoGeneratedCodeHint')}</p>
          </>
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
        ) : null}
        {form.role === 'teacher' && form.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
        {form.role !== 'student' ? (
          <>
            <p className="hint full">{tr(language, 'createOnlyTeacherStudent')}</p>
            {error && <p className="form-error full">{error}</p>}
            <button className="button primary form-submit" type="submit">
              <Plus size={17} aria-hidden="true" />
              <span>{tr(language, 'create')}</span>
            </button>
          </>
        ) : (
          <p className="hint full">{tr(language, 'studentActivationOnlyHint')}</p>
        )}
      </form>
      {form.role === 'student' && <section className="bulk-student-import">
        <div className="bulk-student-import-head">
          <div>
            <p>{tr(language, 'bulkStudentImportHint')}</p>
            <h3>{tr(language, 'bulkStudentImport')}</h3>
          </div>
          <UserPlus size={20} aria-hidden="true" />
        </div>
        <form className="form-grid" onSubmit={importStudentList}>
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
      </section>}
    </div>
  );
}
