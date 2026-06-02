import { CheckCircle2, CircleOff, Globe2, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Language, SyncStatus } from './types';
import { tr } from './i18n';

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
