import { ArrowRightLeft, CheckCircle2, School, X } from 'lucide-react';
import { useState } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser } from '../types';
import { stageNames, tr } from '../i18n';
import { makeId } from '../data';
import { schoolIsTrashed } from '../data-tombstones';
import { RoleLabel } from '../ui';

export function applyTransferredAccount(user: PlatformUser, targetSchool: { id: string; stage: PlatformUser['stage'] }): PlatformUser {
  const nextUser = { ...user, schoolId: targetSchool.id, stage: targetSchool.stage };
  if (user.role === 'teacher' && user.stage !== targetSchool.stage) {
    nextUser.schoolYears = undefined;
    nextUser.subjectsByYear = undefined;
    nextUser.yearClassGroups = undefined;
    nextUser.yearStreamClassGroups = undefined;
  }
  return nextUser;
}

export function MoveAccountPanel({
  data,
  setData,
  target,
  currentUser,
  language,
  onClose
}: {
  data: PlatformData;
  setData: DataSetter;
  target: PlatformUser;
  currentUser: PlatformUser;
  language: Language;
  onClose: () => void;
}) {
  const [targetSchoolId, setTargetSchoolId] = useState('');
  const [sent, setSent] = useState(false);

  const currentSchool = data.schools.find((school) => school.id === target.schoolId);
  const sameStage = currentSchool?.stage ?? target.stage;
  const hasPendingRequest = data.transferRequests.some(
    (request) => request.userId === target.id && request.status === 'pending'
  );
  const targetSchools = data.schools
    .filter(
      (school) =>
        !schoolIsTrashed(school) &&
        school.id !== target.schoolId &&
        (target.role !== 'student' || school.stage === sameStage)
    )
    .sort((left, right) => left.name.localeCompare(right.name, language === 'ar' ? 'ar' : undefined, { sensitivity: 'base' }));

  const requestTransfer = () => {
    const targetSchool = data.schools.find((school) => school.id === targetSchoolId);
    if (!targetSchool || hasPendingRequest) {
      return;
    }

    setData((previous) => ({
      ...previous,
      transferRequests: [
        ...previous.transferRequests,
        {
          id: makeId('transfer'),
          userId: target.id,
          fromSchoolId: target.schoolId ?? '',
          toSchoolId: targetSchoolId,
          requestedBy: currentUser.id,
          requestedAt: new Date().toISOString(),
          status: 'pending'
        }
      ]
    }));
    setSent(true);
  };

  if (sent) {
    return (
      <div className="modal-backdrop" role="presentation">
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="transfer-sent-title">
          <CheckCircle2 size={30} aria-hidden="true" />
          <div>
            <h2 id="transfer-sent-title">{tr(language, 'transferRequested')}</h2>
            <p className="modal-copy">{tr(language, 'transferRequestedHint')}</p>
          </div>
          <div className="delete-target-card">
            <strong>{target.name}</strong>
            <span>{target.email}</span>
            <small>
              <RoleLabel role={target.role} language={language} />
            </small>
          </div>
          <div className="button-row center">
            <button className="button primary" type="button" onClick={onClose}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>{tr(language, 'ok')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="move-account-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <ArrowRightLeft size={30} aria-hidden="true" />
        <div>
          <h2 id="move-account-title">{tr(language, 'moveAccountTitle')}</h2>
          <p className="modal-copy">{tr(language, 'moveAccountHint')}</p>
        </div>
        <div className="delete-target-card">
          <strong>{target.name}</strong>
          <span>{target.email}</span>
          <small>
            <RoleLabel role={target.role} language={language} />
          </small>
        </div>
        <label>
          <span>{tr(language, 'targetSchool')}</span>
          <select value={targetSchoolId} onChange={(event) => setTargetSchoolId(event.target.value)}>
            <option value="">{tr(language, 'choose')}</option>
            {targetSchools.map((school) => (
              <option value={school.id} key={school.id}>
                {school.name} - {stageNames[language][school.stage]}
                {school.city ? ` - ${school.city}` : ''}
              </option>
            ))}
          </select>
        </label>
        {targetSchools.length === 0 && <p className="modal-copy">{tr(language, 'noMoveTargets')}</p>}
        {hasPendingRequest && <p className="modal-warning">{tr(language, 'transferAlreadyPending')}</p>}
        <p className="modal-warning">{tr(language, 'transferNeedsConfirmation')}</p>
        <div className="button-row center">
          <button
            className="button primary"
            type="button"
            disabled={!targetSchoolId || targetSchools.length === 0 || hasPendingRequest}
            onClick={requestTransfer}
          >
            <School size={17} aria-hidden="true" />
            <span>{tr(language, 'requestTransfer')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onClose}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}