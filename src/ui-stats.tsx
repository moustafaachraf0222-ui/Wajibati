import type { LucideIcon } from 'lucide-react';

export function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'teal' | 'amber' | 'blue' | 'green' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
