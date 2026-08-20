import { Archive, ArrowLeft, ChevronRight, Clock, MessageSquare, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Announcement, DataSetter, Language, PlatformData, PlatformUser, SecondaryStream, Subject, TeacherNote, UploadedAttachment } from '../types';
import { schoolYearLabel, subjectNames, tr } from '../i18n';
import {
  assignedSchoolYears,
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  sameClassGroup,
  secondaryStreamLabel,
  secondaryStreamsForYear,
  teacherAllowedSubjectsForYear,
  teacherSubjectForYear,
  uniqueStrings
} from '../education';
import { applyDeletedNoteTombstones, getSchool, makeId, scopedAnnouncements, scopedNotes } from '../data';
import { formatDateTime } from '../dates';
import { readAttachmentFromInput } from '../files';
import {
  announcementStatus,
  canViewAnnouncementArchive,
  isAnnouncementArchived,
  isNoteArchived,
  noteStatus
} from '../messages';
import { AttachmentPreview, Field } from '../ui';
import { useBackShortcut } from '../back-shortcut';
import { markSeenAt } from '../notification-seen';

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

function useTimeTick(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export function AnnouncementsView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);

  useEffect(() => {
    if (currentUser.schoolId) {
      markSeenAt(currentUser.id, 'announcements');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scopedAnnouncementList = scopedAnnouncements(data, currentUser);
  const activeAnnouncements = scopedAnnouncementList
    .filter((announcement) => !isAnnouncementArchived(announcement))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const archivedAnnouncements = canViewAnnouncementArchive(currentUser)
    ? scopedAnnouncementList.filter((announcement) => isAnnouncementArchived(announcement)).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    : [];
  const [form, setForm] = useState<{ title: string; body: string; image: UploadedAttachment | null }>({ title: '', body: '', image: null });
  const [error, setError] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveAnnouncementId, setArchiveAnnouncementId] = useState<string | null>(null);
  const selectedArchivedAnnouncement = archiveAnnouncementId ? archivedAnnouncements.find((announcement) => announcement.id === archiveAnnouncementId) : null;

  useBackShortcut(() => {
    if (archiveAnnouncementId) {
      setArchiveAnnouncementId(null);
      return true;
    }
    if (archiveOpen) {
      setArchiveOpen(false);
      return true;
    }
    return false;
  });

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    readAttachmentFromInput(
      event,
      (image) => {
        setForm((previous) => ({ ...previous, image }));
        setError('');
      },
      () => setError(tr(language, 'fileTooLarge'))
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentUser.role !== 'director' || !currentUser.schoolId) {
      return;
    }

    setData((previous) => ({
      ...previous,
      announcements: [
        ...previous.announcements,
        {
          id: makeId('announcement'),
          schoolId: currentUser.schoolId!,
          authorId: currentUser.id,
          title: form.title.trim(),
          body: form.body.trim(),
          image: form.image ?? undefined,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setForm({ title: '', body: '', image: null });
    setError('');
  };

  const renderAnnouncementCard = (announcement: Announcement, archived = false) => {
    const author = data.users.find((user) => user.id === announcement.authorId);
    const announcementSchool = data.schools.find((record) => record.id === announcement.schoolId);
    const status = archived ? 'archived' : announcementStatus(announcement);
    const statusKey = status === 'active' ? 'messageStatusActive' : status === 'expiring' ? 'messageStatusExpiring' : 'messageStatusArchived';
    const StatusIcon = status === 'expiring' ? Clock : MessageSquare;

    return (
      <article className={archived ? 'message-card archived-message-card' : 'message-card'} key={announcement.id}>
        <div className="message-card-head">
          <h3>{announcement.title}</h3>
          <span className={`message-status ${status}`}>
            <StatusIcon aria-hidden="true" />
            {tr(language, statusKey)}
          </span>
        </div>
        <div className="message-meta">
          {currentUser.role === 'admin' && announcementSchool && <span className="mm-tag">{announcementSchool.name}</span>}
          <span className="mm-tag">{author?.name ?? '-'}</span>
          <span className="mm-tag">
            <Clock aria-hidden="true" />
            {formatDateTime(language, announcement.createdAt)}
          </span>
        </div>
        <p>{announcement.body}</p>
        {announcement.image && <AttachmentPreview attachment={announcement.image} language={language} />}
      </article>
    );
  };

  const renderArchiveRow = (announcement: Announcement) => {
    const author = data.users.find((user) => user.id === announcement.authorId);
    const announcementSchool = data.schools.find((record) => record.id === announcement.schoolId);

    return (
      <button
        type="button"
        className="user-group drill-row"
        key={announcement.id}
        onClick={() => setArchiveAnnouncementId(announcement.id)}
      >
        <span className="user-group-title">
          <span className="user-group-label">
            <Clock size={16} aria-hidden="true" />
            <span className="user-group-label-name">{formatDateTime(language, announcement.createdAt)}</span>
          </span>
          <span className="user-group-meta">
            <span className="user-group-label-stage">{announcementSchool?.name ?? '-'}</span>
            <span className="user-group-label-stage">{author?.name ?? '-'}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </span>
        </span>
      </button>
    );
  };

  return (
    <section className="content-grid">
      {canViewAnnouncementArchive(currentUser) && archiveOpen && !archiveAnnouncementId && (
        <>
          <button type="button" className="back-button full" onClick={() => setArchiveOpen(false)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>{tr(language, 'announcementArchiveHint')}</p>
                <h2>{tr(language, 'announcementArchive')}</h2>
              </div>
              <Archive size={24} aria-hidden="true" />
            </div>
            <div className="user-groups">
              {archivedAnnouncements.length === 0 && <p className="empty-state">{tr(language, 'noArchivedAnnouncements')}</p>}
              {archivedAnnouncements.map((announcement) => renderArchiveRow(announcement))}
            </div>
          </div>
        </>
      )}

      {canViewAnnouncementArchive(currentUser) && archiveOpen && archiveAnnouncementId && selectedArchivedAnnouncement && (
        <>
          <button type="button" className="back-button full" onClick={() => setArchiveAnnouncementId(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="panel full">{renderAnnouncementCard(selectedArchivedAnnouncement, true)}</div>
        </>
      )}

      {(!archiveOpen || !canViewAnnouncementArchive(currentUser)) && (
        <>
          {currentUser.role === 'director' && (
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <p>{school?.name ?? tr(language, 'schoolAnnouncements')}</p>
                  <h2>{tr(language, 'announcements')}</h2>
                </div>
                <MessageSquare size={24} aria-hidden="true" />
              </div>
              <form className="form-stack" onSubmit={submit}>
                <Field label={tr(language, 'announcementTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
                <label>
                  <span>{tr(language, 'announcementBody')}</span>
                  <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
                </label>
                <label className="file-field">
                  <span>{tr(language, 'uploadImage')}</span>
                  <input type="file" accept="image/*" onChange={readImage} />
                  <Upload size={18} aria-hidden="true" />
                </label>
                {form.image && <AttachmentPreview attachment={form.image} language={language} />}
                {error && <p className="form-error">{error}</p>}
                <button className="button primary" type="submit">
                  <Plus size={17} aria-hidden="true" />
                  <span>{tr(language, 'publishAnnouncement')}</span>
                </button>
              </form>
            </div>
          )}

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>{school?.name ?? tr(language, 'scopedData')}</p>
                <h2>{tr(language, 'activeAnnouncements')}</h2>
              </div>
              <MessageSquare size={24} aria-hidden="true" />
            </div>
            <div className="message-list">
              {activeAnnouncements.length === 0 && <p className="empty-state">{tr(language, 'noAnnouncements')}</p>}
              {activeAnnouncements.map((announcement) => renderAnnouncementCard(announcement))}
            </div>
          </div>

          {canViewAnnouncementArchive(currentUser) && (
            <button type="button" className="user-group user-group-school drill-row" onClick={() => setArchiveOpen(true)}>
              <span className="user-group-title">
                <span className="user-group-label">
                  <Archive size={18} aria-hidden="true" />
                  <span className="user-group-label-name">{tr(language, 'announcementArchive')}</span>
                </span>
                <span className="user-group-meta">
                  <strong>{archivedAnnouncements.length}</strong>
                  <ChevronRight size={17} aria-hidden="true" />
                </span>
              </span>
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function NotesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'teacher') {
    return <TeacherNotes data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'student') {
    return <StudentNotes data={data} currentUser={currentUser} language={language} />;
  }

  return <p className="empty-state">{tr(language, 'scopedData')}</p>;
}

function TeacherNotes({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const now = useTimeTick();
  const teacherYearClassGroups = assignedYearClassGroups(currentUser);
  const teacherYearStreamClassGroups = assignedYearStreamClassGroups(currentUser);
  const hasStreamAssignments = Object.keys(teacherYearStreamClassGroups).length > 0;
  const teacherYears = assignedSchoolYears(currentUser);
  const firstYear = teacherYears[0] ?? 1;
  const teacherClassesForYear = (year: number) => teacherYearClassGroups[String(year)] ?? [];
  const teacherStreamsForYear = (year: number) => {
    const streamsForYear = secondaryStreamsForYear(school, year);
    const assignedStreams = Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}) as SecondaryStream[];
    return currentUser.stage === 'secondary' ? assignedStreams.filter((stream) => streamsForYear.includes(stream)) : [];
  };
  const teacherClassesForYearAndStream = (year: number, stream: SecondaryStream | '') =>
    stream && hasStreamAssignments ? teacherYearStreamClassGroups[String(year)]?.[stream] ?? [] : teacherClassesForYear(year);
  const firstStream = teacherStreamsForYear(firstYear)[0] ?? '';
  const firstSubject = teacherAllowedSubjectsForYear(currentUser, firstYear)[0] ?? '';
  const [form, setForm] = useState({
    title: '',
    body: '',
    targetSchoolYear: firstYear,
    targetSubject: firstSubject as Subject | '',
    targetStream: firstStream as SecondaryStream | '',
    targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
    attachment: null as UploadedAttachment | null
  });
  const [error, setError] = useState('');
  const notes = scopedNotes(data, currentUser).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const activeNotes = notes.filter((note) => !isNoteArchived(note, now));
  const streamOptionsForSelectedYear = teacherStreamsForYear(form.targetSchoolYear);
  const subjectOptionsForSelectedYear = teacherAllowedSubjectsForYear(currentUser, form.targetSchoolYear);
  const streamRequired = currentUser.stage === 'secondary';

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    readAttachmentFromInput(
      event,
      (attachment) => {
        setForm((previous) => ({ ...previous, attachment }));
        setError('');
      },
      () => setError(tr(language, 'fileTooLarge'))
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const classGroup = form.targetClassGroup.trim();
    const targetSubject = subjectOptionsForSelectedYear.includes(form.targetSubject as Subject)
      ? (form.targetSubject as Subject)
      : subjectOptionsForSelectedYear[0] ?? teacherSubjectForYear(currentUser, form.targetSchoolYear);
    const targetStream =
      form.targetStream && streamOptionsForSelectedYear.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : undefined;
    const targetClasses =
      currentUser.stage === 'secondary' && targetStream
        ? teacherClassesForYearAndStream(form.targetSchoolYear, targetStream)
        : teacherClassesForYear(form.targetSchoolYear);

    if (
      !currentUser.schoolId ||
      !currentUser.stage ||
      !teacherYears.includes(form.targetSchoolYear) ||
      !targetClasses.some((assignedClass) => sameClassGroup(assignedClass, classGroup)) ||
      (streamRequired && !targetStream)
    ) {
      return;
    }

    setData((previous) => ({
      ...previous,
      notes: [
        ...previous.notes,
        {
          id: makeId('note'),
          schoolId: currentUser.schoolId!,
          stage: currentUser.stage!,
          teacherId: currentUser.id,
          subject: targetSubject,
          title: form.title.trim(),
          body: form.body.trim(),
          schoolYear: form.targetSchoolYear,
          classGroup,
          stream: targetStream,
          attachment: form.attachment ?? undefined,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setForm({
      title: '',
      body: '',
      targetSchoolYear: firstYear,
      targetSubject: firstSubject as Subject | '',
      targetStream: firstStream as SecondaryStream | '',
      targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
      attachment: null
    });
    setError('');
  };

  const deleteNote = (note: TeacherNote) => {
    if (note.teacherId !== currentUser.id) {
      return;
    }

    setData((previous) =>
      applyDeletedNoteTombstones({
        ...previous,
        deletedNoteIds: uniqueStrings([...previous.deletedNoteIds, note.id])
      })
    );
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'targetGroup')}</p>
            <h2>{tr(language, 'teacherNotes')}</h2>
          </div>
          <MessageSquare size={24} aria-hidden="true" />
        </div>
        <form className="form-stack" onSubmit={submit}>
          <Field label={tr(language, 'noteTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <label>
            <span>{tr(language, 'noteBody')}</span>
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
          </label>
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
                  targetClassGroup: classes[0] ?? ''
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
                  setForm({ ...form, targetStream: stream, targetClassGroup: classes[0] ?? '' });
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
              {(streamRequired && form.targetStream
                ? teacherClassesForYearAndStream(form.targetSchoolYear, form.targetStream as SecondaryStream)
                : teacherClassesForYear(form.targetSchoolYear)
              ).map((classGroup) => (
                <option value={classGroup} key={classGroup}>
                  {classGroup}
                </option>
              ))}
            </select>
          </label>
          <label className="file-field">
            <span>{tr(language, 'uploadFile')}</span>
            <input type="file" onChange={readFile} />
            <Upload size={18} aria-hidden="true" />
          </label>
          {form.attachment && <AttachmentPreview attachment={form.attachment} language={language} />}
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'publishNote')}</span>
          </button>
        </form>
      </div>
      <NotesList notes={activeNotes} data={data} language={language} titleKey="activeNotes" subtitleKey="notesExpiryHint" emptyKey="noNotes" archived={false} onDelete={deleteNote} />
    </section>
  );
}

function StudentNotes({ data, currentUser, language }: CommonViewProps) {
  const now = useTimeTick();

  useEffect(() => {
    markSeenAt(currentUser.id, 'studentNotes');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notes = scopedNotes(data, currentUser)
    .filter((note) => !isNoteArchived(note, now))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <section className="content-grid">
      <NotesList notes={notes} data={data} language={language} titleKey="activeNotes" emptyKey="noNotes" archived={false} />
    </section>
  );
}

function NotesList({
  notes,
  data,
  language,
  titleKey = 'teacherNotes',
  subtitleKey = 'scopedData',
  emptyKey = 'noNotes',
  archived = false,
  onDelete
}: {
  notes: TeacherNote[];
  data: PlatformData;
  language: Language;
  titleKey?: string;
  subtitleKey?: string;
  emptyKey?: string;
  archived?: boolean;
  onDelete?: (note: TeacherNote) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, subtitleKey)}</p>
          <h2>{tr(language, titleKey)}</h2>
        </div>
        {archived ? <Archive size={24} aria-hidden="true" /> : <MessageSquare size={24} aria-hidden="true" />}
      </div>
      <div className="message-list">
        {notes.length === 0 && <p className="empty-state">{tr(language, emptyKey)}</p>}
        {notes.map((note) => {
          const teacher = data.users.find((user) => user.id === note.teacherId);
          const status = archived ? 'archived' : noteStatus(note);
          const statusKey = status === 'active' ? 'messageStatusActive' : status === 'expiring' ? 'messageStatusExpiring' : 'messageStatusArchived';
          const StatusIcon = status === 'expiring' ? Clock : MessageSquare;
          return (
            <article className={archived ? 'message-card archived-message-card' : 'message-card'} key={note.id}>
              <div className="message-card-head">
                <h3>{note.title}</h3>
                <span className={`message-status ${status}`}>
                  <StatusIcon aria-hidden="true" />
                  {tr(language, statusKey)}
                </span>
              </div>
              <div className="message-meta">
                {note.subject && <span className="mm-tag">{subjectNames[language][note.subject]}</span>}
                {note.schoolYear && <span className="mm-tag">{schoolYearLabel(language, note.stage, note.schoolYear)}</span>}
                {note.stream && <span className="mm-tag">{secondaryStreamLabel(language, note.stream, note.schoolYear)}</span>}
                {note.classGroup && <span className="mm-tag">{tr(language, 'classGroup')} {note.classGroup}</span>}
                <span className="mm-tag">
                  <Clock aria-hidden="true" />
                  {formatDateTime(language, note.createdAt)}
                </span>
              </div>
              <p>{note.body}</p>
              {note.attachment && <AttachmentPreview attachment={note.attachment} language={language} />}
              <small>{teacher?.name ?? '-'}</small>
              {onDelete && (
                <div className="button-row">
                  <button className="button danger" type="button" onClick={() => onDelete(note)}>
                    <Trash2 size={16} aria-hidden="true" />
                    <span>{tr(language, 'delete')}</span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
