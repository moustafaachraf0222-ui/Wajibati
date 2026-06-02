import { CheckCircle2, Info, ShieldCheck, X } from 'lucide-react';
import type { Language } from './types';
import { tr } from './i18n';

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
