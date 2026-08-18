import { ArrowRightLeft, School, X } from 'lucide-react';
import { useState } from 'react';
import type { DataSetter, Language, PlatformData, PlatformUser } from '../types';
import { stageNames, tr } from '../i18n';
import { schoolIsTrashed } from '../data-tombstones';
import { RoleLabel } from '../ui';

export function MoveAccountPanel({
  data,
  setData,
  target,
  language,
  onClose
}: {
  data: PlatformData;
  setData: DataSetter;
  target: PlatformUser;
  language: Language;
  onClose: () => void;
}) {
  const [targetSchoolId, setTargetSchoolId] = useState('');

  const currentSchool = data.schools.find((school) => school.id === target.schoolId);
  const sameStage = currentSchool?.stage ?? target.stage;
  const targetSchools = data.schools
    .filter(
      (school) =>
        !schoolIsTrashed(school) &&
        school.id !== target.schoolId &&
        (target.role === 'teacher' || school.stage === sameStage)
    )
    .sort((left, right) => left.name.localeCompare(right.name, language === 'ar' ? 'ar' : undefined, { sensitivity: 'base' }));

  const moveAccount = () => {
    const targetSchool = data.schools.find((school) => school.id === targetSchoolId);
    if (!targetSchool) {
      return;
    }

    setData((previous) => ({
      ...previous,
      laboratories:
        target.role === 'lab'
          ? previous.laboratories.map((lab) =>
              lab.schoolId === target.schoolId && lab.supervisorId === target.id ? { ...lab, supervisorId: '' } : lab
            )
          : previous.laboratories,
      users: previous.users.map((user) => {
        if (user.id !== target.id) {
          return user;
        }
        const nextUser = { ...user, schoolId: targetSchoolId, stage: targetSchool.stage };
        if (user.role === 'teacher' && user.stage !== targetSchool.stage) {
          nextUser.schoolYears = undefined;
          nextUser.subjectsByYear = undefined;
          nextUser.yearClassGroups = undefined;
          nextUser.yearStreamClassGroups = undefined;
        }
        return nextUser;
      })
    }));
    onClose();
  };

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
        <div className="button-row center">
          <button className="button primary" type="button" disabled={!targetSchoolId || targetSchools.length === 0} onClick={moveAccount}>
            <School size={17} aria-hidden="true" />
            <span>{tr(language, 'move')}</span>
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