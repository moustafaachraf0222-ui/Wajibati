import { AlertTriangle, Camera, CheckCircle2, FlaskConical, Plus, Wrench } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type {
  DataSetter,
  LabAvailability,
  LabDevice,
  LabFaultReport,
  Laboratory,
  LabPeriod,
  LabTimeSlot,
  Language,
  PlatformData,
  PlatformUser,
  UploadedAttachment
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

function availabilityLabel(language: Language, availability: LabAvailability) {
  return tr(language, availability === 'available' ? 'labAvailable' : 'labReserved');
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

export function LaboratoriesView({
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
        />
      )}

      <LabStatusPanel labs={labs} language={language} />

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
  devicesByLab
}: {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
  setData: DataSetter;
  labs: Laboratory[];
  devicesByLab: Record<string, LabDevice[]>;
}) {
  const [labChoice, setLabChoice] = useState<(typeof quickLabChoices)[number]>('lab1');
  const [customLabName, setCustomLabName] = useState('');
  const [labError, setLabError] = useState('');
  const [deviceDrafts, setDeviceDrafts] = useState<Record<string, { name: string; image: UploadedAttachment | null; error: string }>>({});

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

  const updateDraft = (labId: string, patch: Partial<{ name: string; image: UploadedAttachment | null; error: string }>) => {
    setDeviceDrafts((previous) => ({
      ...previous,
      [labId]: {
        name: previous[labId]?.name ?? '',
        image: previous[labId]?.image ?? null,
        error: previous[labId]?.error ?? '',
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

            <form className="lab-device-form" onSubmit={(event) => addDevice(event, lab)}>
              <Field
                label={tr(language, 'deviceName')}
                value={deviceDrafts[lab.id]?.name ?? ''}
                onChange={(value) => updateDraft(lab.id, { name: value, error: '' })}
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
                      (image) => updateDraft(lab.id, { image, error: '' }),
                      () => updateDraft(lab.id, { error: tr(language, 'fileTooLarge') })
                    )
                  }
                />
              </label>
              {deviceDrafts[lab.id]?.image && <AttachmentPreview attachment={deviceDrafts[lab.id].image!} language={language} />}
              {deviceDrafts[lab.id]?.error && <p className="form-error full">{deviceDrafts[lab.id].error}</p>}
              <button className="button ghost" type="submit">
                <Plus size={16} aria-hidden="true" />
                <span>{tr(language, 'addDevice')}</span>
              </button>
            </form>

            <div className="lab-device-grid">
              {(devicesByLab[lab.id] ?? []).length === 0 && <p className="empty-state">{tr(language, 'noDevices')}</p>}
              {(devicesByLab[lab.id] ?? []).map((device) => (
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
          </article>
        ))}
      </div>
    </div>
  );
}

function LabStatusPanel({ labs, language }: { labs: Laboratory[]; language: Language }) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'labStatusHint')}</p>
          <h2>{tr(language, 'labStatus')}</h2>
        </div>
        <FlaskConical size={24} aria-hidden="true" />
      </div>
      <div className="lab-status-grid">
        {labs.length === 0 && <p className="empty-state">{tr(language, 'noLaboratories')}</p>}
        {labs.map((lab) => (
          <article className="lab-status-card" key={lab.id}>
            <h3>{lab.name}</h3>
            <div className="lab-period-badges">
              {labPeriods.map((period) => {
                return (
                  <section className="lab-status-period" key={period}>
                    <h4>{periodLabel(language, period)}</h4>
                    <div className="lab-slot-badges">
                      {labTimeSlots(lab)
                        .filter((slot) => slot.period === period)
                        .map((slot) => (
                          <span className={`lab-period-badge ${slot.availability}`} key={slot.id}>
                            <strong>{slot.startsAt}-{slot.endsAt}</strong>
                            <small>{availabilityLabel(language, slot.availability)}</small>
                          </span>
                        ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </div>
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
        {reports.map((report) => (
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
  );
}
