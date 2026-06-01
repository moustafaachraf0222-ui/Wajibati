import {
  Atom,
  Archive,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Code2,
  Download,
  Dumbbell,
  Edit3,
  FlaskConical,
  Database,
  Globe2,
  GraduationCap,
  Info,
  Landmark,
  Languages,
  Leaf,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Printer,
  RotateCcw,
  Save,
  School,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  Trophy,
  Upload,
  UserCog,
  UserPlus,
  Wrench,
  Users,
  X
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';

type Role = 'admin' | 'director' | 'teacher' | 'student';
type Stage = 'primary' | 'middle' | 'secondary';
type Language = 'ar' | 'fr' | 'en';
type Theme = 'light' | 'dark';
type AccountStatus = 'active' | 'disabled';
type HomeworkDifficulty = 'easy' | 'medium' | 'hard';
type UploadedAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};
type Subject =
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
type View = 'overview' | 'schools' | 'users' | 'school' | 'exercises' | 'announcements' | 'notes' | 'settings';
type SecondaryStream =
  | 'experimental_science'
  | 'mathematics'
  | 'civil_engineering'
  | 'electrical_engineering'
  | 'mechanical_engineering'
  | 'process_engineering'
  | 'management_economics'
  | 'literature_philosophy'
  | 'foreign_languages';

type YearStreamClassGroups = Record<string, Partial<Record<SecondaryStream, string[]>>>;

type SchoolRecord = {
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

type PlatformUser = {
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
  createdBy?: string;
};

type Exercise = {
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
};

type Announcement = {
  id: string;
  schoolId: string;
  authorId: string;
  title: string;
  body: string;
  image?: UploadedAttachment;
  createdAt: string;
};

type TeacherNote = {
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

type HomeworkFeedback = {
  difficulty?: HomeworkDifficulty;
  note?: string;
  updatedAt: string;
};

type PushTokenRecord = {
  token: string;
  platform: string;
  updatedAt: string;
};

type PlatformData = {
  schools: SchoolRecord[];
  users: PlatformUser[];
  exercises: Exercise[];
  announcements: Announcement[];
  notes: TeacherNote[];
  completions: Record<string, string[]>;
  completionDates: Record<string, Record<string, string>>;
  feedback: Record<string, Record<string, HomeworkFeedback>>;
  pushTokens: Record<string, PushTokenRecord[]>;
  deletedSchoolIds: string[];
  settings: {
    allowExerciseImages: boolean;
    maintenanceMode: boolean;
  };
};

type DataSetter = Dispatch<SetStateAction<PlatformData>>;
type SyncStatus = 'checking' | 'shared' | 'saving' | 'local' | 'error';

type AccountEditState = {
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

type RememberedAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const DATA_KEY = 'school_platform_data_v2';
const SESSION_KEY = 'school_platform_session_v2';
const LANGUAGE_KEY = 'school_platform_language_v1';
const THEME_KEY = 'school_platform_theme_v1';
const REMEMBERED_ACCOUNTS_KEY = 'school_platform_remembered_accounts_v1';
const REMOTE_STATE_ENDPOINT = import.meta.env.VITE_REMOTE_STATE_ENDPOINT || 'https://wajibati.pages.dev/api/state';
const MAX_ATTACHMENT_SIZE = 1_000_000;
const SCHOOL_TRASH_RETENTION_MS = 24 * 60 * 60 * 1000;
const ANNOUNCEMENT_ACTIVE_MS = 72 * 60 * 60 * 1000;
const NOTE_ACTIVE_MS = 72 * 60 * 60 * 1000;
const SHARED_DATA_REFRESH_MS = 10_000;

const languages: Language[] = ['ar', 'fr', 'en'];
const primarySubjects: Subject[] = [
  'arabic',
  'tamazight',
  'french',
  'english',
  'islamic_education',
  'civic_education',
  'math',
  'scientific_technology',
  'history',
  'art_education',
  'music_education',
  'physical_education'
];
const primaryLowerYearExcludedSubjects: Subject[] = ['french', 'english'];
const middleSubjects: Subject[] = [
  'arabic',
  'tamazight',
  'french',
  'english',
  'islamic_education',
  'civic_education',
  'history',
  'math',
  'life_science',
  'physical_science_technology',
  'computer_science',
  'art_education',
  'music_education',
  'physical_education'
];
const secondarySubjects: Subject[] = [
  'arabic_literature',
  'english',
  'french',
  'math',
  'history',
  'islamic_science',
  'philosophy',
  'computer_science',
  'physical_education',
  'tamazight',
  'life_science',
  'physical_science_technology',
  'physical_sciences',
  'technology',
  'civil_engineering_subject',
  'electrical_engineering_subject',
  'mechanical_engineering_subject',
  'process_engineering_subject',
  'spanish',
  'german',
  'italian'
];
const stages: Stage[] = ['primary', 'middle', 'secondary'];
const defaultClassGroups = ['1', '2', '3', '4'];
const secondaryStreams: SecondaryStream[] = [
  'experimental_science',
  'mathematics',
  'civil_engineering',
  'electrical_engineering',
  'mechanical_engineering',
  'process_engineering',
  'management_economics',
  'literature_philosophy',
  'foreign_languages'
];
const firstYearSecondaryStreams: SecondaryStream[] = ['experimental_science', 'literature_philosophy'];
const scientificSecondaryStreams: SecondaryStream[] = ['experimental_science', 'mathematics'];
const technicalMathStreams: SecondaryStream[] = [
  'civil_engineering',
  'electrical_engineering',
  'mechanical_engineering',
  'process_engineering'
];
const secondarySubjectStreams: Partial<Record<Subject, SecondaryStream[]>> = {
  life_science: scientificSecondaryStreams,
  physical_science_technology: [...scientificSecondaryStreams, ...technicalMathStreams],
  physical_sciences: [...scientificSecondaryStreams, ...technicalMathStreams],
  technology: [...scientificSecondaryStreams, ...technicalMathStreams],
  civil_engineering_subject: ['civil_engineering'],
  electrical_engineering_subject: ['electrical_engineering'],
  mechanical_engineering_subject: ['mechanical_engineering'],
  process_engineering_subject: ['process_engineering'],
  spanish: ['foreign_languages'],
  german: ['foreign_languages'],
  italian: ['foreign_languages']
};
const subjectOrder: Subject[] = [
  ...primarySubjects,
  ...middleSubjects.filter((subject) => !primarySubjects.includes(subject)),
  ...secondarySubjects.filter((subject) => !primarySubjects.includes(subject) && !middleSubjects.includes(subject))
];
const subjectIcons: Record<Subject, LucideIcon> = {
  math: Calculator,
  arabic: BookOpen,
  science: Leaf,
  physics: Atom,
  history: Landmark,
  primary_history: Landmark,
  geography: Globe2,
  french: Languages,
  english: Languages,
  islamic_education: BookOpen,
  civic_education: Landmark,
  scientific_technology: FlaskConical,
  art_education: BookOpen,
  music_education: BookOpen,
  arabic_literature: BookOpen,
  life_science: Leaf,
  physical_science_technology: FlaskConical,
  islamic_science: BookOpen,
  philosophy: GraduationCap,
  computer_science: Code2,
  physical_education: Dumbbell,
  tamazight: Languages,
  civil_engineering_subject: Wrench,
  electrical_engineering_subject: Wrench,
  mechanical_engineering_subject: Wrench,
  process_engineering_subject: Wrench,
  physical_sciences: Atom,
  technology: Wrench,
  spanish: Globe2,
  german: Globe2,
  italian: Globe2
};

const copy: Record<Language, Record<string, string>> = {
  ar: {
    appTitle: 'واجباتي',
    appSubtitle: 'منصة تربط الأسرة بالمدرسة',
    appInfo: 'معلومات عن المنصة',
    appInfoTitle: 'واجباتي 📚',
    appInfoText: 'منصة واجباتي هي منصة تعليمية تربط الأسرة بالمدرسة، تتيح للأساتذة والإدارة نشر التمارين والواجبات مباشرةً، بحيث يستطيع ولي الأمر متابعة مسيرة تعلّم ابنه بكل سهولة ووضوح.',
    appInfoOfferTitle: '🎯 ماذا تقدم المنصة؟',
    appInfoOfferText: 'يقوم الأستاذ أو الإدارة بنشر التمارين على المنصة، فتصبح متاحة لولي الأمر ليطّلع على ما يدرسه التلميذ، ويكتشف النقاط التي تحتاج إلى تطوير، ويساعد ابنه في حلّها بشكل مباشر وفعّال.',
    appInfoAudienceTitle: '👨‍👩‍👧 لمن هي المنصة؟',
    appInfoStudentAudience: 'التلاميذ — لمتابعة واجباتهم وتمارينهم في مكان واحد',
    appInfoParentAudience: 'أولياء الأمور — لمعرفة مستوى أبنائهم ودعمهم في المنزل',
    appInfoWhyTitle: '💡 لماذا واجباتي؟',
    appInfoWhyText: 'لأن التواصل بين الأسرة والمدرسة هو أساس نجاح التلميذ. واجباتي تجعل هذا التواصل بسيطاً وشفافاً وفي متناول الجميع.',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'ادخل إلى حسابك لمتابعة واجبات التلاميذ.',
    loginHeroTitle: 'واجباتي',
    loginHeroSubtitle: 'ابدأ رحلتك مع ابنك نحو مستقبل أكاديمي مشرق',
    loginHeroText: 'تابع واجبات طفلك، راقب تقدمه الدراسي، وكن شريكًا حقيقيًا في نجاحه',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'دخول',
    rememberMe: 'تذكر هذا الحساب',
    rememberedAccounts: 'الحسابات المحفوظة',
    useRememberedAccount: 'استخدام الحساب',
    forgetAccount: 'إزالة الحساب',
    demoAccounts: 'حساب المشرف العام',
    invalidCredentials: 'بيانات الدخول غير صحيحة.',
    disabledAccount: 'هذا الحساب معطل ولا يمكنه تسجيل الدخول حتى يتم تفعيله.',
    checkingData: 'فحص الاتصال',
    sharedData: 'بيانات مشتركة',
    savingData: 'جاري الحفظ',
    localOnly: 'محلي فقط',
    syncError: 'تعذر الحفظ',
    chooseLanguage: 'لغة الواجهة',
    overview: 'نظرة عامة',
    schools: 'المدارس',
    users: 'الحسابات',
    school: 'المدرسة',
    exercises: 'التمارين',
    announcements: 'الإعلانات',
    notes: 'الملاحظات',
    settings: 'الإعدادات',
    theme: 'المظهر',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    logout: 'تسجيل الخروج',
    logoutQuestion: 'هل تريد حقاً تسجيل الخروج؟',
    yes: 'نعم',
    cancel: 'إلغاء',
    close: 'إغلاق',
    adminPower: 'إدارة المنصة',
    createDirector: 'إنشاء حساب مدير',
    createAccountTab: 'إنشاء حساب',
    viewAccountsTab: 'عرض الحسابات',
    databaseTab: 'قاعدة البيانات',
    credentialsDatabase: 'قاعدة بيانات الحسابات',
    credentialsDatabaseHint: 'تحتوي على البريد الإلكتروني والكود الذي أنشأه المدير لكل حساب.',
    teacherDatabase: 'قاعدة بيانات الأساتذة',
    studentDatabase: 'قاعدة بيانات التلاميذ',
    accountCode: 'الكود',
    autoGeneratedEmailHint: 'يتم إنشاء البريد تلقائياً من الاسم الكامل ونطاق المدرسة.',
    generatedEmailPreview: 'البريد المقترح',
    autoGeneratedCodeHint: 'يتم إنشاء كود الدخول تلقائياً من 6 خانات أرقام وحروف.',
    printTable: 'طباعة الجدول',
    databaseEmpty: 'لا توجد حسابات في هذه القاعدة.',
    directorEdit: 'تعديل بيانات مدير',
    fullName: 'الاسم واللقب الكامل',
    nameRequired: 'أدخل الاسم واللقب الكامل.',
    schoolName: 'اسم المدرسة',
    stage: 'الطور الدراسي',
    domain: 'نطاق البريد',
    city: 'المدينة',
    address: 'العنوان',
    phone: 'الهاتف',
    save: 'حفظ',
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    deleteAccountTitle: 'تأكيد حذف الحساب',
    deleteAccountQuestion: 'هل تريد حذف هذا الحساب؟',
    deleteAccountWarning: 'سيتم حذف الحساب والبيانات المرتبطة به نهائياً، ولا يمكن التراجع عن هذا الإجراء.',
    deleteSchoolTitle: 'تأكيد حذف المدرسة',
    deleteSchoolQuestion: 'هل تريد حذف هذه المدرسة؟',
    deleteSchoolWarning: 'سيتم نقل المدرسة إلى Trash لمدة 24 ساعة قبل حذفها نهائياً.',
    forceDeleteSchoolTitle: 'حذف نهائي للمدرسة',
    forceDeleteSchoolQuestion: 'هل تريد حذف هذه المدرسة نهائياً الآن؟',
    forceDeleteSchoolWarning: 'سيتم حذف المدرسة وجميع حساباتها وتمارينها وإعلاناتها وملاحظاتها نهائياً، ولا يمكن التراجع عن هذا الإجراء.',
    linkedAccounts: 'الحسابات المرتبطة',
    schoolTrash: 'Trash',
    trashHint: 'تبقى المدارس المحذوفة هنا لمدة 24 ساعة قبل الحذف النهائي التلقائي.',
    deletedAt: 'وقت الحذف',
    deletesAt: 'الحذف النهائي',
    restoreSchool: 'استعادة',
    forceDelete: 'حذف نهائي',
    editUser: 'تعديل الحساب',
    activate: 'تفعيل',
    disable: 'تعطيل',
    status: 'الحالة',
    role: 'الدور',
    subject: 'المادة',
    subjectAfterYear: 'اختر سنة التدريس أولاً لتظهر المواد المناسبة.',
    chooseStreamFirst: 'اختر الشعبة والقسم أولاً لتظهر مواد هذه السنة.',
    schoolYear: 'السنة الدراسية',
    schoolYears: 'سنوات التدريس',
    classGroup: 'القسم',
    classGroups: 'الأقسام',
    stream: 'الشعبة',
    secondaryStreams: 'الشعب في التعليم الثانوي',
    streamRequired: 'اختر الشعبة.',
    noStreamsEnabled: 'فعّل الشعب الخاصة بهذه الثانوية أولاً من صفحة المدرسة.',
    addClass: 'إضافة قسم',
    customClass: 'قسم آخر',
    chooseClass: 'اختر القسم',
    commonSubject: 'مشترك',
    subjectRequired: 'اختر مادة متاحة لهذه الشعبة.',
    assignments: 'التعيينات',
    showDetails: 'عرض التفاصيل',
    hideDetails: 'إخفاء التفاصيل',
    noAssignments: 'لا توجد تعيينات',
    actions: 'الإجراءات',
    director: 'مدير',
    teacher: 'أستاذ',
    student: 'تلميذ',
    admin: 'مشرف عام',
    allSchools: 'جميع المدارس المسجلة',
    allUsers: 'إدارة جميع المستخدمين',
    noRecords: 'لا توجد بيانات مطابقة.',
    activeUsers: 'حسابات مفعلة',
    disabledUsers: 'حسابات معطلة',
    totalExercises: 'إجمالي التمارين',
    createSchoolAccounts: 'إنشاء حسابات الأساتذة والتلاميذ',
    accountType: 'نوع الحساب',
    lockedScope: 'المدرسة والطور مرتبطان بالحساب ولا يمكن تغييرهما.',
    createOnlyTeacherStudent: 'المدير لا يستطيع إنشاء مديرين آخرين.',
    emailMustMatchDomain: 'يجب أن ينتهي البريد بنطاق المدرسة.',
    duplicateEmail: 'هذا البريد مستعمل بالفعل.',
    yearRequired: 'اختر سنة واحدة على الأقل.',
    classRequired: 'أدخل القسم.',
    classesRequired: 'أدخل قسماً واحداً على الأقل.',
    classesHint: 'اختر قسماً لكل سنة، أو اكتب رقماً/حرفاً خاصاً بك.',
    streamClassesHint: 'اختر الشعبة ثم القسم لكل سنة، ويمكنك إضافة أكثر من شعبة وأكثر من قسم.',
    schoolProfile: 'بيانات المدرسة',
    lockedSchool: 'اسم المدرسة مقفل',
    lockedStage: 'الطور الدراسي مقفل',
    lockedDomain: 'نطاق المدرسة مقفل',
    saved: 'تم الحفظ.',
    exerciseTitle: 'عنوان التمرين',
    exerciseBody: 'نص التمرين',
    dueDate: 'آخر أجل',
    dueDatePast: 'لا يمكن اختيار تاريخ سابق. اختر اليوم أو تاريخاً قادماً.',
    uploadImage: 'رفع صورة',
    uploadFile: 'رفع ملف أو صورة',
    publishExercise: 'نشر التمرين',
    updateExercise: 'تحديث التمرين',
    assignedExercises: 'تمارين مخصصة لك',
    viewHomework: 'عرض التمرين',
    homeworkDetails: 'تفاصيل التمرين',
    groupedBySubject: 'مرتبة حسب مادة الأستاذ',
    groupedByTarget: 'مرتبة حسب الشعبة ثم القسم',
    done: 'تم الإنجاز',
    completed: 'منجز',
    confirmDoneTitle: 'تأكيد الإنجاز',
    confirmDoneQuestion: 'هل تريد تأكيد إنجاز هذا التمرين؟',
    confirmDoneWarning: 'بعد التأكيد لن تستطيع تعديل التقييم أو الملاحظة.',
    confirmDoneAction: 'تأكيد الإنجاز',
    lockedFeedbackAfterDone: 'تم تثبيت التقييم والملاحظة بعد الإنجاز.',
    noSubmittedFeedback: 'تم الإنجاز بدون تقييم أو ملاحظة.',
    imagePreview: 'معاينة الصورة',
    announcementTitle: 'عنوان الإعلان',
    announcementBody: 'نص الإعلان',
    publishAnnouncement: 'نشر الإعلان',
    schoolAnnouncements: 'إعلانات المدرسة',
    activeAnnouncements: 'الإعلانات الحالية',
    announcementArchive: 'أرشيف الإعلانات',
    announcementArchiveHint: 'تظهر الإعلانات للجميع لمدة 72 ساعة، ثم تنتقل إلى الأرشيف ولا يراها إلا المشرف والمدير.',
    noArchivedAnnouncements: 'لا توجد إعلانات مؤرشفة.',
    visibleUntil: 'مرئي إلى غاية',
    archivedAt: 'دخل الأرشيف',
    noAnnouncements: 'لا توجد إعلانات بعد.',
    noteTitle: 'عنوان الملاحظة',
    noteBody: 'نص الملاحظة',
    publishNote: 'نشر الملاحظة',
    teacherNotes: 'ملاحظات الأستاذ',
    activeNotes: 'الملاحظات الحالية',
    noteArchive: 'أرشيف الملاحظات',
    noteArchiveHint: 'تظهر الملاحظات للتلميذ والأستاذ لمدة 72 ساعة، ثم تختفي من حساب التلميذ وتنتقل إلى أرشيف الأستاذ.',
    noArchivedNotes: 'لا توجد ملاحظات مؤرشفة.',
    attachment: 'مرفق',
    downloadFile: 'تنزيل الملف',
    noNotes: 'لا توجد ملاحظات بعد.',
    fileTooLarge: 'حجم الملف كبير. الحد الأقصى 1MB.',
    onlySubject: 'لا يمكنك إضافة أو تعديل تمارين إلا ضمن المادة المخصصة لك.',
    targetGroup: 'اختر السنة والقسم المستهدفين من الأقسام المخصصة لك.',
    systemSettings: 'إعدادات النظام',
    allowImages: 'السماح برفع الصور داخل التمارين',
    maintenanceMode: 'وضع الصيانة',
    settingsLanguageText: 'يتم حفظ اللغة المختارة وتطبيقها على جميع الصفحات.',
    resetDemo: 'إعادة ضبط البيانات التجريبية',
    scopedData: 'لا تظهر إلا البيانات المرتبطة بصلاحيات الحساب الحالي.',
    passwordHint: 'هذا هو الحساب الأولي الوحيد داخل النظام.',
    createdAt: 'تاريخ النشر',
    byTeacher: 'الأستاذ',
    schoolUsers: 'حسابات المدرسة',
    passwordDefault: 'كلمة المرور',
    useDemo: 'استخدام',
    visibleScope: 'النطاق الظاهر',
    connectedSchool: 'المدرسة المرتبطة',
    connectedStage: 'الطور المرتبط',
    completedExercises: 'تمارين منجزة',
    remainingExercises: 'تمارين متبقية',
    weeklyRequired: 'واجبات هذا الأسبوع',
    weeklyDone: 'أنجز هذا الأسبوع',
    weeklyRate: 'نسبة الأسبوع',
    classCompletion: 'إنجاز القسم',
    completedByStudents: 'ضغطوا تم الإنجاز',
    assignedStudents: 'التلاميذ المستهدفون',
    completionRate: 'نسبة الإنجاز',
    homeworkArchive: 'أرشيف الواجبات السابقة',
    archiveByMonth: 'مرتبة حسب الشهر',
    vacationExercise: 'تمرين وضع الإجازة',
    vacationHomework: 'واجب الإجازة',
    difficultyRating: 'تقييم الواجب',
    easyHomework: 'سهل',
    mediumHomework: 'متوسط',
    hardHomework: 'صعب',
    familyNote: 'ملاحظة الأسرة أو التلميذ',
    feedbackFromFamily: 'ملاحظات الأسرة والتلاميذ',
    noFeedback: 'لا توجد ملاحظات بعد.',
    easyCount: 'سهل',
    mediumCount: 'متوسط',
    hardCount: 'صعب',
    teacherActivity: 'نشاط الأساتذة',
    topTeacher: 'أكثر أستاذ نشاطاً',
    topSubject: 'أكثر مادة فيها واجبات',
    generalCompletion: 'نسبة الإنجاز العامة',
    weeklyDirectorReport: 'التقرير الأسبوعي للمدير',
    weeklyReportReady: 'ملخص جاهز للتنزيل بصيغة PDF',
    sendWeeklyReport: 'تنزيل التقرير PDF',
    noTeacherActivity: 'لا يوجد نشاط',
    noSubjectActivity: 'لا توجد مواد',
    weeklyReportSummary: 'ملخص الأسبوع'
  },
  fr: {
    appTitle: 'واجباتي',
    appSubtitle: 'Plateforme famille-école',
    appInfo: 'Informations sur la plateforme',
    appInfoTitle: 'Wajibati 📚',
    appInfoText: 'Wajibati est une plateforme éducative qui relie la famille à l’école. Elle permet aux enseignants et à l’administration de publier directement exercices et devoirs, afin que le parent puisse suivre le parcours d’apprentissage de son enfant avec simplicité et clarté.',
    appInfoOfferTitle: '🎯 Que propose la plateforme ?',
    appInfoOfferText: 'L’enseignant ou l’administration publie les exercices sur la plateforme. Ils deviennent accessibles au parent, qui peut voir ce que l’élève étudie, repérer les points à améliorer et aider son enfant de manière directe et efficace.',
    appInfoAudienceTitle: '👨‍👩‍👧 À qui s’adresse la plateforme ?',
    appInfoStudentAudience: 'Élèves — suivre leurs devoirs et exercices au même endroit',
    appInfoParentAudience: 'Parents — connaître le niveau de leurs enfants et les accompagner à la maison',
    appInfoWhyTitle: '💡 Pourquoi Wajibati ?',
    appInfoWhyText: 'Parce que la communication entre la famille et l’école est la base de la réussite de l’élève. Wajibati rend cette communication simple, transparente et accessible à tous.',
    loginTitle: 'Connexion',
    loginSubtitle: 'Connectez-vous pour suivre les devoirs des élèves.',
    loginHeroTitle: 'Wajibati',
    loginHeroSubtitle: 'Commencez le parcours de votre enfant vers un avenir scolaire brillant',
    loginHeroText: 'Suivez ses devoirs, surveillez ses progrès et devenez un vrai partenaire de sa réussite',
    email: 'E-mail',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    rememberMe: 'Se souvenir de ce compte',
    rememberedAccounts: 'Comptes mémorisés',
    useRememberedAccount: 'Utiliser ce compte',
    forgetAccount: 'Retirer le compte',
    demoAccounts: 'Compte administrateur',
    invalidCredentials: 'Identifiants incorrects.',
    disabledAccount: 'Ce compte est désactivé et ne peut pas se connecter.',
    checkingData: 'Connexion',
    sharedData: 'Données partagées',
    savingData: 'Enregistrement',
    localOnly: 'Local seulement',
    syncError: 'Échec synchro',
    chooseLanguage: 'Langue',
    overview: 'Vue',
    schools: 'Écoles',
    users: 'Comptes',
    school: 'École',
    exercises: 'Exercices',
    announcements: 'Annonces',
    notes: 'Notes',
    settings: 'Paramètres',
    theme: 'Thème',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    logout: 'Déconnexion',
    logoutQuestion: 'هل تريد حقاً تسجيل الخروج؟',
    yes: 'نعم',
    cancel: 'إلغاء',
    close: 'Fermer',
    adminPower: 'Administration',
    createDirector: 'Créer un directeur',
    createAccountTab: 'Créer compte',
    viewAccountsTab: 'Voir comptes',
    databaseTab: 'Base de données',
    credentialsDatabase: 'Base des comptes',
    credentialsDatabaseHint: 'Contient l’e-mail et le code créé par le directeur pour chaque compte.',
    teacherDatabase: 'Base des enseignants',
    studentDatabase: 'Base des élèves',
    accountCode: 'Code',
    autoGeneratedEmailHint: 'L’e-mail est généré automatiquement avec le nom complet et le domaine de l’école.',
    generatedEmailPreview: 'E-mail proposé',
    autoGeneratedCodeHint: 'Le code d’accès est généré automatiquement avec 6 chiffres et lettres.',
    printTable: 'Imprimer le tableau',
    databaseEmpty: 'Aucun compte dans cette base.',
    directorEdit: 'Modifier un directeur',
    fullName: 'Nom et prénom complets',
    nameRequired: 'Saisissez le nom et prénom complets.',
    schoolName: 'Nom de l’école',
    stage: 'Cycle',
    domain: 'Domaine e-mail',
    city: 'Ville',
    address: 'Adresse',
    phone: 'Téléphone',
    save: 'Enregistrer',
    create: 'Créer',
    edit: 'Modifier',
    delete: 'Supprimer',
    deleteAccountTitle: 'Confirmer la suppression',
    deleteAccountQuestion: 'Voulez-vous supprimer ce compte ?',
    deleteAccountWarning: 'Le compte et ses données liées seront supprimés définitivement. Cette action est irréversible.',
    deleteSchoolTitle: 'Confirmer la suppression de l’école',
    deleteSchoolQuestion: 'Voulez-vous supprimer cette école ?',
    deleteSchoolWarning: 'L’école sera déplacée vers Trash pendant 24 heures avant suppression définitive.',
    forceDeleteSchoolTitle: 'Suppression définitive de l’école',
    forceDeleteSchoolQuestion: 'Voulez-vous supprimer définitivement cette école maintenant ?',
    forceDeleteSchoolWarning: 'L’école, tous ses comptes, exercices, annonces et notes seront supprimés définitivement. Cette action est irréversible.',
    linkedAccounts: 'Comptes liés',
    schoolTrash: 'Trash',
    trashHint: 'Les écoles supprimées restent ici pendant 24 heures avant la suppression définitive automatique.',
    deletedAt: 'Supprimée le',
    deletesAt: 'Suppression définitive',
    restoreSchool: 'Restaurer',
    forceDelete: 'Supprimer définitivement',
    editUser: 'Modifier le compte',
    activate: 'Activer',
    disable: 'Désactiver',
    status: 'Statut',
    role: 'Rôle',
    subject: 'Matière',
    subjectAfterYear: 'Choisissez d’abord l’année enseignée pour afficher les matières adaptées.',
    chooseStreamFirst: 'Choisissez d’abord la filière et la classe pour afficher les matières.',
    schoolYear: 'Année scolaire',
    schoolYears: 'Années enseignées',
    classGroup: 'Classe',
    classGroups: 'Classes',
    stream: 'Filière',
    secondaryStreams: 'Filières du secondaire',
    streamRequired: 'Choisissez la filière.',
    noStreamsEnabled: 'Activez d’abord les filières de ce lycée dans la page école.',
    addClass: 'Ajouter classe',
    customClass: 'Autre classe',
    chooseClass: 'Choisir la classe',
    commonSubject: 'Tronc commun',
    subjectRequired: 'Choisissez une matière disponible pour cette filière.',
    assignments: 'Affectations',
    showDetails: 'Afficher détails',
    hideDetails: 'Masquer détails',
    noAssignments: 'Aucune affectation',
    actions: 'Actions',
    director: 'Directeur',
    teacher: 'Enseignant',
    student: 'Élève',
    admin: 'Administrateur',
    allSchools: 'Toutes les écoles inscrites',
    allUsers: 'Gestion de tous les utilisateurs',
    noRecords: 'Aucune donnée.',
    activeUsers: 'Comptes actifs',
    disabledUsers: 'Comptes désactivés',
    totalExercises: 'Total des exercices',
    createSchoolAccounts: 'Créer enseignants et élèves',
    accountType: 'Type de compte',
    lockedScope: 'L’école et le cycle sont liés au compte.',
    createOnlyTeacherStudent: 'Le directeur ne peut pas créer d’autres directeurs.',
    emailMustMatchDomain: 'L’e-mail doit utiliser le domaine de l’école.',
    duplicateEmail: 'Cet e-mail existe déjà.',
    yearRequired: 'Choisissez au moins une année.',
    classRequired: 'Saisissez la classe.',
    classesRequired: 'Saisissez au moins une classe.',
    classesHint: 'Choisissez une classe pour chaque année ou saisissez votre propre numéro/lettre.',
    streamClassesHint: 'Choisissez la filière puis la classe pour chaque année. Plusieurs filières et classes sont possibles.',
    schoolProfile: 'Données de l’école',
    lockedSchool: 'Nom de l’école verrouillé',
    lockedStage: 'Cycle verrouillé',
    lockedDomain: 'Domaine verrouillé',
    saved: 'Enregistré.',
    exerciseTitle: 'Titre',
    exerciseBody: 'Énoncé',
    dueDate: 'Échéance',
    dueDatePast: 'Impossible de choisir une date passée. Choisissez aujourd’hui ou une date future.',
    uploadImage: 'Importer image',
    uploadFile: 'Importer fichier ou image',
    publishExercise: 'Publier',
    updateExercise: 'Mettre à jour',
    assignedExercises: 'Exercices assignés',
    viewHomework: 'Voir l’exercice',
    homeworkDetails: 'Détails de l’exercice',
    groupedBySubject: 'Classés par matière de l’enseignant',
    groupedByTarget: 'Classés par filière puis classe',
    done: 'Terminé',
    completed: 'Fait',
    confirmDoneTitle: 'Confirmer le devoir',
    confirmDoneQuestion: 'Voulez-vous confirmer que cet exercice est terminé ?',
    confirmDoneWarning: 'Après confirmation, la note et l’évaluation ne pourront plus être modifiées.',
    confirmDoneAction: 'Confirmer',
    lockedFeedbackAfterDone: 'L’évaluation et la note sont verrouillées après validation.',
    noSubmittedFeedback: 'Terminé sans évaluation ni note.',
    imagePreview: 'Aperçu',
    announcementTitle: 'Titre de l’annonce',
    announcementBody: 'Texte de l’annonce',
    publishAnnouncement: 'Publier l’annonce',
    schoolAnnouncements: 'Annonces de l’école',
    activeAnnouncements: 'Annonces actives',
    announcementArchive: 'Archive des annonces',
    announcementArchiveHint: 'Les annonces restent visibles pour tout le monde pendant 72 heures, puis passent dans l’archive visible seulement par l’administrateur et le directeur.',
    noArchivedAnnouncements: 'Aucune annonce archivée.',
    visibleUntil: 'Visible jusqu’au',
    archivedAt: 'Archivée le',
    noAnnouncements: 'Aucune annonce.',
    noteTitle: 'Titre de la note',
    noteBody: 'Texte de la note',
    publishNote: 'Publier la note',
    teacherNotes: 'Notes du professeur',
    activeNotes: 'Notes actives',
    noteArchive: 'Archive des notes',
    noteArchiveHint: 'Les notes restent visibles pour l’élève et l’enseignant pendant 72 heures, puis disparaissent du compte élève et passent dans l’archive de l’enseignant.',
    noArchivedNotes: 'Aucune note archivée.',
    attachment: 'Pièce jointe',
    downloadFile: 'Télécharger',
    noNotes: 'Aucune note.',
    fileTooLarge: 'Le fichier est trop volumineux. Maximum 1MB.',
    onlySubject: 'Vous ne pouvez gérer que votre matière.',
    targetGroup: 'Choisissez l’année et la classe ciblées parmi vos affectations.',
    systemSettings: 'Paramètres système',
    allowImages: 'Autoriser les images dans les exercices',
    maintenanceMode: 'Mode maintenance',
    settingsLanguageText: 'La langue choisie est sauvegardée pour toutes les pages.',
    resetDemo: 'Réinitialiser la démo',
    scopedData: 'Seules les données autorisées sont visibles.',
    passwordHint: 'C’est le seul compte initial du système.',
    createdAt: 'Publication',
    byTeacher: 'Enseignant',
    schoolUsers: 'Comptes de l’école',
    passwordDefault: 'Mot de passe',
    useDemo: 'Utiliser',
    visibleScope: 'Périmètre visible',
    connectedSchool: 'École liée',
    connectedStage: 'Cycle lié',
    completedExercises: 'Exercices faits',
    remainingExercises: 'Exercices restants',
    weeklyRequired: 'Devoirs cette semaine',
    weeklyDone: 'Faits cette semaine',
    weeklyRate: 'Taux semaine',
    classCompletion: 'Avancement classe',
    completedByStudents: 'Ont marqué terminé',
    assignedStudents: 'Élèves ciblés',
    completionRate: 'Taux de réalisation',
    homeworkArchive: 'Archive des anciens devoirs',
    archiveByMonth: 'Classée par mois',
    vacationExercise: 'Devoir de vacances',
    vacationHomework: 'Vacances',
    difficultyRating: 'Évaluation du devoir',
    easyHomework: 'Facile',
    mediumHomework: 'Moyen',
    hardHomework: 'Difficile',
    familyNote: 'Note famille ou élève',
    feedbackFromFamily: 'Notes des familles et élèves',
    noFeedback: 'Aucune note pour le moment.',
    easyCount: 'Facile',
    mediumCount: 'Moyen',
    hardCount: 'Difficile',
    teacherActivity: 'Activité des enseignants',
    topTeacher: 'Enseignant le plus actif',
    topSubject: 'Matière la plus donnée',
    generalCompletion: 'Taux global',
    weeklyDirectorReport: 'Rapport hebdomadaire du directeur',
    weeklyReportReady: 'Résumé prêt à télécharger en PDF',
    sendWeeklyReport: 'Télécharger le PDF',
    noTeacherActivity: 'Aucune activité',
    noSubjectActivity: 'Aucune matière',
    weeklyReportSummary: 'Résumé de la semaine'
  },
  en: {
    appTitle: 'واجباتي',
    appSubtitle: 'Family-school homework platform',
    appInfo: 'About the platform',
    appInfoTitle: 'Wajibati 📚',
    appInfoText: 'Wajibati is an educational platform that connects families with the school. It allows teachers and administration to publish exercises and homework directly, so parents can follow their child’s learning path with clarity and ease.',
    appInfoOfferTitle: '🎯 What does the platform offer?',
    appInfoOfferText: 'Teachers or administration publish exercises on the platform, making them available to parents. Parents can see what the student is studying, discover points that need improvement, and help their child directly and effectively.',
    appInfoAudienceTitle: '👨‍👩‍👧 Who is it for?',
    appInfoStudentAudience: 'Students — follow their homework and exercises in one place',
    appInfoParentAudience: 'Parents — understand their children’s level and support them at home',
    appInfoWhyTitle: '💡 Why Wajibati?',
    appInfoWhyText: 'Because communication between family and school is the foundation of student success. Wajibati makes that communication simple, transparent, and accessible to everyone.',
    loginTitle: 'Sign in',
    loginSubtitle: 'Sign in to follow student homework.',
    loginHeroTitle: 'Wajibati',
    loginHeroSubtitle: 'Start your child’s journey toward a bright academic future',
    loginHeroText: 'Follow your child’s homework, track progress, and become a real partner in their success',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    rememberMe: 'Remember this account',
    rememberedAccounts: 'Remembered accounts',
    useRememberedAccount: 'Use account',
    forgetAccount: 'Forget account',
    demoAccounts: 'Administrator account',
    invalidCredentials: 'Invalid credentials.',
    disabledAccount: 'This account is disabled and cannot sign in.',
    checkingData: 'Checking sync',
    sharedData: 'Shared data',
    savingData: 'Saving',
    localOnly: 'Local only',
    syncError: 'Sync failed',
    chooseLanguage: 'Interface language',
    overview: 'Overview',
    schools: 'Schools',
    users: 'Accounts',
    school: 'School',
    exercises: 'Exercises',
    announcements: 'Announcements',
    notes: 'Notes',
    settings: 'Settings',
    theme: 'Theme',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    logout: 'Log out',
    logoutQuestion: 'هل تريد حقاً تسجيل الخروج؟',
    yes: 'نعم',
    cancel: 'إلغاء',
    close: 'Close',
    adminPower: 'Platform administration',
    createDirector: 'Create director account',
    createAccountTab: 'Create account',
    viewAccountsTab: 'View accounts',
    databaseTab: 'Database',
    credentialsDatabase: 'Account database',
    credentialsDatabaseHint: 'Contains the email and code created by the director for each account.',
    teacherDatabase: 'Teacher database',
    studentDatabase: 'Student database',
    accountCode: 'Code',
    autoGeneratedEmailHint: 'The email is generated automatically from the full name and school domain.',
    generatedEmailPreview: 'Generated email',
    autoGeneratedCodeHint: 'The login code is generated automatically with 6 letters and numbers.',
    printTable: 'Print table',
    databaseEmpty: 'No accounts in this database.',
    directorEdit: 'Edit director data',
    fullName: 'First and last name',
    nameRequired: 'Enter the full name.',
    schoolName: 'School name',
    stage: 'School stage',
    domain: 'Email domain',
    city: 'City',
    address: 'Address',
    phone: 'Phone',
    save: 'Save',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    deleteAccountTitle: 'Confirm account deletion',
    deleteAccountQuestion: 'Do you want to delete this account?',
    deleteAccountWarning: 'The account and its related data will be permanently deleted. This action cannot be undone.',
    deleteSchoolTitle: 'Confirm school deletion',
    deleteSchoolQuestion: 'Do you want to delete this school?',
    deleteSchoolWarning: 'The school will move to Trash for 24 hours before it is permanently deleted.',
    forceDeleteSchoolTitle: 'Permanently delete school',
    forceDeleteSchoolQuestion: 'Do you want to permanently delete this school now?',
    forceDeleteSchoolWarning: 'The school and all linked accounts, exercises, announcements, notes, completions, and feedback will be permanently deleted. This action cannot be undone.',
    linkedAccounts: 'Linked accounts',
    schoolTrash: 'Trash',
    trashHint: 'Deleted schools stay here for 24 hours before automatic permanent deletion.',
    deletedAt: 'Deleted at',
    deletesAt: 'Permanent deletion',
    restoreSchool: 'Restore',
    forceDelete: 'Force delete',
    editUser: 'Edit account',
    activate: 'Activate',
    disable: 'Disable',
    status: 'Status',
    role: 'Role',
    subject: 'Subject',
    subjectAfterYear: 'Choose the teaching year first to show the matching subjects.',
    chooseStreamFirst: 'Choose the stream and class first to show this year’s subjects.',
    schoolYear: 'School year',
    schoolYears: 'Teaching years',
    classGroup: 'Class',
    classGroups: 'Classes',
    stream: 'Stream',
    secondaryStreams: 'Secondary streams',
    streamRequired: 'Choose the stream.',
    noStreamsEnabled: 'Enable this secondary school’s streams first from the school page.',
    addClass: 'Add class',
    customClass: 'Other class',
    chooseClass: 'Choose class',
    commonSubject: 'Common',
    subjectRequired: 'Choose a subject available for this stream.',
    assignments: 'Assignments',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    noAssignments: 'No assignments',
    actions: 'Actions',
    director: 'Director',
    teacher: 'Teacher',
    student: 'Student',
    admin: 'Administrator',
    allSchools: 'All registered schools',
    allUsers: 'Manage all users',
    noRecords: 'No matching records.',
    activeUsers: 'Active accounts',
    disabledUsers: 'Disabled accounts',
    totalExercises: 'Total exercises',
    createSchoolAccounts: 'Create teachers and students',
    accountType: 'Account type',
    lockedScope: 'School and stage are tied to the account.',
    createOnlyTeacherStudent: 'Directors cannot create other directors.',
    emailMustMatchDomain: 'Email must use the school domain.',
    duplicateEmail: 'This email is already used.',
    yearRequired: 'Choose at least one year.',
    classRequired: 'Enter the class.',
    classesRequired: 'Enter at least one class.',
    classesHint: 'Choose a class for each year, or enter your own number/letter.',
    streamClassesHint: 'Choose the stream, then the class for each year. Multiple streams and classes are allowed.',
    schoolProfile: 'School data',
    lockedSchool: 'School name locked',
    lockedStage: 'Stage locked',
    lockedDomain: 'School domain locked',
    saved: 'Saved.',
    exerciseTitle: 'Exercise title',
    exerciseBody: 'Exercise text',
    dueDate: 'Due date',
    dueDatePast: 'Past dates are not allowed. Choose today or a future date.',
    uploadImage: 'Upload image',
    uploadFile: 'Upload file or image',
    publishExercise: 'Publish exercise',
    updateExercise: 'Update exercise',
    assignedExercises: 'Assigned exercises',
    viewHomework: 'View exercise',
    homeworkDetails: 'Exercise details',
    groupedBySubject: 'Grouped by teacher subject',
    groupedByTarget: 'Grouped by stream then class',
    done: 'Done',
    completed: 'Completed',
    confirmDoneTitle: 'Confirm completion',
    confirmDoneQuestion: 'Do you want to confirm this exercise as completed?',
    confirmDoneWarning: 'After confirmation, the rating and note cannot be edited.',
    confirmDoneAction: 'Confirm completion',
    lockedFeedbackAfterDone: 'The rating and note are locked after completion.',
    noSubmittedFeedback: 'Completed without a rating or note.',
    imagePreview: 'Image preview',
    announcementTitle: 'Announcement title',
    announcementBody: 'Announcement text',
    publishAnnouncement: 'Publish announcement',
    schoolAnnouncements: 'School announcements',
    activeAnnouncements: 'Active announcements',
    announcementArchive: 'Announcement archive',
    announcementArchiveHint: 'Announcements stay visible to everyone for 72 hours, then move to the archive visible only to the administrator and principal.',
    noArchivedAnnouncements: 'No archived announcements.',
    visibleUntil: 'Visible until',
    archivedAt: 'Archived at',
    noAnnouncements: 'No announcements yet.',
    noteTitle: 'Note title',
    noteBody: 'Note text',
    publishNote: 'Publish note',
    teacherNotes: 'Teacher notes',
    activeNotes: 'Active notes',
    noteArchive: 'Notes archive',
    noteArchiveHint: 'Notes stay visible to the student and teacher for 72 hours, then disappear from the student account and move to the teacher archive.',
    noArchivedNotes: 'No archived notes.',
    attachment: 'Attachment',
    downloadFile: 'Download file',
    noNotes: 'No notes yet.',
    fileTooLarge: 'File is too large. Maximum is 1MB.',
    onlySubject: 'You can only add or edit exercises in your assigned subject.',
    targetGroup: 'Choose the target year and class from your assignments.',
    systemSettings: 'System settings',
    allowImages: 'Allow images inside exercises',
    maintenanceMode: 'Maintenance mode',
    settingsLanguageText: 'The selected language is saved and applied everywhere.',
    resetDemo: 'Reset demo data',
    scopedData: 'Only permitted data is visible for this account.',
    passwordHint: 'This is the only initial account in the system.',
    createdAt: 'Published',
    byTeacher: 'Teacher',
    schoolUsers: 'School accounts',
    passwordDefault: 'Password',
    useDemo: 'Use',
    visibleScope: 'Visible scope',
    connectedSchool: 'Connected school',
    connectedStage: 'Connected stage',
    completedExercises: 'Completed exercises',
    remainingExercises: 'Remaining exercises',
    weeklyRequired: 'Homework this week',
    weeklyDone: 'Done this week',
    weeklyRate: 'Weekly rate',
    classCompletion: 'Class completion',
    completedByStudents: 'Marked done',
    assignedStudents: 'Assigned students',
    completionRate: 'Completion rate',
    homeworkArchive: 'Previous homework archive',
    archiveByMonth: 'Grouped by month',
    vacationExercise: 'Vacation homework',
    vacationHomework: 'Vacation',
    difficultyRating: 'Homework rating',
    easyHomework: 'Easy',
    mediumHomework: 'Medium',
    hardHomework: 'Hard',
    familyNote: 'Family or student note',
    feedbackFromFamily: 'Family and student notes',
    noFeedback: 'No notes yet.',
    easyCount: 'Easy',
    mediumCount: 'Medium',
    hardCount: 'Hard',
    teacherActivity: 'Teacher activity',
    topTeacher: 'Most active teacher',
    topSubject: 'Top homework subject',
    generalCompletion: 'Overall completion',
    weeklyDirectorReport: 'Director weekly report',
    weeklyReportReady: 'Summary ready to download as PDF',
    sendWeeklyReport: 'Download PDF',
    noTeacherActivity: 'No activity',
    noSubjectActivity: 'No subjects',
    weeklyReportSummary: 'Weekly summary'
  }
};

const roleNames: Record<Language, Record<Role, string>> = {
  ar: { admin: 'المشرف العام', director: 'مدير المدرسة', teacher: 'الأستاذ', student: 'التلميذ' },
  fr: { admin: 'Administrateur', director: 'Directeur', teacher: 'Enseignant', student: 'Élève' },
  en: { admin: 'Administrator', director: 'School director', teacher: 'Teacher', student: 'Student' }
};

const roleIcons: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  director: Building2,
  teacher: GraduationCap,
  student: BookOpen
};

const stageNames: Record<Language, Record<Stage, string>> = {
  ar: { primary: 'ابتدائي', middle: 'متوسط', secondary: 'ثانوي' },
  fr: { primary: 'Primaire', middle: 'Moyen', secondary: 'Secondaire' },
  en: { primary: 'Primary', middle: 'Middle', secondary: 'Secondary' }
};

const schoolYearNames: Record<Language, Record<Stage, string[]>> = {
  ar: {
    primary: ['السنة الأولى ابتدائي', 'السنة الثانية ابتدائي', 'السنة الثالثة ابتدائي', 'السنة الرابعة ابتدائي', 'السنة الخامسة ابتدائي'],
    middle: ['السنة الأولى متوسط', 'السنة الثانية متوسط', 'السنة الثالثة متوسط', 'السنة الرابعة متوسط'],
    secondary: ['السنة الأولى ثانوي', 'السنة الثانية ثانوي', 'السنة الثالثة ثانوي']
  },
  fr: {
    primary: ['1re année primaire', '2e année primaire', '3e année primaire', '4e année primaire', '5e année primaire'],
    middle: ['1re année moyenne', '2e année moyenne', '3e année moyenne', '4e année moyenne'],
    secondary: ['1re année secondaire', '2e année secondaire', '3e année secondaire']
  },
  en: {
    primary: ['Primary year 1', 'Primary year 2', 'Primary year 3', 'Primary year 4', 'Primary year 5'],
    middle: ['Middle year 1', 'Middle year 2', 'Middle year 3', 'Middle year 4'],
    secondary: ['Secondary year 1', 'Secondary year 2', 'Secondary year 3']
  }
};

const subjectNames: Record<Language, Record<Subject, string>> = {
  ar: {
    math: 'الرياضيات',
    arabic: 'اللغة العربية',
    science: 'العلوم الطبيعية',
    physics: 'الفيزياء',
    history: 'التاريخ والجغرافيا',
    primary_history: 'التاريخ',
    geography: 'الجغرافيا',
    french: 'اللغة الفرنسية',
    english: 'اللغة الإنجليزية',
    islamic_education: 'التربية الإسلامية',
    civic_education: 'التربية المدنية',
    scientific_technology: 'التربية العلمية والتكنولوجية',
    art_education: 'التربية الفنية',
    music_education: 'التربية الموسيقية',
    arabic_literature: 'اللغة العربية وآدابها',
    life_science: 'علوم الطبيعة والحياة',
    physical_science_technology: 'العلوم الفيزيائية والتكنولوجيا',
    islamic_science: 'العلوم الإسلامية',
    philosophy: 'الفلسفة',
    computer_science: 'الإعلام الآلي',
    physical_education: 'التربية البدنية والرياضية',
    tamazight: 'الأمازيغية',
    civil_engineering_subject: 'هندسة مدنية',
    electrical_engineering_subject: 'هندسة كهربائية',
    mechanical_engineering_subject: 'هندسة ميكانيكية',
    process_engineering_subject: 'هندسة الطرائق',
    physical_sciences: 'العلوم الفيزيائية',
    technology: 'التكنولوجيا',
    spanish: 'اللغة الإسبانية',
    german: 'اللغة الألمانية',
    italian: 'اللغة الإيطالية'
  },
  fr: {
    math: 'Mathématiques',
    arabic: 'Arabe',
    science: 'Sciences naturelles',
    physics: 'Physique',
    history: 'Histoire-géographie',
    primary_history: 'Histoire',
    geography: 'Géographie',
    french: 'Français',
    english: 'Anglais',
    islamic_education: 'Éducation islamique',
    civic_education: 'Éducation civique',
    scientific_technology: 'Éducation scientifique et technologique',
    art_education: 'Éducation artistique',
    music_education: 'Éducation musicale',
    arabic_literature: 'Langue arabe et littérature',
    life_science: 'Sciences de la nature et de la vie',
    physical_science_technology: 'Sciences physiques et technologie',
    islamic_science: 'Sciences islamiques',
    philosophy: 'Philosophie',
    computer_science: 'Informatique',
    physical_education: 'Éducation physique et sportive',
    tamazight: 'Tamazight',
    civil_engineering_subject: 'Génie civil',
    electrical_engineering_subject: 'Génie électrique',
    mechanical_engineering_subject: 'Génie mécanique',
    process_engineering_subject: 'Génie des procédés',
    physical_sciences: 'Sciences physiques',
    technology: 'Technologie',
    spanish: 'Espagnol',
    german: 'Allemand',
    italian: 'Italien'
  },
  en: {
    math: 'Mathematics',
    arabic: 'Arabic',
    science: 'Natural sciences',
    physics: 'Physics',
    history: 'History and geography',
    primary_history: 'History',
    geography: 'Geography',
    french: 'French',
    english: 'English',
    islamic_education: 'Islamic education',
    civic_education: 'Civic education',
    scientific_technology: 'Scientific and technological education',
    art_education: 'Art education',
    music_education: 'Music education',
    arabic_literature: 'Arabic language and literature',
    life_science: 'Life and earth sciences',
    physical_science_technology: 'Physical sciences and technology',
    islamic_science: 'Islamic sciences',
    philosophy: 'Philosophy',
    computer_science: 'Computer science',
    physical_education: 'Physical education and sports',
    tamazight: 'Tamazight',
    civil_engineering_subject: 'Civil engineering',
    electrical_engineering_subject: 'Electrical engineering',
    mechanical_engineering_subject: 'Mechanical engineering',
    process_engineering_subject: 'Process engineering',
    physical_sciences: 'Physical sciences',
    technology: 'Technology',
    spanish: 'Spanish',
    german: 'German',
    italian: 'Italian'
  }
};

const secondaryStreamNames: Record<Language, Record<SecondaryStream, string>> = {
  ar: {
    experimental_science: 'علوم تجريبية',
    mathematics: 'رياضيات',
    civil_engineering: 'تقني رياضي - هندسة مدنية',
    electrical_engineering: 'تقني رياضي - هندسة كهربائية',
    mechanical_engineering: 'تقني رياضي - هندسة ميكانيكية',
    process_engineering: 'تقني رياضي - هندسة الطرائق',
    management_economics: 'تسيير واقتصاد',
    literature_philosophy: 'آداب وفلسفة',
    foreign_languages: 'لغات أجنبية'
  },
  fr: {
    experimental_science: 'Sciences expérimentales',
    mathematics: 'Mathématiques',
    civil_engineering: 'Technique math - Génie civil',
    electrical_engineering: 'Technique math - Génie électrique',
    mechanical_engineering: 'Technique math - Génie mécanique',
    process_engineering: 'Technique math - Génie des procédés',
    management_economics: 'Gestion et économie',
    literature_philosophy: 'Lettres et philosophie',
    foreign_languages: 'Langues étrangères'
  },
  en: {
    experimental_science: 'Experimental sciences',
    mathematics: 'Mathematics',
    civil_engineering: 'Technical mathematics - Civil engineering',
    electrical_engineering: 'Technical mathematics - Electrical engineering',
    mechanical_engineering: 'Technical mathematics - Mechanical engineering',
    process_engineering: 'Technical mathematics - Process engineering',
    management_economics: 'Management and economics',
    literature_philosophy: 'Literature and philosophy',
    foreign_languages: 'Foreign languages'
  }
};

const statusNames: Record<Language, Record<AccountStatus, string>> = {
  ar: { active: 'مفعل', disabled: 'معطل' },
  fr: { active: 'Actif', disabled: 'Désactivé' },
  en: { active: 'Active', disabled: 'Disabled' }
};

const languageNames: Record<Language, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English'
};

const languageFlags: Record<Language, string> = {
  ar: '🇩🇿',
  fr: '🇫🇷',
  en: '🇬🇧'
};

const localeNames: Record<Language, string> = {
  ar: 'ar-DZ',
  fr: 'fr-DZ',
  en: 'en'
};

const homeworkDifficulties: HomeworkDifficulty[] = ['easy', 'medium', 'hard'];

const navItems: Record<Role, Array<{ id: View; labelKey: string; icon: LucideIcon }>> = {
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

const seedData: PlatformData = {
  schools: [],
  users: [
    {
      id: 'user-admin',
      name: 'Administrator',
      email: 'wajibati@admin.dz',
      password: 'LATTOUI1qaz0plm@7',
      role: 'admin',
      status: 'active'
    }
  ],
  exercises: [],
  announcements: [],
  notes: [],
  completions: {},
  completionDates: {},
  feedback: {},
  pushTokens: {},
  deletedSchoolIds: [],
  settings: {
    allowExerciseImages: true,
    maintenanceMode: false
  }
};

function tr(language: Language, key: string) {
  return copy[language][key] ?? copy.ar[key] ?? key;
}

function schoolYearLabel(language: Language, stage: Stage | undefined, schoolYear: number | undefined) {
  if (!stage || !schoolYear) {
    return '-';
  }

  return schoolYearNames[language][stage][schoolYear - 1] ?? '-';
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function parseClassGroups(value: string) {
  const seen = new Set<string>();

  return value
    .split(/[,،;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

function normalizeClassGroup(value: string) {
  return value.trim();
}

function normalizeYearClassGroups(assignments: Record<string, string[]> | undefined) {
  const normalized: Record<string, string[]> = {};

  Object.entries(assignments ?? {}).forEach(([year, groups]) => {
    const yearNumber = Number(year);
    const cleanGroups = parseClassGroups(groups.join(','));
    if (Number.isInteger(yearNumber) && yearNumber > 0 && cleanGroups.length > 0) {
      normalized[String(yearNumber)] = cleanGroups;
    }
  });

  return normalized;
}

function normalizeYearStreamClassGroups(assignments: YearStreamClassGroups | undefined) {
  const normalized: YearStreamClassGroups = {};

  Object.entries(assignments ?? {}).forEach(([year, streams]) => {
    const yearNumber = Number(year);
    if (!Number.isInteger(yearNumber) || yearNumber <= 0) {
      return;
    }

    const normalizedStreams: Partial<Record<SecondaryStream, string[]>> = {};

    Object.entries(streams ?? {}).forEach(([stream, groups]) => {
      if (!secondaryStreams.includes(stream as SecondaryStream)) {
        return;
      }

      const cleanGroups = parseClassGroups((groups ?? []).join(','));
      if (cleanGroups.length > 0) {
        normalizedStreams[stream as SecondaryStream] = cleanGroups;
      }
    });

    if (Object.keys(normalizedStreams).length > 0) {
      normalized[String(yearNumber)] = normalizedStreams;
    }
  });

  return normalized;
}

function assignedYearStreamClassGroups(user: PlatformUser) {
  return normalizeYearStreamClassGroups(user.yearStreamClassGroups);
}

function assignedSchoolYears(user: PlatformUser) {
  const streamGroupedYears = uniqueNumbers(Object.keys(assignedYearStreamClassGroups(user)).map(Number));
  if (streamGroupedYears.length > 0) {
    return streamGroupedYears;
  }

  const groupedYears = uniqueNumbers(Object.keys(normalizeYearClassGroups(user.yearClassGroups)).map(Number));
  if (groupedYears.length > 0) {
    return groupedYears;
  }

  const years = uniqueNumbers((user.schoolYears ?? []).filter((year) => Number.isInteger(year) && year > 0));
  if (years.length > 0) {
    return years;
  }

  return user.schoolYear ? [user.schoolYear] : [];
}

function assignedYearClassGroups(user: PlatformUser) {
  const grouped = normalizeYearClassGroups(user.yearClassGroups);
  if (Object.keys(grouped).length > 0) {
    return grouped;
  }

  const years = assignedSchoolYears(user);
  const groups = parseClassGroups((user.classGroups ?? []).join(','));

  if (years.length > 0 && groups.length > 0) {
    return Object.fromEntries(years.map((year) => [String(year), groups]));
  }

  if (user.schoolYear && user.classGroup?.trim()) {
    return { [String(user.schoolYear)]: [user.classGroup.trim()] };
  }

  return {};
}

function assignedClassGroups(user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamGroupedClasses = parseClassGroups(
    Object.values(streamGrouped)
      .flatMap((streams) => Object.values(streams).flat())
      .join(',')
  );
  if (streamGroupedClasses.length > 0) {
    return streamGroupedClasses;
  }

  const grouped = normalizeYearClassGroups(user.yearClassGroups);
  const groupedClasses = parseClassGroups(Object.values(grouped).flat().join(','));
  if (groupedClasses.length > 0) {
    return groupedClasses;
  }

  const groups = parseClassGroups((user.classGroups ?? []).join(','));
  if (groups.length > 0) {
    return groups;
  }

  return user.classGroup?.trim() ? [user.classGroup.trim()] : [];
}

function schoolYearsLabel(language: Language, user: PlatformUser) {
  const years = assignedSchoolYears(user);
  if (years.length === 0) {
    return '-';
  }

  return years.map((year) => schoolYearLabel(language, user.stage, year)).join('، ');
}

function classGroupsLabel(user: PlatformUser) {
  const groups = assignedClassGroups(user);
  return groups.length > 0 ? groups.join('، ') : '-';
}

function yearClassGroupsLabel(language: Language, user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamEntries = Object.entries(streamGrouped);

  if (streamEntries.length > 0) {
    return streamEntries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([year, streams]) => {
        const streamText = Object.entries(streams)
          .map(([stream, groups]) => `${secondaryStreamLabel(language, stream as SecondaryStream, Number(year))}: ${(groups ?? []).join('، ')}`)
          .join(' / ');

        return `${schoolYearLabel(language, user.stage, Number(year))}: ${streamText}`;
      })
      .join(' | ');
  }

  const grouped = assignedYearClassGroups(user);
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return '-';
  }

  return entries
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([year, groups]) => `${schoolYearLabel(language, user.stage, Number(year))}: ${groups.join('، ')}`)
    .join(' | ');
}

function scopedYearDetailsLabel(language: Language, user: PlatformUser, details: Array<{ year: number; text: string }>) {
  const visibleDetails = details.filter((detail) => detail.text.trim());

  if (visibleDetails.length === 0) {
    return '-';
  }

  if (visibleDetails.length === 1) {
    return visibleDetails[0].text;
  }

  return visibleDetails.map((detail) => `${schoolYearLabel(language, user.stage, detail.year)}: ${detail.text}`).join(' | ');
}

function teacherTableClassGroupsLabel(language: Language, user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamEntries = Object.entries(streamGrouped);

  if (streamEntries.length > 0) {
    return scopedYearDetailsLabel(
      language,
      user,
      streamEntries
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([year, streams]) => ({
          year: Number(year),
          text: parseClassGroups(Object.values(streams).flat().join(',')).join('، ')
        }))
    );
  }

  const grouped = assignedYearClassGroups(user);
  const entries = Object.entries(grouped);

  if (entries.length > 0) {
    return scopedYearDetailsLabel(
      language,
      user,
      entries
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([year, groups]) => ({ year: Number(year), text: parseClassGroups(groups.join(',')).join('، ') }))
    );
  }

  return classGroupsLabel(user);
}

function teacherTableStreamsLabel(language: Language, user: PlatformUser) {
  const streamEntries = Object.entries(assignedYearStreamClassGroups(user));

  if (streamEntries.length === 0) {
    return '-';
  }

  return scopedYearDetailsLabel(
    language,
    user,
    streamEntries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([year, streams]) => ({
        year: Number(year),
        text: (Object.keys(streams) as SecondaryStream[]).map((stream) => secondaryStreamLabel(language, stream, Number(year))).join('، ')
      }))
  );
}

function assignedYearSubjects(user: PlatformUser) {
  const years = assignedSchoolYears(user);
  const subjectsByYear: Record<string, Subject> = {};

  years.forEach((year) => {
    const key = String(year);
    const subject = user.subjectsByYear?.[key] ?? user.subject;
    if (subject) {
      subjectsByYear[key] = subject;
    }
  });

  Object.entries(user.subjectsByYear ?? {}).forEach(([year, subject]) => {
    if (subject) {
      subjectsByYear[year] = subject;
    }
  });

  return subjectsByYear;
}

function teacherSubjectForYear(user: PlatformUser, schoolYear: number | undefined) {
  if (!schoolYear) {
    return user.subject;
  }

  return assignedYearSubjects(user)[String(schoolYear)] ?? user.subject;
}

function teacherSubjectsLabel(language: Language, user: PlatformUser) {
  if (user.role !== 'teacher') {
    return user.subject ? subjectNames[language][user.subject] : '-';
  }

  const subjectEntries = Object.entries(assignedYearSubjects(user)).sort(([left], [right]) => Number(left) - Number(right));
  if (subjectEntries.length === 0) {
    return user.subject ? subjectNames[language][user.subject] : '-';
  }

  const uniqueSubjects = [...new Set(subjectEntries.map(([, subject]) => subject))];
  if (uniqueSubjects.length === 1) {
    return subjectNames[language][uniqueSubjects[0]];
  }

  return subjectEntries.map(([year, subject]) => `${schoolYearLabel(language, user.stage, Number(year))}: ${subjectNames[language][subject]}`).join(' | ');
}

function selectedStreamsForTeacherYear(yearStreamClassGroups: YearStreamClassGroups, school: SchoolRecord | undefined, schoolYear: number) {
  const selectedStreams = Object.keys(normalizeYearStreamClassGroups(yearStreamClassGroups)[String(schoolYear)] ?? {}) as SecondaryStream[];
  if (school?.stage === 'secondary') {
    return selectedStreams;
  }

  return selectedStreams.length > 0 ? selectedStreams : secondaryStreamsForYear(school, schoolYear);
}

function subjectOptionsForTeacherYear(school: SchoolRecord | undefined, yearStreamClassGroups: YearStreamClassGroups, schoolYear: number) {
  const selectedStreams = selectedStreamsForTeacherYear(yearStreamClassGroups, school, schoolYear);
  if (school?.stage === 'secondary' && selectedStreams.length === 0) {
    return [];
  }

  return subjectsForTeacherYear(school, selectedStreams, schoolYear);
}

function normalizeTeacherSubjectsByYear(
  school: SchoolRecord | undefined,
  schoolYears: number[],
  yearStreamClassGroups: YearStreamClassGroups,
  subjectsByYear: Record<string, Subject | ''>,
  fallbackSubject?: Subject
) {
  const normalized: Record<string, Subject> = {};

  schoolYears.forEach((year) => {
    const key = String(year);
    const options = subjectOptionsForTeacherYear(school, yearStreamClassGroups, year);
    const selected = subjectsByYear[key] || fallbackSubject || '';
    const subject = selected && options.includes(selected as Subject) ? (selected as Subject) : options[0];

    if (subject) {
      normalized[key] = subject;
    }
  });

  return normalized;
}

function assignmentSummaryLabel(language: Language, user: PlatformUser) {
  if (user.role === 'admin') {
    return tr(language, 'noAssignments');
  }

  if (user.role === 'director') {
    return user.stage ? stageNames[language][user.stage] : tr(language, 'noAssignments');
  }

  if (user.role === 'student') {
    const parts = [
      schoolYearLabel(language, user.stage, user.schoolYear),
      user.stream ? secondaryStreamLabel(language, user.stream, user.schoolYear) : '',
      user.classGroup ? `${tr(language, 'classGroup')} ${user.classGroup}` : ''
    ].filter((part) => part && part !== '-');

    return parts.length > 0 ? parts.join(' / ') : tr(language, 'noAssignments');
  }

  const years = assignedSchoolYears(user);
  const classes = assignedClassGroups(user);
  const streams = Object.values(assignedYearStreamClassGroups(user)).flatMap((streamGroups) => Object.keys(streamGroups));
  const parts = [`${years.length} ${tr(language, 'schoolYears')}`, `${classes.length} ${tr(language, 'classGroups')}`];

  if (user.stage === 'secondary') {
    parts.splice(1, 0, `${new Set(streams).size} ${tr(language, 'stream')}`);
  }

  return years.length > 0 || classes.length > 0 ? parts.join(' / ') : tr(language, 'noAssignments');
}

function hasAccountDetails(user: PlatformUser) {
  return user.role !== 'admin';
}

function AccountAssignmentDetails({ user, language }: { user: PlatformUser; language: Language }) {
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

function sameClassGroup(left?: string, right?: string) {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();
}

function exerciseMatchesStudent(exercise: Exercise, user: PlatformUser) {
  if (user.role !== 'student' || !user.schoolId || !user.stage || !user.schoolYear || !user.classGroup?.trim()) {
    return false;
  }

  if (exercise.schoolId !== user.schoolId || exercise.stage !== user.stage || exercise.schoolYear !== user.schoolYear) {
    return false;
  }

  if (!sameClassGroup(exercise.classGroup, user.classGroup)) {
    return false;
  }

  if (user.stage === 'secondary') {
    return Boolean(exercise.stream && user.stream && exercise.stream === user.stream);
  }

  return true;
}

function exerciseMatchesTeacherAssignment(exercise: Exercise, user: PlatformUser) {
  const streamGrouped = assignedYearStreamClassGroups(user);
  const streamEntries = Object.entries(streamGrouped);

  if (streamEntries.length > 0) {
    const years = Object.keys(streamGrouped).map(Number);
    const yearMatches = exercise.schoolYear === undefined || years.includes(exercise.schoolYear);
    const streamGroupsForYear =
      exercise.schoolYear === undefined ? Object.values(streamGrouped) : [streamGrouped[String(exercise.schoolYear)] ?? {}];
    const streamMatches =
      exercise.stream === undefined || streamGroupsForYear.some((streams) => Boolean(streams[exercise.stream as SecondaryStream]?.length));
    const classesForTarget = streamGroupsForYear.flatMap((streams) =>
      exercise.stream === undefined ? Object.values(streams).flat() : streams[exercise.stream as SecondaryStream] ?? []
    );
    const classMatches = exercise.classGroup === undefined || classesForTarget.some((group) => sameClassGroup(group, exercise.classGroup));

    return yearMatches && streamMatches && classMatches;
  }

  const grouped = assignedYearClassGroups(user);
  const years = Object.keys(grouped).map(Number);
  const yearMatches = exercise.schoolYear === undefined || years.includes(exercise.schoolYear);
  const classesForYear = exercise.schoolYear === undefined ? Object.values(grouped).flat() : grouped[String(exercise.schoolYear)] ?? [];
  const classMatches = exercise.classGroup === undefined || classesForYear.some((group) => sameClassGroup(group, exercise.classGroup));

  return yearMatches && classMatches;
}

function enabledSecondaryStreams(school?: SchoolRecord) {
  return school?.stage === 'secondary' ? school.streams ?? [] : [];
}

function secondaryStreamsForYear(school: SchoolRecord | undefined, schoolYear: number | undefined) {
  const enabledStreams = enabledSecondaryStreams(school);

  if (school?.stage !== 'secondary') {
    return [];
  }

  if (schoolYear === 1) {
    return firstYearSecondaryStreams.filter((stream) => enabledStreams.includes(stream));
  }

  return enabledStreams;
}

function secondaryStreamLabel(language: Language, stream: SecondaryStream, schoolYear?: number) {
  if (schoolYear === 1 && stream === 'literature_philosophy') {
    return {
      ar: 'آداب',
      fr: 'Lettres',
      en: 'Literature'
    }[language];
  }

  return secondaryStreamNames[language][stream];
}

function streamsForSubject(subject: Subject | undefined, school?: SchoolRecord) {
  if (!subject || school?.stage !== 'secondary') {
    return [];
  }

  const enabledStreams = enabledSecondaryStreams(school);
  const specificStreams = secondarySubjectStreams[subject];

  if (!specificStreams) {
    return enabledStreams;
  }

  return enabledStreams.filter((stream) => specificStreams.includes(stream));
}

function subjectsForSchool(school?: SchoolRecord) {
  if (school?.stage === 'primary') {
    return primarySubjects;
  }

  if (school?.stage === 'middle' || !school) {
    return middleSubjects;
  }

  return secondarySubjects.filter((subject) => !secondarySubjectStreams[subject] || streamsForSubject(subject, school).length > 0);
}

function subjectMatchesStreams(subject: Subject, streams: SecondaryStream[]) {
  const specificStreams = secondarySubjectStreams[subject];
  return !specificStreams || streams.some((stream) => specificStreams.includes(stream));
}

function subjectsForTeacherStreams(school: SchoolRecord | undefined, selectedStreams: SecondaryStream[]) {
  if (school?.stage !== 'secondary') {
    return subjectsForSchool(school);
  }

  const availableStreams = selectedStreams.length > 0 ? selectedStreams : enabledSecondaryStreams(school);
  return secondarySubjects.filter((subject) => subjectMatchesStreams(subject, availableStreams));
}

function subjectsForTeacherYears(school: SchoolRecord | undefined, selectedStreams: SecondaryStream[], schoolYears: number[]) {
  if (schoolYears.length === 0) {
    return [];
  }

  const availableSubjects = subjectsForTeacherStreams(school, selectedStreams);

  if (school?.stage === 'primary' && schoolYears.some((year) => year === 1 || year === 2)) {
    return availableSubjects.filter((subject) => !primaryLowerYearExcludedSubjects.includes(subject));
  }

  return availableSubjects;
}

function subjectsForTeacherYear(school: SchoolRecord | undefined, selectedStreams: SecondaryStream[], schoolYear: number) {
  return subjectsForTeacherYears(school, selectedStreams, [schoolYear]);
}

function subjectScopeLabel(language: Language, subject: Subject, school?: SchoolRecord) {
  if (school?.stage !== 'secondary') {
    return '';
  }

  const specificStreams = secondarySubjectStreams[subject];
  if (!specificStreams) {
    return tr(language, 'commonSubject');
  }

  const streams = streamsForSubject(subject, school);
  return streams.length > 0 ? streams.map((stream) => secondaryStreamLabel(language, stream)).join('، ') : '-';
}

function subjectOptionLabel(language: Language, subject: Subject, school?: SchoolRecord) {
  const subjectName = subjectNames[language][subject];
  const scope = subjectScopeLabel(language, subject, school);

  return scope ? `${subjectName} - ${scope}` : subjectName;
}

function homeworkDifficultyLabelKey(difficulty: HomeworkDifficulty) {
  if (difficulty === 'easy') {
    return 'easyHomework';
  }

  if (difficulty === 'medium') {
    return 'mediumHomework';
  }

  return 'hardHomework';
}

function RoleLabel({ role, language }: { role: Role; language: Language }) {
  const Icon = roleIcons[role];

  return (
    <span className={`role-label ${role}`}>
      <Icon size={16} aria-hidden="true" />
      <span>{roleNames[language][role]}</span>
    </span>
  );
}

function LanguageMenu({
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

function subjectIndex(subject: Subject) {
  const index = subjectOrder.indexOf(subject);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortExercises(left: Exercise, right: Exercise) {
  return (
    subjectIndex(left.subject) - subjectIndex(right.subject) ||
    (left.schoolYear ?? 0) - (right.schoolYear ?? 0) ||
    (left.stream ?? '').localeCompare(right.stream ?? '') ||
    (left.classGroup ?? '').localeCompare(right.classGroup ?? '', undefined, { numeric: true, sensitivity: 'base' }) ||
    left.dueDate.localeCompare(right.dueDate) ||
    left.title.localeCompare(right.title)
  );
}

function exerciseSubjectGroups(exercises: Exercise[]) {
  const grouped = new Map<Subject, Exercise[]>();

  [...exercises].sort(sortExercises).forEach((exercise) => {
    grouped.set(exercise.subject, [...(grouped.get(exercise.subject) ?? []), exercise]);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => subjectIndex(left) - subjectIndex(right))
    .map(([subject, subjectExercises]) => ({ subject, exercises: subjectExercises }));
}

function streamIndex(stream: SecondaryStream | '') {
  if (!stream) {
    return Number.MAX_SAFE_INTEGER;
  }

  const index = secondaryStreams.indexOf(stream);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function yearIndex(year: number | '') {
  return year === '' ? Number.MAX_SAFE_INTEGER : year;
}

function groupExercisesByTeacherTarget(exercises: Exercise[]) {
  const yearMap = new Map<number | '', Map<SecondaryStream | '', Map<string, Exercise[]>>>();

  [...exercises].sort(sortExercises).forEach((exercise) => {
    const year = exercise.schoolYear ?? '';
    const stream = exercise.stream ?? '';
    const classGroup = exercise.classGroup?.trim() || '-';
    const streamMap = yearMap.get(year) ?? new Map<SecondaryStream | '', Map<string, Exercise[]>>();
    const classMap = streamMap.get(stream) ?? new Map<string, Exercise[]>();
    classMap.set(classGroup, [...(classMap.get(classGroup) ?? []), exercise]);
    streamMap.set(stream, classMap);
    yearMap.set(year, streamMap);
  });

  return [...yearMap.entries()]
    .sort(([left], [right]) => yearIndex(left) - yearIndex(right))
    .map(([schoolYear, streamMap]) => {
      const streams = [...streamMap.entries()]
        .sort(([left], [right]) => streamIndex(left) - streamIndex(right))
        .map(([stream, classMap]) => ({
          stream,
          count: [...classMap.values()].reduce((total, groupExercises) => total + groupExercises.length, 0),
          classes: [...classMap.entries()]
            .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
            .map(([classGroup, classExercises]) => ({ classGroup, exercises: classExercises }))
        }));

      return {
        schoolYear,
        count: streams.reduce((total, streamGroup) => total + streamGroup.count, 0),
        streams
      };
    });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00`);
}

function weekBounds(reference = new Date()) {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isIsoInCurrentWeek(value?: string) {
  if (!value) {
    return false;
  }

  const date = dateFromIso(value);
  const { start, end } = weekBounds();
  return date >= start && date <= end;
}

function weekRangeLabel(language: Language) {
  const { start, end } = weekBounds();
  const formatter = new Intl.DateTimeFormat(localeNames[language], { day: 'numeric', month: 'short' });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function monthLabel(language: Language, key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(localeNames[language], { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function formatDateTime(language: Language, value?: string | Date | null) {
  if (!value) {
    return '-';
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function announcementExpiresAt(announcement: Announcement) {
  const createdAt = Date.parse(announcement.createdAt);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return new Date(createdAt + ANNOUNCEMENT_ACTIVE_MS);
}

function isAnnouncementArchived(announcement: Announcement, now = Date.now()) {
  const expiresAt = announcementExpiresAt(announcement);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

function canViewAnnouncementArchive(user: PlatformUser) {
  return user.role === 'admin' || user.role === 'director';
}

function noteExpiresAt(note: TeacherNote) {
  const createdAt = Date.parse(note.createdAt);
  if (Number.isNaN(createdAt)) {
    return null;
  }

  return new Date(createdAt + NOTE_ACTIVE_MS);
}

function isNoteArchived(note: TeacherNote, now = Date.now()) {
  const expiresAt = noteExpiresAt(note);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

function isPastExercise(exercise: Exercise) {
  return Boolean(exercise.dueDate && exercise.dueDate < todayIso());
}

function groupExercisesByMonth(exercises: Exercise[], language: Language) {
  const grouped = new Map<string, Exercise[]>();

  [...exercises].sort((left, right) => right.dueDate.localeCompare(left.dueDate)).forEach((exercise) => {
    const date = exercise.dueDate || exercise.createdAt || todayIso();
    const key = date.slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), exercise]);
  });

  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, monthExercises]) => ({ key, label: monthLabel(language, key), exercises: monthExercises }));
}

function targetStudentsForExercise(data: PlatformData, exercise: Exercise) {
  return data.users.filter(
    (user) =>
      user.role === 'student' &&
      user.status === 'active' &&
      exerciseMatchesStudent(exercise, user)
  );
}

function isExerciseCompletedBy(data: PlatformData, studentId: string, exerciseId: string) {
  return Boolean(data.completions[studentId]?.includes(exerciseId));
}

function completionDateFor(data: PlatformData, studentId: string, exercise: Exercise) {
  return data.completionDates[studentId]?.[exercise.id];
}

function isExerciseCompletedThisWeek(data: PlatformData, studentId: string, exercise: Exercise) {
  if (!isExerciseCompletedBy(data, studentId, exercise.id)) {
    return false;
  }

  const completedAt = completionDateFor(data, studentId, exercise);
  return completedAt ? isIsoInCurrentWeek(completedAt) : isIsoInCurrentWeek(exercise.dueDate);
}

function completionStatsForExercise(data: PlatformData, exercise: Exercise) {
  const students = targetStudentsForExercise(data, exercise);
  const completed = students.filter((student) => isExerciseCompletedBy(data, student.id, exercise.id)).length;
  const total = students.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, rate };
}

function feedbackForStudent(data: PlatformData, studentId: string, exerciseId: string) {
  return data.feedback[studentId]?.[exerciseId];
}

function feedbackStatsForExercise(data: PlatformData, exercise: Exercise) {
  const students = targetStudentsForExercise(data, exercise);
  const entries = students
    .map((student) => ({ student, feedback: feedbackForStudent(data, student.id, exercise.id) }))
    .filter((entry): entry is { student: PlatformUser; feedback: HomeworkFeedback } => Boolean(entry.feedback));
  const easy = entries.filter((entry) => entry.feedback.difficulty === 'easy').length;
  const medium = entries.filter((entry) => entry.feedback.difficulty === 'medium').length;
  const hard = entries.filter((entry) => entry.feedback.difficulty === 'hard').length;
  const notes = entries.filter((entry) => entry.feedback.note?.trim());

  return { easy, medium, hard, notes };
}

function completionRateForExercises(data: PlatformData, exercises: Exercise[]) {
  return exercises.reduce(
    (summary, exercise) => {
      const stats = completionStatsForExercise(data, exercise);
      return {
        total: summary.total + stats.total,
        completed: summary.completed + stats.completed
      };
    },
    { total: 0, completed: 0 }
  );
}

function topTeacherByActivity(data: PlatformData, exercises: Exercise[], language: Language) {
  const counts = new Map<string, number>();
  exercises.forEach((exercise) => counts.set(exercise.teacherId, (counts.get(exercise.teacherId) ?? 0) + 1));
  const [teacherId, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];
  const teacher = data.users.find((user) => user.id === teacherId);

  return {
    name: teacher ? teacher.name : tr(language, 'noTeacherActivity'),
    count: count ?? 0
  };
}

function topSubjectByHomework(exercises: Exercise[], language: Language) {
  const counts = new Map<Subject, number>();
  exercises.forEach((exercise) => counts.set(exercise.subject, (counts.get(exercise.subject) ?? 0) + 1));
  const [subject, count] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

  return {
    name: subject ? subjectNames[language][subject] : tr(language, 'noSubjectActivity'),
    count: count ?? 0
  };
}

function reportLinesForDirector(data: PlatformData, currentUser: PlatformUser, language: Language) {
  const exercises = scopedExercises(data, currentUser);
  const weeklyExercises = exercises.filter((exercise) => isIsoInCurrentWeek(exercise.dueDate));
  const weeklyRate = completionRateForExercises(data, weeklyExercises);
  const overallRate = completionRateForExercises(data, exercises);
  const topTeacher = topTeacherByActivity(data, exercises, language);
  const topSubject = topSubjectByHomework(exercises, language);
  const percent = weeklyRate.total > 0 ? Math.round((weeklyRate.completed / weeklyRate.total) * 100) : 0;
  const overallPercent = overallRate.total > 0 ? Math.round((overallRate.completed / overallRate.total) * 100) : 0;

  return [
    `${tr(language, 'weeklyReportSummary')}: ${weekRangeLabel(language)}`,
    `${tr(language, 'totalExercises')}: ${weeklyExercises.length}`,
    `${tr(language, 'topTeacher')}: ${topTeacher.name} (${topTeacher.count})`,
    `${tr(language, 'topSubject')}: ${topSubject.name} (${topSubject.count})`,
    `${tr(language, 'completionRate')}: ${percent}%`,
    `${tr(language, 'generalCompletion')}: ${overallPercent}%`
  ];
}

function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign
) {
  const words = text.split(/\s+/);
  let line = '';
  let nextY = y;

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      context.fillText(line, x, nextY);
      line = word;
      nextY += lineHeight;
      return;
    }

    line = candidate;
  });

  if (line) {
    context.fillText(line, x, nextY);
    nextY += lineHeight;
  }

  context.textAlign = align;
  return nextY;
}

function canvasToPdfBlob(canvas: HTMLCanvasElement) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const imageBase64 = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
  const imageBinary = atob(imageBase64);
  const imageBytes = new Uint8Array(imageBinary.length);

  for (let index = 0; index < imageBinary.length; index += 1) {
    imageBytes[index] = imageBinary.charCodeAt(index);
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let offset = 0;

  const append = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    offset += bytes.length;
  };

  const addObject = (id: number, body: string) => {
    offsets[id] = offset;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };

  append('%PDF-1.4\n');
  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );

  offsets[4] = offset;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  append(imageBytes);
  append('\nendstream\nendobj\n');

  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  addObject(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);

  const xrefOffset = offset;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (let id = 1; id <= 5; id += 1) {
    append(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfBytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let position = 0;
  chunks.forEach((chunk) => {
    pdfBytes.set(chunk, position);
    position += chunk.length;
  });

  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

function createReportPdfBlob(title: string, lines: string[], language: Language) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;

  const context = canvas.getContext('2d');
  if (!context) {
    return new Blob([], { type: 'application/pdf' });
  }

  const isRtl = language === 'ar';
  const margin = 96;
  const contentWidth = canvas.width - margin * 2;
  const textX = isRtl ? canvas.width - margin : margin;
  const align: CanvasTextAlign = isRtl ? 'right' : 'left';

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#006233';
  context.fillRect(0, 0, canvas.width, 18);
  context.fillStyle = '#d21034';
  context.fillRect(0, 18, canvas.width, 7);
  context.direction = isRtl ? 'rtl' : 'ltr';
  context.textAlign = align;
  context.textBaseline = 'top';

  context.fillStyle = '#006233';
  context.font = '700 48px "Segoe UI", Tahoma, Arial, sans-serif';
  let y = drawWrappedCanvasText(context, title, textX, 86, contentWidth, 64, align);

  context.fillStyle = '#5f7168';
  context.font = '600 26px "Segoe UI", Tahoma, Arial, sans-serif';
  y = drawWrappedCanvasText(context, weekRangeLabel(language), textX, y + 12, contentWidth, 40, align);

  context.fillStyle = '#111f18';
  context.font = '600 31px "Segoe UI", Tahoma, Arial, sans-serif';
  y += 46;

  lines.forEach((line, index) => {
    const cardTop = y - 14;
    context.fillStyle = index % 2 === 0 ? '#f4f8f5' : '#ffffff';
    context.strokeStyle = '#dbe8df';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(margin, cardTop, contentWidth, 76, 12);
    context.fill();
    context.stroke();

    context.fillStyle = '#111f18';
    drawWrappedCanvasText(context, line, textX, y, contentWidth - 34, 40, align);
    y += 92;
  });

  context.fillStyle = '#006233';
  context.font = '700 24px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(new Date().toLocaleDateString(localeNames[language]), textX, canvas.height - 96);

  return canvasToPdfBlob(canvas);
}

function cloneSeedData(): PlatformData {
  return JSON.parse(JSON.stringify(seedData)) as PlatformData;
}

function upsertPushToken(data: PlatformData, userId: string, token: string): PlatformData {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return data;
  }

  const nextRecord: PushTokenRecord = {
    token: trimmedToken,
    platform: Capacitor.getPlatform(),
    updatedAt: new Date().toISOString()
  };
  const currentTokens = data.pushTokens[userId] ?? [];
  const nextTokens = [nextRecord, ...currentTokens.filter((record) => record.token !== trimmedToken)].slice(0, 5);

  return {
    ...data,
    pushTokens: {
      ...data.pushTokens,
      [userId]: nextTokens
    }
  };
}

function normalizePlatformData(value: Partial<PlatformData> | null | undefined): PlatformData {
  const fallback = cloneSeedData();
  const source = value ?? {};

  const normalized = {
    ...fallback,
    ...source,
    schools: Array.isArray(source.schools)
      ? source.schools.map((school) =>
          school.stage === 'secondary' && (!Array.isArray(school.streams) || school.streams.length === 0)
            ? { ...school, streams: [...secondaryStreams] }
            : school
        )
      : fallback.schools,
    users: Array.isArray(source.users) ? source.users : fallback.users,
    exercises: Array.isArray(source.exercises) ? source.exercises : fallback.exercises,
    announcements: Array.isArray(source.announcements) ? source.announcements : fallback.announcements,
    notes: Array.isArray(source.notes) ? source.notes : fallback.notes,
    completions: source.completions && typeof source.completions === 'object' ? source.completions : fallback.completions,
    completionDates:
      source.completionDates && typeof source.completionDates === 'object' ? source.completionDates : fallback.completionDates,
    feedback: source.feedback && typeof source.feedback === 'object' ? source.feedback : fallback.feedback,
    pushTokens: source.pushTokens && typeof source.pushTokens === 'object' ? source.pushTokens : fallback.pushTokens,
    deletedSchoolIds: Array.isArray(source.deletedSchoolIds) ? uniqueStrings(source.deletedSchoolIds.filter((id): id is string => typeof id === 'string')) : fallback.deletedSchoolIds,
    settings: {
      ...fallback.settings,
      ...(source.settings ?? {})
    }
  };

  return applyDeletedSchoolTombstones(purgeExpiredTrashedSchools(normalized));
}

async function fetchSharedData() {
  if (window.location.protocol === 'file:' && !REMOTE_STATE_ENDPOINT.startsWith('http')) {
    return null;
  }

  const response = await fetch(REMOTE_STATE_ENDPOINT, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Shared data request failed with ${response.status}`);
  }

  const payload = (await response.json()) as { data?: PlatformData };
  return normalizePlatformData(payload.data);
}

async function saveSharedData(data: PlatformData) {
  if (window.location.protocol === 'file:' && !REMOTE_STATE_ENDPOINT.startsWith('http')) {
    return;
  }

  const response = await fetch(REMOTE_STATE_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data })
  });

  if (!response.ok) {
    throw new Error(`Shared data save failed with ${response.status}`);
  }
}

function hasUserData(data: PlatformData) {
  return (
    data.schools.length > 0 ||
    data.users.length > 1 ||
    data.exercises.length > 0 ||
    data.announcements.length > 0 ||
    data.notes.length > 0 ||
    data.deletedSchoolIds.length > 0 ||
    Object.keys(data.completions).length > 0 ||
    Object.keys(data.completionDates).length > 0 ||
    Object.keys(data.feedback).length > 0
  );
}

function isSeedOnlyData(data: PlatformData) {
  return (
    data.schools.length === 0 &&
    data.exercises.length === 0 &&
    data.announcements.length === 0 &&
    data.notes.length === 0 &&
    data.users.length === 1 &&
    data.users[0]?.id === seedData.users[0].id &&
    data.deletedSchoolIds.length === 0 &&
    Object.keys(data.completions).length === 0 &&
    Object.keys(data.completionDates).length === 0 &&
    Object.keys(data.feedback).length === 0
  );
}

async function promoteLocalDataIfRemoteIsEmpty(sharedData: PlatformData, localData: PlatformData) {
  if (isSeedOnlyData(sharedData) && hasUserData(localData)) {
    await saveSharedData(localData);
    return localData;
  }

  const deletedSchoolIds = uniqueStrings([...sharedData.deletedSchoolIds, ...localData.deletedSchoolIds]);
  if (deletedSchoolIds.length !== sharedData.deletedSchoolIds.length) {
    const mergedData = applyDeletedSchoolTombstones({ ...sharedData, deletedSchoolIds });
    await saveSharedData(mergedData);
    return mergedData;
  }

  return sharedData;
}

function isLanguage(value: string | null): value is Language {
  return value === 'ar' || value === 'fr' || value === 'en';
}

function loadLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : 'ar';
}

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return isTheme(stored) ? stored : 'light';
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'director' || value === 'teacher' || value === 'student';
}

function loadRememberedAccounts(): RememberedAccount[] {
  try {
    const stored = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();

    return parsed
      .filter(
        (item): item is RememberedAccount =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.email === 'string' &&
          isRole(item.role)
      )
      .filter((item) => {
        const idKey = `id:${item.id}`;
        const emailKey = `email:${item.email.toLowerCase()}`;
        if (seen.has(idKey) || seen.has(emailKey)) {
          return false;
        }
        seen.add(idKey);
        seen.add(emailKey);
        return true;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

function rememberedAccountFromUser(account: PlatformUser): RememberedAccount {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };
}

function mergeRememberedAccount(previous: RememberedAccount[], account: PlatformUser) {
  const nextAccount = rememberedAccountFromUser(account);
  return [
    nextAccount,
    ...previous.filter((item) => item.id !== account.id && item.email.toLowerCase() !== account.email.toLowerCase())
  ].slice(0, 8);
}

function rememberedAccountListsEqual(left: RememberedAccount[], right: RememberedAccount[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function saveRememberedAccounts(accounts: RememberedAccount[]) {
  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function rememberStoredAccount(account: PlatformUser) {
  const next = mergeRememberedAccount(loadRememberedAccounts(), account);
  saveRememberedAccounts(next);
  return next;
}

function forgetStoredAccount(account: PlatformUser) {
  const next = loadRememberedAccounts().filter(
    (item) => item.id !== account.id && item.email.toLowerCase() !== account.email.toLowerCase()
  );
  saveRememberedAccounts(next);
  return next;
}

function pruneRememberedAccounts(users: PlatformUser[]) {
  const next = loadRememberedAccounts().filter((remembered) =>
    users.some((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase())
  );

  saveRememberedAccounts(next);
  return next;
}

function loadData(): PlatformData {
  localStorage.removeItem('school_platform_data_v1');
  localStorage.removeItem('school_platform_session_v1');

  const stored = localStorage.getItem(DATA_KEY);
  if (!stored) {
    return cloneSeedData();
  }

  try {
    const parsed = JSON.parse(stored) as PlatformData;
    return normalizePlatformData(parsed);
  } catch {
    return cloneSeedData();
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function randomIndex(max: number) {
  if (max <= 0) {
    return 0;
  }

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function generateAccountCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const alphabet = `${letters}${digits}`;
  const characters = [
    letters[randomIndex(letters.length)],
    digits[randomIndex(digits.length)],
    ...Array.from({ length: 4 }, () => alphabet[randomIndex(alphabet.length)])
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}

function normalizeEmailDomain(domain: string) {
  return domain.replace(/^@/, '').trim().toLowerCase();
}

function compactEmailLocalPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function generateSchoolEmail(name: string, role: 'teacher' | 'student', domain: string, users: PlatformUser[]) {
  const emailDomain = normalizeEmailDomain(domain);
  const localBase = compactEmailLocalPart(name) || role;
  const usedEmails = new Set(users.map((user) => user.email.toLowerCase()));
  let suffix = 0;
  let email = `${localBase}@${emailDomain}`;

  while (usedEmails.has(email.toLowerCase())) {
    suffix += 1;
    email = `${localBase}${suffix}@${emailDomain}`;
  }

  return email;
}

function isSubject(value: unknown): value is Subject {
  return typeof value === 'string' && subjectOrder.includes(value as Subject);
}

function readAttachmentFromInput(
  event: ChangeEvent<HTMLInputElement>,
  onReady: (attachment: UploadedAttachment) => void,
  onTooLarge: () => void
) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    event.target.value = '';
    onTooLarge();
    return;
  }

  const reader = new FileReader();
  reader.onload = () =>
    onReady({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: String(reader.result)
    });
  reader.readAsDataURL(file);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sortedCredentialUsers(users: PlatformUser[], role: 'teacher' | 'student') {
  return users
    .filter((user) => user.role === role)
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }));
}

function printCredentialTable(language: Language, title: string, schoolName: string, users: PlatformUser[]) {
  if (typeof document === 'undefined') {
    return;
  }

  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const printedAt = new Intl.DateTimeFormat(localeNames[language], { dateStyle: 'medium' }).format(new Date());
  const rows = users
    .map(
      (user, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(user.name)}</td>
          <td dir="ltr">${escapeHtml(user.email)}</td>
          <td dir="ltr">${escapeHtml(user.password)}</td>
        </tr>`
    )
    .join('');
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.inset = 'auto 0 0 auto';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument ?? frame.contentWindow?.document;
  if (!frameDocument || !frame.contentWindow) {
    frame.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write(`<!doctype html>
    <html lang="${language}" dir="${direction}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111827; font-family: Arial, Tahoma, sans-serif; direction: ${direction}; }
          header { border-bottom: 3px solid #006233; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0 0 6px; color: #006233; font-size: 22px; }
          p { margin: 0; color: #4b5563; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #d1d5db; padding: 9px 8px; text-align: start; vertical-align: middle; }
          th { background: #f3f4f6; color: #111827; font-weight: 700; }
          tbody tr:nth-child(even) td { background: #fafafa; }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(schoolName)} - ${escapeHtml(printedAt)}</p>
        </header>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(tr(language, 'fullName'))}</th>
              <th>${escapeHtml(tr(language, 'email'))}</th>
              <th>${escapeHtml(tr(language, 'accountCode'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  }, 120);
}

function getSchool(data: PlatformData, user?: PlatformUser) {
  if (!user?.schoolId) {
    return undefined;
  }

  return data.schools.find((school) => school.id === user.schoolId);
}

function schoolIsTrashed(school?: SchoolRecord) {
  return Boolean(school?.deletedAt);
}

function schoolTrashExpiresAt(school: SchoolRecord) {
  if (!school.deletedAt) {
    return null;
  }

  const deletedAt = Date.parse(school.deletedAt);
  if (Number.isNaN(deletedAt)) {
    return new Date();
  }

  return new Date(deletedAt + SCHOOL_TRASH_RETENTION_MS);
}

function schoolTrashIsExpired(school: SchoolRecord, now = Date.now()) {
  const expiresAt = schoolTrashExpiresAt(school);
  return Boolean(expiresAt && expiresAt.getTime() <= now);
}

function userSchoolIsTrashed(data: PlatformData, user: PlatformUser) {
  if (!user.schoolId) {
    return false;
  }

  return schoolIsTrashed(data.schools.find((school) => school.id === user.schoolId));
}

function canAuthenticateUser(data: PlatformData, user: PlatformUser) {
  return user.status === 'active' && !userSchoolIsTrashed(data, user);
}

function userCanSeeSchool(user: PlatformUser, school: SchoolRecord) {
  if (schoolIsTrashed(school)) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return user.schoolId === school.id;
}

function scopedUsers(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.users;
  }

  if (user.role === 'director') {
    return data.users.filter((candidate) => candidate.schoolId === user.schoolId);
  }

  return data.users.filter((candidate) => candidate.id === user.id);
}

function scopedExercises(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.exercises;
  }

  if (user.role === 'director') {
    return data.exercises.filter((exercise) => exercise.schoolId === user.schoolId);
  }

  if (user.role === 'teacher') {
    return data.exercises.filter(
      (exercise) =>
        exercise.schoolId === user.schoolId &&
        exercise.subject === teacherSubjectForYear(user, exercise.schoolYear) &&
        exerciseMatchesTeacherAssignment(exercise, user)
    );
  }

  return data.exercises.filter((exercise) => exerciseMatchesStudent(exercise, user));
}

function scopedAnnouncements(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.announcements;
  }

  if (!user.schoolId) {
    return [];
  }

  return data.announcements.filter((announcement) => announcement.schoolId === user.schoolId);
}

function noteMatchesStudent(note: TeacherNote, user: PlatformUser) {
  if (user.role !== 'student') {
    return false;
  }

  const yearMatches = note.schoolYear === undefined || note.schoolYear === user.schoolYear;
  const streamMatches = note.stream === undefined || note.stream === user.stream;
  const classMatches = note.classGroup === undefined || sameClassGroup(note.classGroup, user.classGroup ?? '');

  return note.schoolId === user.schoolId && note.stage === user.stage && yearMatches && streamMatches && classMatches;
}

function scopedNotes(data: PlatformData, user: PlatformUser) {
  if (user.role === 'admin') {
    return data.notes;
  }

  if (user.role === 'director') {
    return data.notes.filter((note) => note.schoolId === user.schoolId);
  }

  if (user.role === 'teacher') {
    return data.notes.filter((note) => note.teacherId === user.id);
  }

  return data.notes.filter((note) => noteMatchesStudent(note, user));
}

function defaultView(role: Role): View {
  if (role === 'student') {
    return 'exercises';
  }

  return 'overview';
}

function canToggleUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return currentUser.role === 'director' && target.schoolId === currentUser.schoolId && (target.role === 'teacher' || target.role === 'student');
}

function canEditUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return currentUser.role === 'director' && target.schoolId === currentUser.schoolId && (target.role === 'teacher' || target.role === 'student');
}

function canDeleteUser(currentUser: PlatformUser, target: PlatformUser) {
  if (currentUser.id === target.id) {
    return false;
  }

  if (currentUser.role === 'admin') {
    return true;
  }

  return currentUser.role === 'director' && target.schoolId === currentUser.schoolId && (target.role === 'teacher' || target.role === 'student');
}

function deleteUserRecords(previous: PlatformData, target: PlatformUser): PlatformData {
  const removedExerciseIds =
    target.role === 'teacher' ? previous.exercises.filter((exercise) => exercise.teacherId === target.id).map((exercise) => exercise.id) : [];

  return {
    ...previous,
    users: previous.users.filter((user) => user.id !== target.id),
    schools: previous.schools.map((school) => (school.directorId === target.id ? { ...school, directorId: undefined } : school)),
    exercises: previous.exercises.filter((exercise) => exercise.teacherId !== target.id),
    announcements: previous.announcements.filter((announcement) => announcement.authorId !== target.id),
    notes: previous.notes.filter((note) => note.teacherId !== target.id),
    completions: Object.fromEntries(
      Object.entries(previous.completions)
        .filter(([userId]) => userId !== target.id)
        .map(([userId, done]) => [userId, done.filter((exerciseId) => !removedExerciseIds.includes(exerciseId))])
    ),
    completionDates: Object.fromEntries(
      Object.entries(previous.completionDates)
        .filter(([userId]) => userId !== target.id)
        .map(([userId, dates]) => [
          userId,
          Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !removedExerciseIds.includes(exerciseId)))
        ])
    ),
    feedback: Object.fromEntries(
      Object.entries(previous.feedback)
        .filter(([userId]) => userId !== target.id)
        .map(([userId, feedback]) => [
          userId,
          Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !removedExerciseIds.includes(exerciseId)))
        ])
    ),
    pushTokens: Object.fromEntries(Object.entries(previous.pushTokens).filter(([userId]) => userId !== target.id))
  };
}

function applyDeletedSchoolTombstones(data: PlatformData): PlatformData {
  const deletedSchoolIds = new Set(data.deletedSchoolIds);
  if (deletedSchoolIds.size === 0) {
    return data;
  }

  const removedUserIds = new Set(data.users.filter((user) => user.schoolId && deletedSchoolIds.has(user.schoolId)).map((user) => user.id));
  const removedExerciseIds = new Set(data.exercises.filter((exercise) => deletedSchoolIds.has(exercise.schoolId)).map((exercise) => exercise.id));

  return {
    ...data,
    schools: data.schools.filter((school) => !deletedSchoolIds.has(school.id)),
    users: data.users.filter((user) => !user.schoolId || !deletedSchoolIds.has(user.schoolId)),
    exercises: data.exercises.filter((exercise) => !deletedSchoolIds.has(exercise.schoolId)),
    announcements: data.announcements.filter((announcement) => !deletedSchoolIds.has(announcement.schoolId)),
    notes: data.notes.filter((note) => !deletedSchoolIds.has(note.schoolId)),
    completions: Object.fromEntries(
      Object.entries(data.completions)
        .filter(([userId]) => !removedUserIds.has(userId))
        .map(([userId, done]) => [userId, done.filter((exerciseId) => !removedExerciseIds.has(exerciseId))])
    ),
    completionDates: Object.fromEntries(
      Object.entries(data.completionDates)
        .filter(([userId]) => !removedUserIds.has(userId))
        .map(([userId, dates]) => [
          userId,
          Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !removedExerciseIds.has(exerciseId)))
        ])
    ),
    feedback: Object.fromEntries(
      Object.entries(data.feedback)
        .filter(([userId]) => !removedUserIds.has(userId))
        .map(([userId, feedback]) => [
          userId,
          Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !removedExerciseIds.has(exerciseId)))
        ])
    ),
    pushTokens: Object.fromEntries(Object.entries(data.pushTokens).filter(([userId]) => !removedUserIds.has(userId)))
  };
}

function deleteSchoolRecords(previous: PlatformData, target: SchoolRecord): PlatformData {
  return applyDeletedSchoolTombstones({
    ...previous,
    deletedSchoolIds: uniqueStrings([...previous.deletedSchoolIds, target.id])
  });
}

function trashSchoolRecords(previous: PlatformData, target: SchoolRecord): PlatformData {
  return {
    ...previous,
    schools: previous.schools.map((school) =>
      school.id === target.id ? { ...school, deletedAt: school.deletedAt ?? new Date().toISOString() } : school
    )
  };
}

function restoreSchoolRecords(previous: PlatformData, target: SchoolRecord): PlatformData {
  return {
    ...previous,
    schools: previous.schools.map((school) => {
      if (school.id !== target.id) {
        return school;
      }

      const { deletedAt: _deletedAt, ...restoredSchool } = school;
      return restoredSchool;
    })
  };
}

function purgeExpiredTrashedSchools(data: PlatformData, now = Date.now()): PlatformData {
  const expiredSchools = data.schools.filter((school) => schoolIsTrashed(school) && schoolTrashIsExpired(school, now));
  if (expiredSchools.length === 0) {
    return data;
  }

  return expiredSchools.reduce((nextData, school) => deleteSchoolRecords(nextData, school), data);
}

function makeAccountEditState(target: PlatformUser, data: PlatformData): AccountEditState {
  const school = getSchool(data, target);
  const classGroup = target.classGroup?.trim() ?? '';
  const classChoice = defaultClassGroups.includes(classGroup) ? classGroup : classGroup ? 'custom' : '1';
  const yearStreamClassGroups = assignedYearStreamClassGroups(target);
  const firstStreamByYear = Object.fromEntries(
    Object.entries(yearStreamClassGroups).map(([year, streams]) => [year, (Object.keys(streams)[0] as SecondaryStream | undefined) ?? ''])
  ) as Record<string, SecondaryStream | ''>;

  return {
    id: target.id,
    role: target.role,
    name: target.name,
    email: target.email,
    password: target.password,
    status: target.status,
    schoolName: school?.name ?? '',
    domain: school?.domain ?? '',
    stage: target.stage ?? school?.stage ?? 'middle',
    subject: target.subject ?? 'math',
    subjectsByYear: Object.fromEntries(
      Object.entries(assignedYearSubjects(target)).map(([year, subject]) => [year, subject])
    ) as Record<string, Subject>,
    schoolYear: target.schoolYear ?? 1,
    classChoice,
    customClassGroup: classChoice === 'custom' ? classGroup : '',
    stream: target.stream ?? '',
    schoolYears: assignedSchoolYears(target).length > 0 ? assignedSchoolYears(target) : [target.schoolYear ?? 1],
    yearClassGroups: assignedYearClassGroups(target),
    yearStreamClassGroups,
    streamChoiceByYear: firstStreamByYear,
    classChoiceByYear: {},
    customClassByYear: {}
  };
}

function App() {
  const [language, setLanguage] = useState<Language>(loadLanguage);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [data, setData] = useState<PlatformData>(loadData);
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  const [activeView, setActiveView] = useState<View>('overview');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('checking');
  const remoteLoadedRef = useRef(false);
  const remoteEnabledRef = useRef(false);
  const skipNextSharedSaveRef = useRef(false);

  const currentUser = data.users.find((user) => user.id === sessionUserId && canAuthenticateUser(data, user)) ?? null;
  const tabs = currentUser ? navItems[currentUser.role] : [];
  const safeView = tabs.some((tab) => tab.id === activeView) ? activeView : tabs[0]?.id ?? 'overview';
  const currentSchool = currentUser ? getSchool(data, currentUser) : undefined;

  const loginUser = (userId: string) => {
    localStorage.setItem(SESSION_KEY, userId);
    setSessionUserId(userId);
  };

  const logoutUser = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessionUserId(null);
  };

  const applySharedData = (nextData: PlatformData) => {
    setData((previous) => {
      if (JSON.stringify(previous) === JSON.stringify(nextData)) {
        return previous;
      }

      skipNextSharedSaveRef.current = true;
      return nextData;
    });
  };

  const refreshSharedData = async () => {
    try {
      setSyncStatus('checking');
      const sharedData = await fetchSharedData();
      if (!sharedData) {
        remoteEnabledRef.current = false;
        remoteLoadedRef.current = true;
        setSyncStatus('local');
        return data;
      }

      const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedData, data);
      remoteEnabledRef.current = true;
      remoteLoadedRef.current = true;
      applySharedData(nextData);
      setSyncStatus('shared');
      return nextData;
    } catch {
      remoteEnabledRef.current = false;
      remoteLoadedRef.current = true;
      setSyncStatus('local');
      return data;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSharedData = async () => {
      try {
        const sharedData = await fetchSharedData();
        if (cancelled) {
          return;
        }

        if (!sharedData) {
          remoteEnabledRef.current = false;
          setSyncStatus('local');
          return;
        }

        const nextData = await promoteLocalDataIfRemoteIsEmpty(sharedData, data);
        remoteEnabledRef.current = true;
        applySharedData(nextData);
        setSyncStatus('shared');
      } catch {
        if (!cancelled) {
          remoteEnabledRef.current = false;
          setSyncStatus('local');
        }
      } finally {
        if (!cancelled) {
          remoteLoadedRef.current = true;
        }
      }
    };

    loadSharedData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    if (skipNextSharedSaveRef.current) {
      skipNextSharedSaveRef.current = false;
      return;
    }

    if (!remoteLoadedRef.current || !remoteEnabledRef.current) {
      return;
    }

    setSyncStatus('saving');
    const saveTimer = window.setTimeout(() => {
      saveSharedData(data)
        .then(() => setSyncStatus('shared'))
        .catch(() => setSyncStatus('error'));
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [data]);

  useEffect(() => {
    if (!currentUser || syncStatus === 'checking' || syncStatus === 'saving') {
      return;
    }

    let cancelled = false;

    const refreshLatestSharedData = async () => {
      if (cancelled || !remoteEnabledRef.current || document.visibilityState === 'hidden') {
        return;
      }

      try {
        const sharedData = await fetchSharedData();
        if (!cancelled && sharedData) {
          remoteEnabledRef.current = true;
          remoteLoadedRef.current = true;
          applySharedData(sharedData);
          setSyncStatus('shared');
        }
      } catch {
        if (!cancelled) {
          setSyncStatus('error');
        }
      }
    };

    const refreshOnFocus = () => {
      refreshLatestSharedData();
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshLatestSharedData();
      }
    };

    const refreshTimer = window.setInterval(refreshLatestSharedData, SHARED_DATA_REFRESH_MS);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [currentUser?.id, syncStatus]);

  useEffect(() => {
    const purgeExpiredSchools = () => {
      setData((previous) => purgeExpiredTrashedSchools(previous));
    };

    purgeExpiredSchools();
    const purgeTimer = window.setInterval(purgeExpiredSchools, 60_000);
    return () => window.clearInterval(purgeTimer);
  }, []);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (sessionUserId) {
      localStorage.setItem(SESSION_KEY, sessionUserId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [sessionUserId]);

  useEffect(() => {
    if (!currentUser || syncStatus === 'checking' || !Capacitor.isNativePlatform()) {
      return;
    }

    let cancelled = false;
    const listenerHandles: Array<{ remove: () => Promise<void> }> = [];

    const registerForPush = async () => {
      try {
        let permissions = await PushNotifications.checkPermissions();
        if (permissions.receive === 'prompt') {
          permissions = await PushNotifications.requestPermissions();
        }

        if (permissions.receive !== 'granted') {
          return;
        }

        const registrationHandle = await PushNotifications.addListener('registration', (token: Token) => {
          if (!cancelled) {
            setData((previous) => upsertPushToken(previous, currentUser.id, token.value));
          }
        });
        listenerHandles.push(registrationHandle);

        const errorHandle = await PushNotifications.addListener('registrationError', () => undefined);
        listenerHandles.push(errorHandle);

        await PushNotifications.register();
      } catch {
        // Push registration is best effort; the website must still work normally without it.
      }
    };

    registerForPush();

    return () => {
      cancelled = true;
      listenerHandles.forEach((handle) => {
        handle.remove().catch(() => undefined);
      });
    };
  }, [currentUser?.id, syncStatus]);

  useEffect(() => {
    if (currentUser) {
      setActiveView(defaultView(currentUser.role));
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (sessionUserId && !currentUser) {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser, sessionUserId]);

  if (!currentUser) {
    return (
      <LoginPage
        data={data}
        language={language}
        theme={theme}
        onLanguageChange={setLanguage}
        onThemeChange={setTheme}
        onLogin={loginUser}
        onRefreshData={refreshSharedData}
        syncStatus={syncStatus}
      />
    );
  }

  const renderView = () => {
    switch (safeView) {
      case 'schools':
        return <SchoolsView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'users':
        return <UsersView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'school':
        return <SchoolProfileView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'exercises':
        return <ExercisesView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'announcements':
        return <AnnouncementsView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'notes':
        return <NotesView data={data} setData={setData} currentUser={currentUser} language={language} />;
      case 'settings':
        return (
          <SettingsView
            data={data}
            setData={setData}
            language={language}
            theme={theme}
            currentUser={currentUser}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
            onResetDemo={() => {
              setData(cloneSeedData());
              logoutUser();
            }}
          />
        );
      case 'overview':
      default:
        return <OverviewView data={data} currentUser={currentUser} language={language} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <School size={25} aria-hidden="true" />
          </div>
          <div>
            <strong>{tr(language, 'appTitle')}</strong>
            <span>{tr(language, 'appSubtitle')}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={safeView === item.id ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{tr(language, item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        <div className="scope-card">
          <span>{tr(language, 'visibleScope')}</span>
          <strong>
            <RoleLabel role={currentUser.role} language={language} />
          </strong>
          {currentSchool && <small>{currentSchool.name}</small>}
          {currentUser.stage && <small>{stageNames[language][currentUser.stage]}</small>}
          {assignedSchoolYears(currentUser).length > 0 && <small>{schoolYearsLabel(language, currentUser)}</small>}
          {assignedClassGroups(currentUser).length > 0 && (
            <small>
              {tr(language, currentUser.role === 'teacher' ? 'classGroups' : 'classGroup')}{' '}
              {currentUser.role === 'teacher' ? yearClassGroupsLabel(language, currentUser) : classGroupsLabel(currentUser)}
            </small>
          )}
          {currentUser.stream && <small>{secondaryStreamLabel(language, currentUser.stream, currentUser.schoolYear)}</small>}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p>{tr(language, safeView)}</p>
            <h1>{currentUser.name}</h1>
          </div>
          <div className="topbar-actions">
            <SyncIndicator status={syncStatus} language={language} />
            <LanguageMenu language={language} onLanguageChange={setLanguage} />
            <button
              className="icon-text-button"
              type="button"
              title={theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
              <span>{theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}</span>
            </button>
            <button className="button ghost" type="button" onClick={() => setLogoutOpen(true)}>
              <LogOut size={17} aria-hidden="true" />
              <span>{tr(language, 'logout')}</span>
            </button>
          </div>
        </header>

        {renderView()}
      </main>

      {logoutOpen && (
        <ConfirmDialog
          language={language}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false);
            logoutUser();
          }}
        />
      )}
    </div>
  );
}

function SyncIndicator({ status, language, compact = false }: { status: SyncStatus; language: Language; compact?: boolean }) {
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

type LoginProps = {
  data: PlatformData;
  language: Language;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onLogin: (userId: string) => void;
  onRefreshData: () => Promise<PlatformData>;
  syncStatus: SyncStatus;
};

function LoginPage({ data, language, theme, onLanguageChange, onThemeChange, onLogin, onRefreshData, syncStatus }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>(loadRememberedAccounts);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const visibleRememberedAccounts = rememberedAccounts
    .map((remembered) => data.users.find((user) => user.id === remembered.id || user.email.toLowerCase() === remembered.email.toLowerCase()))
    .filter((user): user is PlatformUser => Boolean(user && canAuthenticateUser(data, user)));

  useEffect(() => {
    const next = pruneRememberedAccounts(data.users);
    setRememberedAccounts((previous) => (rememberedAccountListsEqual(previous, next) ? previous : next));
  }, [data]);

  const rememberAccount = (account: PlatformUser) => {
    const next = rememberStoredAccount(account);
    setRememberedAccounts(next);
  };

  const loginWithRememberedAccount = (account: PlatformUser) => {
    if (!canAuthenticateUser(data, account)) {
      setError(tr(language, 'disabledAccount'));
      return;
    }

    rememberAccount(account);
    setEmail(account.email);
    setPassword('');
    setRememberMe(true);
    setError('');
    onLogin(account.id);
  };

  const forgetRememberedAccount = (account: PlatformUser) => {
    const next = forgetStoredAccount(account);
    setRememberedAccounts(next);
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const shouldRemember = rememberMe || formData.get('remember') === 'on';
    setIsSubmitting(true);
    const latestData = await onRefreshData();
    const account = latestData.users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
    setIsSubmitting(false);

    if (!account || account.password !== password) {
      setError(tr(language, 'invalidCredentials'));
      return;
    }

    if (!canAuthenticateUser(latestData, account)) {
      setError(tr(language, 'disabledAccount'));
      return;
    }

    if (shouldRemember) {
      rememberAccount(account);
    }

    setError('');
    onLogin(account.id);
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-corner-actions">
          <button
            className="corner-icon-button info-button"
            type="button"
            title={tr(language, 'appInfo')}
            aria-label={tr(language, 'appInfo')}
            onClick={() => setInfoOpen(true)}
          >
            <Info size={18} aria-hidden="true" />
          </button>
          <LanguageMenu language={language} onLanguageChange={onLanguageChange} variant="corner" />
          <button
            className="corner-icon-button"
            type="button"
            title={theme === 'dark' ? tr(language, 'lightMode') : tr(language, 'darkMode')}
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
        <div className="login-copy">
          <div className="login-hero">
            <h1 className="login-hero-title">
              <span>{tr(language, 'loginHeroTitle')}</span>
            </h1>
            <p className="login-hero-lead">{tr(language, 'loginHeroSubtitle')}</p>
            <p className="login-hero-copy">{tr(language, 'loginHeroText')}</p>
          </div>

          <SyncIndicator status={syncStatus} language={language} compact />

          {visibleRememberedAccounts.length > 0 && (
            <div className="remembered-box">
              <span className="remembered-title">{tr(language, 'rememberedAccounts')}</span>
              <div className="remembered-list">
                {visibleRememberedAccounts.map((account) => (
                  <div className="remembered-account" key={account.id}>
                    <button className="remembered-main" type="button" title={tr(language, 'useRememberedAccount')} onClick={() => loginWithRememberedAccount(account)}>
                      <Users size={17} aria-hidden="true" />
                      <span>
                        <strong>{account.name}</strong>
                        <small>{account.email}</small>
                      </span>
                    </button>
                    <button className="remembered-remove" type="button" title={tr(language, 'forgetAccount')} onClick={() => forgetRememberedAccount(account)}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form className="form-stack" onSubmit={submitLogin}>
            <label>
              <span>{tr(language, 'email')}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="off" />
            </label>
            <label>
              <span>{tr(language, 'password')}</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" />
            </label>
            <label className="remember-row">
              <input name="remember" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
              <span>{tr(language, 'rememberMe')}</span>
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="button primary wide" type="submit" disabled={isSubmitting}>
              <ShieldCheck size={18} aria-hidden="true" />
              <span>{tr(language, 'signIn')}</span>
            </button>
          </form>
        </div>
      </section>
      {infoOpen && <AppInfoDialog language={language} onClose={() => setInfoOpen(false)} />}
    </main>
  );
}

type CommonViewProps = {
  data: PlatformData;
  currentUser: PlatformUser;
  language: Language;
};

function OverviewView({ data, currentUser, language }: CommonViewProps) {
  const school = getSchool(data, currentUser);
  const users = scopedUsers(data, currentUser);
  const exercises = scopedExercises(data, currentUser);
  const activeCount = users.filter((user) => user.status === 'active').length;
  const disabledCount = users.filter((user) => user.status === 'disabled').length;
  const completed = currentUser.role === 'student' ? data.completions[currentUser.id]?.length ?? 0 : 0;
  const directorCompletion = currentUser.role === 'director' ? completionRateForExercises(data, exercises) : { total: 0, completed: 0 };
  const directorCompletionPercent = directorCompletion.total > 0 ? Math.round((directorCompletion.completed / directorCompletion.total) * 100) : 0;
  const topTeacher = currentUser.role === 'director' ? topTeacherByActivity(data, exercises, language) : null;
  const topSubject = currentUser.role === 'director' ? topSubjectByHomework(exercises, language) : null;

  return (
    <section className="content-grid">
      <div className="stats-grid">
        <StatCard icon={Users} label={tr(language, 'activeUsers')} value={activeCount.toString()} tone="teal" />
        <StatCard icon={CircleOff} label={tr(language, 'disabledUsers')} value={disabledCount.toString()} tone="amber" />
        <StatCard icon={BookOpen} label={tr(language, 'totalExercises')} value={exercises.length.toString()} tone="blue" />
        {currentUser.role === 'student' && (
          <StatCard icon={CheckCircle2} label={tr(language, 'completedExercises')} value={completed.toString()} tone="green" />
        )}
        {currentUser.role === 'director' && topTeacher && (
          <StatCard icon={Trophy} label={tr(language, 'topTeacher')} value={`${topTeacher.name} (${topTeacher.count})`} tone="green" />
        )}
        {currentUser.role === 'director' && topSubject && (
          <StatCard icon={BookOpen} label={tr(language, 'topSubject')} value={`${topSubject.name} (${topSubject.count})`} tone="blue" />
        )}
        {currentUser.role === 'director' && (
          <StatCard icon={BarChart3} label={tr(language, 'generalCompletion')} value={`${directorCompletionPercent}%`} tone="teal" />
        )}
      </div>

      <div className="panel overview-context">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'visibleScope')}</p>
            <h2>
              <RoleLabel role={currentUser.role} language={language} />
            </h2>
          </div>
          <LockKeyhole size={24} aria-hidden="true" />
        </div>
        <dl className="detail-list">
          {school && (
            <>
              <div>
                <dt>{tr(language, 'connectedSchool')}</dt>
                <dd>{school.name}</dd>
              </div>
              <div>
                <dt>{tr(language, 'connectedStage')}</dt>
                <dd>{stageNames[language][school.stage]}</dd>
              </div>
            </>
          )}
          {currentUser.subject && (
            <div>
              <dt>{tr(language, 'subject')}</dt>
              <dd>{currentUser.role === 'teacher' ? teacherSubjectsLabel(language, currentUser) : subjectNames[language][currentUser.subject]}</dd>
            </div>
          )}
          {assignedSchoolYears(currentUser).length > 0 && (
            <div>
              <dt>{currentUser.role === 'teacher' ? tr(language, 'schoolYears') : tr(language, 'schoolYear')}</dt>
              <dd>{schoolYearsLabel(language, currentUser)}</dd>
            </div>
          )}
          {assignedClassGroups(currentUser).length > 0 && (
            <div>
              <dt>{currentUser.role === 'teacher' ? tr(language, 'classGroups') : tr(language, 'classGroup')}</dt>
              <dd>{currentUser.role === 'teacher' ? yearClassGroupsLabel(language, currentUser) : classGroupsLabel(currentUser)}</dd>
            </div>
          )}
          {currentUser.stream && (
            <div>
              <dt>{tr(language, 'stream')}</dt>
              <dd>{secondaryStreamLabel(language, currentUser.stream, currentUser.schoolYear)}</dd>
            </div>
          )}
          <div>
            <dt>{tr(language, 'status')}</dt>
            <dd>{statusNames[language][currentUser.status]}</dd>
          </div>
        </dl>
      </div>
      {currentUser.role === 'director' && <DirectorWeeklyReport data={data} currentUser={currentUser} language={language} />}
    </section>
  );
}

function DirectorWeeklyReport({ data, currentUser, language }: CommonViewProps) {
  const lines = reportLinesForDirector(data, currentUser, language);
  const reportTitle = `${tr(language, 'weeklyDirectorReport')} - ${weekRangeLabel(language)}`;
  const downloadReport = () => {
    const blob = createReportPdfBlob(reportTitle, lines, language);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-report-${todayIso()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel overview-context">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'weeklyReportReady')}</p>
          <h2>{tr(language, 'weeklyDirectorReport')}</h2>
        </div>
        <CalendarDays size={24} aria-hidden="true" />
      </div>
      <div className="weekly-report">
        {lines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <button className="button primary" type="button" onClick={downloadReport}>
        <Download size={17} aria-hidden="true" />
        <span>{tr(language, 'sendWeeklyReport')}</span>
      </button>
    </div>
  );
}

function SchoolsView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const schools = data.schools.filter((school) => userCanSeeSchool(currentUser, school));
  const trashedSchools = currentUser.role === 'admin' ? data.schools.filter(schoolIsTrashed) : [];
  const [pendingDeleteSchool, setPendingDeleteSchool] = useState<SchoolRecord | null>(null);
  const [pendingForceDeleteSchool, setPendingForceDeleteSchool] = useState<SchoolRecord | null>(null);
  const canDeleteSchools = currentUser.role === 'admin';
  const columns = [tr(language, 'schoolName'), tr(language, 'stage'), tr(language, 'domain'), tr(language, 'city'), tr(language, 'director'), tr(language, 'users')];
  const trashColumns = [...columns, tr(language, 'deletedAt'), tr(language, 'deletesAt'), tr(language, 'actions')];

  if (canDeleteSchools) {
    columns.push(tr(language, 'actions'));
  }

  const deleteSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => trashSchoolRecords(previous, school));
    setPendingDeleteSchool(null);
  };

  const forceDeleteSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => deleteSchoolRecords(previous, school));
    setPendingForceDeleteSchool(null);
  };

  const restoreSchool = (school: SchoolRecord) => {
    if (!canDeleteSchools) {
      return;
    }

    setData((previous) => restoreSchoolRecords(previous, school));
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'allSchools')}</p>
            <h2>{tr(language, 'schools')}</h2>
          </div>
          <School size={24} aria-hidden="true" />
        </div>
        <ResponsiveTable columns={columns} emptyText={tr(language, 'noRecords')}>
          {schools.map((school) => {
            const director = data.users.find((user) => user.id === school.directorId);
            const userCount = data.users.filter((user) => user.schoolId === school.id).length;
            return (
              <tr key={school.id}>
                <td>{school.name}</td>
                <td>{stageNames[language][school.stage]}</td>
                <td>{school.domain}</td>
                <td>{school.city}</td>
                <td>{director?.name ?? '-'}</td>
                <td>{userCount}</td>
                {canDeleteSchools && (
                  <td>
                    <div className="table-actions">
                      <button className="icon-button danger" type="button" title={tr(language, 'delete')} onClick={() => setPendingDeleteSchool(school)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </ResponsiveTable>
      </div>
      {canDeleteSchools && (
        <div className="panel trash-panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'trashHint')}</p>
              <h2>{tr(language, 'schoolTrash')}</h2>
            </div>
            <Trash2 size={24} aria-hidden="true" />
          </div>
          <ResponsiveTable columns={trashColumns} emptyText={tr(language, 'noRecords')}>
            {trashedSchools.map((school) => {
              const director = data.users.find((user) => user.id === school.directorId);
              const userCount = data.users.filter((user) => user.schoolId === school.id).length;
              return (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>{stageNames[language][school.stage]}</td>
                  <td>{school.domain}</td>
                  <td>{school.city}</td>
                  <td>{director?.name ?? '-'}</td>
                  <td>{userCount}</td>
                  <td>{formatDateTime(language, school.deletedAt)}</td>
                  <td>{formatDateTime(language, schoolTrashExpiresAt(school))}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-button" type="button" title={tr(language, 'restoreSchool')} onClick={() => restoreSchool(school)}>
                        <RotateCcw size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button danger"
                        type="button"
                        title={tr(language, 'forceDelete')}
                        onClick={() => setPendingForceDeleteSchool(school)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </ResponsiveTable>
        </div>
      )}
      {pendingDeleteSchool && (
        <SchoolDeleteDialog
          school={pendingDeleteSchool}
          userCount={data.users.filter((user) => user.schoolId === pendingDeleteSchool.id).length}
          language={language}
          mode="trash"
          onCancel={() => setPendingDeleteSchool(null)}
          onConfirm={() => deleteSchool(pendingDeleteSchool)}
        />
      )}
      {pendingForceDeleteSchool && (
        <SchoolDeleteDialog
          school={pendingForceDeleteSchool}
          userCount={data.users.filter((user) => user.schoolId === pendingForceDeleteSchool.id).length}
          language={language}
          mode="permanent"
          onCancel={() => setPendingForceDeleteSchool(null)}
          onConfirm={() => forceDeleteSchool(pendingForceDeleteSchool)}
        />
      )}
    </section>
  );
}

function UsersView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'admin') {
    return <AdminUsersPanel data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'director') {
    return <DirectorUsersPanel data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  return (
    <section className="panel">
      <p className="empty-state">{tr(language, 'scopedData')}</p>
    </section>
  );
}

function AdminUsersPanel({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const [accountMode, setAccountMode] = useState<'create' | 'view'>('view');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    schoolName: '',
    stage: 'middle' as Stage,
    domain: '',
    city: ''
  });
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [directorEdit, setDirectorEdit] = useState<null | {
    id: string;
    schoolId: string;
    name: string;
    email: string;
    schoolName: string;
    stage: Stage;
    domain: string;
  }>(null);

  const createDirector = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (data.users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    const schoolId = makeId('school');
    const directorId = makeId('director');
    const domain = form.domain.replace(/^@/, '').trim();

    setData((previous) => ({
      ...previous,
      schools: [
        ...previous.schools,
        {
          id: schoolId,
          name: form.schoolName.trim(),
          stage: form.stage,
          domain,
          city: form.city.trim(),
          address: '',
          phone: '',
          directorId,
          streams: form.stage === 'secondary' ? [...secondaryStreams] : undefined
        }
      ],
      users: [
        ...previous.users,
        {
          id: directorId,
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'director',
          status: 'active',
          schoolId,
          stage: form.stage
        }
      ]
    }));

    setForm({ name: '', email: '', password: '', schoolName: '', stage: 'middle', domain: '', city: '' });
    setError('');
  };

  const toggleStatus = (target: PlatformUser) => {
    if (!canToggleUser(currentUser, target)) {
      return;
    }

    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) =>
        user.id === target.id ? { ...user, status: user.status === 'active' ? 'disabled' : 'active' } : user
      )
    }));
  };

  const deleteUser = (target: PlatformUser) => {
    if (!canDeleteUser(currentUser, target)) {
      return;
    }

    setData((previous) => deleteUserRecords(previous, target));
    if (editingUser?.id === target.id) {
      setEditingUser(null);
    }
  };

  const saveDirectorEdit = () => {
    if (!directorEdit) {
      return;
    }

    const normalizedEmail = directorEdit.email.trim().toLowerCase();
    if (data.users.some((user) => user.id !== directorEdit.id && user.email.toLowerCase() === normalizedEmail)) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((school) =>
        school.id === directorEdit.schoolId
          ? {
              ...school,
              name: directorEdit.schoolName.trim(),
              stage: directorEdit.stage,
              domain: directorEdit.domain.replace(/^@/, '').trim(),
              streams: directorEdit.stage === 'secondary' ? (school.streams?.length ? school.streams : [...secondaryStreams]) : undefined
            }
          : school
      ),
      users: previous.users.map((user) =>
        user.id === directorEdit.id
          ? { ...user, name: directorEdit.name.trim(), email: directorEdit.email.trim(), stage: directorEdit.stage }
          : user.schoolId === directorEdit.schoolId
            ? { ...user, stage: directorEdit.stage, stream: directorEdit.stage === 'secondary' ? user.stream : undefined }
          : user
      )
    }));
    setDirectorEdit(null);
    setError('');
  };

  return (
    <section className="content-grid">
      <div className="account-mode-switch full">
        <div className="segmented">
          <button type="button" className={accountMode === 'view' ? 'active' : ''} onClick={() => setAccountMode('view')}>
            <Users size={16} aria-hidden="true" />
            <span>{tr(language, 'viewAccountsTab')}</span>
          </button>
          <button type="button" className={accountMode === 'create' ? 'active' : ''} onClick={() => setAccountMode('create')}>
            <Plus size={16} aria-hidden="true" />
            <span>{tr(language, 'createAccountTab')}</span>
          </button>
        </div>
      </div>

      {accountMode === 'create' && (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'adminPower')}</p>
            <h2>{tr(language, 'createDirector')}</h2>
          </div>
          <UserCog size={24} aria-hidden="true" />
        </div>
        <form className="form-grid" onSubmit={createDirector}>
          <Field label={tr(language, 'fullName')} value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Field label={tr(language, 'email')} value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" required />
          <Field label={tr(language, 'passwordDefault')} value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
          <Field label={tr(language, 'schoolName')} value={form.schoolName} onChange={(value) => setForm({ ...form, schoolName: value })} required />
          <label>
            <span>{tr(language, 'stage')}</span>
            <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as Stage })}>
              {stages.map((stage) => (
                <option value={stage} key={stage}>
                  {stageNames[language][stage]}
                </option>
              ))}
            </select>
          </label>
          <Field label={tr(language, 'domain')} value={form.domain} onChange={(value) => setForm({ ...form, domain: value })} required />
          <Field label={tr(language, 'city')} value={form.city} onChange={(value) => setForm({ ...form, city: value })} required />
          {error && <p className="form-error full">{error}</p>}
          <button className="button primary form-submit" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'create')}</span>
          </button>
        </form>
      </div>
      )}

      {accountMode === 'view' && directorEdit && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'directorEdit')}</p>
              <h2>{directorEdit.email}</h2>
            </div>
            <Edit3 size={24} aria-hidden="true" />
          </div>
          <div className="form-grid">
            <Field label={tr(language, 'fullName')} value={directorEdit.name} onChange={(value) => setDirectorEdit({ ...directorEdit, name: value })} />
            <Field label={tr(language, 'email')} value={directorEdit.email} onChange={(value) => setDirectorEdit({ ...directorEdit, email: value })} type="email" />
            <Field label={tr(language, 'schoolName')} value={directorEdit.schoolName} onChange={(value) => setDirectorEdit({ ...directorEdit, schoolName: value })} />
            <label>
              <span>{tr(language, 'stage')}</span>
              <select value={directorEdit.stage} onChange={(event) => setDirectorEdit({ ...directorEdit, stage: event.target.value as Stage })}>
                {stages.map((stage) => (
                  <option value={stage} key={stage}>
                    {stageNames[language][stage]}
                  </option>
                ))}
              </select>
            </label>
            <Field label={tr(language, 'domain')} value={directorEdit.domain} onChange={(value) => setDirectorEdit({ ...directorEdit, domain: value })} />
            <div className="button-row full">
              <button className="button primary" type="button" onClick={saveDirectorEdit}>
                <Save size={17} aria-hidden="true" />
                <span>{tr(language, 'save')}</span>
              </button>
              <button className="button ghost" type="button" onClick={() => setDirectorEdit(null)}>
                <X size={17} aria-hidden="true" />
                <span>{tr(language, 'cancel')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {accountMode === 'view' && editingUser && (
        <AccountEditPanel
          data={data}
          setData={setData}
          currentUser={currentUser}
          target={editingUser}
          language={language}
          onClose={() => setEditingUser(null)}
          onSaved={() => setEditingUser(null)}
        />
      )}

      {accountMode === 'view' && (
        <UsersTable
          title={tr(language, 'allUsers')}
          data={data}
          users={data.users}
          currentUser={currentUser}
          language={language}
          onToggle={toggleStatus}
          onDelete={deleteUser}
          onEdit={(target) => setEditingUser(target)}
          groupByRole
        />
      )}
    </section>
  );
}

function DirectorUsersPanel({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const [accountMode, setAccountMode] = useState<'create' | 'view' | 'database'>('view');
  const [form, setForm] = useState({
    role: 'teacher' as 'teacher' | 'student',
    name: '',
    subject: 'math' as Subject,
    subjectsByYear: {} as Record<string, Subject | ''>,
    schoolYear: 1,
    classGroup: '',
    schoolYears: [] as number[],
    yearClassGroups: {} as Record<string, string[]>,
    yearStreamClassGroups: {} as YearStreamClassGroups,
    classChoice: '1',
    customClassGroup: '',
    streamChoiceByYear: {} as Record<string, SecondaryStream | ''>,
    classChoiceByYear: {} as Record<string, string>,
    customClassByYear: {} as Record<string, string>,
    stream: '' as SecondaryStream | ''
  });
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);

  const createAccount = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!school || !currentUser.stage) {
      return;
    }

    const accountName = form.name.trim();
    if (!accountName) {
      setError(tr(language, 'nameRequired'));
      return;
    }

    const teacherYearClassGroups = normalizeYearClassGroups(form.yearClassGroups);
    const teacherYearStreamClassGroups = normalizeYearStreamClassGroups(form.yearStreamClassGroups);
    const teacherSubjectsByYear = normalizeTeacherSubjectsByYear(school, form.schoolYears, teacherYearStreamClassGroups, form.subjectsByYear, form.subject);
    const studentClassGroup = form.classChoice === 'custom' ? normalizeClassGroup(form.customClassGroup) : form.classChoice;
    const studentStreamsForYear = secondaryStreamsForYear(school, form.schoolYear);

    if (form.role === 'teacher' && form.schoolYears.length === 0) {
      setError(tr(language, 'yearRequired'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => secondaryStreamsForYear(school, year).length === 0)
    ) {
      setError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).length === 0)
    ) {
      setError(tr(language, 'classesRequired'));
      return;
    }

    if (
      form.role === 'teacher' &&
      currentUser.stage === 'secondary' &&
      form.schoolYears.some((year) => {
        const streamsForYear = secondaryStreamsForYear(school, year);
        return Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).some((stream) => !streamsForYear.includes(stream as SecondaryStream));
      })
    ) {
      setError(tr(language, 'streamRequired'));
      return;
    }

    if (form.role === 'teacher' && currentUser.stage !== 'secondary' && form.schoolYears.some((year) => (teacherYearClassGroups[String(year)] ?? []).length === 0)) {
      setError(tr(language, 'classesRequired'));
      return;
    }

    if (form.role === 'teacher' && form.schoolYears.some((year) => !teacherSubjectsByYear[String(year)])) {
      setError(tr(language, 'subjectRequired'));
      return;
    }

    if (form.role === 'student' && !studentClassGroup.trim()) {
      setError(tr(language, 'classRequired'));
      return;
    }

    if (form.role === 'student' && currentUser.stage === 'secondary' && studentStreamsForYear.length === 0) {
      setError(tr(language, 'noStreamsEnabled'));
      return;
    }

    if (form.role === 'student' && currentUser.stage === 'secondary' && (!form.stream || !studentStreamsForYear.includes(form.stream))) {
      setError(tr(language, 'streamRequired'));
      return;
    }

    const primaryYear = form.role === 'teacher' ? form.schoolYears[0] : form.schoolYear;
    const primarySubject = form.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      form.role === 'teacher' && currentUser.stage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : form.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : studentClassGroup.trim();
    const accountCode = generateAccountCode();

    setData((previous) => ({
      ...previous,
      users: [
        ...previous.users,
        {
          id: makeId(form.role),
          name: accountName,
          email: generateSchoolEmail(accountName, form.role, school.domain, previous.users),
          password: accountCode,
          role: form.role,
          status: 'active',
          schoolId: currentUser.schoolId,
          stage: currentUser.stage,
          subject: primarySubject,
          subjectsByYear: form.role === 'teacher' ? teacherSubjectsByYear : undefined,
          schoolYear: primaryYear,
          classGroup: primaryClassGroup,
          schoolYears: form.role === 'teacher' ? form.schoolYears : undefined,
          classGroups: undefined,
          yearClassGroups: form.role === 'teacher' && currentUser.stage !== 'secondary' ? teacherYearClassGroups : undefined,
          yearStreamClassGroups: form.role === 'teacher' && currentUser.stage === 'secondary' ? teacherYearStreamClassGroups : undefined,
          stream: form.role === 'student' && form.stream ? form.stream : undefined,
          createdBy: currentUser.id
        }
      ]
    }));

    setForm({
      role: 'teacher',
      name: '',
      subject: 'math',
      subjectsByYear: {},
      schoolYear: 1,
      classGroup: '',
      schoolYears: [],
      yearClassGroups: {},
      yearStreamClassGroups: {},
      classChoice: '1',
      customClassGroup: '',
      streamChoiceByYear: {},
      classChoiceByYear: {},
      customClassByYear: {},
      stream: ''
    });
    setError('');
  };

  const schoolUsers = scopedUsers(data, currentUser);
  const availableYearLabels = currentUser.stage ? schoolYearNames[language][currentUser.stage] : [];
  const studentStreamOptions = secondaryStreamsForYear(school, form.schoolYear);
  const generatedEmailPreview = school && form.name.trim() ? generateSchoolEmail(form.name, form.role, school.domain, data.users) : '';
  useEffect(() => {
    if (form.role !== 'teacher') {
      return;
    }

    setForm((previous) => {
      const nextSubjects = { ...previous.subjectsByYear };
      let changed = false;

      Object.keys(nextSubjects).forEach((year) => {
        if (!previous.schoolYears.includes(Number(year))) {
          delete nextSubjects[year];
          changed = true;
        }
      });

      previous.schoolYears.forEach((year) => {
        const key = String(year);
        const options = subjectOptionsForTeacherYear(school, previous.yearStreamClassGroups, year);
        const selected = nextSubjects[key];

        if (!selected || !options.includes(selected as Subject)) {
          nextSubjects[key] = options[0] ?? '';
          changed = true;
        }
      });

      const firstSubject = previous.schoolYears.map((year) => nextSubjects[String(year)]).find(Boolean) as Subject | undefined;
      if (firstSubject && previous.subject !== firstSubject) {
        changed = true;
      }

      return changed ? { ...previous, subjectsByYear: nextSubjects, subject: firstSubject ?? previous.subject } : previous;
    });
  }, [form.role, form.schoolYears, form.yearStreamClassGroups, school]);

  useEffect(() => {
    if (form.role !== 'student' || currentUser.stage !== 'secondary') {
      return;
    }

    const nextStream = studentStreamOptions.includes(form.stream as SecondaryStream) ? form.stream : studentStreamOptions[0] ?? '';

    if (nextStream !== form.stream) {
      setForm((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [currentUser.stage, form.role, form.schoolYear, form.stream, studentStreamOptions]);

  const toggleTeacherYear = (year: number) => {
    setForm((previous) => {
      const years = previous.schoolYears.includes(year)
        ? previous.schoolYears.filter((selected) => selected !== year)
        : uniqueNumbers([...previous.schoolYears, year]);

      const yearClassGroups = { ...previous.yearClassGroups };
      const yearStreamClassGroups = { ...previous.yearStreamClassGroups };
      if (years.includes(year) && !yearClassGroups[String(year)]) {
        yearClassGroups[String(year)] = ['1'];
      }
      const streamsForYear = secondaryStreamsForYear(school, year);
      const streamChoiceByYear = { ...previous.streamChoiceByYear };
      if (years.includes(year) && currentUser.stage === 'secondary' && streamsForYear[0] && !streamChoiceByYear[String(year)]) {
        streamChoiceByYear[String(year)] = streamsForYear[0];
      }
      if (!years.includes(year)) {
        delete yearClassGroups[String(year)];
        delete yearStreamClassGroups[String(year)];
        delete streamChoiceByYear[String(year)];
      }

      return { ...previous, schoolYears: years, yearClassGroups, yearStreamClassGroups, streamChoiceByYear };
    });
  };

  const addTeacherStreamClassForYear = (year: number) => {
    setForm((previous) => {
      const yearKey = String(year);
      const streamOptionsForYear = secondaryStreamsForYear(school, year);
      const savedStream = previous.streamChoiceByYear[yearKey];
      const stream = savedStream && streamOptionsForYear.includes(savedStream) ? savedStream : streamOptionsForYear[0];
      if (!stream) {
        return previous;
      }

      const classKey = `${yearKey}:${stream}`;
      const choice = previous.classChoiceByYear[classKey] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[classKey] ?? '') : choice;
      if (!nextClass) {
        return previous;
      }

      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const existing = currentYear[stream] ?? [];
      if (existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: {
            ...currentYear,
            [stream]: [...existing, nextClass]
          }
        },
        customClassByYear: {
          ...previous.customClassByYear,
          [classKey]: ''
        }
      };
    });
  };

  const removeTeacherStreamClassForYear = (year: number, stream: SecondaryStream, classGroup: string) => {
    setForm((previous) => {
      const yearKey = String(year);
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const nextClasses = (currentYear[stream] ?? []).filter((group) => !sameClassGroup(group, classGroup));
      const nextYear = { ...currentYear };

      if (nextClasses.length > 0) {
        nextYear[stream] = nextClasses;
      } else {
        delete nextYear[stream];
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: nextYear
        }
      };
    });
  };

  const addTeacherClassForYear = (year: number) => {
    setForm((previous) => {
      const key = String(year);
      const choice = previous.classChoiceByYear[key] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[key] ?? '') : choice;

      if (!nextClass) {
        return previous;
      }

      const existing = previous.yearClassGroups[key] ?? [];
      if (existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: [...existing, nextClass]
        },
        customClassByYear: {
          ...previous.customClassByYear,
          [key]: ''
        }
      };
    });
  };

  const removeTeacherClassForYear = (year: number, classGroup: string) => {
    setForm((previous) => {
      const key = String(year);
      const nextGroups = (previous.yearClassGroups[key] ?? []).filter((group) => !sameClassGroup(group, classGroup));

      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: nextGroups
        }
      };
    });
  };

  const toggleStatus = (target: PlatformUser) => {
    if (!canToggleUser(currentUser, target)) {
      return;
    }

    setData((previous) => ({
      ...previous,
      users: previous.users.map((user) =>
        user.id === target.id ? { ...user, status: user.status === 'active' ? 'disabled' : 'active' } : user
      )
    }));
  };

  const deleteUser = (target: PlatformUser) => {
    if (!canDeleteUser(currentUser, target)) {
      return;
    }

    setData((previous) => deleteUserRecords(previous, target));
    if (editingUser?.id === target.id) {
      setEditingUser(null);
    }
  };

  return (
    <section className="content-grid">
      <div className="account-mode-switch full">
        <div className="segmented">
          <button type="button" className={accountMode === 'view' ? 'active' : ''} onClick={() => setAccountMode('view')}>
            <Users size={16} aria-hidden="true" />
            <span>{tr(language, 'viewAccountsTab')}</span>
          </button>
          <button type="button" className={accountMode === 'database' ? 'active' : ''} onClick={() => setAccountMode('database')}>
            <Database size={16} aria-hidden="true" />
            <span>{tr(language, 'databaseTab')}</span>
          </button>
          <button type="button" className={accountMode === 'create' ? 'active' : ''} onClick={() => setAccountMode('create')}>
            <Plus size={16} aria-hidden="true" />
            <span>{tr(language, 'createAccountTab')}</span>
          </button>
        </div>
      </div>

      {accountMode === 'create' && (
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'lockedScope')}</p>
            <h2>{tr(language, 'createSchoolAccounts')}</h2>
          </div>
          <UserPlus size={24} aria-hidden="true" />
        </div>
        <div className="locked-strip">
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {school?.name}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {currentUser.stage && stageNames[language][currentUser.stage]}
          </span>
        </div>
        <form className="form-grid" onSubmit={createAccount}>
          <label>
            <span>{tr(language, 'accountType')}</span>
            <select
              value={form.role}
              onChange={(event) => {
                const role = event.target.value as 'teacher' | 'student';
                const streamsForYear = secondaryStreamsForYear(school, form.schoolYear);
                const defaultStream = streamsForYear.includes(form.stream as SecondaryStream) ? form.stream : streamsForYear[0] ?? '';
                setForm({
                  ...form,
                  role,
                  stream: role === 'student' && currentUser.stage === 'secondary' ? defaultStream : form.stream
                });
              }}
            >
              <option value="teacher">{tr(language, 'teacher')}</option>
              <option value="student">{tr(language, 'student')}</option>
            </select>
          </label>
          <Field label={tr(language, 'fullName')} value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <p className="hint full">{tr(language, 'autoGeneratedEmailHint')}</p>
          {generatedEmailPreview && (
            <p className="hint full">
              <span>{tr(language, 'generatedEmailPreview')}: </span>
              <strong dir="ltr">{generatedEmailPreview}</strong>
            </p>
          )}
          <p className="hint full">{tr(language, 'autoGeneratedCodeHint')}</p>
          {currentUser.stage && form.role === 'student' && (
            <label>
              <span>{tr(language, 'schoolYear')}</span>
              <select
                value={form.schoolYear}
                onChange={(event) => {
                  const schoolYear = Number(event.target.value);
                  const streamsForYear = secondaryStreamsForYear(school, schoolYear);
                  const nextStream = streamsForYear.includes(form.stream as SecondaryStream) ? form.stream : streamsForYear[0] ?? '';
                  setForm({ ...form, schoolYear, stream: currentUser.stage === 'secondary' ? nextStream : form.stream });
                }}
              >
                {schoolYearNames[language][currentUser.stage].map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentUser.stage === 'secondary' && form.role === 'student' && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={form.stream}
                disabled={studentStreamOptions.length === 0}
                onChange={(event) => setForm({ ...form, stream: event.target.value as SecondaryStream | '' })}
              >
                <option value="">{studentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                {studentStreamOptions.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, form.schoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {currentUser.stage && form.role === 'teacher' && (
            <div className="form-field full">
              <span>{tr(language, 'schoolYears')}</span>
              <div className="checkbox-grid">
                {availableYearLabels.map((label, index) => {
                  const year = index + 1;
                  return (
                    <label className="check-option" key={label}>
                      <input type="checkbox" checked={form.schoolYears.includes(year)} onChange={() => toggleTeacherYear(year)} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {form.role === 'teacher' ? (
            <>
              <div className="year-class-list full">
                {form.schoolYears.map((year) => {
                  const key = String(year);
                  const isSecondaryTeacher = currentUser.stage === 'secondary';
                  const streamOptionsForYear = secondaryStreamsForYear(school, year);
                  const savedStreamChoice = form.streamChoiceByYear[key];
                  const streamChoice =
                    savedStreamChoice && streamOptionsForYear.includes(savedStreamChoice) ? savedStreamChoice : streamOptionsForYear[0] || '';
                  const streamClassKey = `${key}:${streamChoice}`;
                  const classChoiceKey = isSecondaryTeacher ? streamClassKey : key;
                  const choice = form.classChoiceByYear[classChoiceKey] ?? '1';
                  const selectedClasses = form.yearClassGroups[key] ?? [];
                  const selectedStreamClasses = form.yearStreamClassGroups[key] ?? {};
                  const subjectOptionsForYear = subjectOptionsForTeacherYear(school, form.yearStreamClassGroups, year);
                  const subjectChoice = form.subjectsByYear[key] || subjectOptionsForYear[0] || '';
                  return (
                    <div className="year-class-row" key={year}>
                      <strong>{schoolYearLabel(language, currentUser.stage, year)}</strong>
                      {isSecondaryTeacher ? (
                        <>
                          <div className="class-picker-row">
                            <select
                              value={streamChoice}
                              disabled={streamOptionsForYear.length === 0}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  streamChoiceByYear: { ...form.streamChoiceByYear, [key]: event.target.value as SecondaryStream }
                                })
                              }
                            >
                              {streamOptionsForYear.map((stream) => (
                                <option value={stream} key={stream}>
                                  {secondaryStreamLabel(language, stream, year)}
                                </option>
                              ))}
                            </select>
                            <select
                              value={choice}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  classChoiceByYear: { ...form.classChoiceByYear, [classChoiceKey]: event.target.value }
                                })
                              }
                            >
                              {defaultClassGroups.map((classGroup) => (
                                <option value={classGroup} key={classGroup}>
                                  {classGroup}
                                </option>
                              ))}
                              <option value="custom">{tr(language, 'customClass')}</option>
                            </select>
                            {choice === 'custom' && (
                              <input
                                value={form.customClassByYear[classChoiceKey] ?? ''}
                                placeholder={tr(language, 'customClass')}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    customClassByYear: { ...form.customClassByYear, [classChoiceKey]: event.target.value }
                                  })
                                }
                              />
                            )}
                            <button className="button ghost" type="button" onClick={() => addTeacherStreamClassForYear(year)}>
                              <Plus size={16} aria-hidden="true" />
                              <span>{tr(language, 'addClass')}</span>
                            </button>
                          </div>
                          <div className="chip-row">
                            {Object.entries(selectedStreamClasses).flatMap(([stream, classes]) =>
                              (classes ?? []).map((classGroup) => (
                                <button
                                  className="chip-button"
                                  type="button"
                                  key={`${stream}-${classGroup}`}
                                  onClick={() => removeTeacherStreamClassForYear(year, stream as SecondaryStream, classGroup)}
                                >
                                  <span>{secondaryStreamLabel(language, stream as SecondaryStream, year)}: {classGroup}</span>
                                  <X size={13} aria-hidden="true" />
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="class-picker-row">
                            <select
                              value={choice}
                              onChange={(event) =>
                                setForm({
                                  ...form,
                                  classChoiceByYear: { ...form.classChoiceByYear, [key]: event.target.value }
                                })
                              }
                            >
                              {defaultClassGroups.map((classGroup) => (
                                <option value={classGroup} key={classGroup}>
                                  {classGroup}
                                </option>
                              ))}
                              <option value="custom">{tr(language, 'customClass')}</option>
                            </select>
                            {choice === 'custom' && (
                              <input
                                value={form.customClassByYear[key] ?? ''}
                                placeholder={tr(language, 'customClass')}
                                onChange={(event) =>
                                  setForm({
                                    ...form,
                                    customClassByYear: { ...form.customClassByYear, [key]: event.target.value }
                                  })
                                }
                              />
                            )}
                            <button className="button ghost" type="button" onClick={() => addTeacherClassForYear(year)}>
                              <Plus size={16} aria-hidden="true" />
                              <span>{tr(language, 'addClass')}</span>
                            </button>
                          </div>
                          <div className="chip-row">
                            {selectedClasses.map((classGroup) => (
                              <button className="chip-button" type="button" key={classGroup} onClick={() => removeTeacherClassForYear(year, classGroup)}>
                                <span>{classGroup}</span>
                                <X size={13} aria-hidden="true" />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <label className="year-subject-select">
                        <span>{tr(language, 'subject')}</span>
                        <select
                          value={subjectChoice}
                          disabled={subjectOptionsForYear.length === 0}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              subjectsByYear: { ...form.subjectsByYear, [key]: event.target.value as Subject }
                            })
                          }
                        >
                          {subjectOptionsForYear.length === 0 && (
                            <option value="">{tr(language, isSecondaryTeacher ? 'chooseStreamFirst' : 'subjectRequired')}</option>
                          )}
                          {subjectOptionsForYear.map((subject) => (
                            <option value={subject} key={subject}>
                              {subjectNames[language][subject]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="hint full">{tr(language, currentUser.stage === 'secondary' ? 'streamClassesHint' : 'classesHint')}</p>
            </>
          ) : (
            <>
              <label>
                <span>{tr(language, 'classGroup')}</span>
                <select value={form.classChoice} onChange={(event) => setForm({ ...form, classChoice: event.target.value })}>
                  {defaultClassGroups.map((classGroup) => (
                    <option value={classGroup} key={classGroup}>
                      {classGroup}
                    </option>
                  ))}
                  <option value="custom">{tr(language, 'customClass')}</option>
                </select>
              </label>
              {form.classChoice === 'custom' && (
                <Field label={tr(language, 'customClass')} value={form.customClassGroup} onChange={(value) => setForm({ ...form, customClassGroup: value })} required />
              )}
            </>
          )}
          {form.role === 'teacher' && form.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
          <p className="hint full">{tr(language, 'createOnlyTeacherStudent')}</p>
          {error && <p className="form-error full">{error}</p>}
          <button className="button primary form-submit" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'create')}</span>
          </button>
        </form>
      </div>
      )}

      {accountMode === 'database' && <CredentialDatabasePanel users={schoolUsers} school={school} language={language} />}

      {accountMode === 'view' && editingUser && (
        <AccountEditPanel
          data={data}
          setData={setData}
          currentUser={currentUser}
          target={editingUser}
          language={language}
          onClose={() => setEditingUser(null)}
          onSaved={() => setEditingUser(null)}
        />
      )}

      {accountMode === 'view' && (
        <UsersTable
          title={tr(language, 'schoolUsers')}
          data={data}
          users={schoolUsers}
          currentUser={currentUser}
          language={language}
          onToggle={toggleStatus}
          onDelete={deleteUser}
          onEdit={(target) => setEditingUser(target)}
          groupByRole
        />
      )}
    </section>
  );
}

function CredentialDatabasePanel({ users, school, language }: { users: PlatformUser[]; school: SchoolRecord | undefined; language: Language }) {
  const teacherUsers = sortedCredentialUsers(users, 'teacher');
  const studentUsers = sortedCredentialUsers(users, 'student');
  const schoolName = school?.name ?? '-';

  return (
    <div className="panel credential-database-panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'credentialsDatabaseHint')}</p>
          <h2>{tr(language, 'credentialsDatabase')}</h2>
        </div>
        <Database size={24} aria-hidden="true" />
      </div>
      <div className="credential-database-grid">
        <CredentialDatabaseCard title={tr(language, 'teacherDatabase')} users={teacherUsers} schoolName={schoolName} language={language} />
        <CredentialDatabaseCard title={tr(language, 'studentDatabase')} users={studentUsers} schoolName={schoolName} language={language} />
      </div>
    </div>
  );
}

function CredentialDatabaseCard({
  title,
  users,
  schoolName,
  language
}: {
  title: string;
  users: PlatformUser[];
  schoolName: string;
  language: Language;
}) {
  const columns = [tr(language, 'fullName'), tr(language, 'email'), tr(language, 'accountCode')];

  return (
    <section className="credential-database-card">
      <div className="credential-database-head">
        <div>
          <h3>{title}</h3>
          <span>{users.length}</span>
        </div>
        <button className="button ghost" type="button" disabled={users.length === 0} onClick={() => printCredentialTable(language, title, schoolName, users)}>
          <Printer size={17} aria-hidden="true" />
          <span>{tr(language, 'printTable')}</span>
        </button>
      </div>
      <ResponsiveTable columns={columns} emptyText={tr(language, 'databaseEmpty')}>
        {users.map((user) => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td dir="ltr">{user.email}</td>
            <td dir="ltr">{user.password}</td>
          </tr>
        ))}
      </ResponsiveTable>
    </section>
  );
}

function AccountEditPanel({
  data,
  setData,
  currentUser,
  target,
  language,
  onClose,
  onSaved
}: CommonViewProps & {
  setData: DataSetter;
  target: PlatformUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const targetSchool = getSchool(data, target);
  const [edit, setEdit] = useState<AccountEditState>(() => makeAccountEditState(target, data));
  const [error, setError] = useState('');
  const editStage = target.role === 'director' ? edit.stage : target.stage ?? targetSchool?.stage ?? 'middle';
  const studentStreamOptions = secondaryStreamsForYear(targetSchool, edit.schoolYear);
  const availableYearLabels = schoolYearNames[language][editStage];

  useEffect(() => {
    setEdit(makeAccountEditState(target, data));
    setError('');
  }, [target.id, data]);

  useEffect(() => {
    if (target.role !== 'teacher') {
      return;
    }

    setEdit((previous) => {
      const nextSubjects = { ...previous.subjectsByYear };
      let changed = false;

      Object.keys(nextSubjects).forEach((year) => {
        if (!previous.schoolYears.includes(Number(year))) {
          delete nextSubjects[year];
          changed = true;
        }
      });

      previous.schoolYears.forEach((year) => {
        const key = String(year);
        const options = subjectOptionsForTeacherYear(targetSchool, previous.yearStreamClassGroups, year);
        const selected = nextSubjects[key];

        if (!selected || !options.includes(selected as Subject)) {
          nextSubjects[key] = options[0] ?? '';
          changed = true;
        }
      });

      const firstSubject = previous.schoolYears.map((year) => nextSubjects[String(year)]).find(Boolean) as Subject | undefined;
      if (firstSubject && previous.subject !== firstSubject) {
        changed = true;
      }

      return changed ? { ...previous, subjectsByYear: nextSubjects, subject: firstSubject ?? previous.subject } : previous;
    });
  }, [target.role, targetSchool, edit.schoolYears, edit.yearStreamClassGroups]);

  useEffect(() => {
    if (target.role !== 'student' || editStage !== 'secondary') {
      return;
    }

    const nextStream = studentStreamOptions.includes(edit.stream as SecondaryStream) ? edit.stream : studentStreamOptions[0] ?? '';

    if (nextStream !== edit.stream) {
      setEdit((previous) => ({ ...previous, stream: nextStream }));
    }
  }, [edit.schoolYear, edit.stream, editStage, studentStreamOptions, target.role]);

  const toggleTeacherYear = (year: number) => {
    setEdit((previous) => {
      const years = previous.schoolYears.includes(year)
        ? previous.schoolYears.filter((selected) => selected !== year)
        : uniqueNumbers([...previous.schoolYears, year]);
      const yearClassGroups = { ...previous.yearClassGroups };
      const yearStreamClassGroups = { ...previous.yearStreamClassGroups };

      if (years.includes(year) && !yearClassGroups[String(year)]) {
        yearClassGroups[String(year)] = ['1'];
      }
      const streamsForYear = secondaryStreamsForYear(targetSchool, year);
      const streamChoiceByYear = { ...previous.streamChoiceByYear };
      if (years.includes(year) && editStage === 'secondary' && streamsForYear[0] && !streamChoiceByYear[String(year)]) {
        streamChoiceByYear[String(year)] = streamsForYear[0];
      }
      if (!years.includes(year)) {
        delete yearClassGroups[String(year)];
        delete yearStreamClassGroups[String(year)];
        delete streamChoiceByYear[String(year)];
      }

      return { ...previous, schoolYears: years, yearClassGroups, yearStreamClassGroups, streamChoiceByYear };
    });
  };

  const addTeacherClassForYear = (year: number) => {
    setEdit((previous) => {
      const key = String(year);
      const choice = previous.classChoiceByYear[key] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[key] ?? '') : choice;
      if (!nextClass || (previous.yearClassGroups[key] ?? []).some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearClassGroups: { ...previous.yearClassGroups, [key]: [...(previous.yearClassGroups[key] ?? []), nextClass] },
        customClassByYear: { ...previous.customClassByYear, [key]: '' }
      };
    });
  };

  const removeTeacherClassForYear = (year: number, classGroup: string) => {
    setEdit((previous) => {
      const key = String(year);
      return {
        ...previous,
        yearClassGroups: {
          ...previous.yearClassGroups,
          [key]: (previous.yearClassGroups[key] ?? []).filter((group) => !sameClassGroup(group, classGroup))
        }
      };
    });
  };

  const addTeacherStreamClassForYear = (year: number) => {
    setEdit((previous) => {
      const yearKey = String(year);
      const streamOptionsForYear = secondaryStreamsForYear(targetSchool, year);
      const savedStream = previous.streamChoiceByYear[yearKey];
      const stream = savedStream && streamOptionsForYear.includes(savedStream) ? savedStream : streamOptionsForYear[0];
      if (!stream) {
        return previous;
      }

      const classKey = `${yearKey}:${stream}`;
      const choice = previous.classChoiceByYear[classKey] ?? '1';
      const nextClass = choice === 'custom' ? normalizeClassGroup(previous.customClassByYear[classKey] ?? '') : choice;
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const existing = currentYear[stream] ?? [];
      if (!nextClass || existing.some((group) => sameClassGroup(group, nextClass))) {
        return previous;
      }

      return {
        ...previous,
        yearStreamClassGroups: {
          ...previous.yearStreamClassGroups,
          [yearKey]: { ...currentYear, [stream]: [...existing, nextClass] }
        },
        customClassByYear: { ...previous.customClassByYear, [classKey]: '' }
      };
    });
  };

  const removeTeacherStreamClassForYear = (year: number, stream: SecondaryStream, classGroup: string) => {
    setEdit((previous) => {
      const yearKey = String(year);
      const currentYear = previous.yearStreamClassGroups[yearKey] ?? {};
      const nextClasses = (currentYear[stream] ?? []).filter((group) => !sameClassGroup(group, classGroup));
      const nextYear = { ...currentYear };

      if (nextClasses.length > 0) {
        nextYear[stream] = nextClasses;
      } else {
        delete nextYear[stream];
      }

      return { ...previous, yearStreamClassGroups: { ...previous.yearStreamClassGroups, [yearKey]: nextYear } };
    });
  };

  const saveEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditUser(currentUser, target)) {
      return;
    }

    const normalizedEmail = edit.email.trim().toLowerCase();
    if (data.users.some((user) => user.id !== target.id && user.email.toLowerCase() === normalizedEmail)) {
      setError(tr(language, 'duplicateEmail'));
      return;
    }

    const teacherYearClassGroups = normalizeYearClassGroups(edit.yearClassGroups);
    const teacherYearStreamClassGroups = normalizeYearStreamClassGroups(edit.yearStreamClassGroups);
    const teacherSubjectsByYear = normalizeTeacherSubjectsByYear(targetSchool, edit.schoolYears, teacherYearStreamClassGroups, edit.subjectsByYear, edit.subject);
    const studentClassGroup = edit.classChoice === 'custom' ? normalizeClassGroup(edit.customClassGroup) : edit.classChoice;

    if (target.role === 'teacher') {
      if (edit.schoolYears.length === 0) {
        setError(tr(language, 'yearRequired'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => secondaryStreamsForYear(targetSchool, year).length === 0)
      ) {
        setError(tr(language, 'noStreamsEnabled'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).length === 0)
      ) {
        setError(tr(language, 'classesRequired'));
        return;
      }
      if (
        editStage === 'secondary' &&
        edit.schoolYears.some((year) => {
          const streamsForYear = secondaryStreamsForYear(targetSchool, year);
          return Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}).some((stream) => !streamsForYear.includes(stream as SecondaryStream));
        })
      ) {
        setError(tr(language, 'streamRequired'));
        return;
      }
      if (editStage !== 'secondary' && edit.schoolYears.some((year) => (teacherYearClassGroups[String(year)] ?? []).length === 0)) {
        setError(tr(language, 'classesRequired'));
        return;
      }
      if (edit.schoolYears.some((year) => !teacherSubjectsByYear[String(year)])) {
        setError(tr(language, 'subjectRequired'));
        return;
      }
    }

    if (target.role === 'student') {
      if (!studentClassGroup.trim()) {
        setError(tr(language, 'classRequired'));
        return;
      }
      if (editStage === 'secondary' && studentStreamOptions.length === 0) {
        setError(tr(language, 'noStreamsEnabled'));
        return;
      }
      if (editStage === 'secondary' && (!edit.stream || !studentStreamOptions.includes(edit.stream))) {
        setError(tr(language, 'streamRequired'));
        return;
      }
    }

    const primaryYear = target.role === 'teacher' ? edit.schoolYears[0] : edit.schoolYear;
    const primarySubject = target.role === 'teacher' ? teacherSubjectsByYear[String(primaryYear)] : undefined;
    const primaryStreamGroups = teacherYearStreamClassGroups[String(primaryYear)] ?? {};
    const primaryStream = Object.keys(primaryStreamGroups)[0] as SecondaryStream | undefined;
    const primaryClassGroup =
      target.role === 'teacher' && editStage === 'secondary'
        ? primaryStreamGroups[primaryStream as SecondaryStream]?.[0] ?? ''
        : target.role === 'teacher'
          ? teacherYearClassGroups[String(primaryYear)]?.[0] ?? ''
          : studentClassGroup.trim();

    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((school) =>
        target.role === 'director' && school.id === target.schoolId
          ? {
              ...school,
              name: edit.schoolName.trim(),
              stage: edit.stage,
              domain: edit.domain.replace(/^@/, '').trim(),
              streams: edit.stage === 'secondary' ? (school.streams?.length ? school.streams : [...secondaryStreams]) : undefined
            }
          : school
      ),
      users: previous.users.map((user) => {
        if (target.role === 'director' && user.schoolId === target.schoolId && user.id !== target.id) {
          return { ...user, stage: edit.stage, stream: edit.stage === 'secondary' ? user.stream : undefined };
        }

        if (user.id !== target.id) {
          return user;
        }

        const base = {
          ...user,
          name: edit.name.trim(),
          email: edit.email.trim(),
          password: edit.password,
          status: edit.status
        };

        if (target.role === 'director') {
          return { ...base, stage: edit.stage };
        }

        if (target.role === 'teacher') {
          return {
            ...base,
            subject: primarySubject,
            subjectsByYear: teacherSubjectsByYear,
            schoolYear: primaryYear,
            classGroup: primaryClassGroup,
            schoolYears: edit.schoolYears,
            yearClassGroups: editStage === 'secondary' ? undefined : teacherYearClassGroups,
            yearStreamClassGroups: editStage === 'secondary' ? teacherYearStreamClassGroups : undefined,
            stream: undefined
          };
        }

        if (target.role === 'student') {
          return {
            ...base,
            schoolYear: edit.schoolYear,
            classGroup: primaryClassGroup,
            stream: editStage === 'secondary' ? edit.stream || undefined : undefined
          };
        }

        return base;
      })
    }));

    setError('');
    onSaved();
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>
            <RoleLabel role={target.role} language={language} />
          </p>
          <h2>{tr(language, 'editUser')}</h2>
        </div>
        <Edit3 size={24} aria-hidden="true" />
      </div>
      <form className="form-grid" onSubmit={saveEdit}>
        <Field label={tr(language, 'fullName')} value={edit.name} onChange={(value) => setEdit({ ...edit, name: value })} required />
        <Field label={tr(language, 'email')} value={edit.email} onChange={(value) => setEdit({ ...edit, email: value })} type="email" required />
        <Field label={tr(language, 'passwordDefault')} value={edit.password} onChange={(value) => setEdit({ ...edit, password: value })} required />
        <label>
          <span>{tr(language, 'status')}</span>
          <select value={edit.status} onChange={(event) => setEdit({ ...edit, status: event.target.value as AccountStatus })}>
            <option value="active">{statusNames[language].active}</option>
            <option value="disabled">{statusNames[language].disabled}</option>
          </select>
        </label>

        {target.role === 'director' && currentUser.role === 'admin' && targetSchool && (
          <>
            <Field label={tr(language, 'schoolName')} value={edit.schoolName} onChange={(value) => setEdit({ ...edit, schoolName: value })} required />
            <label>
              <span>{tr(language, 'stage')}</span>
              <select value={edit.stage} onChange={(event) => setEdit({ ...edit, stage: event.target.value as Stage })}>
                {stages.map((stage) => (
                  <option value={stage} key={stage}>
                    {stageNames[language][stage]}
                  </option>
                ))}
              </select>
            </label>
            <Field label={tr(language, 'domain')} value={edit.domain} onChange={(value) => setEdit({ ...edit, domain: value })} required />
          </>
        )}

        {target.role === 'student' && (
          <>
            <label>
              <span>{tr(language, 'schoolYear')}</span>
              <select
                value={edit.schoolYear}
                onChange={(event) => {
                  const schoolYear = Number(event.target.value);
                  const streamsForYear = secondaryStreamsForYear(targetSchool, schoolYear);
                  const nextStream = streamsForYear.includes(edit.stream as SecondaryStream) ? edit.stream : streamsForYear[0] ?? '';
                  setEdit({ ...edit, schoolYear, stream: editStage === 'secondary' ? nextStream : edit.stream });
                }}
              >
                {availableYearLabels.map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {editStage === 'secondary' && (
              <label>
                <span>{tr(language, 'stream')}</span>
                <select
                  value={edit.stream}
                  disabled={studentStreamOptions.length === 0}
                  onChange={(event) => setEdit({ ...edit, stream: event.target.value as SecondaryStream | '' })}
                >
                  <option value="">{studentStreamOptions.length === 0 ? tr(language, 'noStreamsEnabled') : tr(language, 'stream')}</option>
                  {studentStreamOptions.map((stream) => (
                    <option value={stream} key={stream}>
                      {secondaryStreamLabel(language, stream, edit.schoolYear)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>{tr(language, 'classGroup')}</span>
              <select value={edit.classChoice} onChange={(event) => setEdit({ ...edit, classChoice: event.target.value })}>
                {defaultClassGroups.map((classGroup) => (
                  <option value={classGroup} key={classGroup}>
                    {classGroup}
                  </option>
                ))}
                <option value="custom">{tr(language, 'customClass')}</option>
              </select>
            </label>
            {edit.classChoice === 'custom' && (
              <Field label={tr(language, 'customClass')} value={edit.customClassGroup} onChange={(value) => setEdit({ ...edit, customClassGroup: value })} required />
            )}
          </>
        )}

        {target.role === 'teacher' && (
          <>
            <div className="form-field full">
              <span>{tr(language, 'schoolYears')}</span>
              <div className="checkbox-grid">
                {availableYearLabels.map((label, index) => {
                  const year = index + 1;
                  return (
                    <label className="check-option" key={label}>
                      <input type="checkbox" checked={edit.schoolYears.includes(year)} onChange={() => toggleTeacherYear(year)} />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="year-class-list full">
              {edit.schoolYears.map((year) => {
                const key = String(year);
                const isSecondaryTeacher = editStage === 'secondary';
                const streamOptionsForYear = secondaryStreamsForYear(targetSchool, year);
                const savedStreamChoice = edit.streamChoiceByYear[key];
                const streamChoice =
                  savedStreamChoice && streamOptionsForYear.includes(savedStreamChoice) ? savedStreamChoice : streamOptionsForYear[0] || '';
                const streamClassKey = `${key}:${streamChoice}`;
                const classChoiceKey = isSecondaryTeacher ? streamClassKey : key;
                const choice = edit.classChoiceByYear[classChoiceKey] ?? '1';
                const selectedClasses = edit.yearClassGroups[key] ?? [];
                const selectedStreamClasses = edit.yearStreamClassGroups[key] ?? {};
                const subjectOptionsForYear = subjectOptionsForTeacherYear(targetSchool, edit.yearStreamClassGroups, year);
                const subjectChoice = edit.subjectsByYear[key] || subjectOptionsForYear[0] || '';

                return (
                  <div className="year-class-row" key={year}>
                    <strong>{schoolYearLabel(language, editStage, year)}</strong>
                    {isSecondaryTeacher ? (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={streamChoice}
                            disabled={streamOptionsForYear.length === 0}
                            onChange={(event) =>
                              setEdit({ ...edit, streamChoiceByYear: { ...edit.streamChoiceByYear, [key]: event.target.value as SecondaryStream } })
                            }
                          >
                            {streamOptionsForYear.map((stream) => (
                              <option value={stream} key={stream}>
                                {secondaryStreamLabel(language, stream, year)}
                              </option>
                            ))}
                          </select>
                          <select
                            value={choice}
                            onChange={(event) => setEdit({ ...edit, classChoiceByYear: { ...edit.classChoiceByYear, [classChoiceKey]: event.target.value } })}
                          >
                            {defaultClassGroups.map((classGroup) => (
                              <option value={classGroup} key={classGroup}>
                                {classGroup}
                              </option>
                            ))}
                            <option value="custom">{tr(language, 'customClass')}</option>
                          </select>
                          {choice === 'custom' && (
                            <input
                              value={edit.customClassByYear[classChoiceKey] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) =>
                                setEdit({ ...edit, customClassByYear: { ...edit.customClassByYear, [classChoiceKey]: event.target.value } })
                              }
                            />
                          )}
                          <button className="button ghost" type="button" onClick={() => addTeacherStreamClassForYear(year)}>
                            <Plus size={16} aria-hidden="true" />
                            <span>{tr(language, 'addClass')}</span>
                          </button>
                        </div>
                        <div className="chip-row">
                          {Object.entries(selectedStreamClasses).flatMap(([stream, classes]) =>
                            (classes ?? []).map((classGroup) => (
                              <button
                                className="chip-button"
                                type="button"
                                key={`${stream}-${classGroup}`}
                                onClick={() => removeTeacherStreamClassForYear(year, stream as SecondaryStream, classGroup)}
                              >
                                <span>{secondaryStreamLabel(language, stream as SecondaryStream, year)}: {classGroup}</span>
                                <X size={13} aria-hidden="true" />
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="class-picker-row">
                          <select
                            value={choice}
                            onChange={(event) => setEdit({ ...edit, classChoiceByYear: { ...edit.classChoiceByYear, [key]: event.target.value } })}
                          >
                            {defaultClassGroups.map((classGroup) => (
                              <option value={classGroup} key={classGroup}>
                                {classGroup}
                              </option>
                            ))}
                            <option value="custom">{tr(language, 'customClass')}</option>
                          </select>
                          {choice === 'custom' && (
                            <input
                              value={edit.customClassByYear[key] ?? ''}
                              placeholder={tr(language, 'customClass')}
                              onChange={(event) => setEdit({ ...edit, customClassByYear: { ...edit.customClassByYear, [key]: event.target.value } })}
                            />
                          )}
                          <button className="button ghost" type="button" onClick={() => addTeacherClassForYear(year)}>
                            <Plus size={16} aria-hidden="true" />
                            <span>{tr(language, 'addClass')}</span>
                          </button>
                        </div>
                        <div className="chip-row">
                          {selectedClasses.map((classGroup) => (
                            <button className="chip-button" type="button" key={classGroup} onClick={() => removeTeacherClassForYear(year, classGroup)}>
                              <span>{classGroup}</span>
                              <X size={13} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <label className="year-subject-select">
                      <span>{tr(language, 'subject')}</span>
                      <select
                        value={subjectChoice}
                        disabled={subjectOptionsForYear.length === 0}
                        onChange={(event) =>
                          setEdit({
                            ...edit,
                            subjectsByYear: { ...edit.subjectsByYear, [key]: event.target.value as Subject }
                          })
                        }
                      >
                        {subjectOptionsForYear.length === 0 && (
                          <option value="">{tr(language, isSecondaryTeacher ? 'chooseStreamFirst' : 'subjectRequired')}</option>
                        )}
                        {subjectOptionsForYear.map((subject) => (
                          <option value={subject} key={subject}>
                            {subjectNames[language][subject]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
            {edit.schoolYears.length === 0 && <p className="hint full">{tr(language, 'subjectAfterYear')}</p>}
          </>
        )}

        {error && <p className="form-error full">{error}</p>}
        <div className="button-row full">
          <button className="button primary" type="submit">
            <Save size={17} aria-hidden="true" />
            <span>{tr(language, 'save')}</span>
          </button>
          <button className="button ghost" type="button" onClick={onClose}>
            <X size={17} aria-hidden="true" />
            <span>{tr(language, 'cancel')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersTable({
  title,
  data,
  users,
  currentUser,
  language,
  onToggle,
  onDelete,
  onEdit,
  groupByRole = false
}: {
  title: string;
  data: PlatformData;
  users: PlatformUser[];
  currentUser: PlatformUser;
  language: Language;
  onToggle: (user: PlatformUser) => void;
  onDelete: (user: PlatformUser) => void;
  onEdit?: (user: PlatformUser) => void;
  groupByRole?: boolean;
}) {
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [pendingDeleteUser, setPendingDeleteUser] = useState<PlatformUser | null>(null);
  const columns = [
    tr(language, 'fullName'),
    tr(language, 'email'),
    tr(language, 'role'),
    tr(language, 'school'),
    tr(language, 'subject'),
    tr(language, 'status'),
    tr(language, 'assignments'),
    tr(language, 'actions')
  ];
  const rowsForUsers = (tableUsers: PlatformUser[]) =>
    tableUsers.flatMap((user) => {
      const school = getSchool(data, user);
      const detailsOpen = Boolean(expandedUsers[user.id]);
      const detailsAvailable = hasAccountDetails(user);
      const row = (
        <tr key={user.id}>
          <td>{user.name}</td>
          <td>{user.email}</td>
          <td>
            <RoleLabel role={user.role} language={language} />
          </td>
          <td>{school?.name ?? '-'}</td>
          <td>{user.role === 'teacher' ? teacherSubjectsLabel(language, user) : user.subject ? subjectNames[language][user.subject] : '-'}</td>
          <td>
            <span className={`status ${user.status}`}>{statusNames[language][user.status]}</span>
          </td>
          <td>
            {detailsAvailable ? (
              <button
                className="assignment-summary-button"
                type="button"
                title={detailsOpen ? tr(language, 'hideDetails') : tr(language, 'showDetails')}
                onClick={() => setExpandedUsers((previous) => ({ ...previous, [user.id]: !previous[user.id] }))}
              >
                <BookOpen size={15} aria-hidden="true" />
                <span>{assignmentSummaryLabel(language, user)}</span>
              </button>
            ) : (
              <span className="muted-cell">{assignmentSummaryLabel(language, user)}</span>
            )}
          </td>
          <td>
            <div className="table-actions">
              {onEdit && canEditUser(currentUser, user) && (
                <button className="icon-button" type="button" title={tr(language, 'edit')} onClick={() => onEdit(user)}>
                  <Edit3 size={16} aria-hidden="true" />
                </button>
              )}
              <button
                className="icon-button"
                type="button"
                title={user.status === 'active' ? tr(language, 'disable') : tr(language, 'activate')}
                disabled={!canToggleUser(currentUser, user)}
                onClick={() => onToggle(user)}
              >
                {user.status === 'active' ? <CircleOff size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              </button>
              <button
                className="icon-button danger"
                type="button"
                title={tr(language, 'delete')}
                disabled={!canDeleteUser(currentUser, user)}
                onClick={() => setPendingDeleteUser(user)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
      );

      if (!detailsOpen || !detailsAvailable) {
        return [row];
      }

      return [
        row,
        <tr className="account-details-row" key={`${user.id}-details`}>
          <td colSpan={columns.length}>
            <AccountAssignmentDetails user={user} language={language} />
          </td>
        </tr>
      ];
    });
  const renderTable = (tableUsers: PlatformUser[]) => (
    <ResponsiveTable columns={columns} emptyText={tr(language, 'noRecords')}>
      {rowsForUsers(tableUsers)}
    </ResponsiveTable>
  );
  const groupedUsers = (['admin', 'director', 'teacher', 'student'] as Role[])
    .map((role) => ({ role, users: users.filter((user) => user.role === role) }))
    .filter((group) => group.users.length > 0);

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'scopedData')}</p>
          <h2>{title}</h2>
        </div>
        <Users size={24} aria-hidden="true" />
      </div>
      {groupByRole ? (
        <div className="user-groups">
          {groupedUsers.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {groupedUsers.map((group) =>
            group.users.length > 1 ? (
              <details className="user-group" key={group.role}>
                <summary>
                  <span className="user-group-label">
                    <RoleLabel role={group.role} language={language} />
                  </span>
                  <span className="user-group-meta">
                    <strong>{group.users.length}</strong>
                    <ChevronDown size={17} aria-hidden="true" />
                  </span>
                </summary>
                {renderTable(group.users)}
              </details>
            ) : (
              <div className="user-group single" key={group.role}>
                <div className="user-group-title">
                  <span className="user-group-label">
                    <RoleLabel role={group.role} language={language} />
                  </span>
                  <span className="user-group-meta">
                    <strong>{group.users.length}</strong>
                  </span>
                </div>
                {renderTable(group.users)}
              </div>
            )
          )}
        </div>
      ) : (
        renderTable(users)
      )}
      {pendingDeleteUser && (
        <AccountDeleteDialog
          user={pendingDeleteUser}
          language={language}
          onCancel={() => setPendingDeleteUser(null)}
          onConfirm={() => {
            onDelete(pendingDeleteUser);
            setPendingDeleteUser(null);
          }}
        />
      )}
    </div>
  );
}

function AccountDeleteDialog({
  user,
  language,
  onConfirm,
  onCancel
}: {
  user: PlatformUser;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <Trash2 size={30} aria-hidden="true" />
        <div>
          <h2 id="delete-account-title">{tr(language, 'deleteAccountTitle')}</h2>
          <p className="modal-copy">{tr(language, 'deleteAccountQuestion')}</p>
        </div>
        <div className="delete-target-card">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          <small>
            <RoleLabel role={user.role} language={language} />
          </small>
        </div>
        <p className="modal-warning">{tr(language, 'deleteAccountWarning')}</p>
        <div className="button-row center">
          <button className="button danger" type="button" onClick={onConfirm}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, 'delete')}</span>
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

function SchoolDeleteDialog({
  school,
  userCount,
  language,
  mode,
  onConfirm,
  onCancel
}: {
  school: SchoolRecord;
  userCount: number;
  language: Language;
  mode: 'trash' | 'permanent';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isPermanent = mode === 'permanent';

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="delete-school-title">
        <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={onCancel}>
          <X size={18} aria-hidden="true" />
        </button>
        <Trash2 size={30} aria-hidden="true" />
        <div>
          <h2 id="delete-school-title">{tr(language, isPermanent ? 'forceDeleteSchoolTitle' : 'deleteSchoolTitle')}</h2>
          <p className="modal-copy">{tr(language, isPermanent ? 'forceDeleteSchoolQuestion' : 'deleteSchoolQuestion')}</p>
        </div>
        <div className="delete-target-card">
          <strong>{school.name}</strong>
          <span dir="ltr">{school.domain}</span>
          <small>
            {stageNames[language][school.stage]} - {tr(language, 'linkedAccounts')}: {userCount}
          </small>
        </div>
        <p className="modal-warning">{tr(language, isPermanent ? 'forceDeleteSchoolWarning' : 'deleteSchoolWarning')}</p>
        <div className="button-row center">
          <button className="button danger" type="button" onClick={onConfirm}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, isPermanent ? 'forceDelete' : 'delete')}</span>
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

function SchoolProfileView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const [form, setForm] = useState({
    city: school?.city ?? '',
    address: school?.address ?? '',
    phone: school?.phone ?? ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ city: school?.city ?? '', address: school?.address ?? '', phone: school?.phone ?? '' });
  }, [school?.id, school?.city, school?.address, school?.phone]);

  if (!school) {
    return <p className="empty-state">{tr(language, 'noRecords')}</p>;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((record) => (record.id === school.id ? { ...record, ...form } : record))
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  const toggleStream = (stream: SecondaryStream) => {
    setData((previous) => ({
      ...previous,
      schools: previous.schools.map((record) => {
        if (record.id !== school.id) {
          return record;
        }

        const currentStreams = record.streams ?? [];
        const nextStreams = currentStreams.includes(stream)
          ? currentStreams.filter((item) => item !== stream)
          : [...currentStreams, stream];

        return { ...record, streams: nextStreams };
      })
    }));
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, 'lockedScope')}</p>
          <h2>{tr(language, 'schoolProfile')}</h2>
        </div>
        <School size={24} aria-hidden="true" />
      </div>
      <div className="locked-strip">
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedSchool')}: {school.name}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedStage')}: {stageNames[language][school.stage]}
        </span>
        <span>
          <LockKeyhole size={15} aria-hidden="true" />
          {tr(language, 'lockedDomain')}: @{school.domain}
        </span>
      </div>
      {school.stage === 'secondary' && (
        <div className="form-field stream-settings">
          <span>{tr(language, 'secondaryStreams')}</span>
          <div className="checkbox-grid">
            {secondaryStreams.map((stream) => (
              <label className="check-option" key={stream}>
                <input type="checkbox" checked={(school.streams ?? []).includes(stream)} onChange={() => toggleStream(stream)} />
                <span>{secondaryStreamNames[language][stream]}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <form className="form-grid" onSubmit={submit}>
        <Field label={tr(language, 'city')} value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
        <Field label={tr(language, 'address')} value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
        <Field label={tr(language, 'phone')} value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
        {saved && <p className="success-message full">{tr(language, 'saved')}</p>}
        <button className="button primary form-submit" type="submit">
          <Save size={17} aria-hidden="true" />
          <span>{tr(language, 'save')}</span>
        </button>
      </form>
    </section>
  );
}

function AttachmentPreview({ attachment, language }: { attachment: UploadedAttachment; language: Language }) {
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

function useTimeTick(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function AnnouncementsView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const scopedAnnouncementList = scopedAnnouncements(data, currentUser);
  const activeAnnouncements = scopedAnnouncementList
    .filter((announcement) => !isAnnouncementArchived(announcement))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const archivedAnnouncements = canViewAnnouncementArchive(currentUser)
    ? scopedAnnouncementList.filter((announcement) => isAnnouncementArchived(announcement)).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    : [];
  const [form, setForm] = useState<{ title: string; body: string; image: UploadedAttachment | null }>({ title: '', body: '', image: null });
  const [error, setError] = useState('');

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    readAttachmentFromInput(
      event,
      (image) => {
        setForm((previous) => ({ ...previous, image }));
        setError('');
      },
      () => setError(tr(language, 'fileTooLarge'))
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentUser.role !== 'director' || !currentUser.schoolId) {
      return;
    }

    setData((previous) => ({
      ...previous,
      announcements: [
        ...previous.announcements,
        {
          id: makeId('announcement'),
          schoolId: currentUser.schoolId!,
          authorId: currentUser.id,
          title: form.title.trim(),
          body: form.body.trim(),
          image: form.image ?? undefined,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setForm({ title: '', body: '', image: null });
    setError('');
  };

  const renderAnnouncementCard = (announcement: Announcement, archived = false) => {
    const author = data.users.find((user) => user.id === announcement.authorId);
    const announcementSchool = data.schools.find((record) => record.id === announcement.schoolId);
    const expiresAt = announcementExpiresAt(announcement);

    return (
      <article className={archived ? 'message-card archived-message-card' : 'message-card'} key={announcement.id}>
        <div className="message-card-head">
          <h3>{announcement.title}</h3>
          <small>{formatDateTime(language, announcement.createdAt)}</small>
        </div>
        <div className="message-meta">
          {currentUser.role === 'admin' && announcementSchool && <span>{announcementSchool.name}</span>}
          <span>{author?.name ?? '-'}</span>
          <span>{tr(language, archived ? 'archivedAt' : 'visibleUntil')}: {formatDateTime(language, expiresAt)}</span>
        </div>
        <p>{announcement.body}</p>
        {announcement.image && <AttachmentPreview attachment={announcement.image} language={language} />}
      </article>
    );
  };

  return (
    <section className="content-grid">
      {currentUser.role === 'director' && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{school?.name ?? tr(language, 'schoolAnnouncements')}</p>
              <h2>{tr(language, 'announcements')}</h2>
            </div>
            <MessageSquare size={24} aria-hidden="true" />
          </div>
          <form className="form-stack" onSubmit={submit}>
            <Field label={tr(language, 'announcementTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <label>
              <span>{tr(language, 'announcementBody')}</span>
              <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
            </label>
            <label className="file-field">
              <span>{tr(language, 'uploadImage')}</span>
              <input type="file" accept="image/*" onChange={readImage} />
              <Upload size={18} aria-hidden="true" />
            </label>
            {form.image && <AttachmentPreview attachment={form.image} language={language} />}
            {error && <p className="form-error">{error}</p>}
            <button className="button primary" type="submit">
              <Plus size={17} aria-hidden="true" />
              <span>{tr(language, 'publishAnnouncement')}</span>
            </button>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{school?.name ?? tr(language, 'scopedData')}</p>
            <h2>{tr(language, 'activeAnnouncements')}</h2>
          </div>
          <MessageSquare size={24} aria-hidden="true" />
        </div>
        <div className="message-list">
          {activeAnnouncements.length === 0 && <p className="empty-state">{tr(language, 'noAnnouncements')}</p>}
          {activeAnnouncements.map((announcement) => renderAnnouncementCard(announcement))}
        </div>
      </div>

      {canViewAnnouncementArchive(currentUser) && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'announcementArchiveHint')}</p>
              <h2>{tr(language, 'announcementArchive')}</h2>
            </div>
            <Archive size={24} aria-hidden="true" />
          </div>
          <div className="message-list">
            {archivedAnnouncements.length === 0 && <p className="empty-state">{tr(language, 'noArchivedAnnouncements')}</p>}
            {archivedAnnouncements.map((announcement) => renderAnnouncementCard(announcement, true))}
          </div>
        </div>
      )}
    </section>
  );
}

function NotesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'teacher') {
    return <TeacherNotes data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'student') {
    return <StudentNotes data={data} currentUser={currentUser} language={language} />;
  }

  return <p className="empty-state">{tr(language, 'scopedData')}</p>;
}

function TeacherNotes({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const now = useTimeTick();
  const teacherYearClassGroups = assignedYearClassGroups(currentUser);
  const teacherYearStreamClassGroups = assignedYearStreamClassGroups(currentUser);
  const hasStreamAssignments = Object.keys(teacherYearStreamClassGroups).length > 0;
  const teacherYears = assignedSchoolYears(currentUser);
  const firstYear = teacherYears[0] ?? 1;
  const teacherClassesForYear = (year: number) => teacherYearClassGroups[String(year)] ?? [];
  const teacherStreamsForYear = (year: number) => {
    const streamsForYear = secondaryStreamsForYear(school, year);
    const assignedStreams = Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}) as SecondaryStream[];
    return currentUser.stage === 'secondary' ? assignedStreams.filter((stream) => streamsForYear.includes(stream)) : [];
  };
  const teacherClassesForYearAndStream = (year: number, stream: SecondaryStream | '') =>
    stream && hasStreamAssignments ? teacherYearStreamClassGroups[String(year)]?.[stream] ?? [] : teacherClassesForYear(year);
  const firstStream = teacherStreamsForYear(firstYear)[0] ?? '';
  const [form, setForm] = useState({
    title: '',
    body: '',
    targetSchoolYear: firstYear,
    targetStream: firstStream as SecondaryStream | '',
    targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
    attachment: null as UploadedAttachment | null
  });
  const [error, setError] = useState('');
  const notes = scopedNotes(data, currentUser).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const activeNotes = notes.filter((note) => !isNoteArchived(note, now));
  const archivedNotes = notes.filter((note) => isNoteArchived(note, now));
  const streamOptionsForSelectedYear = teacherStreamsForYear(form.targetSchoolYear);
  const streamRequired = currentUser.stage === 'secondary';

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    readAttachmentFromInput(
      event,
      (attachment) => {
        setForm((previous) => ({ ...previous, attachment }));
        setError('');
      },
      () => setError(tr(language, 'fileTooLarge'))
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const classGroup = form.targetClassGroup.trim();
    const targetSubject = teacherSubjectForYear(currentUser, form.targetSchoolYear);
    const targetStream =
      form.targetStream && streamOptionsForSelectedYear.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : undefined;
    const targetClasses =
      currentUser.stage === 'secondary' && targetStream
        ? teacherClassesForYearAndStream(form.targetSchoolYear, targetStream)
        : teacherClassesForYear(form.targetSchoolYear);

    if (
      !currentUser.schoolId ||
      !currentUser.stage ||
      !teacherYears.includes(form.targetSchoolYear) ||
      !targetClasses.some((assignedClass) => sameClassGroup(assignedClass, classGroup)) ||
      (streamRequired && !targetStream)
    ) {
      return;
    }

    setData((previous) => ({
      ...previous,
      notes: [
        ...previous.notes,
        {
          id: makeId('note'),
          schoolId: currentUser.schoolId!,
          stage: currentUser.stage!,
          teacherId: currentUser.id,
          subject: targetSubject,
          title: form.title.trim(),
          body: form.body.trim(),
          schoolYear: form.targetSchoolYear,
          classGroup,
          stream: targetStream,
          attachment: form.attachment ?? undefined,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    setForm({
      title: '',
      body: '',
      targetSchoolYear: firstYear,
      targetStream: firstStream as SecondaryStream | '',
      targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
      attachment: null
    });
    setError('');
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'targetGroup')}</p>
            <h2>{tr(language, 'teacherNotes')}</h2>
          </div>
          <MessageSquare size={24} aria-hidden="true" />
        </div>
        <form className="form-stack" onSubmit={submit}>
          <Field label={tr(language, 'noteTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <label>
            <span>{tr(language, 'noteBody')}</span>
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
          </label>
          <label>
            <span>{tr(language, 'schoolYear')}</span>
            <select
              value={form.targetSchoolYear}
              onChange={(event) => {
                const year = Number(event.target.value);
                const streams = teacherStreamsForYear(year);
                const nextStream = streams.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : streams[0] ?? '';
                const classes =
                  currentUser.stage === 'secondary' && nextStream ? teacherClassesForYearAndStream(year, nextStream) : teacherClassesForYear(year);
                setForm({ ...form, targetSchoolYear: year, targetStream: nextStream, targetClassGroup: classes[0] ?? '' });
              }}
            >
              {teacherYears.map((year) => (
                <option value={year} key={year}>
                  {schoolYearLabel(language, currentUser.stage, year)}
                </option>
              ))}
            </select>
          </label>
          {streamRequired && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={form.targetStream}
                onChange={(event) => {
                  const stream = event.target.value as SecondaryStream | '';
                  const classes = teacherClassesForYearAndStream(form.targetSchoolYear, stream);
                  setForm({ ...form, targetStream: stream, targetClassGroup: classes[0] ?? '' });
                }}
              >
                {streamOptionsForSelectedYear.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, form.targetSchoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{tr(language, 'classGroup')}</span>
            <select value={form.targetClassGroup} onChange={(event) => setForm({ ...form, targetClassGroup: event.target.value })}>
              {(streamRequired && form.targetStream
                ? teacherClassesForYearAndStream(form.targetSchoolYear, form.targetStream as SecondaryStream)
                : teacherClassesForYear(form.targetSchoolYear)
              ).map((classGroup) => (
                <option value={classGroup} key={classGroup}>
                  {classGroup}
                </option>
              ))}
            </select>
          </label>
          <label className="file-field">
            <span>{tr(language, 'uploadFile')}</span>
            <input type="file" onChange={readFile} />
            <Upload size={18} aria-hidden="true" />
          </label>
          {form.attachment && <AttachmentPreview attachment={form.attachment} language={language} />}
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" type="submit">
            <Plus size={17} aria-hidden="true" />
            <span>{tr(language, 'publishNote')}</span>
          </button>
        </form>
      </div>
      <NotesList notes={activeNotes} data={data} language={language} titleKey="activeNotes" emptyKey="noNotes" archived={false} />
      <NotesList
        notes={archivedNotes}
        data={data}
        language={language}
        titleKey="noteArchive"
        subtitleKey="noteArchiveHint"
        emptyKey="noArchivedNotes"
        archived
      />
    </section>
  );
}

function StudentNotes({ data, currentUser, language }: CommonViewProps) {
  const now = useTimeTick();
  const notes = scopedNotes(data, currentUser)
    .filter((note) => !isNoteArchived(note, now))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <section className="content-grid">
      <NotesList notes={notes} data={data} language={language} titleKey="activeNotes" emptyKey="noNotes" archived={false} />
    </section>
  );
}

function NotesList({
  notes,
  data,
  language,
  titleKey = 'teacherNotes',
  subtitleKey = 'scopedData',
  emptyKey = 'noNotes',
  archived = false
}: {
  notes: TeacherNote[];
  data: PlatformData;
  language: Language;
  titleKey?: string;
  subtitleKey?: string;
  emptyKey?: string;
  archived?: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{tr(language, subtitleKey)}</p>
          <h2>{tr(language, titleKey)}</h2>
        </div>
        {archived ? <Archive size={24} aria-hidden="true" /> : <MessageSquare size={24} aria-hidden="true" />}
      </div>
      <div className="message-list">
        {notes.length === 0 && <p className="empty-state">{tr(language, emptyKey)}</p>}
        {notes.map((note) => {
          const teacher = data.users.find((user) => user.id === note.teacherId);
          return (
            <article className={archived ? 'message-card archived-message-card' : 'message-card'} key={note.id}>
              <div className="message-card-head">
                <h3>{note.title}</h3>
                <small>{formatDateTime(language, note.createdAt)}</small>
              </div>
              <div className="message-meta">
                {note.subject && <span>{subjectNames[language][note.subject]}</span>}
                {note.schoolYear && <span>{schoolYearLabel(language, note.stage, note.schoolYear)}</span>}
                {note.stream && <span>{secondaryStreamLabel(language, note.stream, note.schoolYear)}</span>}
                {note.classGroup && <span>{tr(language, 'classGroup')} {note.classGroup}</span>}
                <span>{tr(language, archived ? 'archivedAt' : 'visibleUntil')}: {formatDateTime(language, noteExpiresAt(note))}</span>
              </div>
              <p>{note.body}</p>
              {note.attachment && <AttachmentPreview attachment={note.attachment} language={language} />}
              <small>{teacher?.name ?? '-'}</small>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ExercisesView({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  if (currentUser.role === 'teacher') {
    return <TeacherExercises data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  if (currentUser.role === 'student') {
    return <StudentExercises data={data} setData={setData} currentUser={currentUser} language={language} />;
  }

  return <p className="empty-state">{tr(language, 'scopedData')}</p>;
}

function TeacherExercises({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const school = getSchool(data, currentUser);
  const teacherYearClassGroups = assignedYearClassGroups(currentUser);
  const teacherYearStreamClassGroups = assignedYearStreamClassGroups(currentUser);
  const hasStreamAssignments = Object.keys(teacherYearStreamClassGroups).length > 0;
  const teacherYears = assignedSchoolYears(currentUser);
  const teacherClassesForYear = (year: number) => teacherYearClassGroups[String(year)] ?? [];
  const firstYear = teacherYears[0] ?? 1;
  const compatibleStreamsForYear = (year: number, streams: SecondaryStream[]) => {
    const subject = teacherSubjectForYear(currentUser, year);
    return subject && secondarySubjectStreams[subject]
      ? streams.filter((stream) => secondarySubjectStreams[subject]?.includes(stream))
      : streams;
  };
  const teacherStreamsForYear = (year: number) => {
    const streamsForYear = secondaryStreamsForYear(school, year);
    const assignedStreams = Object.keys(teacherYearStreamClassGroups[String(year)] ?? {}) as SecondaryStream[];
    const subject = teacherSubjectForYear(currentUser, year);
    const subjectStreams = subject ? streamsForSubject(subject, school) : [];
    const streams = assignedStreams.length > 0 ? assignedStreams : subjectStreams;
    return school?.stage === 'secondary'
      ? compatibleStreamsForYear(year, streams).filter((stream) => streamsForYear.includes(stream))
      : compatibleStreamsForYear(year, streams);
  };
  const teacherClassesForYearAndStream = (year: number, stream: SecondaryStream | '') => {
    if (!stream || !hasStreamAssignments) {
      return teacherClassesForYear(year);
    }

    return teacherYearStreamClassGroups[String(year)]?.[stream] ?? [];
  };
  const firstStream = teacherStreamsForYear(firstYear)[0] ?? '';
  const [form, setForm] = useState({
    title: '',
    body: '',
    dueDate: '',
    image: '',
    targetSchoolYear: firstYear,
    targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
    targetStream: firstStream as SecondaryStream | '',
    isVacation: false
  });
  const streamOptionsForSelectedYear = teacherStreamsForYear(form.targetSchoolYear);
  const streamRequired = currentUser.stage === 'secondary';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const exercises = scopedExercises(data, currentUser);

  useEffect(() => {
    if (streamRequired && (!form.targetStream || !streamOptionsForSelectedYear.includes(form.targetStream))) {
      const nextStream = streamOptionsForSelectedYear[0] ?? '';
      const nextClassGroup = teacherClassesForYearAndStream(form.targetSchoolYear, nextStream)[0] ?? '';

      if (form.targetStream !== nextStream || form.targetClassGroup !== nextClassGroup) {
        setForm((previous) => ({
          ...previous,
          targetStream: nextStream,
          targetClassGroup: nextClassGroup
        }));
      }
    }
  }, [form.targetClassGroup, form.targetSchoolYear, form.targetStream, streamRequired, streamOptionsForSelectedYear]);

  const readImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setForm((previous) => ({ ...previous, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const classGroup = form.targetClassGroup.trim();
    const targetSubject = teacherSubjectForYear(currentUser, form.targetSchoolYear);
    const targetStream =
      form.targetStream && streamOptionsForSelectedYear.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : undefined;
    const targetClasses =
      currentUser.stage === 'secondary' && targetStream
        ? teacherClassesForYearAndStream(form.targetSchoolYear, targetStream)
        : teacherClassesForYear(form.targetSchoolYear);
    if (
      !currentUser.schoolId ||
      !currentUser.stage ||
      !targetSubject ||
      !teacherYears.includes(form.targetSchoolYear) ||
      !targetClasses.some((assignedClass) => sameClassGroup(assignedClass, classGroup)) ||
      (streamRequired && !targetStream)
    ) {
      return;
    }

    if (form.dueDate < todayIso()) {
      setError(tr(language, 'dueDatePast'));
      return;
    }

    if (editingId) {
      setData((previous) => ({
        ...previous,
        exercises: previous.exercises.map((exercise) =>
          exercise.id === editingId && exercise.teacherId === currentUser.id
            ? {
                ...exercise,
                title: form.title.trim(),
                body: form.body.trim(),
                dueDate: form.dueDate,
                image: form.image || undefined,
                subject: targetSubject,
                schoolYear: form.targetSchoolYear,
                classGroup,
                stream: targetStream,
                isVacation: form.isVacation || undefined
              }
            : exercise
        )
      }));
      setEditingId(null);
    } else {
      setData((previous) => ({
        ...previous,
        exercises: [
          ...previous.exercises,
          {
            id: makeId('exercise'),
            title: form.title.trim(),
            body: form.body.trim(),
            dueDate: form.dueDate,
            image: form.image || undefined,
            subject: targetSubject,
            schoolId: currentUser.schoolId!,
            stage: currentUser.stage!,
            schoolYear: form.targetSchoolYear,
            classGroup,
            stream: targetStream,
            teacherId: currentUser.id,
            isVacation: form.isVacation || undefined,
            createdAt: new Date().toISOString().slice(0, 10)
          }
      ]
    }));
    }

    setError('');
    setForm({
      title: '',
      body: '',
      dueDate: '',
      image: '',
      targetSchoolYear: firstYear,
      targetClassGroup: teacherClassesForYearAndStream(firstYear, firstStream)[0] ?? teacherClassesForYear(firstYear)[0] ?? '',
      targetStream: firstStream as SecondaryStream | '',
      isVacation: false
    });
  };

  const editExercise = (exercise: Exercise) => {
    if (exercise.teacherId !== currentUser.id) {
      return;
    }

    setEditingId(exercise.id);
    setError('');
    setForm({
      title: exercise.title,
      body: exercise.body,
      dueDate: exercise.dueDate < todayIso() ? todayIso() : exercise.dueDate,
      image: exercise.image ?? '',
      targetSchoolYear: exercise.schoolYear ?? firstYear,
      targetClassGroup:
        exercise.classGroup ??
        teacherClassesForYearAndStream(exercise.schoolYear ?? firstYear, exercise.stream ?? firstStream)[0] ??
        teacherClassesForYear(exercise.schoolYear ?? firstYear)[0] ??
        '',
      targetStream: exercise.stream ?? firstStream,
      isVacation: Boolean(exercise.isVacation)
    });
  };

  const deleteExercise = (exercise: Exercise) => {
    if (exercise.teacherId !== currentUser.id) {
      return;
    }

    setData((previous) => ({
      ...previous,
      exercises: previous.exercises.filter((record) => record.id !== exercise.id),
      completions: Object.fromEntries(
        Object.entries(previous.completions).map(([userId, done]) => [userId, done.filter((exerciseId) => exerciseId !== exercise.id)])
      ),
      completionDates: Object.fromEntries(
        Object.entries(previous.completionDates).map(([userId, dates]) => [
          userId,
          Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => exerciseId !== exercise.id))
        ])
      ),
      feedback: Object.fromEntries(
        Object.entries(previous.feedback).map(([userId, feedback]) => [
          userId,
          Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => exerciseId !== exercise.id))
        ])
      )
    }));
  };

  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'onlySubject')}</p>
            <h2>{teacherSubjectsLabel(language, currentUser)}</h2>
          </div>
          <BookOpen size={24} aria-hidden="true" />
        </div>
        <div className="locked-strip">
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {school?.name}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {currentUser.stage && stageNames[language][currentUser.stage]}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {schoolYearsLabel(language, currentUser)}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {tr(language, 'classGroups')} {yearClassGroupsLabel(language, currentUser)}
          </span>
          <span>
            <LockKeyhole size={15} aria-hidden="true" />
            {teacherSubjectsLabel(language, currentUser)}
          </span>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <Field label={tr(language, 'exerciseTitle')} value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <label>
            <span>{tr(language, 'exerciseBody')}</span>
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required rows={5} />
          </label>
          <Field
            label={tr(language, 'dueDate')}
            value={form.dueDate}
            onChange={(value) => setForm({ ...form, dueDate: value })}
            type="date"
            min={todayIso()}
            required
          />
          <label>
            <span>{tr(language, 'schoolYear')}</span>
            <select
              value={form.targetSchoolYear}
              onChange={(event) => {
                const year = Number(event.target.value);
                const streams = teacherStreamsForYear(year);
                const nextStream = streams.includes(form.targetStream as SecondaryStream) ? (form.targetStream as SecondaryStream) : streams[0] ?? '';
                const classes =
                  currentUser.stage === 'secondary' && nextStream ? teacherClassesForYearAndStream(year, nextStream) : teacherClassesForYear(year);
                setForm({
                  ...form,
                  targetSchoolYear: year,
                  targetStream: nextStream,
                  targetClassGroup: classes.some((classGroup) => sameClassGroup(classGroup, form.targetClassGroup))
                    ? form.targetClassGroup
                    : classes[0] ?? ''
                });
              }}
            >
              {teacherYears.map((year) => (
                <option value={year} key={year}>
                  {schoolYearLabel(language, currentUser.stage, year)}
                </option>
              ))}
            </select>
          </label>
          {streamRequired && (
            <label>
              <span>{tr(language, 'stream')}</span>
              <select
                value={form.targetStream}
                onChange={(event) => {
                  const stream = event.target.value as SecondaryStream | '';
                  const classes = teacherClassesForYearAndStream(form.targetSchoolYear, stream);
                  setForm({
                    ...form,
                    targetStream: stream,
                    targetClassGroup: classes.some((classGroup) => sameClassGroup(classGroup, form.targetClassGroup))
                      ? form.targetClassGroup
                      : classes[0] ?? ''
                  });
                }}
              >
                {streamOptionsForSelectedYear.map((stream) => (
                  <option value={stream} key={stream}>
                    {secondaryStreamLabel(language, stream, form.targetSchoolYear)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>{tr(language, 'classGroup')}</span>
            <select value={form.targetClassGroup} onChange={(event) => setForm({ ...form, targetClassGroup: event.target.value })}>
              {(currentUser.stage === 'secondary' && form.targetStream
                ? teacherClassesForYearAndStream(form.targetSchoolYear, form.targetStream as SecondaryStream)
                : teacherClassesForYear(form.targetSchoolYear)
              ).map((classGroup) => (
                <option value={classGroup} key={classGroup}>
                  {classGroup}
                </option>
              ))}
            </select>
          </label>
          {data.settings.allowExerciseImages && (
            <label className="file-field">
              <span>{tr(language, 'uploadImage')}</span>
              <input type="file" accept="image/*" onChange={readImage} />
              <Upload size={18} aria-hidden="true" />
            </label>
          )}
          {form.image && <img className="image-preview" src={form.image} alt={tr(language, 'imagePreview')} />}
          <label className="toggle-row">
            <span>{tr(language, 'vacationExercise')}</span>
            <input type="checkbox" checked={form.isVacation} onChange={(event) => setForm({ ...form, isVacation: event.target.checked })} />
          </label>
          <p className="hint">{tr(language, 'targetGroup')}</p>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" type="submit">
            {editingId ? <Save size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
            <span>{editingId ? tr(language, 'updateExercise') : tr(language, 'publishExercise')}</span>
          </button>
        </form>
      </div>

      <ExerciseList
        exercises={exercises}
        data={data}
        language={language}
        currentUser={currentUser}
        onEdit={editExercise}
        onDelete={deleteExercise}
      />
    </section>
  );
}

function StudentExercises({ data, setData, currentUser, language }: CommonViewProps & { setData: DataSetter }) {
  const exercises = scopedExercises(data, currentUser);
  const completed = data.completions[currentUser.id] ?? [];
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [pendingDoneExercise, setPendingDoneExercise] = useState<Exercise | null>(null);
  const visibleExerciseIds = new Set(exercises.map((exercise) => exercise.id));
  const completedVisible = completed.filter((exerciseId) => visibleExerciseIds.has(exerciseId));
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;
  const subjectGroups = exerciseSubjectGroups(exercises);
  const weeklyExercises = exercises.filter((exercise) => isIsoInCurrentWeek(exercise.dueDate));
  const weeklyCompleted = weeklyExercises.filter((exercise) => isExerciseCompletedThisWeek(data, currentUser.id, exercise)).length;
  const weeklyRate = weeklyExercises.length > 0 ? Math.round((weeklyCompleted / weeklyExercises.length) * 100) : 0;

  const markDone = (exerciseId: string) => {
    setData((previous) => {
      const existing = previous.completions[currentUser.id] ?? [];
      if (existing.includes(exerciseId)) {
        return previous;
      }

      return {
        ...previous,
        completions: {
          ...previous.completions,
          [currentUser.id]: [...existing, exerciseId]
        },
        completionDates: {
          ...previous.completionDates,
          [currentUser.id]: {
            ...(previous.completionDates[currentUser.id] ?? {}),
            [exerciseId]: todayIso()
          }
        }
      };
    });
  };

  const updateFeedback = (exerciseId: string, update: Partial<HomeworkFeedback>) => {
    setData((previous) => {
      if (isExerciseCompletedBy(previous, currentUser.id, exerciseId)) {
        return previous;
      }

      const currentFeedback = previous.feedback[currentUser.id]?.[exerciseId] ?? { updatedAt: new Date().toISOString() };
      return {
        ...previous,
        feedback: {
          ...previous.feedback,
          [currentUser.id]: {
            ...(previous.feedback[currentUser.id] ?? {}),
            [exerciseId]: {
              ...currentFeedback,
              ...update,
              updatedAt: new Date().toISOString()
            }
          }
        }
      };
    });
  };

  const requestDoneConfirmation = (exercise: Exercise) => {
    if (completed.includes(exercise.id)) {
      return;
    }

    setPendingDoneExercise(exercise);
  };

  const confirmDone = () => {
    if (!pendingDoneExercise) {
      return;
    }

    markDone(pendingDoneExercise.id);
    setPendingDoneExercise(null);
  };

  const renderFeedbackSummary = (exercise: Exercise) => {
    const feedback = feedbackForStudent(data, currentUser.id, exercise.id);
    if (!feedback?.difficulty && !feedback?.note?.trim()) {
      return null;
    }

    return (
      <div className="feedback-summary">
        {feedback.difficulty && (
          <span>
            <Star size={14} aria-hidden="true" />
            {tr(language, homeworkDifficultyLabelKey(feedback.difficulty))}
          </span>
        )}
        {feedback.note?.trim() && (
          <span>
            <MessageSquare size={14} aria-hidden="true" />
            {feedback.note.trim()}
          </span>
        )}
      </div>
    );
  };

  const renderFeedbackControls = (exercise: Exercise) => {
    const feedback = feedbackForStudent(data, currentUser.id, exercise.id);
    const isDone = completed.includes(exercise.id);

    if (isDone) {
      return (
        <div className="student-feedback-box locked-feedback-box">
          <span>{tr(language, 'difficultyRating')}</span>
          {renderFeedbackSummary(exercise) ?? <p className="feedback-lock-note">{tr(language, 'noSubmittedFeedback')}</p>}
          <p className="feedback-lock-note with-icon">
            <LockKeyhole size={15} aria-hidden="true" />
            <span>{tr(language, 'lockedFeedbackAfterDone')}</span>
          </p>
        </div>
      );
    }

    return (
      <div className="student-feedback-box">
        <span>{tr(language, 'difficultyRating')}</span>
        <div className="rating-row">
          {homeworkDifficulties.map((difficulty) => (
            <button
              key={difficulty}
              className={feedback?.difficulty === difficulty ? 'rating-button active' : 'rating-button'}
              type="button"
              onClick={() => updateFeedback(exercise.id, { difficulty })}
            >
              <Star size={16} aria-hidden="true" />
              <span>{tr(language, homeworkDifficultyLabelKey(difficulty))}</span>
            </button>
          ))}
        </div>
        <label>
          <span>{tr(language, 'familyNote')}</span>
          <textarea
            value={feedback?.note ?? ''}
            rows={3}
            onChange={(event) => updateFeedback(exercise.id, { note: event.target.value })}
          />
        </label>
      </div>
    );
  };

  return (
    <section className="content-grid">
      <div className="stats-grid">
        <StatCard icon={BookOpen} label={tr(language, 'assignedExercises')} value={exercises.length.toString()} tone="blue" />
        <StatCard icon={CheckCircle2} label={tr(language, 'completedExercises')} value={completedVisible.length.toString()} tone="green" />
        <StatCard icon={CalendarDays} label={tr(language, 'weeklyRequired')} value={weeklyExercises.length.toString()} tone="blue" />
        <StatCard icon={CheckCircle2} label={tr(language, 'weeklyDone')} value={weeklyCompleted.toString()} tone="green" />
        <StatCard icon={BarChart3} label={tr(language, 'weeklyRate')} value={`${weeklyRate}%`} tone="teal" />
        <StatCard
          icon={CircleOff}
          label={tr(language, 'remainingExercises')}
          value={Math.max(exercises.length - completedVisible.length, 0).toString()}
          tone="amber"
        />
      </div>
      <div className="homework-subject-groups">
        {exercises.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
        {subjectGroups.map((group) => {
          const Icon = subjectIcons[group.subject] ?? BookOpen;
          const teacherNames = [
            ...new Set(
              group.exercises
                .map((exercise) => data.users.find((user) => user.id === exercise.teacherId)?.name)
                .filter((name): name is string => Boolean(name))
            )
          ];
          return (
            <details className="homework-subject-group" key={group.subject} open>
              <summary className="subject-group-heading">
                <div className="subject-title">
                  <span className="subject-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{subjectNames[language][group.subject]}</strong>
                    <small>
                      {tr(language, 'groupedBySubject')}
                      {teacherNames.length > 0 ? ` · ${teacherNames.join('، ')}` : ''}
                    </small>
                  </div>
                </div>
                <span className="subject-summary-actions">
                  <span className="subject-count">{group.exercises.length}</span>
                  <ChevronDown size={17} aria-hidden="true" />
                </span>
              </summary>
              <div className="exercise-grid">
                {group.exercises.map((exercise) => {
                  const teacher = data.users.find((user) => user.id === exercise.teacherId);
                  const isDone = completed.includes(exercise.id);
                  return (
                    <article className="exercise-card" key={exercise.id}>
                      {exercise.image && <img src={exercise.image} alt="" />}
                      <div className="exercise-meta">
                        <span>{subjectNames[language][exercise.subject]}</span>
                        {exercise.schoolYear && <span>{schoolYearLabel(language, exercise.stage, exercise.schoolYear)}</span>}
                        {exercise.classGroup && <span>{tr(language, 'classGroup')} {exercise.classGroup}</span>}
                        {exercise.stream && <span>{secondaryStreamLabel(language, exercise.stream, exercise.schoolYear)}</span>}
                        {exercise.isVacation && <span>{tr(language, 'vacationHomework')}</span>}
                        <span>{exercise.dueDate}</span>
                      </div>
                      <h3>{exercise.title}</h3>
                      <p>{exercise.body}</p>
                      <small>
                        {tr(language, 'byTeacher')}: {teacher?.name ?? '-'}
                      </small>
                      {renderFeedbackSummary(exercise)}
                      <div className="button-row homework-actions">
                        <button className="button ghost" type="button" onClick={() => setSelectedExerciseId(exercise.id)}>
                          <BookOpen size={17} aria-hidden="true" />
                          <span>{tr(language, 'viewHomework')}</span>
                        </button>
                        <button className={isDone ? 'button success' : 'button primary'} type="button" disabled={isDone} onClick={() => requestDoneConfirmation(exercise)}>
                          <CheckCircle2 size={17} aria-hidden="true" />
                          <span>{isDone ? tr(language, 'completed') : tr(language, 'done')}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
      {selectedExercise && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedExerciseId(null)}>
          <article className="modal homework-modal" role="dialog" aria-modal="true" aria-labelledby="homework-title" onClick={(event) => event.stopPropagation()}>
            <button className="icon-button close" type="button" title={tr(language, 'cancel')} onClick={() => setSelectedExerciseId(null)}>
              <X size={16} aria-hidden="true" />
            </button>
            <div className="homework-modal-heading">
              <span>{tr(language, 'homeworkDetails')}</span>
              <h2 id="homework-title">{selectedExercise.title}</h2>
            </div>
            <div className="exercise-meta homework-meta">
              <span>{subjectNames[language][selectedExercise.subject]}</span>
              {selectedExercise.schoolYear && <span>{schoolYearLabel(language, selectedExercise.stage, selectedExercise.schoolYear)}</span>}
              {selectedExercise.classGroup && <span>{tr(language, 'classGroup')} {selectedExercise.classGroup}</span>}
              {selectedExercise.stream && <span>{secondaryStreamLabel(language, selectedExercise.stream, selectedExercise.schoolYear)}</span>}
              {selectedExercise.isVacation && <span>{tr(language, 'vacationHomework')}</span>}
              <span>{selectedExercise.dueDate}</span>
            </div>
            {selectedExercise.image && <img className="homework-image" src={selectedExercise.image} alt={tr(language, 'imagePreview')} />}
            <p className="homework-body">{selectedExercise.body}</p>
            <small className="homework-teacher">
              {tr(language, 'byTeacher')}: {data.users.find((user) => user.id === selectedExercise.teacherId)?.name ?? '-'}
            </small>
            {renderFeedbackControls(selectedExercise)}
            <div className="button-row center">
              <button
                className={completed.includes(selectedExercise.id) ? 'button success' : 'button primary'}
                type="button"
                disabled={completed.includes(selectedExercise.id)}
                onClick={() => requestDoneConfirmation(selectedExercise)}
              >
                <CheckCircle2 size={17} aria-hidden="true" />
                <span>{completed.includes(selectedExercise.id) ? tr(language, 'completed') : tr(language, 'done')}</span>
              </button>
            </div>
          </article>
        </div>
      )}
      {pendingDoneExercise && (
        <DoneConfirmDialog
          language={language}
          exerciseTitle={pendingDoneExercise.title}
          onConfirm={confirmDone}
          onCancel={() => setPendingDoneExercise(null)}
        />
      )}
    </section>
  );
}

function ExerciseList({
  exercises,
  data,
  language,
  currentUser,
  onEdit,
  onDelete
}: {
  exercises: Exercise[];
  data: PlatformData;
  language: Language;
  currentUser: PlatformUser;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}) {
  const activeTeacherExercises = currentUser.role === 'teacher' ? exercises.filter((exercise) => !isPastExercise(exercise)) : exercises;
  const archivedTeacherExercises = currentUser.role === 'teacher' ? exercises.filter(isPastExercise) : [];
  const teacherGroups = currentUser.role === 'teacher' ? groupExercisesByTeacherTarget(activeTeacherExercises) : [];
  const archiveGroups = currentUser.role === 'teacher' ? groupExercisesByMonth(archivedTeacherExercises, language) : [];
  const renderExerciseCard = (exercise: Exercise) => {
    const teacher = data.users.find((user) => user.id === exercise.teacherId);
    const canMutate = currentUser.role === 'teacher' && exercise.teacherId === currentUser.id;
    const completionStats = currentUser.role === 'teacher' ? completionStatsForExercise(data, exercise) : null;
    const feedbackStats = currentUser.role === 'teacher' ? feedbackStatsForExercise(data, exercise) : null;

    return (
      <article className="exercise-card" key={exercise.id}>
        {exercise.image && <img src={exercise.image} alt="" />}
        <div className="exercise-meta">
          <span>{subjectNames[language][exercise.subject]}</span>
          {exercise.schoolYear && <span>{schoolYearLabel(language, exercise.stage, exercise.schoolYear)}</span>}
          {exercise.classGroup && <span>{tr(language, 'classGroup')} {exercise.classGroup}</span>}
          {exercise.stream && <span>{secondaryStreamLabel(language, exercise.stream, exercise.schoolYear)}</span>}
          {exercise.isVacation && <span>{tr(language, 'vacationHomework')}</span>}
          <span>{exercise.dueDate}</span>
        </div>
        <h3>{exercise.title}</h3>
        <p>{exercise.body}</p>
        <small>
          {tr(language, 'byTeacher')}: {teacher?.name ?? '-'} · {tr(language, 'createdAt')}: {exercise.createdAt}
        </small>
        {completionStats && feedbackStats && (
          <div className="teacher-homework-insights">
            <div>
              <span>{tr(language, 'completedByStudents')}</span>
              <strong>
                {completionStats.completed}/{completionStats.total} · {completionStats.rate}%
              </strong>
            </div>
            <div>
              <span>{tr(language, 'difficultyRating')}</span>
              <strong>
                {tr(language, 'easyCount')}: {feedbackStats.easy} · {tr(language, 'mediumCount')}: {feedbackStats.medium} ·{' '}
                {tr(language, 'hardCount')}: {feedbackStats.hard}
              </strong>
            </div>
            <details className="feedback-notes">
              <summary>
                <MessageSquare size={15} aria-hidden="true" />
                <span>{tr(language, 'feedbackFromFamily')}</span>
                <strong>{feedbackStats.notes.length}</strong>
              </summary>
              <div>
                {feedbackStats.notes.length === 0 && <p className="empty-state">{tr(language, 'noFeedback')}</p>}
                {feedbackStats.notes.map((entry) => (
                  <article key={`${exercise.id}-${entry.student.id}`}>
                    <strong>{entry.student.name}</strong>
                    {entry.feedback.difficulty && (
                      <span>{tr(language, homeworkDifficultyLabelKey(entry.feedback.difficulty))}</span>
                    )}
                    <p>{entry.feedback.note}</p>
                  </article>
                ))}
              </div>
            </details>
          </div>
        )}
        {canMutate && (
          <div className="button-row">
            <button className="button ghost" type="button" onClick={() => onEdit(exercise)}>
              <Edit3 size={16} aria-hidden="true" />
              <span>{tr(language, 'edit')}</span>
            </button>
            <button className="button danger" type="button" onClick={() => onDelete(exercise)}>
              <Trash2 size={16} aria-hidden="true" />
              <span>{tr(language, 'delete')}</span>
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <p>{currentUser.role === 'teacher' ? tr(language, 'groupedByTarget') : tr(language, 'scopedData')}</p>
          <h2>{tr(language, 'exercises')}</h2>
        </div>
        <BookOpen size={24} aria-hidden="true" />
      </div>
      {currentUser.role === 'teacher' ? (
        <div className="teacher-exercise-groups">
          {exercises.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {activeTeacherExercises.length === 0 && exercises.length > 0 && <p className="empty-state">{tr(language, 'homeworkArchive')}</p>}
          {teacherGroups.map((yearGroup) => {
            const firstExercise = yearGroup.streams.flatMap((streamGroup) => streamGroup.classes.flatMap((classGroup) => classGroup.exercises))[0];
            return (
              <section className="teacher-year-group" key={String(yearGroup.schoolYear || 'no-year')}>
                <div className="teacher-year-heading">
                  <span>{yearGroup.schoolYear ? schoolYearLabel(language, firstExercise?.stage, yearGroup.schoolYear) : '-'}</span>
                  <strong>{yearGroup.count}</strong>
                </div>
                {yearGroup.streams.map((streamGroup) => (
                  <section className="teacher-exercise-stream" key={`${yearGroup.schoolYear || 'no-year'}-${streamGroup.stream || 'no-stream'}`}>
                    {currentUser.stage === 'secondary' && (
                      <div className="teacher-stream-heading">
                        <span>{streamGroup.stream ? secondaryStreamLabel(language, streamGroup.stream, firstExercise?.schoolYear) : '-'}</span>
                        <strong>{streamGroup.count}</strong>
                      </div>
                    )}
                    {streamGroup.classes.map((classGroup) => (
                      <details
                        className="teacher-class-group"
                        key={`${yearGroup.schoolYear || 'no-year'}-${streamGroup.stream || 'no-stream'}-${classGroup.classGroup}`}
                      >
                        <summary className="teacher-class-heading">
                          <span>{tr(language, 'classGroup')} {classGroup.classGroup}</span>
                          <span className="subject-summary-actions">
                            <small>{classGroup.exercises.length}</small>
                            <ChevronDown size={17} aria-hidden="true" />
                          </span>
                        </summary>
                        <div className="exercise-grid compact-list">{classGroup.exercises.map(renderExerciseCard)}</div>
                      </details>
                    ))}
                  </section>
                ))}
              </section>
            );
          })}
          {archiveGroups.length > 0 && (
            <section className="homework-archive">
              <div className="subject-group-heading">
                <div className="subject-title">
                  <span className="subject-icon">
                    <Archive size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{tr(language, 'homeworkArchive')}</strong>
                    <small>{tr(language, 'archiveByMonth')}</small>
                  </div>
                </div>
                <span className="subject-count">{archivedTeacherExercises.length}</span>
              </div>
              {archiveGroups.map((group) => (
                <details className="archive-month" key={group.key}>
                  <summary>
                    <span>{group.label}</span>
                    <strong>{group.exercises.length}</strong>
                  </summary>
                  <div className="exercise-grid compact-list">{group.exercises.map(renderExerciseCard)}</div>
                </details>
              ))}
            </section>
          )}
        </div>
      ) : (
        <div className="exercise-grid compact-list">
          {exercises.length === 0 && <p className="empty-state">{tr(language, 'noRecords')}</p>}
          {[...exercises].sort(sortExercises).map(renderExerciseCard)}
        </div>
      )}
    </div>
  );
}

function SettingsView({
  data,
  setData,
  currentUser,
  language,
  theme,
  onLanguageChange,
  onThemeChange,
  onResetDemo
}: CommonViewProps & {
  setData: DataSetter;
  theme: Theme;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: Theme) => void;
  onResetDemo: () => void;
}) {
  return (
    <section className="content-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <p>{tr(language, 'settingsLanguageText')}</p>
            <h2>{tr(language, 'chooseLanguage')}</h2>
          </div>
          <Globe2 size={24} aria-hidden="true" />
        </div>
        <div className="segmented">
          {languages.map((option) => (
            <button
              key={option}
              type="button"
              className={language === option ? 'active' : ''}
              onClick={() => onLanguageChange(option)}
            >
              <span className="language-flag" aria-hidden="true">{languageFlags[option]}</span>
              <span>{languageNames[option]}</span>
            </button>
          ))}
        </div>
        <label className="toggle-row settings-toggle">
          <span>{tr(language, 'darkMode')}</span>
          <input
            type="checkbox"
            checked={theme === 'dark'}
            onChange={(event) => onThemeChange(event.target.checked ? 'dark' : 'light')}
          />
        </label>
      </div>

      {currentUser.role === 'admin' && (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <p>{tr(language, 'adminPower')}</p>
              <h2>{tr(language, 'systemSettings')}</h2>
            </div>
            <Settings size={24} aria-hidden="true" />
          </div>
          <label className="toggle-row">
            <span>{tr(language, 'allowImages')}</span>
            <input
              type="checkbox"
              checked={data.settings.allowExerciseImages}
              onChange={(event) =>
                setData((previous) => ({
                  ...previous,
                  settings: { ...previous.settings, allowExerciseImages: event.target.checked }
                }))
              }
            />
          </label>
          <label className="toggle-row">
            <span>{tr(language, 'maintenanceMode')}</span>
            <input
              type="checkbox"
              checked={data.settings.maintenanceMode}
              onChange={(event) =>
                setData((previous) => ({
                  ...previous,
                  settings: { ...previous.settings, maintenanceMode: event.target.checked }
                }))
              }
            />
          </label>
          <button className="button danger" type="button" onClick={onResetDemo}>
            <Trash2 size={17} aria-hidden="true" />
            <span>{tr(language, 'resetDemo')}</span>
          </button>
        </div>
      )}
    </section>
  );
}

function ConfirmDialog({ language, onConfirm, onCancel }: { language: Language; onConfirm: () => void; onCancel: () => void }) {
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

function AppInfoDialog({ language, onClose }: { language: Language; onClose: () => void }) {
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

function DoneConfirmDialog({
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

function Field({
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

function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'teal' | 'amber' | 'blue' | 'green' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResponsiveTable({
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

export default App;
