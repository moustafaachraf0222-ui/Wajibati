import { Edit3, LockKeyhole, RotateCcw, Save, School, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser, SchoolRecord, SecondaryStream, Stage } from '../types';
import { secondaryStreamNames, stageNames, tr } from '../i18n';
import { secondaryStreams, stages } from '../education';
import {
  deleteSchoolRecords,
  getSchool,
  normalizeEmailDomain,
  restoreSchoolRecords,
  schoolIsTrashed,
  schoolTrashExpiresAt,
  trashSchoolRecords,
  userCanSeeSchool
} from '../data';
import { formatDateTime } from '../dates';
import { Field, ResponsiveTable } from '../ui';

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

type SchoolEditState = {
  id: string;
  name: string;
  stage: Stage;
  domain: string;
  city: string;
  address: string;
  phone: string;
};

export function SchoolsView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const schools = data.schools.filter((school) => userCanSeeSchool(currentUser, school));
  const trashedSchools = currentUser.role === 'admin' ? data.schools.filter(schoolIsTrashed) : [];
  const [pendingDeleteSchool, setPendingDeleteSchool] = useState<SchoolRecord | null>(null);
  const [pendingForceDeleteSchool, setPendingForceDeleteSchool] = useState<SchoolRecord | null>(null);
  const [editingSchool, setEditingSchool] = useState<SchoolEditState | null>(null);
  const [schoolEditError, setSchoolEditError] = useState('');
  const canDeleteSchools = currentUser.role === 'admin';
  const columns = [tr(language, 'schoolName'), tr(language, 'stage'), tr(language, 'domain'), tr(language, 'city'), tr(language, 'director'), tr(language, 'users')];
  const trashColumns = [...columns, tr(language, 'deletedAt'), tr(language, 'deletesAt'), tr(language, 'actions')];

  if (canDeleteSchools) {
    columns.push(tr(language, 'actions'));
  }

  const deleteSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => trashSchoolRecords(previous, school));
    setPendingDeleteSchool(null);
  };

  const forceDeleteSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => deleteSchoolRecords(previous, school));
    setPendingForceDeleteSchool(null);
  };

  const restoreSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => restoreSchoolRecords(previous, school));
  };

  const openSchoolEdit = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setSchoolEditError('');
    setEditingSchool({
      id: school.id,
      name: school.name,
      stage: school.stage,
      domain: school.domain,
      city: school.city,
      address: school.address,
      phone: school.phone
    });
  };

  const saveSchoolEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canDeleteSchools || !editingSchool) {
      return;
    }

    const domain = normalizeEmailDomain(editingSchool.domain);
    const duplicateDomain = data.schools.some(
      (school) => school.id !== editingSchool.id && !schoolIsTrashed(school) && normalizeEmailDomain(school.domain) === domain
    );

    if (duplicateDomain) {
      setSchoolEditError(tr(language, 'duplicateDomain'));
      return;
    }

    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((school) =>
        school.id === editingSchool.id
          ? {
              ...school,
              name: editingSchool.name.trim(),
              stage: editingSchool.stage,
              domain,
              city: editingSchool.city.trim(),
              address: editingSchool.address.trim(),
              phone: editingSchool.phone.trim(),
              streams: editingSchool.stage === 'secondary' ? (school.streams?.length ? school.streams : [...secondaryStreams]) : undefined
            }
          : school
      ),
      users: previous.users.map((user) =>
        user.schoolId === editingSchool.id
          ? { ...user, stage: editingSchool.stage, stream: editingSchool.stage === 'secondary' ? user.stream : undefined }
          : user
      ),
      studentActivations: previous.studentActivations.map((activation) =>
        activation.schoolId === editingSchool.id
          ? { ...activation, stage: editingSchool.stage, stream: editingSchool.stage === 'secondary' ? activation.stream : undefined }
          : activation
      )
    }));

    setSchoolEditError('');
    setEditingSchool(null);
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'allSchools')}</p>
            <h2>{tr(language, 'schools')}</h2>
          </div>
          <School size={24} aria-hidden="true" />
        </div>
        <ResponsiveTable columns={columns} emptyText={tr(language, 'noRecords')}>
          {schools.map((school) => {
            const director = data.users.find((user) => user.id === school.directorId);
            const userCount = data.users.filter((user) => user.schoolId === school.id).length;
            return (
              <tr key={school.id}>
                <td>{school.name}</td>
                <td>{stageNames[language][school.stage]}</td>
                <td>{school.domain}</td>
                <td>{school.city}</td>
                <td>{director?.name ?? '-'}</td>
                <td>{userCount}</td>
                {canDeleteSchools && (
                  <td>
                    <div className="table-actions">
                      <button className="icon-button" type="button" title={tr(language, 'editSchool')} onClick={() => openSchoolEdit(school)}>
                        <Edit3 size={16} aria-hidden="true" />
                      </button>
                      <button className="icon-button danger" type="button" title={tr(language, 'delete')} onClick={() => setPendingDeleteSchool(school)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </ResponsiveTable>
      </div>
      {canDeleteSchools && (
        <div className="panel trash-panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'trashHint')}</p>
              <h2>{tr(language, 'schoolTrash')}</h2>
            </div>
            <Trash2 size={24} aria-hidden="true" />
          </div>
          <ResponsiveTable columns={trashColumns} emptyText={tr(language, 'noRecords')}>
            {trashedSchools.map((school) => {
              const director = data.users.find((user) => user.id === school.directorId);
              const userCount = data.users.filter((user) => user.schoolId === school.id).length;
              return (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>{stageNames[language][school.stage]}</td>
                  <td>{school.domain}</td>
                  <td>{school.city}</td>
                  <td>{director?.name ?? '-'}</td>
                  <td>{userCount}</td>
                  <td>{formatDateTime(language, school.deletedAt)}</td>
                  <td>{formatDateTime(language, schoolTrashExpiresAt(school))}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-button" type="button" title={tr(language, 'restoreSchool')} onClick={() => restoreSchool(school)}>
                        <RotateCcw size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        title={tr(language, 'forceDelete')}
                        onClick={() => setPendingForceDeleteSchool(school)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </ResponsiveTable>
        </div>
      )}
      {pendingDeleteSchool && (
        <SchoolDeleteDialog
          school={pendingDeleteSchool}
          userCount={data.users.filter((user) => user.schoolId === pendingDeleteSchool.id).length}
          language={language}
          mode="trash"
          onCancel={() => setPendingDeleteSchool(null)}
          onConfirm={() => deleteSchool(pendingDeleteSchool)}
        />
      )}
      {pendingForceDeleteSchool && (
        <SchoolDeleteDialog
          school={pendingForceDeleteSchool}
          userCount={data.users.filter((user) => user.schoolId === pendingForceDeleteSchool.id).length}
          language={language}
          mode="permanent"
          onCancel={() => setPendingForceDeleteSchool(null)}
          onConfirm={() => forceDeleteSchool(pendingForceDeleteSchool)}
        />
      )}
      {editingSchool && (
        <SchoolEditDialog
          edit={editingSchool}
          error={schoolEditError}
          language={language}
          onCancel={() => {
            setSchoolEditError('');
            setEditingSchool(null);
          }}
          onChange={setEditingSchool}
          onSubmit={saveSchoolEdit}
        />
      )}
    </section>
  );
}

function SchoolEditDialog({
  edit,
  error,
  language,
  onSubmit,
  onChange,
  onCancel
}: {
  edit: SchoolEditState;
  error: string;
  language: Language;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (edit: SchoolEditState) => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal school-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-school-title" onSubmit={onSubmit}>
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <Edit3 size={30} aria-hidden="true" />
        <div>
          <h2 id="edit-school-title">{tr(language, 'editSchool')}</h2>
          <p className="modal-copy">{tr(language, 'schoolEditHint')}</p>
        </div>
        <div className="form-grid">
          <Field label={tr(language, 'schoolName')} value={edit.name} onChange={(value) => onChange({ ...edit, name: value })} required />
          <label>
            <span>{tr(language, 'stage')}</span>
            <select value={edit.stage} onChange={(event) => onChange({ ...edit, stage: event.target.value as Stage })}>
              {stages.map((stage) => (
                <option value={stage} key={stage}>
                  {stageNames[language][stage]}
                </option>
              ))}
            </select>
          </label>
          <Field label={tr(language, 'domain')} value={edit.domain} onChange={(value) => onChange({ ...edit, domain: value })} required />
          <Field label={tr(language, 'city')} value={edit.city} onChange={(value) => onChange({ ...edit, city: value })} required />
          <Field label={tr(language, 'address')} value={edit.address} onChange={(value) => onChange({ ...edit, address: value })} />
          <Field label={tr(language, 'phone')} value={edit.phone} onChange={(value) => onChange({ ...edit, phone: value })} />
        </div>
        {error && <p className="form-error full">{error}</p>}
        <div className="button-row center">
          <button className="button primary" type="submit">
            <Save size={17} aria-hidden="true" />
            <span>{tr(language, 'save')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onCancel}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function SchoolDeleteDialog({
  school,
  userCount,
  language,
  mode,
  onConfirm,
  onCancel
}: {
  school: SchoolRecord;
  userCount: number;
  language: Language;
  mode: 'trash' | 'permanent';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isPermanent = mode === 'permanent';

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="delete-school-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <Trash2 size={30} aria-hidden="true" />
        <div>
          <h2 id="delete-school-title">{tr(language, isPermanent ? 'forceDeleteSchoolTitle' : 'deleteSchoolTitle')}</h2>
          <p className="modal-copy">{tr(language, isPermanent ? 'forceDeleteSchoolQuestion' : 'deleteSchoolQuestion')}</p>
        </div>
        <div className="delete-target-card">
          <strong>{school.name}</strong>
          <span dir="ltr">{school.domain}</span>
          <small>
            {stageNames[language][school.stage]} - {tr(language, 'linkedAccounts')}: {userCount}
          </small>
        </div>
        <p className="modal-warning">{tr(language, isPermanent ? 'forceDeleteSchoolWarning' : 'deleteSchoolWarning')}</p>
        <div className="button-row center">
          <button className="button danger" type="button" onClick={onConfirm}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, isPermanent ? 'forceDelete' : 'delete')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onCancel}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SchoolProfileView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const [form, setForm] = useState({
    city: school?.city ?? '',
    address: school?.address ?? '',
    phone: school?.phone ?? ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ city: school?.city ?? '', address: school?.address ?? '', phone: school?.phone ?? '' });
  }, [school?.id, school?.city, school?.address, school?.phone]);

  if (!school) {
    return <p className="empty-state">{tr(language, 'noRecords')}</p>;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((record) => (record.id === school.id ? { ...record, ...form } : record))
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const toggleStream = (stream: SecondaryStream) => {
    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((record) => {
        if (record.id !== school.id) {
          return record;
        }

        const currentStreams = record.streams ?? [];
        const nextStreams = currentStreams.includes(stream)
          ? currentStreams.filter((item) => item !== stream)
          : [...currentStreams, stream];

        return { ...record, streams: nextStreams };
      })
    }));
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'lockedScope')}</p>
          <h2>{tr(language, 'schoolProfile')}</h2>
        </div>
        <School size={24} aria-hidden="true" />
      </div>
      <div className="locked-strip">
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedSchool')}: {school.name}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedStage')}: {stageNames[language][school.stage]}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedDomain')}: @{school.domain}
        </span>
      </div>
      {school.stage === 'secondary' && (
        <div className="form-field stream-settings">
          <span>{tr(language, 'secondaryStreams')}</span>
          <div className="checkbox-grid">
            {secondaryStreams.map((stream) => (
              <label className="check-option" key={stream}>
                <input type="checkbox" checked={(school.streams ?? []).includes(stream)} onChange={() => toggleStream(stream)} />
                <span>{secondaryStreamNames[language][stream]}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <form className="form-grid" onSubmit={submit}>
        <Field label={tr(language, 'city')} value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
        <Field label={tr(language, 'address')} value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
        <Field label={tr(language, 'phone')} value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
        {saved && <p className="success-message full">{tr(language, 'saved')}</p>}
        <button className="button primary form-submit" type="submit">
          <Save size={17} aria-hidden="true" />
          <span>{tr(language, 'save')}</span>
        </button>
      </form>
    </section>
  );
}
