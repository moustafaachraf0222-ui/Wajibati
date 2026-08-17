import type { Dispatch, SetStateAction } from 'react';

export type Role = 'admin' | 'director' | 'supervisor' | 'lab' | 'canteen' | 'teacher' | 'student';
export type Stage = 'primary' | 'middle' | 'secondary';
export type Language = 'ar' | 'fr' | 'en';
export type Theme = 'light' | 'dark';
export type Accent = 'green' | 'navy' | 'teal' | 'amber' | 'crimson' | 'violet';
export type AccountStatus = 'active' | 'disabled';
export type HomeworkDifficulty = 'easy' | 'medium' | 'hard';

export type UploadedAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type Subject =
  | 'math'
  | 'arabic'
  | 'science'
  | 'physics'
  | 'history'
  | 'primary_history'
  | 'geography'
  | 'french'
  | 'english'
  | 'islamic_education'
  | 'civic_education'
  | 'scientific_technology'
  | 'art_education'
  | 'music_education'
  | 'arabic_literature'
  | 'life_science'
  | 'physical_science_technology'
  | 'islamic_science'
  | 'philosophy'
  | 'computer_science'
  | 'physical_education'
  | 'tamazight'
  | 'civil_engineering_subject'
  | 'electrical_engineering_subject'
  | 'mechanical_engineering_subject'
  | 'process_engineering_subject'
  | 'physical_sciences'
  | 'technology'
  | 'spanish'
  | 'german'
  | 'italian';

export type View =
  | 'overview'
  | 'schools'
  | 'users'
  | 'school'
  | 'exercises'
  | 'announcements'
  | 'notes'
  | 'absences'
  | 'labs'
  | 'canteen'
  | 'settings';

export type SecondaryStream =
  | 'experimental_science'
  | 'mathematics'
  | 'civil_engineering'
  | 'electrical_engineering'
  | 'mechanical_engineering'
  | 'process_engineering'
  | 'management_economics'
  | 'literature_philosophy'
  | 'foreign_languages';

export type YearStreamClassGroups = Record<string, Partial<Record<SecondaryStream, string[]>>>;

export type SchoolRecord = {
  id: string;
  name: string;
  stage: Stage;
  domain: string;
  city: string;
  address: string;
  phone: string;
  directorId?: string;
  streams?: SecondaryStream[];
  deletedAt?: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  status: AccountStatus;
  schoolId?: string;
  stage?: Stage;
  subject?: Subject;
  subjectsByYear?: Record<string, Subject>;
  schoolYear?: number;
  classGroup?: string;
  schoolYears?: number[];
  classGroups?: string[];
  yearClassGroups?: Record<string, string[]>;
  yearStreamClassGroups?: YearStreamClassGroups;
  stream?: SecondaryStream;
  guardianPhone?: string;
  createdBy?: string;
};

export type StudentActivationRecord = {
  id: string;
  name: string;
  code: string;
  schoolId: string;
  stage: Stage;
  schoolYear?: number;
  classGroup?: string;
  stream?: SecondaryStream;
  createdBy: string;
  createdAt: string;
  activatedUserId?: string;
  activatedAt?: string;
};

export type Exercise = {
  id: string;
  title: string;
  body: string;
  subject: Subject;
  schoolId: string;
  stage: Stage;
  schoolYear?: number;
  classGroup?: string;
  stream?: SecondaryStream;
  teacherId: string;
  dueDate: string;
  image?: string;
  isVacation?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type Announcement = {
  id: string;
  schoolId: string;
  authorId: string;
  title: string;
  body: string;
  image?: UploadedAttachment;
  createdAt: string;
};

export type TeacherNote = {
  id: string;
  schoolId: string;
  stage: Stage;
  teacherId: string;
  subject?: Subject;
  title: string;
  body: string;
  schoolYear?: number;
  classGroup?: string;
  stream?: SecondaryStream;
  attachment?: UploadedAttachment;
  createdAt: string;
};

export type HomeworkFeedback = {
  difficulty?: HomeworkDifficulty;
  note?: string;
  updatedAt: string;
};

export type AbsenceSession = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

export type AbsenceScheduleTarget = {
  schoolYear: number;
  classGroup: string;
  stream?: SecondaryStream;
};

export type AbsenceSchedule = {
  id: string;
  schoolId: string;
  stage?: Stage;
  name: string;
  sessions: AbsenceSession[];
  appliesToAll?: boolean;
  targets?: AbsenceScheduleTarget[];
  weekdays?: number[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type AbsenceRecord = {
  id: string;
  schoolId: string;
  schoolYear: number;
  classGroup: string;
  stream?: SecondaryStream;
  date: string;
  sessionId: string;
  scheduleId?: string;
  sessionName?: string;
  startsAt?: string;
  endsAt?: string;
  studentId: string;
  markedBy: string;
  reportId?: string;
  sentAt?: string;
  justificationText?: string;
  justificationAttachment?: UploadedAttachment;
  justificationSubmittedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AbsenceReport = {
  id: string;
  schoolId: string;
  stage: Stage;
  date: string;
  sessionId: string;
  scheduleId?: string;
  sessionName: string;
  startsAt: string;
  endsAt: string;
  markedBy: string;
  createdAt: string;
};

export type LabPeriod = 'morning' | 'afternoon';
export type LabAvailability = 'available' | 'reserved';
export type LabDeviceStatus = 'working' | 'broken';
export type LabFaultStatus = 'open' | 'repaired';
export type LabReservationStatus = 'pending' | 'confirmed' | 'rejected';

export type LabTimeSlot = {
  id: string;
  period: LabPeriod;
  name: string;
  startsAt: string;
  endsAt: string;
  availability: LabAvailability;
};

export type Laboratory = {
  id: string;
  schoolId: string;
  name: string;
  supervisorId: string;
  periods: Record<LabPeriod, LabAvailability>;
  timeSlots?: LabTimeSlot[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type LabDevice = {
  id: string;
  schoolId: string;
  labId: string;
  name: string;
  image?: UploadedAttachment;
  status: LabDeviceStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type LabFaultReport = {
  id: string;
  schoolId: string;
  labId: string;
  deviceId: string;
  deviceName: string;
  deviceImage?: UploadedAttachment;
  reportedBy: string;
  reportedAt: string;
  faultNumber: number;
  repairDate?: string;
  status: LabFaultStatus;
  updatedAt?: string;
};

export type LabReservationRequest = {
  id: string;
  schoolId: string;
  labId: string;
  slotId: string;
  period: LabPeriod;
  startsAt: string;
  endsAt: string;
  teacherId: string;
  labSupervisorId: string;
  status: LabReservationStatus;
  requestedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  updatedAt?: string;
};

export type CanteenCard = {
  id: string;
  schoolId: string;
  studentId: string;
  code: string;
  status: AccountStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
};

export type CanteenScanResult = 'allowed' | 'duplicate' | 'absent' | 'invalid';

export type CanteenMealScan = {
  id: string;
  schoolId: string;
  cardId?: string;
  studentId?: string;
  code: string;
  scannedBy: string;
  scannedAt: string;
  date: string;
  result: CanteenScanResult;
};

export type PushTokenRecord = {
  token: string;
  platform: string;
  updatedAt: string;
};

export type PlatformData = {
  schools: SchoolRecord[];
  users: PlatformUser[];
  studentActivations: StudentActivationRecord[];
  exercises: Exercise[];
  announcements: Announcement[];
  notes: TeacherNote[];
  completions: Record<string, string[]>;
  completionDates: Record<string, Record<string, string>>;
  feedback: Record<string, Record<string, HomeworkFeedback>>;
  absenceSchedules: AbsenceSchedule[];
  absenceRecords: AbsenceRecord[];
  absenceReports: AbsenceReport[];
  laboratories: Laboratory[];
  labDevices: LabDevice[];
  labFaultReports: LabFaultReport[];
  labReservationRequests: LabReservationRequest[];
  canteenCards: CanteenCard[];
  canteenMealScans: CanteenMealScan[];
  pushTokens: Record<string, PushTokenRecord[]>;
  deletedSchoolIds: string[];
  deletedExerciseIds: string[];
  deletedNoteIds: string[];
  deletedScheduleIds: string[];
  settings: {
    allowExerciseImages: boolean;
    maintenanceMode: boolean;
  };
};

export type SharedDataSnapshot = {
  data: PlatformData;
  updatedAt: string | null;
};

export type DataSetter = Dispatch<SetStateAction<PlatformData>>;
export type SyncStatus = 'checking' | 'shared' | 'saving' | 'local' | 'error';

export type AccountEditState = {
  id: string;
  role: Role;
  name: string;
  email: string;
  password: string;
  status: AccountStatus;
  schoolName: string;
  domain: string;
  stage: Stage;
  subject: Subject;
  subjectsByYear: Record<string, Subject | ''>;
  schoolYear: number;
  classChoice: string;
  customClassGroup: string;
  stream: SecondaryStream | '';
  schoolYears: number[];
  yearClassGroups: Record<string, string[]>;
  yearStreamClassGroups: YearStreamClassGroups;
  streamChoiceByYear: Record<string, SecondaryStream | ''>;
  classChoiceByYear: Record<string, string>;
  customClassByYear: Record<string, string>;
};

export type RememberedAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
