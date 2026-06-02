import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Download,
  Globe2,
  GraduationCap,
  Info,
  Languages,
  ShieldCheck,
  Upload,
  X
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type {
  Language,
  PlatformUser,
  Role,
  SecondaryStream,
  SyncStatus,
  UploadedAttachment
} from './types';
import {
  languageFlags,
  languageNames,
  roleNames,
  schoolYearLabel,
  stageNames,
  subjectNames,
  tr
} from './i18n';
import {
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  secondaryStreamLabel,
  teacherSubjectForYear
} from './education';

export const languages: Language[] = ['ar', 'fr', 'en'];

const roleIcons: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  director: Building2,
  teacher: GraduationCap,
  student: BookOpen
};

export function AccountAssignmentDetails({ user, language }: { user: PlatformUser; language: Language }) {
  if (user.role === 'director') {
    return (
      <div className="account-details">
        <div className="account-detail-grid">
          <div>
            <span>{tr(language, 'stage')}</span>
            <strong>{user.stage ? stageNames[language][user.stage] : '-'}</strong>
          </div>
        </div>
      </div>
    );
  }

  if (user.role === 'student') {
    return (
      <div className="account-details">
        <div className="account-detail-grid">
          <div>
            <span>{tr(language, 'schoolYear')}</span>
            <strong>{schoolYearLabel(language, user.stage, user.schoolYear)}</strong>
          </div>
          {user.stream && (
            <div>
              <span>{tr(language, 'stream')}</span>
              <strong>{secondaryStreamLabel(language, user.stream, user.schoolYear)}</strong>
            </div>
          )}
          <div>
            <span>{tr(language, 'classGroup')}</span>
            <strong>{user.classGroup || '-'}</strong>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'teacher') {
    return <p className="empty-state">{tr(language, 'noAssignments')}</p>;
  }

  const streamEntries = Object.entries(assignedYearStreamClassGroups(user));
  const classEntries = Object.entries(assignedYearClassGroups(user));

  if (streamEntries.length > 0) {
    return (
      <div className="account-details">
        <div className="assignment-tree">
          {streamEntries
            .sort(([left], [right]) => Number(left) - Number(right))
            .map(([year, streams]) => (
              <section className="assignment-year" key={year}>
                <div className="assignment-year-heading">
                  <strong>{schoolYearLabel(language, user.stage, Number(year))}</strong>
                  {teacherSubjectForYear(user, Number(year)) && (
                    <span className="assignment-chip subject">{subjectNames[language][teacherSubjectForYear(user, Number(year))!]}</span>
                  )}
                </div>
                <div className="assignment-stream-list">
                  {Object.entries(streams).map(([stream, groups]) => (
                    <div className="assignment-stream" key={`${year}-${stream}`}>
                      <span className="assignment-chip stream">{secondaryStreamLabel(language, stream as SecondaryStream, Number(year))}</span>
                      <div className="assignment-chip-row">
                        {(groups ?? []).map((group) => (
                          <span className="assignment-chip" key={`${year}-${stream}-${group}`}>
                            {tr(language, 'classGroup')} {group}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>
    );
  }

  if (classEntries.length > 0) {
    return (
      <div className="account-details">
        <div className="assignment-tree">
          {classEntries
            .sort(([left], [right]) => Number(left) - Number(right))
            .map(([year, groups]) => (
              <section className="assignment-year" key={year}>
                <div className="assignment-year-heading">
                  <strong>{schoolYearLabel(language, user.stage, Number(year))}</strong>
                  {teacherSubjectForYear(user, Number(year)) && (
                    <span className="assignment-chip subject">{subjectNames[language][teacherSubjectForYear(user, Number(year))!]}</span>
                  )}
                </div>
                <div className="assignment-chip-row">
                  {groups.map((group) => (
                    <span className="assignment-chip" key={`${year}-${group}`}>
                      {tr(language, 'classGroup')} {group}
                    </span>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>
    );
  }

  return <p className="empty-state">{tr(language, 'noAssignments')}</p>;
}

export function RoleLabel({ role, language }: { role: Role; language: Language }) {
  const Icon = roleIcons[role];

  return (
    <span className={`role-label ${role}`}>
      <Icon size={16} aria-hidden="true" />
      <span>{roleNames[language][role]}</span>
    </span>
  );
}

export function LanguageMenu({
  language,
  onLanguageChange,
  variant = 'inline'
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  variant?: 'inline' | 'corner';
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeFromOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeFromOutside);
    document.addEventListener('touchstart', closeFromOutside);
    document.addEventListener('keydown', closeFromKeyboard);

    return () => {
      document.removeEventListener('mousedown', closeFromOutside);
      document.removeEventListener('touchstart', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [open]);

  return (
    <div className={`language-menu ${variant}`} ref={menuRef}>
      <button
        className={`language-trigger ${variant}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={tr(language, 'chooseLanguage')}
        onClick={() => setOpen((previous) => !previous)}
      >
        <Languages size={variant === 'corner' ? 18 : 16} aria-hidden="true" />
        {variant === 'inline' && (
          <>
            <span className="language-flag" aria-hidden="true">{languageFlags[language]}</span>
            <span>{languageNames[language]}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <div className="language-options" role="menu">
          {languages.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={language === option}
              className={language === option ? 'active' : ''}
              onClick={() => {
                onLanguageChange(option);
                setOpen(false);
              }}
            >
              <span className="language-flag" aria-hidden="true">{languageFlags[option]}</span>
              <span>{languageNames[option]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SyncIndicator({ status, language, compact = false }: { status: SyncStatus; language: Language; compact?: boolean }) {
  const statusConfig: Record<SyncStatus, { icon: LucideIcon; labelKey: string }> = {
    checking: { icon: Globe2, labelKey: 'checkingData' },
    shared: { icon: CheckCircle2, labelKey: 'sharedData' },
    saving: { icon: Upload, labelKey: 'savingData' },
    local: { icon: CircleOff, labelKey: 'localOnly' },
    error: { icon: CircleOff, labelKey: 'syncError' }
  };
  const Icon = statusConfig[status].icon;

  return (
    <span className={compact ? `sync-indicator compact ${status}` : `sync-indicator ${status}`} title={tr(language, statusConfig[status].labelKey)}>
      <Icon size={15} aria-hidden="true" />
      <span>{tr(language, statusConfig[status].labelKey)}</span>
    </span>
  );
}

export function AttachmentPreview({ attachment, language }: { attachment: UploadedAttachment; language: Language }) {
  const isImage = attachment.type.startsWith('image/');

  return (
    <div className="attachment-preview">
      {isImage && <img src={attachment.dataUrl} alt={attachment.name || tr(language, 'imagePreview')} />}
      <a className="button ghost" href={attachment.dataUrl} download={attachment.name}>
        <Download size={16} aria-hidden="true" />
        <span>{isImage ? attachment.name : tr(language, 'downloadFile')}</span>
      </a>
    </div>
  );
}

export function ConfirmDialog({ language, onConfirm, onCancel }: { language: Language; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <ShieldCheck size={30} aria-hidden="true" />
        <h2 id="logout-title">{tr(language, 'logoutQuestion')}</h2>
        <div className="button-row center">
          <button className="button primary" type="button" onClick={onConfirm}>
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{tr(language, 'yes')}</span>
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

export function AppInfoDialog({ language, onClose }: { language: Language; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal app-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-info-title"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button close" type="button" title={tr(language, 'close')} onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <Info size={30} aria-hidden="true" />
        <h2 id="app-info-title">{tr(language, 'appInfoTitle')}</h2>
        <div className="app-info-content">
          <p className="modal-copy">{tr(language, 'appInfoText')}</p>
          <section className="app-info-section">
            <h3>{tr(language, 'appInfoOfferTitle')}</h3>
            <p className="modal-copy">{tr(language, 'appInfoOfferText')}</p>
          </section>
          <section className="app-info-section">
            <h3>{tr(language, 'appInfoAudienceTitle')}</h3>
            <ul className="app-info-list">
              <li>{tr(language, 'appInfoStudentAudience')}</li>
              <li>{tr(language, 'appInfoParentAudience')}</li>
            </ul>
          </section>
          <section className="app-info-section">
            <h3>{tr(language, 'appInfoWhyTitle')}</h3>
            <p className="modal-copy">{tr(language, 'appInfoWhyText')}</p>
          </section>
        </div>
        <button className="button primary" type="button" onClick={onClose}>
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>{tr(language, 'close')}</span>
        </button>
      </div>
    </div>
  );
}

export function DoneConfirmDialog({
  language,
  exerciseTitle,
  onConfirm,
  onCancel
}: {
  language: Language;
  exerciseTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <CheckCircle2 size={30} aria-hidden="true" />
        <h2 id="completion-title">{tr(language, 'confirmDoneTitle')}</h2>
        <p className="modal-copy">{tr(language, 'confirmDoneQuestion')}</p>
        <div className="delete-target-card completion-target-card">
          <strong>{exerciseTitle}</strong>
        </div>
        <p className="modal-warning">{tr(language, 'confirmDoneWarning')}</p>
        <div className="button-row center">
          <button className="button primary" type="button" onClick={onConfirm}>
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{tr(language, 'confirmDoneAction')}</span>
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

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} type={type} min={min} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'teal' | 'amber' | 'blue' | 'green' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ResponsiveTable({
  columns,
  children,
  emptyText
}: {
  columns: string[];
  children: ReactNode;
  emptyText: string;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {Array.isArray(rows) && rows.length === 0 && <p className="empty-state">{emptyText}</p>}
    </div>
  );
}
