import { BookOpen, Building2, ClipboardCheck, FlaskConical, GraduationCap, ShieldCheck, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Language, PlatformUser, Role, SecondaryStream } from './types';
import { roleNames, schoolYearLabel, stageNames, tr } from './i18n';
import {
  assignedYearClassGroups,
  assignedYearStreamClassGroups,
  secondaryStreamLabel,
  teacherSubjectForYear,
  teacherSubjectName
} from './education';

const roleIcons: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  director: Building2,
  supervisor: ClipboardCheck,
  lab: FlaskConical,
  canteen: Utensils,
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
                    <span className="assignment-chip subject">{teacherSubjectName(language, user, teacherSubjectForYear(user, Number(year))!, Number(year))}</span>
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
                    <span className="assignment-chip subject">{teacherSubjectName(language, user, teacherSubjectForYear(user, Number(year))!, Number(year))}</span>
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
