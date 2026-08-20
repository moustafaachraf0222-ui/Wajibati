import {
  AlertCircle,
  Archive,
  Atom,
  BarChart3,
  BookOpen,
  CalendarDays,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Code2,
  Dumbbell,
  Edit3,
  Eye,
  Filter,
  FlaskConical,
  Globe2,
  GraduationCap,
  Landmark,
  Languages,
  Leaf,
  LockKeyhole,
  MessageSquare,
  MinusCircle,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash2,
  Upload,
  User,
  Wrench,
  X
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type {
  DataSetter,
  Exercise,
  HomeworkFeedback,
  Language,
  PlatformData,
  PlatformUser,
  SecondaryStream,
  Subject
} from '../types';
import { schoolYearLabel, stageNames, subjectNames, tr } from '../i18n';
import {
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  sameClassGroup,
  schoolYearsLabel,
  secondaryStreamLabel,
  secondaryStreamsForYear,
  secondarySubjectStreams,
  streamsForSubject,
  teacherAllowedSubjectsForYear,
  teacherSubjectForYear,
  teacherSubjectsLabel,
  uniqueStrings,
  yearClassGroupsLabel
} from '../education';
import { applyDeletedExerciseTombstones, getSchool, makeId, scopedExercises } from '../data';
import { markSeenAt } from '../notification-seen';
import {
  exerciseSubjectGroups,
  feedbackForStudent,
  feedbackStatsForExercise,
  groupExercisesByMonth,
  groupExercisesByTeacherTarget,
  homeworkDifficulties,
  homeworkDifficultyLabelKey,
  isExerciseCompletedBy,
  isExerciseCompletedThisWeek,
  isIsoInCurrentWeek,
  isPastExercise,
  sortExercises,
  todayIso,
  completionStatsForExercise
} from '../homework';
import { DoneConfirmDialog, Field, StatCard } from '../ui';

const subjectIcons: Record<Subject, LucideIcon> = {
  math: Calculator,
  arabic: BookOpen,
  science: Leaf,
  physics: Atom,
  history: Landmark,
  primary_history: Landmark,
  geography: Globe2,
  french: Languages,
  english: Languages,
  islamic_education: BookOpen,
  civic_education: Landmark,
  scientific_technology: FlaskConical,
  art_education: BookOpen,
  music_education: BookOpen,
  arabic_literature: BookOpen,
  life_science: Leaf,
  physical_science_technology: FlaskConical,
  islamic_science: BookOpen,
  philosophy: GraduationCap,
  computer_science: Code2,
  physical_education: Dumbbell,
  tamazight: Languages,
  civil_engineering_subject: Wrench,
  electrical_engineering_subject: Wrench,
  mechanical_engineering_subject: Wrench,
  process_engineering_subject: Wrench,
  physical_sciences: Atom,
  technology: Wrench,
  spanish: Globe2,
  german: Globe2,
  italian: Globe2
};

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

export function ExercisesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'teacher') {
    return <TeacherExercises data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'student') {
    return <StudentExercises data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  return <p className="empty-state">{tr(language, 'scopedData')}</p>;
}

function TeacherExercises({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const teacherYearClassGroups = assignedYearClassGroups(currentUser);
  const teacherYearStreamClassGroups = assignedYearStreamClassGroups(currentUser);
  const hasStreamAssignments = Object.keys(teacherYearStreamClassGroups).length > 0;
  const teacherYears = assignedSchoolYears(currentUser);
  const teacherClassesForYear = (year: number) => teacherYearClassGroups[String(year)] ?? [];
  const firstYear = teacherYears[0] ?? 1;
  const compatibleStreamsForYear = (year: number, streams: SecondaryStream[]) => {
    const subject = teacherSubjectForYear(currentUser, year);
    return subject && secondarySubjectStreams[subject]
      ? streams.filter((stream) => secondarySubjectStreams[subject]?.includes(stream))
      : streams;
  };
  const teacherStreamsForYear = (year: number) => {
    const streamsForYear = secondaryStreamsForYear(school, year);
    const assignedStreams = Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}) as SecondaryStream[];
    const subject = teacherSubjectForYear(currentUser, year);
    const subjectStreams = subject ? streamsForSubject(subject, school) : [];
    const streams = assignedStreams.length > 0 ? assignedStreams : subjectStreams;
    return school?.stage === 'secondary'
      ? compatibleStreamsForYear(year, streams).filter((stream) => streamsForYear.includes(stream))
      : compatibleStreamsForYear(year, streams);
  };
  const teacherClassesForYearAndStream = (year: number, stream: SecondaryStream | '') => {
    if (!stream || !hasStreamAssignments) {
      return teacherClassesForYear(year);
    }

    return teacherYearStreamClassGroups[String(year)]?.[stream] ?? [];
  };
  const firstStream = teacherStreamsForYear(firstYear)[0] ?? '';
  const firstSubject = teacherAllowedSubjectsForYear(currentUser, firstYear)[0] ?? '';
  const [form, setForm] = useState({
    title: '',
    body: '',
    dueDate: '',
    image: '',
    targetSchoolYear: firstYear,
    targetSubject: firstSubject as Subject | '',
    targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
    targetStream: firstStream as SecondaryStream | '',
    isVacation: false
  });
  const streamOptionsForSelectedYear = teacherStreamsForYear(form.targetSchoolYear);
  const subjectOptionsForSelectedYear = teacherAllowedSubjectsForYear(currentUser, form.targetSchoolYear);
  const streamRequired = currentUser.stage === 'secondary';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const exercises = scopedExercises(data, currentUser);

  useEffect(() => {
    if (streamRequired && (!form.targetStream || !streamOptionsForSelectedYear.includes(form.targetStream))) {
      const nextStream = streamOptionsForSelectedYear[0] ?? '';
      const nextClassGroup = teacherClassesForYearAndStream(form.targetSchoolYear, nextStream)[0] ?? '';

      if (form.targetStream !== nextStream || form.targetClassGroup !== nextClassGroup) {
        setForm((previous) => ({
          ...previous,
          targetStream: nextStream,
          targetClassGroup: nextClassGroup
        }));
      }
    }
  }, [form.targetClassGroup, form.targetSchoolYear, form.targetStream, streamRequired, streamOptionsForSelectedYear]);

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setForm((previous) => ({ ...previous, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const savedAt = new Date().toISOString();
    const classGroup = form.targetClassGroup.trim();
    const targetSubject = subjectOptionsForSelectedYear.includes(form.targetSubject as Subject)
      ? (form.targetSubject as Subject)
      : subjectOptionsForSelectedYear[0];
    const targetStream =
      form.targetStream && streamOptionsForSelectedYear.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : undefined;
    const targetClasses =
      currentUser.stage === 'secondary' && targetStream
        ? teacherClassesForYearAndStream(form.targetSchoolYear, targetStream)
        : teacherClassesForYear(form.targetSchoolYear);
    if (
      !currentUser.schoolId ||
      !currentUser.stage ||
      !targetSubject ||
      !teacherYears.includes(form.targetSchoolYear) ||
      !targetClasses.some((assignedClass) => sameClassGroup(assignedClass, classGroup)) ||
      (streamRequired && !targetStream)
    ) {
      return;
    }

    if (form.dueDate < todayIso()) {
      setError(tr(language, 'dueDatePast'));
      return;
    }

    if (editingId) {
      setData((previous) => ({
        ...previous,
        exercises: previous.exercises.map((exercise) =>
          exercise.id === editingId && exercise.teacherId === currentUser.id
            ? {
                ...exercise,
                title: form.title.trim(),
                body: form.body.trim(),
                dueDate: form.dueDate,
                image: form.image || undefined,
                subject: targetSubject,
                schoolYear: form.targetSchoolYear,
                classGroup,
                stream: targetStream,
                isVacation: form.isVacation || undefined,
                updatedAt: savedAt
              }
            : exercise
        )
      }));
      setEditingId(null);
    } else {
      setData((previous) => ({
        ...previous,
        exercises: [
          ...previous.exercises,
          {
            id: makeId('exercise'),
            title: form.title.trim(),
            body: form.body.trim(),
            dueDate: form.dueDate,
            image: form.image || undefined,
            subject: targetSubject,
            schoolId: currentUser.schoolId!,
            stage: currentUser.stage!,
            schoolYear: form.targetSchoolYear,
            classGroup,
            stream: targetStream,
            teacherId: currentUser.id,
            isVacation: form.isVacation || undefined,
            createdAt: savedAt.slice(0, 10),
            updatedAt: savedAt
          }
      ]
    }));
    }

    setError('');
    setForm({
      title: '',
      body: '',
      dueDate: '',
      image: '',
      targetSchoolYear: firstYear,
      targetSubject: firstSubject as Subject | '',
      targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
      targetStream: firstStream as SecondaryStream | '',
      isVacation: false
    });
  };

  const editExercise = (exercise: Exercise) => {
    if (exercise.teacherId !== currentUser.id) {
      return;
    }

    setEditingId(exercise.id);
    setError('');
    const editSubjects = teacherAllowedSubjectsForYear(currentUser, exercise.schoolYear ?? firstYear);
    setForm({
      title: exercise.title,
      body: exercise.body,
      dueDate: exercise.dueDate < todayIso() ? todayIso() : exercise.dueDate,
      image: exercise.image ?? '',
      targetSchoolYear: exercise.schoolYear ?? firstYear,
      targetSubject: editSubjects.includes(exercise.subject) ? exercise.subject : editSubjects[0] ?? '',
      targetClassGroup:
        exercise.classGroup ??
        teacherClassesForYearAndStream(exercise.schoolYear ?? firstYear, exercise.stream ?? firstStream)[0] ??
        teacherClassesForYear(exercise.schoolYear ?? firstYear)[0] ??
        '',
      targetStream: exercise.stream ?? firstStream,
      isVacation: Boolean(exercise.isVacation)
    });
  };

  const deleteExercise = (exercise: Exercise) => {
    if (exercise.teacherId !== currentUser.id) {
      return;
    }

    setData((previous) =>
      applyDeletedExerciseTombstones({
        ...previous,
        deletedExerciseIds: uniqueStrings([...previous.deletedExerciseIds, exercise.id])
      })
    );
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'onlySubject')}</p>
            <h2>{teacherSubjectsLabel(language, currentUser)}</h2>
          </div>
          <BookOpen size={24} aria-hidden="true" />
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
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {schoolYearsLabel(language, currentUser)}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {tr(language, 'classGroups')} {yearClassGroupsLabel(language, currentUser)}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {teacherSubjectsLabel(language, currentUser)}
          </span>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <Field label={tr(language, 'exerciseTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <label>
            <span>{tr(language, 'exerciseBody')}</span>
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
          </label>
          <Field
            label={tr(language, 'dueDate')}
            value={form.dueDate}
            onChange={(value) => setForm({ ...form, dueDate: value })}
            type="date"
            min={todayIso()}
            required
          />
          <label>
            <span>{tr(language, 'schoolYear')}</span>
            <select
              value={form.targetSchoolYear}
              onChange={(event) => {
                const year = Number(event.target.value);
                const streams = teacherStreamsForYear(year);
                const subjects = teacherAllowedSubjectsForYear(currentUser, year);
                const nextStream = streams.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : streams[0] ?? '';
                const classes =
                  currentUser.stage === 'secondary' && nextStream ? teacherClassesForYearAndStream(year, nextStream) : teacherClassesForYear(year);
                setForm({
                  ...form,
                  targetSchoolYear: year,
                  targetSubject: subjects.includes(form.targetSubject as Subject) ? form.targetSubject : subjects[0] ?? '',
                  targetStream: nextStream,
                  targetClassGroup: classes.some((classGroup) => sameClassGroup(classGroup, form.targetClassGroup))
                    ? form.targetClassGroup
                    : classes[0] ?? ''
                });
              }}
            >
              {teacherYears.map((year) => (
                <option value={year} key={year}>
                  {schoolYearLabel(language, currentUser.stage, year)}
                </option>
              ))}
            </select>
          </label>
          {subjectOptionsForSelectedYear.length > 1 && (
            <label>
              <span>{tr(language, 'subject')}</span>
              <select value={form.targetSubject} onChange={(event) => setForm({ ...form, targetSubject: event.target.value as Subject })}>
                {subjectOptionsForSelectedYear.map((subject) => (
                  <option value={subject} key={subject}>
                    {subjectNames[language][subject]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {streamRequired && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={form.targetStream}
                onChange={(event) => {
                  const stream = event.target.value as SecondaryStream | '';
                  const classes = teacherClassesForYearAndStream(form.targetSchoolYear, stream);
                  setForm({
                    ...form,
                    targetStream: stream,
                    targetClassGroup: classes.some((classGroup) => sameClassGroup(classGroup, form.targetClassGroup))
                      ? form.targetClassGroup
                      : classes[0] ?? ''
                  });
                }}
              >
                {streamOptionsForSelectedYear.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, form.targetSchoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{tr(language, 'classGroup')}</span>
            <select value={form.targetClassGroup} onChange={(event) => setForm({ ...form, targetClassGroup: event.target.value })}>
              {(currentUser.stage === 'secondary' && form.targetStream
                ? teacherClassesForYearAndStream(form.targetSchoolYear, form.targetStream as SecondaryStream)
                : teacherClassesForYear(form.targetSchoolYear)
              ).map((classGroup) => (
                <option value={classGroup} key={classGroup}>
                  {classGroup}
                </option>
              ))}
            </select>
          </label>
          {data.settings.allowExerciseImages && (
            <label className="file-field">
              <span>{tr(language, 'uploadImage')}</span>
              <input type="file" accept="image/*" onChange={readImage} />
              <Upload size={18} aria-hidden="true" />
            </label>
          )}
          {form.image && <img className="image-preview" src={form.image} alt={tr(language, 'imagePreview')} />}
          <label className="toggle-row">
            <span>{tr(language, 'vacationExercise')}</span>
            <input type="checkbox" checked={form.isVacation} onChange={(event) => setForm({ ...form, isVacation: event.target.checked })} />
          </label>
          <p className="hint">{tr(language, 'targetGroup')}</p>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" type="submit">
            {editingId ? <Save size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
            <span>{editingId ? tr(language, 'updateExercise') : tr(language, 'publishExercise')}</span>
          </button>
        </form>
      </div>

      <ExerciseList
        exercises={exercises}
        data={data}
        language={language}
        currentUser={currentUser}
        onEdit={editExercise}
        onDelete={deleteExercise}
      />
    </section>
  );
}

function StudentExercises({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const exercises = scopedExercises(data, currentUser);

  useEffect(() => {
    markSeenAt(currentUser.id, 'studentExercises');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completed = data.completions[currentUser.id] ?? [];
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [pendingDoneExercise, setPendingDoneExercise] = useState<Exercise | null>(null);
  const visibleExerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const completedVisible = completed.filter((exerciseId) => visibleExerciseIds.has(exerciseId));
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const subjectGroups = exerciseSubjectGroups(exercises);
  const weeklyExercises = exercises.filter((exercise) => isIsoInCurrentWeek(exercise.dueDate));
  const weeklyCompleted = weeklyExercises.filter((exercise) => isExerciseCompletedThisWeek(data, currentUser.id, exercise)).length;
  const weeklyRate = weeklyExercises.length > 0 ? Math.round((weeklyCompleted / weeklyExercises.length) * 100) : 0;

  const markDone = (exerciseId: string) => {
    setData((previous) => {
      const existing = previous.completions[currentUser.id] ?? [];
      if (existing.includes(exerciseId)) {
        return previous;
      }

      return {
        ...previous,
        completions: {
          ...previous.completions,
          [currentUser.id]: [...existing, exerciseId]
        },
        completionDates: {
          ...previous.completionDates,
          [currentUser.id]: {
            ...(previous.completionDates[currentUser.id] ?? {}),
            [exerciseId]: todayIso()
          }
        }
      };
    });
  };

  const updateFeedback = (exerciseId: string, update: Partial<HomeworkFeedback>) => {
    setData((previous) => {
      if (isExerciseCompletedBy(previous, currentUser.id, exerciseId)) {
        return previous;
      }

      const currentFeedback = previous.feedback[currentUser.id]?.[exerciseId] ?? { updatedAt: new Date().toISOString() };
      return {
        ...previous,
        feedback: {
          ...previous.feedback,
          [currentUser.id]: {
            ...(previous.feedback[currentUser.id] ?? {}),
            [exerciseId]: {
              ...currentFeedback,
              ...update,
              updatedAt: new Date().toISOString()
            }
          }
        }
      };
    });
  };

  const requestDoneConfirmation = (exercise: Exercise) => {
    if (completed.includes(exercise.id)) {
      return;
    }

    setPendingDoneExercise(exercise);
  };

  const confirmDone = () => {
    if (!pendingDoneExercise) {
      return;
    }

    markDone(pendingDoneExercise.id);
    setPendingDoneExercise(null);
  };

  const renderFeedbackSummary = (exercise: Exercise) => {
    const feedback = feedbackForStudent(data, currentUser.id, exercise.id);
    if (!feedback?.difficulty && !feedback?.note?.trim()) {
      return null;
    }

    return (
      <div className="feedback-summary">
        {feedback.difficulty && (
          <span>
            <Star size={14} aria-hidden="true" />
            {tr(language, homeworkDifficultyLabelKey(feedback.difficulty))}
          </span>
        )}
        {feedback.note?.trim() && (
          <span>
            <MessageSquare size={14} aria-hidden="true" />
            {feedback.note.trim()}
          </span>
        )}
      </div>
    );
  };

  const renderFeedbackControls = (exercise: Exercise) => {
    const feedback = feedbackForStudent(data, currentUser.id, exercise.id);
    const isDone = completed.includes(exercise.id);

    if (isDone) {
      return (
        <div className="student-feedback-box locked-feedback-box">
          <span>{tr(language, 'difficultyRating')}</span>
          {renderFeedbackSummary(exercise) ?? <p className="feedback-lock-note">{tr(language, 'noSubmittedFeedback')}</p>}
          <p className="feedback-lock-note with-icon">
            <LockKeyhole size={15} aria-hidden="true" />
            <span>{tr(language, 'lockedFeedbackAfterDone')}</span>
          </p>
        </div>
      );
    }

    return (
      <div className="student-feedback-box">
        <span>{tr(language, 'difficultyRating')}</span>
        <div className="rating-row">
          {homeworkDifficulties.map((difficulty) => (
            <button
              key={difficulty}
              className={feedback?.difficulty === difficulty ? 'rating-button active' : 'rating-button'}
              type="button"
              onClick={() => updateFeedback(exercise.id, { difficulty })}
            >
              <Star size={16} aria-hidden="true" />
              <span>{tr(language, homeworkDifficultyLabelKey(difficulty))}</span>
            </button>
          ))}
        </div>
        <label>
          <span>{tr(language, 'familyNote')}</span>
          <textarea
            value={feedback?.note ?? ''}
            rows={3}
            onChange={(event) => updateFeedback(exercise.id, { note: event.target.value })}
          />
        </label>
      </div>
    );
  };

  return (
    <section className="content-grid">
      <div className="stats-grid">
        <StatCard icon={BookOpen} label={tr(language, 'assignedExercises')} value={exercises.length.toString()} tone="blue" />
        <StatCard icon={CheckCircle2} label={tr(language, 'completedExercises')} value={completedVisible.length.toString()} tone="green" />
        <StatCard icon={CalendarDays} label={tr(language, 'weeklyRequired')} value={weeklyExercises.length.toString()} tone="blue" />
        <StatCard icon={CheckCircle2} label={tr(language, 'weeklyDone')} value={weeklyCompleted.toString()} tone="green" />
        <StatCard icon={BarChart3} label={tr(language, 'weeklyRate')} value={`${weeklyRate}%`} tone="teal" />
        <StatCard
          icon={CircleOff}
          label={tr(language, 'remainingExercises')}
          value={Math.max(exercises.length - completedVisible.length, 0).toString()}
          tone="amber"
        />
      </div>
      <div className="homework-subject-groups">
        {exercises.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
        {subjectGroups.map((group) => {
          const Icon = subjectIcons[group.subject] ?? BookOpen;
          const teacherNames = [
            ...new Set(
              group.exercises
                .map((exercise) => data.users.find((user) => user.id === exercise.teacherId)?.name)
                .filter((name): name is string => Boolean(name))
            )
          ];
          return (
            <details className="homework-subject-group" key={group.subject} open>
              <summary className="subject-group-heading">
                <div className="subject-title">
                  <span className="subject-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{subjectNames[language][group.subject]}</strong>
                    <small>
                      {tr(language, 'groupedBySubject')}
                      {teacherNames.length > 0 ? ` · ${teacherNames.join('، ')}` : ''}
                    </small>
                  </div>
                </div>
                <span className="subject-summary-actions">
                  <span className="subject-count">{group.exercises.length}</span>
                  <ChevronDown size={17} aria-hidden="true" />
                </span>
              </summary>
              <div className="exercise-grid">
                {group.exercises.map((exercise) => {
                  const teacher = data.users.find((user) => user.id === exercise.teacherId);
                  const isDone = completed.includes(exercise.id);
                  return (
                    <article className="exercise-card" key={exercise.id}>
                      {exercise.image && <img src={exercise.image} alt="" />}
                      <div className="exercise-meta">
                        <span>{subjectNames[language][exercise.subject]}</span>
                        {exercise.schoolYear && <span>{schoolYearLabel(language, exercise.stage, exercise.schoolYear)}</span>}
                        {exercise.classGroup && <span>{tr(language, 'classGroup')} {exercise.classGroup}</span>}
                        {exercise.stream && <span>{secondaryStreamLabel(language, exercise.stream, exercise.schoolYear)}</span>}
                        {exercise.isVacation && <span>{tr(language, 'vacationHomework')}</span>}
                        <span>{exercise.dueDate}</span>
                      </div>
                      <h3>{exercise.title}</h3>
                      <p>{exercise.body}</p>
                      <small>
                        {tr(language, 'byTeacher')}: {teacher?.name ?? '-'}
                      </small>
                      {renderFeedbackSummary(exercise)}
                      <div className="button-row homework-actions">
                        <button className="button ghost" type="button" onClick={() => setSelectedExerciseId(exercise.id)}>
                          <BookOpen size={17} aria-hidden="true" />
                          <span>{tr(language, 'viewHomework')}</span>
                        </button>
                        <button className={isDone ? 'button success' : 'button primary'} type="button" disabled={isDone} onClick={() => requestDoneConfirmation(exercise)}>
                          <CheckCircle2 size={17} aria-hidden="true" />
                          <span>{isDone ? tr(language, 'completed') : tr(language, 'done')}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
      {selectedExercise && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedExerciseId(null)}>
          <article className="modal homework-modal" role="dialog" aria-modal="true" aria-labelledby="homework-title" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={() => setSelectedExerciseId(null)}>
              <X size={16} aria-hidden="true" />
            </button>
            <div className="homework-modal-heading">
              <span>{tr(language, 'homeworkDetails')}</span>
              <h2 id="homework-title">{selectedExercise.title}</h2>
            </div>
            <div className="exercise-meta homework-meta">
              <span>{subjectNames[language][selectedExercise.subject]}</span>
              {selectedExercise.schoolYear && <span>{schoolYearLabel(language, selectedExercise.stage, selectedExercise.schoolYear)}</span>}
              {selectedExercise.classGroup && <span>{tr(language, 'classGroup')} {selectedExercise.classGroup}</span>}
              {selectedExercise.stream && <span>{secondaryStreamLabel(language, selectedExercise.stream, selectedExercise.schoolYear)}</span>}
              {selectedExercise.isVacation && <span>{tr(language, 'vacationHomework')}</span>}
              <span>{selectedExercise.dueDate}</span>
            </div>
            {selectedExercise.image && <img className="homework-image" src={selectedExercise.image} alt={tr(language, 'imagePreview')} />}
            <p className="homework-body">{selectedExercise.body}</p>
            <small className="homework-teacher">
              {tr(language, 'byTeacher')}: {data.users.find((user) => user.id === selectedExercise.teacherId)?.name ?? '-'}
            </small>
            {renderFeedbackControls(selectedExercise)}
            <div className="button-row center">
              <button
                className={completed.includes(selectedExercise.id) ? 'button success' : 'button primary'}
                type="button"
                disabled={completed.includes(selectedExercise.id)}
                onClick={() => requestDoneConfirmation(selectedExercise)}
              >
                <CheckCircle2 size={17} aria-hidden="true" />
                <span>{completed.includes(selectedExercise.id) ? tr(language, 'completed') : tr(language, 'done')}</span>
              </button>
            </div>
          </article>
        </div>
      )}
      {pendingDoneExercise && (
        <DoneConfirmDialog
          language={language}
          exerciseTitle={pendingDoneExercise.title}
          onConfirm={confirmDone}
          onCancel={() => setPendingDoneExercise(null)}
        />
      )}
    </section>
  );
}

function ExerciseList({
  exercises,
  data,
  language,
  currentUser,
  onEdit,
  onDelete
}: {
  exercises: Exercise[];
  data: PlatformData;
  language: Language;
  currentUser: PlatformUser;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}) {
  const activeTeacherExercises = currentUser.role === 'teacher' ? exercises.filter((exercise) => !isPastExercise(exercise)) : exercises;
  const archivedTeacherExercises = currentUser.role === 'teacher' ? exercises.filter(isPastExercise) : [];
  const teacherGroups = currentUser.role === 'teacher' ? groupExercisesByTeacherTarget(activeTeacherExercises) : [];
  const archiveGroups = currentUser.role === 'teacher' ? groupExercisesByMonth(archivedTeacherExercises, language) : [];
  const renderExerciseCard = (exercise: Exercise) => {
    const teacher = data.users.find((user) => user.id === exercise.teacherId);
    const canMutate = currentUser.role === 'teacher' && exercise.teacherId === currentUser.id;
    const completionStats = currentUser.role === 'teacher' ? completionStatsForExercise(data, exercise) : null;
    const feedbackStats = currentUser.role === 'teacher' ? feedbackStatsForExercise(data, exercise) : null;

    return (
      <article className="exercise-card" key={exercise.id}>
        {exercise.image && <img src={exercise.image} alt="" />}
        <div className="exercise-meta">
          <span>{subjectNames[language][exercise.subject]}</span>
          {exercise.schoolYear && <span>{schoolYearLabel(language, exercise.stage, exercise.schoolYear)}</span>}
          {exercise.classGroup && <span>{tr(language, 'classGroup')} {exercise.classGroup}</span>}
          {exercise.stream && <span>{secondaryStreamLabel(language, exercise.stream, exercise.schoolYear)}</span>}
          {exercise.isVacation && <span>{tr(language, 'vacationHomework')}</span>}
          <span>{exercise.dueDate}</span>
        </div>
        <h3>{exercise.title}</h3>
        <p>{exercise.body}</p>
        <small>
          {tr(language, 'byTeacher')}: {teacher?.name ?? '-'} · {tr(language, 'createdAt')}: {exercise.createdAt}
        </small>
        {completionStats && feedbackStats && (
          <div className="teacher-homework-insights">
            <div>
              <span>{tr(language, 'completedByStudents')}</span>
              <strong>
                {completionStats.completed}/{completionStats.total} · {completionStats.rate}%
              </strong>
            </div>
            <div>
              <span>{tr(language, 'difficultyRating')}</span>
              <strong>
                {tr(language, 'easyCount')}: {feedbackStats.easy} · {tr(language, 'mediumCount')}: {feedbackStats.medium} ·{' '}
                {tr(language, 'hardCount')}: {feedbackStats.hard}
              </strong>
            </div>
            <details className="feedback-notes">
              <summary>
                <MessageSquare size={15} aria-hidden="true" />
                <span>{tr(language, 'feedbackFromFamily')}</span>
                <strong>{feedbackStats.notes.length}</strong>
              </summary>
              <div>
                {feedbackStats.notes.length === 0 && <p className="empty-state">{tr(language, 'noFeedback')}</p>}
                {feedbackStats.notes.map((entry) => (
                  <article key={`${exercise.id}-${entry.student.id}`}>
                    <strong>{entry.student.name}</strong>
                    {entry.feedback.difficulty && (
                      <span>{tr(language, homeworkDifficultyLabelKey(entry.feedback.difficulty))}</span>
                    )}
                    <p>{entry.feedback.note}</p>
                  </article>
                ))}
              </div>
            </details>
          </div>
        )}
        {canMutate && (
          <div className="button-row">
            <button className="button ghost" type="button" onClick={() => onEdit(exercise)}>
              <Edit3 size={16} aria-hidden="true" />
              <span>{tr(language, 'edit')}</span>
            </button>
            <button className="button danger" type="button" onClick={() => onDelete(exercise)}>
              <Trash2 size={16} aria-hidden="true" />
              <span>{tr(language, 'delete')}</span>
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{currentUser.role === 'teacher' ? tr(language, 'groupedByTarget') : tr(language, 'scopedData')}</p>
          <h2>{tr(language, 'exercises')}</h2>
        </div>
        <BookOpen size={24} aria-hidden="true" />
      </div>
      {currentUser.role === 'teacher' ? (
        <div className="teacher-exercise-groups">
          {exercises.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {activeTeacherExercises.length === 0 && exercises.length > 0 && <p className="empty-state">{tr(language, 'homeworkArchive')}</p>}
          {teacherGroups.map((yearGroup) => {
            const firstExercise = yearGroup.streams.flatMap((streamGroup) => streamGroup.classes.flatMap((classGroup) => classGroup.exercises))[0];
            return (
              <section className="teacher-year-group" key={String(yearGroup.schoolYear || 'no-year')}>
                <div className="teacher-year-heading">
                  <span>{yearGroup.schoolYear ? schoolYearLabel(language, firstExercise?.stage, yearGroup.schoolYear) : '-'}</span>
                  <strong>{yearGroup.count}</strong>
                </div>
                {yearGroup.streams.map((streamGroup) => (
                  <section className="teacher-exercise-stream" key={`${yearGroup.schoolYear || 'no-year'}-${streamGroup.stream || 'no-stream'}`}>
                    {currentUser.stage === 'secondary' && (
                      <div className="teacher-stream-heading">
                        <span>{streamGroup.stream ? secondaryStreamLabel(language, streamGroup.stream, firstExercise?.schoolYear) : '-'}</span>
                        <strong>{streamGroup.count}</strong>
                      </div>
                    )}
                    {streamGroup.classes.map((classGroup) => (
                      <details
                        className="teacher-class-group"
                        key={`${yearGroup.schoolYear || 'no-year'}-${streamGroup.stream || 'no-stream'}-${classGroup.classGroup}`}
                      >
                        <summary className="teacher-class-heading">
                          <span>{tr(language, 'classGroup')} {classGroup.classGroup}</span>
                          <span className="subject-summary-actions">
                            <small>{classGroup.exercises.length}</small>
                            <ChevronDown size={17} aria-hidden="true" />
                          </span>
                        </summary>
                        <div className="exercise-grid compact-list">{classGroup.exercises.map(renderExerciseCard)}</div>
                      </details>
                    ))}
                  </section>
                ))}
              </section>
            );
          })}
          {archiveGroups.length > 0 && (
            <section className="homework-archive">
              <div className="subject-group-heading">
                <div className="subject-title">
                  <span className="subject-icon">
                    <Archive size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{tr(language, 'homeworkArchive')}</strong>
                    <small>{tr(language, 'archiveByMonth')}</small>
                  </div>
                </div>
                <span className="subject-count">{archivedTeacherExercises.length}</span>
              </div>
              {archiveGroups.map((group) => (
                <details className="archive-month" key={group.key}>
                  <summary>
                    <span>{group.label}</span>
                    <strong>{group.exercises.length}</strong>
                  </summary>
                  <div className="exercise-grid compact-list">{group.exercises.map(renderExerciseCard)}</div>
                </details>
              ))}
            </section>
          )}
        </div>
      ) : (
        <CompactStudentExercisesView
          exercises={exercises}
          data={data}
          language={language}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function CompactStudentExercisesView({
  exercises,
  data,
  language,
  currentUser
}: {
  exercises: Exercise[];
  data: PlatformData;
  language: Language;
  currentUser: PlatformUser;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'late'>('all');
  const [search, setSearch] = useState('');

  const today = todayIso();
  const active = exercises.filter((exercise) => !isPastExercise(exercise));
  const completed = exercises.filter(isPastExercise);
  const late = active.filter((exercise) => exercise.dueDate < today);
  const completionRate = exercises.length > 0 ? Math.round((completed.length / exercises.length) * 100) : 0;

  const filtered = (() => {
    let list = [...exercises].sort(sortExercises);
    if (filter === 'active') {
      list = list.filter((exercise) => !isPastExercise(exercise));
    } else if (filter === 'completed') {
      list = list.filter(isPastExercise);
    } else if (filter === 'late') {
      list = list.filter((exercise) => isPastExercise(exercise) && exercise.dueDate < today);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((exercise) =>
        exercise.title.toLowerCase().includes(query) ||
        subjectNames[language][exercise.subject].toLowerCase().includes(query)
      );
    }
    return list;
  })();

  const renderRow = (exercise: Exercise) => {
    const teacher = data.users.find((user) => user.id === exercise.teacherId);
    const teacherName = teacher?.name ?? '-';
    const teacherInitial = teacherName.charAt(0).toUpperCase() || '?';
    const isLate = !isPastExercise(exercise) && exercise.dueDate < today;
    const isCompleted = isPastExercise(exercise);
    const feedback = feedbackForStudent(data, currentUser.id, exercise.id);
    const hasFeedback = Boolean(feedback && (feedback.difficulty || feedback.note?.trim()));

    const rowClass = isCompleted ? 'done' : isLate ? 'late' : '';

    return (
      <div className={`ce-t-row ${rowClass}`} key={exercise.id}>
        <div className="bar"></div>
        <div className="ce-t-main">
          <div className="row1">
            {isLate && (
              <span className="ce-badge danger">
                <AlertCircle aria-hidden="true" />
                {tr(language, 'late')}
              </span>
            )}
            <h4>{exercise.title}</h4>
          </div>
          <div className="row2">
            <span className="tag">{subjectNames[language][exercise.subject]}</span>
            {exercise.schoolYear && <span className="tag">{schoolYearLabel(language, exercise.stage, exercise.schoolYear)}</span>}
            {exercise.classGroup && <span className="tag">{tr(language, 'classGroup')} {exercise.classGroup}</span>}
            {exercise.stream && <span className="tag">{secondaryStreamLabel(language, exercise.stream, exercise.schoolYear)}</span>}
          </div>
        </div>
        <div className="ce-teacher">
          <div className="avatar" aria-hidden="true">{teacherInitial}</div>
          <span className="name">{teacherName}</span>
        </div>
        <div className="ce-t-cell">
          <CalendarDays size={13} className="ic" aria-hidden="true" />
          <strong>{exercise.dueDate}</strong>
        </div>
        <div>
          {isCompleted ? (
            hasFeedback && feedback?.difficulty ? (
              <span className="ce-badge ok">
                <Check size={11} strokeWidth={3} aria-hidden="true" />
                {tr(language, homeworkDifficultyLabelKey(feedback.difficulty))}
              </span>
            ) : (
              <span className="ce-badge ok">
                <Check size={11} strokeWidth={3} aria-hidden="true" />
                {tr(language, 'completedExercises')}
              </span>
            )
          ) : isLate ? (
            <span className="ce-badge danger">
              <AlertCircle size={11} aria-hidden="true" />
              {tr(language, 'late')}
            </span>
          ) : (
            <span className="ce-badge">{tr(language, 'active')}</span>
          )}
        </div>
        <div className="ce-t-action">
          {isCompleted ? (
            <button className="button ghost" type="button">
              <Eye aria-hidden="true" />
              <span>{tr(language, 'review')}</span>
            </button>
          ) : isLate ? (
            <button className="button primary" type="button">
              <Play aria-hidden="true" />
              <span>{tr(language, 'start')}</span>
            </button>
          ) : (
            <button className="button primary" type="button">
              <Play aria-hidden="true" />
              <span>{tr(language, 'start')}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="compact-exercises">
      <div className="ce-page-head">
        <div>
          <h1>{tr(language, 'exercises')}</h1>
          <div className="ce-sub">{tr(language, 'scopedData')}</div>
        </div>
        <div className="ce-search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            placeholder={tr(language, 'searchExercises')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="ce-stats">
        <div className="ce-stat pri">
          <div className="ico">
            <BookOpen aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'assignedToYou')}</div>
            <div className="val">{active.length}</div>
          </div>
        </div>
        <div className="ce-stat">
          <div className="ico">
            <CheckCircle2 aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'completedExercises')}</div>
            <div className="val">{completed.length}</div>
          </div>
        </div>
        <div className="ce-stat">
          <div className="ico">
            <BarChart3 aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'completionRate')}</div>
            <div className="val">{completionRate}<small>%</small></div>
          </div>
        </div>
        <div className="ce-stat alert">
          <div className="ico">
            <AlertCircle aria-hidden="true" />
          </div>
          <div>
            <div className="lbl">{tr(language, 'lateExercises')}</div>
            <div className="val">{late.length}</div>
          </div>
        </div>
      </div>

      <div className="ce-filter-bar">
        <button
          type="button"
          className={`ce-filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {tr(language, 'filterAll')}
          <span className="count">{exercises.length}</span>
        </button>
        <button
          type="button"
          className={`ce-filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          {tr(language, 'filterActive')}
          <span className="count">{active.length}</span>
        </button>
        <button
          type="button"
          className={`ce-filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          <CheckCircle2 aria-hidden="true" />
          {tr(language, 'filterCompleted')}
          <span className="count">{completed.length}</span>
        </button>
        <button
          type="button"
          className={`ce-filter-tab ${filter === 'late' ? 'active' : ''}`}
          onClick={() => setFilter('late')}
        >
          <AlertCircle aria-hidden="true" />
          {tr(language, 'filterLate')}
          <span className="count">{late.length}</span>
        </button>
        <div className="ce-filter-spacer"></div>
        <button type="button" className="ce-sort">
          <Filter aria-hidden="true" />
          {tr(language, 'sortByNewest')}
        </button>
      </div>

      <div className="ce-sec-head">
        <h2>
          {tr(language, 'totalCount')}
          <span className="count">{filtered.length} {tr(language, 'exerciseCountPlural')}</span>
        </h2>
        <span className="link">{tr(language, 'viewAccountsTab')}</span>
      </div>

      <div className="ce-table">
          <div className="ce-t-head">
          <div></div>
          <div>{tr(language, 'exercises')}</div>
          <div className="h-teacher">{tr(language, 'teacherName')}</div>
          <div>{tr(language, 'dueDate')}</div>
          <div>{tr(language, 'status')}</div>
          <div className="h-action"></div>
        </div>
        {filtered.length === 0 ? (
          <div className="ce-empty">{tr(language, 'noRecords')}</div>
        ) : (
          filtered.map(renderRow)
        )}
      </div>
    </div>
  );
}
