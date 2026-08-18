import {
  BookOpen,
  Building2,
  GraduationCap,
  ClipboardCheck,
  FlaskConical,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  Utensils,
  UserPlus,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PlatformUser, Role, View } from './types';

export type NavItem = {
  id: View;
  labelKey: string;
  icon: LucideIcon;
};

export const navItems: Record<Role, NavItem[]> = {
  admin: [
    { id: 'overview', labelKey: 'overview', icon: ShieldCheck },
    { id: 'schools', labelKey: 'schools', icon: School },
    { id: 'users', labelKey: 'users', icon: Users },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  director: [
    { id: 'overview', labelKey: 'overview', icon: Building2 },
    { id: 'school', labelKey: 'school', icon: School },
    { id: 'users', labelKey: 'users', icon: UserPlus },
    { id: 'absences', labelKey: 'absences', icon: ClipboardCheck },
    { id: 'labs', labelKey: 'laboratories', icon: FlaskConical },
    { id: 'canteen', labelKey: 'schoolCanteen', icon: Utensils },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  supervisor: [
    { id: 'absences', labelKey: 'absences', icon: ClipboardCheck },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  lab: [
    { id: 'labs', labelKey: 'laboratories', icon: FlaskConical },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  cafeteria: [
    { id: 'canteen', labelKey: 'schoolCanteen', icon: Utensils },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  canteen: [
    { id: 'canteen', labelKey: 'schoolCanteen', icon: Utensils },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  teacher: [
    { id: 'overview', labelKey: 'overview', icon: GraduationCap },
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'exercises', labelKey: 'exercises', icon: BookOpen },
    { id: 'notes', labelKey: 'notes', icon: MessageSquare },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ],
  student: [
    { id: 'announcements', labelKey: 'announcements', icon: MessageSquare },
    { id: 'exercises', labelKey: 'exercises', icon: BookOpen },
    { id: 'notes', labelKey: 'notes', icon: MessageSquare },
    { id: 'absences', labelKey: 'absences', icon: ClipboardCheck },
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ]
};

const primaryTeacherAbsenceItem: NavItem = { id: 'absences', labelKey: 'absences', icon: ClipboardCheck };

export function navItemsForUser(user: PlatformUser) {
  const items = navItems[user.role];
  if (user.role !== 'teacher' || user.stage !== 'primary' || items.some((item) => item.id === 'absences')) {
    return items;
  }

  return [items[0], primaryTeacherAbsenceItem, ...items.slice(1)];
}
