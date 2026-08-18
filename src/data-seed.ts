import type { PlatformData } from './types';
import { HASHED_DEFAULT_ADMIN_PASSWORD } from './password';

const seedData: PlatformData = {
  schools: [],
  users: [
    {
      id: 'user-admin',
      name: 'Administrator',
      email: 'wajibati@admin.dz',
      password: HASHED_DEFAULT_ADMIN_PASSWORD,
      role: 'admin',
      status: 'active'
    }
  ],
  accountCodes: [],
  accountCredentials: [],
  studentActivations: [],
  exercises: [],
  announcements: [],
  notes: [],
  completions: {},
  completionDates: {},
  feedback: {},
  absenceSchedules: [],
  absenceRecords: [],
  absenceReports: [],
  laboratories: [],
  labDevices: [],
  labFaultReports: [],
  labReservationRequests: [],
  transferRequests: [],
  canteenCards: [],
  canteenMealScans: [],
  pushTokens: {},
  deletedSchoolIds: [],
  deletedExerciseIds: [],
  deletedNoteIds: [],
  deletedScheduleIds: [],
  settings: {
    allowExerciseImages: true,
    maintenanceMode: false
  }
};

export function cloneSeedData(): PlatformData {
  return JSON.parse(JSON.stringify(seedData)) as PlatformData;
}

export function isSeedOnlyData(data: PlatformData) {
  return (
    data.schools.length === 0 &&
    data.exercises.length === 0 &&
    data.announcements.length === 0 &&
    data.notes.length === 0 &&
    data.users.length === 1 &&
    data.users[0]?.id === seedData.users[0].id &&
    data.accountCodes.length === 0 &&
    data.accountCredentials.length === 0 &&
    data.studentActivations.length === 0 &&
    data.deletedSchoolIds.length === 0 &&
    data.deletedExerciseIds.length === 0 &&
    data.deletedNoteIds.length === 0 &&
    data.deletedScheduleIds.length === 0 &&
    Object.keys(data.completions).length === 0 &&
    Object.keys(data.completionDates).length === 0 &&
    Object.keys(data.feedback).length === 0 &&
    data.absenceSchedules.length === 0 &&
    data.absenceRecords.length === 0 &&
    data.absenceReports.length === 0 &&
    data.laboratories.length === 0 &&
    data.labDevices.length === 0 &&
    data.labFaultReports.length === 0 &&
    data.labReservationRequests.length === 0 &&
    data.transferRequests.length === 0 &&
    data.canteenCards.length === 0 &&
    data.canteenMealScans.length === 0
  );
}
