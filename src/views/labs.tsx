import { AlertTriangle, Archive, ArrowLeft, CalendarDays, Camera, CheckCircle2, ChevronRight, Cpu, FlaskConical, Plus, Printer, Send, Wrench, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  DataSetter,
  LabAvailability,
  LabDevice,
  LabFaultReport,
  Laboratory,
  LabPeriod,
  LabReservationRequest,
  LabTimeSlot,
  Language,
  PlatformData,
  PlatformUser,
  UploadedAttachment,
  View
} from '../types';
import { localeNames, tr } from '../i18n';
import { makeId } from '../data';
import { readAttachmentFromInput } from '../files';
import { AttachmentPreview, Field, ResponsiveTable } from '../ui';

const labPeriods: LabPeriod[] = ['morning', 'afternoon'];
const quickLabChoices = ['lab1', 'lab2', 'custom'] as const;

const defaultLabSlotTemplates: Array<Omit<LabTimeSlot, 'availability'>> = [
  { id: 'morning-0800-0900', period: 'morning', name: '1', startsAt: '08:00', endsAt: '09:00' },
  { id: 'morning-0900-1000', period: 'morning', name: '2', startsAt: '09:00', endsAt: '10:00' },
  { id: 'morning-1000-1100', period: 'morning', name: '3', startsAt: '10:00', endsAt: '11:00' },
  { id: 'morning-1100-1200', period: 'morning', name: '4', startsAt: '11:00', endsAt: '12:00' },
  { id: 'afternoon-1300-1400', period: 'afternoon', name: '5', startsAt: '13:00', endsAt: '14:00' },
  { id: 'afternoon-1400-1500', period: 'afternoon', name: '6', startsAt: '14:00', endsAt: '15:00' },
  { id: 'afternoon-1500-1600', period: 'afternoon', name: '7', startsAt: '15:00', endsAt: '16:00' },
  { id: 'afternoon-1600-1700', period: 'afternoon', name: '8', startsAt: '16:00', endsAt: '17:00' }
];

function periodLabel(language: Language, period: LabPeriod) {
  return tr(language, period === 'morning' ? 'labMorningPeriod' : 'labAfternoonPeriod');
}

function reservationStatusLabel(language: Language, status: LabReservationRequest['status']) {
  if (status === 'confirmed') {
    return tr(language, 'labReservationConfirmed');
  }

  if (status === 'rejected') {
    return tr(language, 'labReservationRejected');
  }

  return tr(language, 'labReservationPending');
}

function defaultLabTimeSlots(availability: LabAvailability = 'available'): LabTimeSlot[] {
  return defaultLabSlotTemplates.map((slot) => ({ ...slot, availability }));
}

function labTimeSlots(lab: Laboratory) {
  if (Array.isArray(lab.timeSlots) && lab.timeSlots.length > 0) {
    return [...lab.timeSlots].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  }

  return defaultLabSlotTemplates.map((slot) => ({
    ...slot,
    availability: (lab.periods ?? defaultLabPeriods())[slot.period] ?? 'available'
  }));
}

function quickLabName(language: Language, choice: (typeof quickLabChoices)[number], customName: string) {
  if (choice === 'custom') {
    return customName.trim();
  }

  return tr(language, choice === 'lab1' ? 'labOne' : 'labTwo');
}

function deviceStatusLabel(language: Language, status: LabDevice['status']) {
  return tr(language, status === 'working' ? 'labDeviceWorking' : 'labDeviceBroken');
}

function faultStatusLabel(language: Language, status: LabFaultReport['status']) {
  return tr(language, status === 'open' ? 'labFaultOpen' : 'labFaultRepaired');
}

const REPAIR_ARCHIVE_CURRENT_MS = 24 * 60 * 60 * 1000;
const LAB_RESERVATION_VISIBLE_MS = 72 * 60 * 60 * 1000;

function repairIsCurrent(report: LabFaultReport, now = Date.now()) {
  const repairDate = Date.parse(report.repairDate ?? '');
  return !Number.isFinite(repairDate) || now - repairDate < REPAIR_ARCHIVE_CURRENT_MS;
}

function formatDate(language: Language, value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(date);
}

function formatDateTime(language: Language, value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function userName(data: PlatformData, userId: string) {
  return data.users.find((user) => user.id === userId)?.name ?? '-';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type RepairPrintEntry = {
  labName: string;
  reportedByName: string;
  report: LabFaultReport;
  technicianName: string;
};

function printRepairReports(language: Language, schoolName: string, administrationName: string, entries: RepairPrintEntry[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const rows =
    entries.length === 0
      ? `<tr><td colspan="6">${escapeHtml(tr(language, 'noRepairArchive'))}</td></tr>`
      : entries
          .map(
            (entry) => `
          <tr>
            <td>${escapeHtml(entry.labName)}</td>
            <td>${escapeHtml(entry.report.deviceName)}</td>
            <td>${entry.report.faultNumber}</td>
            <td>${escapeHtml(entry.reportedByName)}</td>
            <td>${escapeHtml(formatDateTime(language, entry.report.reportedAt))}</td>
            <td>${escapeHtml(formatDateTime(language, entry.report.repairDate))}</td>
          </tr>`
          )
          .join('');

  const technicianNames = [...new Set(entries.map((entry) => entry.technicianName))];
  const signatures = `
    <div class="signatures">
      <div class="signature">
        <p>${escapeHtml(tr(language, 'administration'))}: ${escapeHtml(administrationName)}</p>
        <div class="signature-line"></div>
        <p>${escapeHtml(tr(language, 'signature'))}</p>
      </div>
      ${technicianNames
        .map(
          (name) => `
      <div class="signature">
        <p>${escapeHtml(tr(language, 'labTechnician'))}: ${escapeHtml(name)}</p>
        <div class="signature-line"></div>
        <p>${escapeHtml(tr(language, 'signature'))}</p>
      </div>`
        )
        .join('')}
    </div>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.inset = 'auto 0 0 auto';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument ?? frame.contentWindow?.document;
  if (!frameDocument || !frame.contentWindow) {
    frame.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write(`<!doctype html>
    <html lang="${language}" dir="${direction}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(tr(language, 'repairReport'))}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, Tahoma, sans-serif; direction: ${direction}; }
          header { border-bottom: 3px solid #006233; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0 0 6px; color: #006233; font-size: 22px; }
          p { margin: 0 0 10px; color: #4b5563; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 9px 8px; text-align: start; vertical-align: middle; }
          th { background: #f3f4f6; color: #111827; font-weight: 700; }
          tbody tr:nth-child(even) td { background: #fafafa; }
          .signatures { display: flex; gap: 48px; margin-top: 32px; }
          .signature { flex: 1; }
          .signature-line { border-top: 1px solid #111827; margin-top: 26px; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(tr(language, 'repairReport'))}</h1>
          <p>${escapeHtml(schoolName)} - ${escapeHtml(printedAt)}</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(tr(language, 'laboratory'))}</th>
              <th>${escapeHtml(tr(language, 'deviceName'))}</th>
              <th>${escapeHtml(tr(language, 'faultNumber'))}</th>
              <th>${escapeHtml(tr(language, 'reportedBy'))}</th>
              <th>${escapeHtml(tr(language, 'reportedAt'))}</th>
              <th>${escapeHtml(tr(language, 'repairDate'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${signatures}
      </body>
    </html>`);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  }, 120);
}

function defaultLabPeriods(): Record<LabPeriod, LabAvailability> {
  return { morning: 'available', afternoon: 'available' };
}

function scopedLabsForUser(data: PlatformData, currentUser: PlatformUser) {
  const schoolLabs = data.laboratories.filter((lab) => lab.schoolId === currentUser.schoolId);
  if (currentUser.role === 'lab') {
    return schoolLabs.filter((lab) => lab.supervisorId === currentUser.id);
  }

  return schoolLabs;
}

function reportsForLabs(data: PlatformData, labs: Laboratory[]) {
  const labIds = new Set(labs.map((lab) => lab.id));
  return data.labFaultReports
    .filter((report) => labIds.has(report.labId))
    .sort((left, right) => Date.parse(right.reportedAt) - Date.parse(left.reportedAt));
}

function compareReservationRequests(left: LabReservationRequest, right: LabReservationRequest) {
  const statusRank = { pending: 0, confirmed: 1, rejected: 2 };
  return (
    statusRank[left.status] - statusRank[right.status] ||
    Date.parse(right.updatedAt ?? right.requestedAt) - Date.parse(left.updatedAt ?? left.requestedAt)
  );
}

export function LaboratoriesView({
  data,
  setData,
  currentUser,
  language,
  onViewChange
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  onViewChange: (view: View) => void;
}) {
  const labs = scopedLabsForUser(data, currentUser);
  const devicesByLab = useMemo(
    () =>
      Object.fromEntries(
        labs.map((lab) => [
          lab.id,
          data.labDevices
            .filter((device) => device.labId === lab.id)
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }))
        ])
      ) as Record<string, LabDevice[]>,
    [data.labDevices, labs]
  );
  const reports = reportsForLabs(data, labs);
  const canManageLabs = currentUser.role === 'lab';
  const canHandleFaults = currentUser.role === 'lab' || currentUser.role === 'director';

  return (
    <section className="content-grid labs-view">
      {canManageLabs && (
        <LabManagementPanel
          data={data}
          setData={setData}
          currentUser={currentUser}
          language={language}
          labs={labs}
          devicesByLab={devicesByLab}
          onViewChange={onViewChange}
        />
      )}

      {currentUser.role === 'lab' && (
        <LabReservationRequestsPanel data={data} setData={setData} currentUser={currentUser} language={language} labs={labs} />
      )}

      {(currentUser.role === 'director' || currentUser.role === 'lab') && (
        <LabFaultReportsPanel
          data={data}
          setData={setData}
          currentUser={currentUser}
          language={language}
          labs={labs}
          reports={reports}
          canHandleFaults={canHandleFaults}
        />
      )}
    </section>
  );
}

function LabManagementPanel({
  data,
  setData,
  currentUser,
  language,
  labs,
  devicesByLab,
  onViewChange
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  labs: Laboratory[];
  devicesByLab: Record<string, LabDevice[]>;
  onViewChange: (view: View) => void;
}) {
  const [labChoice, setLabChoice] = useState<(typeof quickLabChoices)[number]>('lab1');
  const [customLabName, setCustomLabName] = useState('');
  const [labError, setLabError] = useState('');

  const addLab = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = quickLabName(language, labChoice, customLabName);
    if (!name || !currentUser.schoolId) {
      setLabError(tr(language, 'labNameRequired'));
      return;
    }

    if (labs.some((lab) => lab.name.trim().toLowerCase() === name.toLowerCase())) {
      setLabError(tr(language, 'duplicateLaboratory'));
      return;
    }

    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      laboratories: [
        ...previous.laboratories,
        {
          id: makeId('lab'),
          schoolId: currentUser.schoolId ?? '',
          name,
          supervisorId: currentUser.id,
          periods: defaultLabPeriods(),
          timeSlots: defaultLabTimeSlots(),
          createdBy: currentUser.id,
          createdAt: now
        }
      ]
    }));
    setCustomLabName('');
    setLabError('');
  };

  const updateLabSlotAvailability = (lab: Laboratory, slotId: string, availability: LabAvailability) => {
    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      laboratories: previous.laboratories.map((item) =>
        item.id === lab.id
          ? {
              ...item,
              timeSlots: labTimeSlots(item).map((slot) => (slot.id === slotId ? { ...slot, availability } : slot)),
              updatedAt: now
            }
          : item
      )
    }));
  };

  return (
    <>
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'labManagementHint')}</p>
            <h2>{tr(language, 'labManagement')}</h2>
          </div>
          <FlaskConical size={24} aria-hidden="true" />
        </div>
        <form className="form-grid" onSubmit={addLab}>
          <label>
            <span>{tr(language, 'labQuickChoice')}</span>
            <select value={labChoice} onChange={(event) => setLabChoice(event.target.value as (typeof quickLabChoices)[number])}>
              <option value="lab1">{tr(language, 'labOne')}</option>
              <option value="lab2">{tr(language, 'labTwo')}</option>
              <option value="custom">{tr(language, 'customLabName')}</option>
            </select>
          </label>
          {labChoice === 'custom' && (
            <Field label={tr(language, 'labName')} value={customLabName} onChange={setCustomLabName} required />
          )}
          {labError && <p className="form-error full">{labError}</p>}
          <button className="button primary form-submit" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'addLaboratory')}</span>
          </button>
        </form>

        <div className="lab-card-list">
          {labs.length === 0 && <p className="empty-state">{tr(language, 'noLaboratories')}</p>}
          {labs.map((lab) => (
            <article className="lab-card" key={lab.id}>
              <div className="lab-card-head">
                <div>
                  <small>{tr(language, 'laboratory')}</small>
                  <h3>{lab.name}</h3>
                </div>
                <FlaskConical size={21} aria-hidden="true" />
              </div>
              <div className="lab-slots-board">
                {labPeriods.map((period) => (
                  <section className="lab-slot-period" key={period}>
                    <h4>{periodLabel(language, period)}</h4>
                    <div className="lab-slot-list">
                      {labTimeSlots(lab)
                        .filter((slot) => slot.period === period)
                        .map((slot) => (
                          <label className={`lab-slot-control ${slot.availability}`} key={slot.id}>
                            <span>
                              {slot.startsAt}-{slot.endsAt}
                            </span>
                            <select value={slot.availability} onChange={(event) => updateLabSlotAvailability(lab, slot.id, event.target.value as LabAvailability)}>
                              <option value="available">{tr(language, 'labAvailable')}</option>
                              <option value="reserved">{tr(language, 'labReserved')}</option>
                            </select>
                          </label>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <button type="button" className="user-group user-group-school drill-row full" onClick={() => onViewChange('labDevices')}>
        <span className="user-group-title">
          <span className="user-group-label">
            <Cpu size={18} aria-hidden="true" />
            <span className="user-group-label-name">{tr(language, 'labDeviceNames')}</span>
          </span>
          <span className="user-group-meta">
            <strong>{labs.reduce((sum, lab) => sum + (devicesByLab[lab.id] ?? []).length, 0)}</strong>
            <ChevronRight size={17} aria-hidden="true" />
          </span>
        </span>
      </button>
    </>
  );
}

export function LabDevicesView({
  data,
  setData,
  currentUser,
  language
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
}) {
  const labs = scopedLabsForUser(data, currentUser);
  const devicesByLab = useMemo(
    () =>
      Object.fromEntries(
        labs.map((lab) => [
          lab.id,
          data.labDevices
            .filter((device) => device.labId === lab.id)
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }))
        ])
      ) as Record<string, LabDevice[]>,
    [data.labDevices, labs]
  );
  const [labId, setLabId] = useState<string | null>(null);
  const [deviceDrafts, setDeviceDrafts] = useState<Record<string, { name: string; image: UploadedAttachment | null; error: string }>>({});
  const selectedLab = labs.find((lab) => lab.id === labId) ?? null;

  const updateDraft = (targetLabId: string, patch: Partial<{ name: string; image: UploadedAttachment | null; error: string }>) => {
    setDeviceDrafts((previous) => ({
      ...previous,
      [targetLabId]: {
        name: previous[targetLabId]?.name ?? '',
        image: previous[targetLabId]?.image ?? null,
        error: previous[targetLabId]?.error ?? '',
        ...patch
      }
    }));
  };

  const addDevice = (event: FormEvent<HTMLFormElement>, lab: Laboratory) => {
    event.preventDefault();
    const draft = deviceDrafts[lab.id] ?? { name: '', image: null, error: '' };
    const name = draft.name.trim();
    if (!name) {
      updateDraft(lab.id, { error: tr(language, 'deviceNameRequired') });
      return;
    }

    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      labDevices: [
        ...previous.labDevices,
        {
          id: makeId('device'),
          schoolId: lab.schoolId,
          labId: lab.id,
          name,
          image: draft.image ?? undefined,
          status: 'working',
          createdBy: currentUser.id,
          createdAt: now
        }
      ]
    }));
    updateDraft(lab.id, { name: '', image: null, error: '' });
  };

  const setDeviceStatus = (device: LabDevice, status: LabDevice['status']) => {
    const now = new Date().toISOString();
    setData((previous) => {
      const latestDevice = previous.labDevices.find((item) => item.id === device.id) ?? device;
      const openReport = previous.labFaultReports.find((report) => report.deviceId === device.id && report.status === 'open');
      const reportsForDevice = previous.labFaultReports.filter((report) => report.deviceId === device.id);
      let nextReports = previous.labFaultReports;

      if (status === 'broken' && latestDevice.status !== 'broken' && !openReport) {
        nextReports = [
          ...nextReports,
          {
            id: makeId('fault'),
            schoolId: latestDevice.schoolId,
            labId: latestDevice.labId,
            deviceId: latestDevice.id,
            deviceName: latestDevice.name,
            deviceImage: latestDevice.image,
            reportedBy: currentUser.id,
            reportedAt: now,
            faultNumber: reportsForDevice.length + 1,
            status: 'open'
          }
        ];
      }

      if (status === 'working' && openReport) {
        nextReports = nextReports.map((report) =>
          report.id === openReport.id ? { ...report, status: 'repaired', repairDate: now, updatedAt: now } : report
        );
      }

      return {
        ...previous,
        labDevices: previous.labDevices.map((item) =>
          item.id === latestDevice.id ? { ...item, status, updatedAt: now } : item
        ),
        labFaultReports: nextReports
      };
    });
  };

  return (
    <section className="content-grid labs-view">
      {labId && selectedLab ? (
        <>
          <button type="button" className="back-button full" onClick={() => setLabId(null)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="panel full">
            <div className="panel-heading">
              <div>
                <p>{tr(language, 'laboratory')}</p>
                <h2>{selectedLab.name}</h2>
              </div>
              <Cpu size={24} aria-hidden="true" />
            </div>
            <form className="lab-device-form" onSubmit={(event) => addDevice(event, selectedLab)}>
              <Field
                label={tr(language, 'deviceName')}
                value={deviceDrafts[selectedLab.id]?.name ?? ''}
                onChange={(value) => updateDraft(selectedLab.id, { name: value, error: '' })}
                required
              />
              <label>
                <span>{tr(language, 'deviceImage')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    readAttachmentFromInput(
                      event,
                      (image) => updateDraft(selectedLab.id, { image, error: '' }),
                      () => updateDraft(selectedLab.id, { error: tr(language, 'fileTooLarge') })
                    )
                  }
                />
              </label>
              {deviceDrafts[selectedLab.id]?.image && <AttachmentPreview attachment={deviceDrafts[selectedLab.id].image!} language={language} />}
              {deviceDrafts[selectedLab.id]?.error && <p className="form-error full">{deviceDrafts[selectedLab.id].error}</p>}
              <button className="button ghost" type="submit">
                <Plus size={16} aria-hidden="true" />
                <span>{tr(language, 'addDevice')}</span>
              </button>
            </form>

            <div className="lab-device-grid">
              {(devicesByLab[selectedLab.id] ?? []).length === 0 && <p className="empty-state">{tr(language, 'noDevices')}</p>}
              {(devicesByLab[selectedLab.id] ?? []).map((device) => (
                <article className={`lab-device-card ${device.status}`} key={device.id}>
                  {device.image ? <img src={device.image.dataUrl} alt={device.name} /> : <Camera size={28} aria-hidden="true" />}
                  <div>
                    <strong>{device.name}</strong>
                    <small>{deviceStatusLabel(language, device.status)}</small>
                  </div>
                  <select value={device.status} onChange={(event) => setDeviceStatus(device, event.target.value as LabDevice['status'])}>
                    <option value="working">{tr(language, 'labDeviceWorking')}</option>
                    <option value="broken">{tr(language, 'labDeviceBroken')}</option>
                  </select>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="panel full">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'labDevicesHint')}</p>
              <h2>{tr(language, 'labDeviceNames')}</h2>
            </div>
            <Cpu size={24} aria-hidden="true" />
          </div>
          <div className="user-groups">
            {labs.length === 0 && <p className="empty-state">{tr(language, 'noLaboratories')}</p>}
            {labs.map((lab) => (
              <button type="button" className="user-group drill-row" key={lab.id} onClick={() => setLabId(lab.id)}>
                <span className="user-group-title">
                  <span className="user-group-label">
                    <FlaskConical size={16} aria-hidden="true" />
                    <span className="user-group-label-name">{lab.name}</span>
                  </span>
                  <span className="user-group-meta">
                    <strong>{(devicesByLab[lab.id] ?? []).length}</strong>
                    <ChevronRight size={17} aria-hidden="true" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function LabReservationRequestsPanel({
  data,
  setData,
  currentUser,
  language,
  labs
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  labs: Laboratory[];
}) {
  const labIds = new Set(labs.map((lab) => lab.id));
  const labById = new Map(labs.map((lab) => [lab.id, lab]));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const requests = data.labReservationRequests
    .filter((request) => request.labSupervisorId === currentUser.id && labIds.has(request.labId))
    .filter((request) => {
      const requestedAt = Date.parse(request.requestedAt);
      return !Number.isFinite(requestedAt) || now - requestedAt < LAB_RESERVATION_VISIBLE_MS;
    })
    .sort(compareReservationRequests);

  const respondToReservation = (request: LabReservationRequest, status: 'confirmed' | 'rejected') => {
    const now = new Date().toISOString();
    setData((previous) => {
      const latestRequest = previous.labReservationRequests.find((item) => item.id === request.id);
      if (!latestRequest || latestRequest.status !== 'pending') {
        return previous;
      }

      if (status === 'confirmed') {
        const latestLab = previous.laboratories.find((lab) => lab.id === request.labId);
        const latestSlot = latestLab ? labTimeSlots(latestLab).find((slot) => slot.id === request.slotId) : undefined;
        if (latestSlot?.availability !== 'available') {
          return previous;
        }
      }

      const nextRequests = previous.labReservationRequests.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status,
              respondedAt: now,
              respondedBy: currentUser.id,
              updatedAt: now
            }
          : item
      );

      if (status === 'rejected') {
        return { ...previous, labReservationRequests: nextRequests };
      }

      return {
        ...previous,
        laboratories: previous.laboratories.map((lab) =>
          lab.id === request.labId
            ? {
                ...lab,
                timeSlots: labTimeSlots(lab).map((slot) =>
                  slot.id === request.slotId ? { ...slot, availability: 'reserved' } : slot
                ),
                updatedAt: now
              }
            : lab
        ),
        labReservationRequests: nextRequests
      };
    });
  };

  const slotIsAvailable = (request: LabReservationRequest) => {
    const lab = labById.get(request.labId);
    const slot = lab ? labTimeSlots(lab).find((item) => item.id === request.slotId) : undefined;
    return slot?.availability === 'available';
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'labReservationRequestsHint')}</p>
          <h2>{tr(language, 'labReservationRequests')}</h2>
        </div>
        <Send size={24} aria-hidden="true" />
      </div>
      <ResponsiveTable
        columns={[
          tr(language, 'teacher'),
          tr(language, 'laboratory'),
          tr(language, 'session'),
          tr(language, 'requestedAt'),
          tr(language, 'status'),
          tr(language, 'actions')
        ]}
        emptyText={tr(language, 'noLabReservationRequests')}
      >
        {requests.map((request) => (
          <tr key={request.id}>
            <td>{userName(data, request.teacherId)}</td>
            <td>{labById.get(request.labId)?.name ?? '-'}</td>
            <td dir="ltr">{request.startsAt}-{request.endsAt}</td>
            <td>{formatDateTime(language, request.requestedAt)}</td>
            <td>
              <span className={`status ${request.status === 'confirmed' ? 'active' : 'disabled'}`}>
                {reservationStatusLabel(language, request.status)}
              </span>
            </td>
            <td>
              <div className="table-actions">
                <button
                  className="icon-text-button small"
                  type="button"
                  disabled={request.status !== 'pending' || !slotIsAvailable(request)}
                  onClick={() => respondToReservation(request, 'confirmed')}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{tr(language, 'confirmReservation')}</span>
                </button>
                <button
                  className="icon-text-button small"
                  type="button"
                  disabled={request.status !== 'pending'}
                  onClick={() => respondToReservation(request, 'rejected')}
                >
                  <XCircle size={16} aria-hidden="true" />
                  <span>{tr(language, 'rejectReservation')}</span>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </ResponsiveTable>
    </div>
  );
}

function LabFaultReportsPanel({
  data,
  setData,
  currentUser,
  language,
  labs,
  reports,
  canHandleFaults
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  labs: Laboratory[];
  reports: LabFaultReport[];
  canHandleFaults: boolean;
}) {
  const labById = new Map(labs.map((lab) => [lab.id, lab]));
  const school = data.schools.find((record) => record.id === currentUser.schoolId);
  const administrationName = school?.directorId ? userName(data, school.directorId) : '-';
  const [now, setNow] = useState(() => Date.now());
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleReports = reports.filter((report) => report.status !== 'repaired' || repairIsCurrent(report, now));
  const archivedRepairs = useMemo(
    () => reports.filter((report) => report.status === 'repaired' && !repairIsCurrent(report, now)),
    [now, reports]
  );
  const repairsByDate = useMemo(() => {
    const groups = new Map<string, RepairPrintEntry[]>();
    archivedRepairs.forEach((report) => {
      const lab = labById.get(report.labId);
      const date = (report.repairDate ?? report.reportedAt).slice(0, 10);
      const entry: RepairPrintEntry = {
        report,
        labName: lab?.name ?? '-',
        technicianName: lab?.supervisorId ? userName(data, lab.supervisorId) : '-',
        reportedByName: userName(data, report.reportedBy)
      };
      groups.set(date, [...(groups.get(date) ?? []), entry]);
    });
    return [...groups.entries()].sort((left, right) => right[0].localeCompare(left[0]));
  }, [archivedRepairs, data, labById]);
  const markRepaired = (report: LabFaultReport) => {
    if (!canHandleFaults) {
      return;
    }

    const now = new Date().toISOString();
    setData((previous) => ({
      ...previous,
      labFaultReports: previous.labFaultReports.map((item) =>
        item.id === report.id ? { ...item, status: 'repaired', repairDate: item.repairDate ?? now, updatedAt: now } : item
      ),
      labDevices: previous.labDevices.map((device) =>
        device.id === report.deviceId ? { ...device, status: 'working', updatedAt: now } : device
      )
    }));
  };

  return (
    <>
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, currentUser.role === 'director' ? 'labFaultDirectorHint' : 'labFaultReportsHint')}</p>
            <h2>{tr(language, 'labFaultReports')}</h2>
          </div>
          <AlertTriangle size={24} aria-hidden="true" />
        </div>
        <ResponsiveTable
          columns={[
            tr(language, 'deviceImage'),
            tr(language, 'laboratory'),
            tr(language, 'deviceName'),
            tr(language, 'faultNumber'),
            tr(language, 'reportedBy'),
            tr(language, 'reportedAt'),
            tr(language, 'repairDate'),
            tr(language, 'currentStatus'),
            tr(language, 'actions')
          ]}
          emptyText={tr(language, 'noLabFaultReports')}
        >
          {visibleReports.map((report) => (
            <tr key={report.id}>
              <td>{report.deviceImage ? <img className="lab-device-thumb" src={report.deviceImage.dataUrl} alt={report.deviceName} /> : '-'}</td>
              <td>{labById.get(report.labId)?.name ?? '-'}</td>
              <td>{report.deviceName}</td>
              <td>{report.faultNumber}</td>
              <td>{userName(data, report.reportedBy)}</td>
              <td>{formatDateTime(language, report.reportedAt)}</td>
              <td>{formatDateTime(language, report.repairDate)}</td>
              <td>
                <span className={`status ${report.status === 'repaired' ? 'active' : 'disabled'}`}>{faultStatusLabel(language, report.status)}</span>
              </td>
              <td>
                <button className="button ghost small" type="button" disabled={!canHandleFaults || report.status === 'repaired'} onClick={() => markRepaired(report)}>
                  {report.status === 'repaired' ? <CheckCircle2 size={16} aria-hidden="true" /> : <Wrench size={16} aria-hidden="true" />}
                  <span>{tr(language, 'markRepaired')}</span>
                </button>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      </div>

      {archiveOpen ? (
        <>
          <button type="button" className="back-button full" onClick={() => setArchiveOpen(false)}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{tr(language, 'back')}</span>
          </button>
          <div className="panel full">
            <div className="panel-heading">
              <div>
                <p>{tr(language, 'repairArchiveHint')}</p>
                <h2>{tr(language, 'repairArchive')}</h2>
              </div>
              <Archive size={24} aria-hidden="true" />
            </div>
            <div className="user-groups">
              {repairsByDate.length === 0 && <p className="empty-state">{tr(language, 'noRepairArchive')}</p>}
              {repairsByDate.map(([date, entries]) => (
                <button
                  type="button"
                  className="user-group drill-row"
                  key={date}
                  onClick={() => printRepairReports(language, school?.name ?? '-', administrationName, entries)}
                >
                  <span className="user-group-title">
                    <span className="user-group-label">
                      <CalendarDays size={16} aria-hidden="true" />
                      <span className="user-group-label-name">{formatDate(language, date)}</span>
                    </span>
                    <span className="user-group-meta">
                      <strong>{entries.length}</strong>
                      <Printer size={16} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <button type="button" className="user-group user-group-school drill-row full" onClick={() => setArchiveOpen(true)}>
          <span className="user-group-title">
            <span className="user-group-label">
              <Archive size={18} aria-hidden="true" />
              <span className="user-group-label-name">{tr(language, 'repairArchive')}</span>
            </span>
            <span className="user-group-meta">
              <strong>{repairsByDate.length}</strong>
              <ChevronRight size={17} aria-hidden="true" />
            </span>
          </span>
        </button>
      )}
    </>
  );
}
