import { ArrowRightLeft, CheckCircle2, Inbox, X } from 'lucide-react';
import type { DataSetter, Language, PlatformData, PlatformUser, TransferRequest } from '../types';
import { tr } from '../i18n';
import { formatDateTime } from '../dates';
import { RoleLabel } from '../ui';
import { applyTransferredAccount } from './accounts-move';

function PendingTransferCard({
  data,
  request,
  language,
  onConfirm,
  onReject
}: {
  data: PlatformData;
  request: TransferRequest;
  language: Language;
  onConfirm: (request: TransferRequest) => void;
  onReject: (request: TransferRequest) => void;
}) {
  const user = data.users.find((item) => item.id === request.userId);
  const fromSchool = data.schools.find((school) => school.id === request.fromSchoolId);
  return (
    <article className="message-card">
      <div className="message-card-head">
        <h3>{user?.name ?? '-'}</h3>
        <span className="mm-tag">
          <ArrowRightLeft size={14} aria-hidden="true" />
          {fromSchool?.name ?? '-'}
        </span>
      </div>
      <div className="message-meta">
        {user && (
          <span className="mm-tag">
            <RoleLabel role={user.role} language={language} />
          </span>
        )}
        {user?.email && <span className="mm-tag">{user.email}</span>}
        <span className="mm-tag">{tr(language, 'fromSchool')}: {fromSchool?.name ?? '-'}</span>
      </div>
      <div className="button-row">
        <button className="button primary" type="button" onClick={() => onConfirm(request)}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{tr(language, 'confirmTransfer')}</span>
        </button>
        <button className="button danger" type="button" onClick={() => onReject(request)}>
          <X size={16} aria-hidden="true" />
          <span>{tr(language, 'rejectTransfer')}</span>
        </button>
      </div>
    </article>
  );
}

export function PendingTransfersPanel({
  data,
  setData,
  currentUser,
  language
}: {
  data: PlatformData;
  setData: DataSetter;
  currentUser: PlatformUser;
  language: Language;
}) {
  const pendingRequests = data.transferRequests
    .filter((request) => request.toSchoolId === currentUser.schoolId && request.status === 'pending')
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));

  const confirmTransfer = (request: TransferRequest) => {
    setData((previous) => {
      const target = previous.users.find((user) => user.id === request.userId);
      const targetSchool = previous.schools.find((school) => school.id === request.toSchoolId);
      if (!target || !targetSchool) {
        return previous;
      }
      const now = new Date().toISOString();
      return {
        ...previous,
        laboratories:
          target.role === 'lab'
            ? previous.laboratories.map((lab) =>
                lab.schoolId === request.fromSchoolId && lab.supervisorId === target.id ? { ...lab, supervisorId: '' } : lab
              )
            : previous.laboratories,
        users: previous.users.map((user) => (user.id === target.id ? applyTransferredAccount(user, targetSchool) : user)),
        transferRequests: previous.transferRequests.map((item) =>
          item.id === request.id ? { ...item, status: 'confirmed', resolvedAt: now, resolvedBy: currentUser.id } : item
        )
      };
    });
  };

  const rejectTransfer = (request: TransferRequest) => {
    setData((previous) => ({
      ...previous,
      transferRequests: previous.transferRequests.map((item) =>
        item.id === request.id
          ? { ...item, status: 'rejected', resolvedAt: new Date().toISOString(), resolvedBy: currentUser.id }
          : item
      )
    }));
  };

  return (
    <div className="panel full">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'pendingTransfersHint')}</p>
          <h2>{tr(language, 'pendingTransfers')}</h2>
        </div>
        <Inbox size={24} aria-hidden="true" />
      </div>
      <div className="user-groups">
        {pendingRequests.length === 0 && <p className="empty-state">{tr(language, 'noPendingTransfers')}</p>}
        {pendingRequests.map((request) => (
          <PendingTransferCard
            key={request.id}
            data={data}
            request={request}
            language={language}
            onConfirm={confirmTransfer}
            onReject={rejectTransfer}
          />
        ))}
      </div>
    </div>
  );
}

export function TransferNoticesPanel({
  data,
  setData,
  currentUser,
  language
}: {
  data: PlatformData;
  setData: DataSetter;
  currentUser: PlatformUser;
  language: Language;
}) {
  const pendingRequests = data.transferRequests
    .filter((request) => request.toSchoolId === currentUser.schoolId && request.status === 'pending')
    .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  const outcomeRequests = data.transferRequests
    .filter((request) => request.fromSchoolId === currentUser.schoolId && request.status !== 'pending')
    .sort((left, right) => (right.resolvedAt ?? '').localeCompare(left.resolvedAt ?? ''));

  const confirmTransfer = (request: TransferRequest) => {
    setData((previous) => {
      const target = previous.users.find((user) => user.id === request.userId);
      const targetSchool = previous.schools.find((school) => school.id === request.toSchoolId);
      if (!target || !targetSchool) {
        return previous;
      }
      const now = new Date().toISOString();
      return {
        ...previous,
        laboratories:
          target.role === 'lab'
            ? previous.laboratories.map((lab) =>
                lab.schoolId === request.fromSchoolId && lab.supervisorId === target.id ? { ...lab, supervisorId: '' } : lab
              )
            : previous.laboratories,
        users: previous.users.map((user) => (user.id === target.id ? applyTransferredAccount(user, targetSchool) : user)),
        transferRequests: previous.transferRequests.map((item) =>
          item.id === request.id ? { ...item, status: 'confirmed', resolvedAt: now, resolvedBy: currentUser.id } : item
        )
      };
    });
  };

  const rejectTransfer = (request: TransferRequest) => {
    setData((previous) => ({
      ...previous,
      transferRequests: previous.transferRequests.map((item) =>
        item.id === request.id
          ? { ...item, status: 'rejected', resolvedAt: new Date().toISOString(), resolvedBy: currentUser.id }
          : item
      )
    }));
  };

  return (
    <div className="panel full">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'transferNoticesHint')}</p>
          <h2>{tr(language, 'transferNotices')}</h2>
        </div>
        <ArrowRightLeft size={24} aria-hidden="true" />
      </div>
      <div className="drill-heading">
        <h3>{tr(language, 'incomingTransfers')}</h3>
      </div>
      <div className="user-groups">
        {pendingRequests.length === 0 && <p className="empty-state">{tr(language, 'noPendingTransfers')}</p>}
        {pendingRequests.map((request) => (
          <PendingTransferCard
            key={request.id}
            data={data}
            request={request}
            language={language}
            onConfirm={confirmTransfer}
            onReject={rejectTransfer}
          />
        ))}
      </div>
      <div className="drill-heading">
        <h3>{tr(language, 'transferOutcomes')}</h3>
      </div>
      <div className="user-groups">
        {outcomeRequests.length === 0 && <p className="empty-state">{tr(language, 'noOutgoingTransfers')}</p>}
        {outcomeRequests.map((request) => {
          const user = data.users.find((item) => item.id === request.userId);
          const toSchool = data.schools.find((school) => school.id === request.toSchoolId);
          const resolvedBy = request.resolvedBy ? data.users.find((item) => item.id === request.resolvedBy) : undefined;
          const confirmed = request.status === 'confirmed';
          return (
            <article className="message-card" key={request.id}>
              <div className="message-card-head">
                <h3>{user?.name ?? '-'}</h3>
                <span className={`mm-tag ${confirmed ? 'confirmed' : 'rejected'}`}>
                  {confirmed ? <CheckCircle2 size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                  {tr(language, confirmed ? 'transferConfirmed' : 'transferRejected')}
                </span>
              </div>
              <div className="message-meta">
                {user && (
                  <span className="mm-tag">
                    <RoleLabel role={user.role} language={language} />
                  </span>
                )}
                <span className="mm-tag">
                  {tr(language, 'targetSchool')}: {toSchool?.name ?? '-'}
                </span>
                <span className="mm-tag">
                  {tr(language, 'transferResolvedAt')}: {formatDateTime(language, request.resolvedAt ?? '')}
                </span>
                {resolvedBy && (
                  <span className="mm-tag">
                    {tr(language, 'transferResolvedBy')}: {resolvedBy.name}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function hasPendingTransfers(data: PlatformData, currentUser: PlatformUser) {
  return data.transferRequests.some(
    (request) => request.toSchoolId === currentUser.schoolId && request.status === 'pending'
  );
}

export function transferBadgeCount(data: PlatformData, currentUser: PlatformUser) {
  return data.transferRequests.filter(
    (request) => request.toSchoolId === currentUser.schoolId && request.status === 'pending'
  ).length;
}