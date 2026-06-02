import {
  BookOpen,
  Building2,
  GraduationCap,
  MessageSquare,
  School,
  Settings,
  ShieldCheck,
  UserPlus,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role, View } from './types';

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
    { id: 'settings', labelKey: 'settings', icon: Settings }
  ]
};
