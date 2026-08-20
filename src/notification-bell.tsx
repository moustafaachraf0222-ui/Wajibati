import { AlertTriangle, Bell, CheckCircle2, ClipboardCheck, Utensils, Wrench, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Language, PlatformData, PlatformUser, View } from './types';
import { localeNames, tr } from './i18n';
import { formatDateTime } from './dates';
import { markAllDomainsSeen, seenThreshold } from './notification-seen';
import {
  absenceNotificationCount,
  canteenNotificationCount,
  labNotificationCount,
  labRepairNotificationCount,
  transferOutcomeNotificationCount
} from './notification-badges';

type BellItemKind = 'transferAccepted' | 'transferRejected' | 'absence' | 'labFault' | 'labRepair' | 'canteen';

type BellItem = {
  id: string;
  kind: BellItemKind;
  title: string;
  subtitle: string;
  at: string;
  view: View;
};

const bellItemIcons: Record<BellItemKind, LucideIcon> = {
  transferAccepted: CheckCircle2,
  transferRejected: XCircle,
  absence: ClipboardCheck,
  labFault: AlertTriangle,
  labRepair: Wrench,
  canteen: Utensils
};

function formatDateLabel(language: Language, value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(date);
}

function pushItem(items: BellItem[], item: BellItem) {
  items.push(item);
}

function buildBellItems(data: PlatformData, currentUser: PlatformUser, language: Language): BellItem[] {
  const items: BellItem[] = [];

  if (currentUser.role === 'director') {
    const transferThreshold = seenThreshold('transferOutcomes');
    data.transferRequests
      .filter(
        (request) => request.fromSchoolId === currentUser.schoolId && request.status !== 'pending' && (request.resolvedAt ?? '') > transferThreshold
      )
      .forEach((request) => {
        const user = data.users.find((candidate) => candidate.id === request.userId);
        const toSchool = data.schools.find((candidate) => candidate.id === request.toSchoolId);
        pushItem(items, {
          id: `transfer-${request.id}`,
          kind: request.status === 'confirmed' ? 'transferAccepted' : 'transferRejected',
          title: tr(language, request.status === 'confirmed' ? 'transferAcceptedNotice' : 'transferRejectedNotice'),
          subtitle: `${user?.name ?? '-'} - ${toSchool?.name ?? '-'}`,
          at: request.resolvedAt ?? '',
          view: 'users'
        });
      });

    const absenceThreshold = seenThreshold('absences');
    data.absenceReports
      .filter((report) => report.schoolId === currentUser.schoolId && report.createdAt > absenceThreshold)
      .forEach((report) => {
        pushItem(items, {
          id: `absence-${report.id}`,
          kind: 'absence',
          title: tr(language, 'absenceReportNotice'),
          subtitle: `${formatDateLabel(language, report.date)} - ${report.sessionName}`,
          at: report.createdAt,
          view: 'absences'
        });
      });

    const labThreshold = seenThreshold('labs');
    data.labFaultReports
      .filter((fault) => fault.schoolId === currentUser.schoolId && fault.status === 'open' && fault.reportedAt > labThreshold)
      .forEach((fault) => {
        const lab = data.laboratories.find((candidate) => candidate.id === fault.labId);
        pushItem(items, {
          id: `fault-${fault.id}`,
          kind: 'labFault',
          title: tr(language, 'labFaultNotice'),
          subtitle: `${fault.deviceName} (${lab?.name ?? '-'})`,
          at: fault.reportedAt,
          view: 'labs'
        });
      });

    const canteenThreshold = seenThreshold('canteen');
    const canteenDays = new Map<string, number>();
    data.canteenMealScans
      .filter((scan) => scan.schoolId === currentUser.schoolId && scan.result === 'allowed' && scan.scannedAt > canteenThreshold)
      .forEach((scan) => {
        canteenDays.set(scan.date, (canteenDays.get(scan.date) ?? 0) + 1);
      });
    canteenDays.forEach((count, date) => {
      pushItem(items, {
        id: `canteen-${date}`,
        kind: 'canteen',
        title: tr(language, 'canteenReportNotice'),
        subtitle: `${formatDateLabel(language, date)} - ${count}`,
        at: `${date}T00:00:00`,
        view: 'canteen'
      });
    });
  }

  if (currentUser.role === 'lab') {
    const labIds = new Set(data.laboratories.filter((lab) => lab.supervisorId === currentUser.id).map((lab) => lab.id));
    const repairThreshold = seenThreshold('labRepairs');
    data.labFaultReports
      .filter(
        (fault) => fault.status === 'repaired' && labIds.has(fault.labId) && (fault.repairDate ?? fault.updatedAt ?? '') > repairThreshold
      )
      .forEach((fault) => {
        const lab = data.laboratories.find((candidate) => candidate.id === fault.labId);
        pushItem(items, {
          id: `repair-${fault.id}`,
          kind: 'labRepair',
          title: tr(language, 'labRepairNotice'),
          subtitle: `${fault.deviceName} (${lab?.name ?? '-'})`,
          at: fault.repairDate ?? fault.updatedAt ?? '',
          view: 'labs'
        });
      });
  }

  return items.sort((left, right) => right.at.localeCompare(left.at)).slice(0, 30);
}

export function NotificationBell({
  data,
  currentUser,
  language,
  onViewChange
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  onViewChange: (view: View) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const total =
    absenceNotificationCount(data, currentUser) +
    labNotificationCount(data, currentUser) +
    canteenNotificationCount(data, currentUser) +
    labRepairNotificationCount(data, currentUser) +
    transferOutcomeNotificationCount(data, currentUser);
  const items = open ? buildBellItems(data, currentUser, language) : [];

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const dismissAll = () => {
    markAllDomainsSeen();
    setOpen(false);
  };

  const openItem = (view: View) => {
    dismissAll();
    onViewChange(view);
  };

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button className="icon-text-button" type="button" title={tr(language, 'notifications')} onClick={() => setOpen((value) => !value)}>
        <Bell size={17} aria-hidden="true" />
        <span>{tr(language, 'notifications')}</span>
      </button>
      {total > 0 && <span className="nav-badge bell-badge">{total}</span>}
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <strong>{tr(language, 'notifications')}</strong>
            <button className="button ghost small" type="button" onClick={dismissAll}>
              <CheckCircle2 size={14} aria-hidden="true" />
              <span>{tr(language, 'markAllRead')}</span>
            </button>
          </div>
          {items.length === 0 ? (
            <p className="empty-state">{tr(language, 'notificationsEmpty')}</p>
          ) : (
            <ul className="notification-list">
              {items.map((item) => {
                const Icon = bellItemIcons[item.kind];
                return (
                  <li key={item.id}>
                    <button className="notification-item" type="button" onClick={() => openItem(item.view)}>
                      <Icon size={17} aria-hidden="true" />
                      <span className="notification-item-text">
                        <strong>{item.title}</strong>
                        <small>{item.subtitle}</small>
                        <small>{formatDateTime(language, item.at)}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}