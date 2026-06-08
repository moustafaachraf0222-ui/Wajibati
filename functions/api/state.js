const STATE_ID = 'main';
const secondaryStreams = [
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

const seedData = {
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

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type'
};

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
}

function applyDeletedSchoolTombstones(data) {
  const deletedSchoolIds = new Set(data.deletedSchoolIds ?? []);
  if (deletedSchoolIds.size === 0) {
    return data;
  }

  const removedUserIds = new Set(data.users.filter((user) => user.schoolId && deletedSchoolIds.has(user.schoolId)).map((user) => user.id));
  const removedExerciseIds = new Set(data.exercises.filter((exercise) => deletedSchoolIds.has(exercise.schoolId)).map((exercise) => exercise.id));

  return {
    ...data,
    schools: data.schools.filter((school) => !deletedSchoolIds.has(school.id)),
    users: data.users.filter((user) => !user.schoolId || !deletedSchoolIds.has(user.schoolId)),
    studentActivations: data.studentActivations.filter((activation) => !deletedSchoolIds.has(activation.schoolId)),
    exercises: data.exercises.filter((exercise) => !deletedSchoolIds.has(exercise.schoolId)),
    announcements: data.announcements.filter((announcement) => !deletedSchoolIds.has(announcement.schoolId)),
    notes: data.notes.filter((note) => !deletedSchoolIds.has(note.schoolId)),
    absenceSchedules: data.absenceSchedules.filter((schedule) => !deletedSchoolIds.has(schedule.schoolId)),
    absenceRecords: data.absenceRecords.filter((record) => !deletedSchoolIds.has(record.schoolId)),
    absenceReports: data.absenceReports.filter((report) => !deletedSchoolIds.has(report.schoolId)),
    laboratories: data.laboratories.filter((lab) => !deletedSchoolIds.has(lab.schoolId)),
    labDevices: data.labDevices.filter((device) => !deletedSchoolIds.has(device.schoolId)),
    labFaultReports: data.labFaultReports.filter((report) => !deletedSchoolIds.has(report.schoolId)),
    completions: Object.fromEntries(
      Object.entries(data.completions).filter(([userId]) => !removedUserIds.has(userId)).map(([userId, done]) => [
        userId,
        Array.isArray(done) ? done.filter((exerciseId) => !removedExerciseIds.has(exerciseId)) : []
      ])
    ),
    completionDates: Object.fromEntries(
      Object.entries(data.completionDates).filter(([userId]) => !removedUserIds.has(userId)).map(([userId, dates]) => [
        userId,
        dates && typeof dates === 'object' ? Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !removedExerciseIds.has(exerciseId))) : {}
      ])
    ),
    feedback: Object.fromEntries(
      Object.entries(data.feedback).filter(([userId]) => !removedUserIds.has(userId)).map(([userId, feedback]) => [
        userId,
        feedback && typeof feedback === 'object' ? Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !removedExerciseIds.has(exerciseId))) : {}
      ])
    ),
    pushTokens: Object.fromEntries(Object.entries(data.pushTokens).filter(([userId]) => !removedUserIds.has(userId)))
  };
}

function applyDeletedExerciseTombstones(data) {
  const deletedExerciseIds = new Set(data.deletedExerciseIds ?? []);
  if (deletedExerciseIds.size === 0) {
    return data;
  }

  return {
    ...data,
    exercises: data.exercises.filter((exercise) => !deletedExerciseIds.has(exercise.id)),
    completions: Object.fromEntries(
      Object.entries(data.completions).map(([userId, done]) => [
        userId,
        Array.isArray(done) ? done.filter((exerciseId) => !deletedExerciseIds.has(exerciseId)) : []
      ])
    ),
    completionDates: Object.fromEntries(
      Object.entries(data.completionDates).map(([userId, dates]) => [
        userId,
        dates && typeof dates === 'object' ? Object.fromEntries(Object.entries(dates).filter(([exerciseId]) => !deletedExerciseIds.has(exerciseId))) : {}
      ])
    ),
    feedback: Object.fromEntries(
      Object.entries(data.feedback).map(([userId, feedback]) => [
        userId,
        feedback && typeof feedback === 'object' ? Object.fromEntries(Object.entries(feedback).filter(([exerciseId]) => !deletedExerciseIds.has(exerciseId))) : {}
      ])
    )
  };
}

function applyDeletedNoteTombstones(data) {
  const deletedNoteIds = new Set(data.deletedNoteIds ?? []);
  if (deletedNoteIds.size === 0) {
    return data;
  }

  return {
    ...data,
    notes: data.notes.filter((note) => !deletedNoteIds.has(note.id))
  };
}

function applyDeletedScheduleTombstones(data) {
  const deletedScheduleIds = new Set(data.deletedScheduleIds ?? []);
  if (deletedScheduleIds.size === 0) {
    return data;
  }

  return {
    ...data,
    absenceSchedules: data.absenceSchedules.filter((schedule) => !deletedScheduleIds.has(schedule.id))
  };
}

function applyDeletionTombstones(data) {
  return applyDeletedScheduleTombstones(applyDeletedNoteTombstones(applyDeletedExerciseTombstones(applyDeletedSchoolTombstones(data))));
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers ?? {})
    }
  });
}

function normalizeState(value) {
  if (!value || typeof value !== 'object') {
    return structuredClone(seedData);
  }

  const normalized = {
    ...structuredClone(seedData),
    ...value,
    schools: Array.isArray(value.schools)
      ? value.schools.map((school) =>
          school.stage === 'secondary' && (!Array.isArray(school.streams) || school.streams.length === 0)
            ? { ...school, streams: [...secondaryStreams] }
            : school
        )
      : [],
    users: Array.isArray(value.users) ? value.users : seedData.users,
    studentActivations: Array.isArray(value.studentActivations) ? value.studentActivations : [],
    exercises: Array.isArray(value.exercises) ? value.exercises : [],
    announcements: Array.isArray(value.announcements) ? value.announcements : [],
    notes: Array.isArray(value.notes) ? value.notes : [],
    completions: value.completions && typeof value.completions === 'object' ? value.completions : {},
    completionDates: value.completionDates && typeof value.completionDates === 'object' ? value.completionDates : {},
    feedback: value.feedback && typeof value.feedback === 'object' ? value.feedback : {},
    absenceSchedules: Array.isArray(value.absenceSchedules) ? value.absenceSchedules : [],
    absenceRecords: Array.isArray(value.absenceRecords) ? value.absenceRecords : [],
    absenceReports: Array.isArray(value.absenceReports) ? value.absenceReports : [],
    laboratories: Array.isArray(value.laboratories) ? value.laboratories : [],
    labDevices: Array.isArray(value.labDevices) ? value.labDevices : [],
    labFaultReports: Array.isArray(value.labFaultReports) ? value.labFaultReports : [],
    pushTokens: value.pushTokens && typeof value.pushTokens === 'object' ? value.pushTokens : {},
    deletedSchoolIds: Array.isArray(value.deletedSchoolIds) ? uniqueStrings(value.deletedSchoolIds) : [],
    deletedExerciseIds: Array.isArray(value.deletedExerciseIds) ? uniqueStrings(value.deletedExerciseIds) : [],
    deletedNoteIds: Array.isArray(value.deletedNoteIds) ? uniqueStrings(value.deletedNoteIds) : [],
    deletedScheduleIds: Array.isArray(value.deletedScheduleIds) ? uniqueStrings(value.deletedScheduleIds) : [],
    settings: {
      ...seedData.settings,
      ...(value.settings ?? {})
    }
  };

  return applyDeletionTombstones(normalized);
}

function timestampValue(record) {
  const value = Date.parse(record?.updatedAt ?? record?.createdAt ?? '');
  return Number.isFinite(value) ? value : 0;
}

function chooseLatestRecord(existingRecord, incomingRecord) {
  const existingTime = timestampValue(existingRecord);
  const incomingTime = timestampValue(incomingRecord);

  if (existingTime > incomingTime) {
    return existingRecord;
  }

  return { ...existingRecord, ...incomingRecord };
}

function chooseLatestWholeRecord(existingRecord, incomingRecord) {
  return timestampValue(existingRecord) > timestampValue(incomingRecord) ? existingRecord : incomingRecord;
}

function mergeRecordsById(existingRecords = [], incomingRecords = [], chooseRecord = (_existingRecord, incomingRecord) => incomingRecord) {
  const merged = new Map();

  existingRecords.forEach((record) => {
    if (record?.id) {
      merged.set(record.id, record);
    }
  });

  incomingRecords.forEach((record) => {
    if (!record?.id) {
      return;
    }

    const existingRecord = merged.get(record.id);
    merged.set(record.id, existingRecord ? chooseRecord(existingRecord, record) : record);
  });

  return [...merged.values()];
}

function mergeCompletions(existingCompletions = {}, incomingCompletions = {}) {
  const userIds = uniqueStrings([...Object.keys(existingCompletions), ...Object.keys(incomingCompletions)]);

  return Object.fromEntries(
    userIds.map((userId) => [
      userId,
      uniqueStrings([...(Array.isArray(existingCompletions[userId]) ? existingCompletions[userId] : []), ...(Array.isArray(incomingCompletions[userId]) ? incomingCompletions[userId] : [])])
    ])
  );
}

function mergeNestedMaps(existingMap = {}, incomingMap = {}, chooseValue = (_existingValue, incomingValue) => incomingValue) {
  const userIds = uniqueStrings([...Object.keys(existingMap), ...Object.keys(incomingMap)]);

  return Object.fromEntries(
    userIds.map((userId) => {
      const existingValues = existingMap[userId] && typeof existingMap[userId] === 'object' ? existingMap[userId] : {};
      const incomingValues = incomingMap[userId] && typeof incomingMap[userId] === 'object' ? incomingMap[userId] : {};
      const entryIds = uniqueStrings([...Object.keys(existingValues), ...Object.keys(incomingValues)]);

      return [
        userId,
        Object.fromEntries(
          entryIds.map((entryId) => {
            if (!(entryId in existingValues)) {
              return [entryId, incomingValues[entryId]];
            }

            if (!(entryId in incomingValues)) {
              return [entryId, existingValues[entryId]];
            }

            return [entryId, chooseValue(existingValues[entryId], incomingValues[entryId])];
          })
        )
      ];
    })
  );
}

function chooseLatestFeedback(existingFeedback, incomingFeedback) {
  const existingTime = Date.parse(existingFeedback?.updatedAt ?? '');
  const incomingTime = Date.parse(incomingFeedback?.updatedAt ?? '');

  if (Number.isFinite(existingTime) && Number.isFinite(incomingTime) && existingTime > incomingTime) {
    return existingFeedback;
  }

  if (Number.isFinite(existingTime) && !Number.isFinite(incomingTime)) {
    return existingFeedback;
  }

  return incomingFeedback;
}

function chooseCompletionDate(existingDate, incomingDate) {
  return String(incomingDate ?? '') > String(existingDate ?? '') ? incomingDate : existingDate;
}

function activationTimestamp(value) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeStudentActivations(existingActivations = [], incomingActivations = []) {
  const merged = new Map();

  existingActivations.forEach((activation) => {
    if (activation?.id) {
      merged.set(activation.id, activation);
    }
  });

  incomingActivations.forEach((activation) => {
    if (!activation?.id) {
      return;
    }

    const existingActivation = merged.get(activation.id);
    if (!existingActivation || activationTimestamp(activation.activatedAt) >= activationTimestamp(existingActivation.activatedAt)) {
      merged.set(activation.id, { ...existingActivation, ...activation });
    }
  });

  return [...merged.values()];
}

function mergePushTokens(existingTokens = {}, incomingTokens = {}) {
  const userIds = uniqueStrings([...Object.keys(existingTokens), ...Object.keys(incomingTokens)]);

  return Object.fromEntries(
    userIds.map((userId) => {
      const byToken = new Map();
      [...(Array.isArray(existingTokens[userId]) ? existingTokens[userId] : []), ...(Array.isArray(incomingTokens[userId]) ? incomingTokens[userId] : [])].forEach((record) => {
        if (!record?.token) {
          return;
        }

        const currentRecord = byToken.get(record.token);
        if (!currentRecord || Date.parse(record.updatedAt ?? '') >= Date.parse(currentRecord.updatedAt ?? '')) {
          byToken.set(record.token, record);
        }
      });

      return [
        userId,
        [...byToken.values()]
          .sort((left, right) => Date.parse(right.updatedAt ?? '') - Date.parse(left.updatedAt ?? ''))
          .slice(0, 5)
      ];
    })
  );
}

function mergeState(existingData, incomingData) {
  return applyDeletionTombstones({
    ...existingData,
    settings: {
      ...(existingData.settings ?? {}),
      ...(incomingData.settings ?? {})
    },
    schools: mergeRecordsById(existingData.schools, incomingData.schools),
    users: mergeRecordsById(existingData.users, incomingData.users),
    studentActivations: mergeStudentActivations(existingData.studentActivations, incomingData.studentActivations),
    exercises: mergeRecordsById(existingData.exercises, incomingData.exercises, chooseLatestRecord),
    announcements: mergeRecordsById(existingData.announcements, incomingData.announcements),
    notes: mergeRecordsById(existingData.notes, incomingData.notes),
    absenceSchedules: mergeRecordsById(existingData.absenceSchedules, incomingData.absenceSchedules),
    absenceRecords: mergeRecordsById(existingData.absenceRecords, incomingData.absenceRecords, chooseLatestWholeRecord),
    absenceReports: mergeRecordsById(existingData.absenceReports, incomingData.absenceReports, chooseLatestRecord),
    laboratories: mergeRecordsById(existingData.laboratories, incomingData.laboratories, chooseLatestRecord),
    labDevices: mergeRecordsById(existingData.labDevices, incomingData.labDevices, chooseLatestRecord),
    labFaultReports: mergeRecordsById(existingData.labFaultReports, incomingData.labFaultReports, chooseLatestRecord),
    completions: mergeCompletions(existingData.completions, incomingData.completions),
    completionDates: mergeNestedMaps(existingData.completionDates, incomingData.completionDates, chooseCompletionDate),
    feedback: mergeNestedMaps(existingData.feedback, incomingData.feedback, chooseLatestFeedback),
    pushTokens: mergePushTokens(existingData.pushTokens, incomingData.pushTokens),
    deletedSchoolIds: uniqueStrings([...(existingData.deletedSchoolIds ?? []), ...(incomingData.deletedSchoolIds ?? [])]),
    deletedExerciseIds: uniqueStrings([...(existingData.deletedExerciseIds ?? []), ...(incomingData.deletedExerciseIds ?? [])]),
    deletedNoteIds: uniqueStrings([...(existingData.deletedNoteIds ?? []), ...(incomingData.deletedNoteIds ?? [])]),
    deletedScheduleIds: uniqueStrings([...(existingData.deletedScheduleIds ?? []), ...(incomingData.deletedScheduleIds ?? [])])
  });
}

async function ensureStateTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS app_state (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    )
    .run();

  const existing = await db.prepare('SELECT id FROM app_state WHERE id = ?').bind(STATE_ID).first();
  if (!existing) {
    await db
      .prepare('INSERT INTO app_state (id, data, updated_at) VALUES (?, ?, ?)')
      .bind(STATE_ID, JSON.stringify(seedData), new Date().toISOString())
      .run();
  }
}

function getDb(context) {
  return context.env.DB;
}

const subjectNames = {
  math: 'الرياضيات',
  arabic: 'اللغة العربية',
  science: 'العلوم الطبيعية',
  physics: 'الفيزياء',
  history: 'التاريخ والجغرافيا',
  primary_history: 'التاريخ والجغرافيا',
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
};

function sameClassGroup(left, right) {
  return String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
}

function studentMatchesTarget(target, student) {
  if (
    student.role !== 'student' ||
    student.status !== 'active' ||
    student.schoolId !== target.schoolId ||
    student.stage !== target.stage ||
    student.schoolYear !== target.schoolYear ||
    !sameClassGroup(student.classGroup, target.classGroup)
  ) {
    return false;
  }

  return target.stage === 'secondary' ? Boolean(student.stream && target.stream && student.stream === target.stream) : true;
}

function createdRecords(previousRecords, nextRecords) {
  const previousIds = new Set(previousRecords.map((record) => record.id));
  return nextRecords.filter((record) => record.id && !previousIds.has(record.id));
}

function targetUsersForExercise(data, exercise) {
  return data.users.filter((user) => studentMatchesTarget(exercise, user));
}

function targetUsersForNote(data, note) {
  return data.users.filter((user) => studentMatchesTarget(note, user));
}

function targetUsersForAnnouncement(data, announcement) {
  return data.users.filter(
    (user) =>
      user.status === 'active' &&
      user.schoolId === announcement.schoolId &&
      (user.role === 'teacher' || user.role === 'student')
  );
}

function tokensForUser(data, user) {
  const tokenSet = new Set();
  const records = data.pushTokens[user.id] ?? [];
  records.forEach((record) => {
    if (record?.token) {
      tokenSet.add(record.token);
    }
  });

  return [...tokenSet];
}

function base64UrlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem) {
  const normalized = pem.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function firebaseServiceAccount(env) {
  if (env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: env.FIREBASE_PROJECT_ID,
      client_email: env.FIREBASE_CLIENT_EMAIL,
      private_key: env.FIREBASE_PRIVATE_KEY
    };
  }

  return null;
}

async function firebaseAccessToken(serviceAccount) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: issuedAt,
      exp: issuedAt + 3600
    })
  );
  const unsignedToken = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsignedToken));
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Firebase access token failed with ${response.status}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

async function createFirebaseNotificationSender(env) {
  const serviceAccount = firebaseServiceAccount(env);
  if (!serviceAccount) {
    return null;
  }

  const accessToken = await firebaseAccessToken(serviceAccount);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  return async function sendNotification(tokens, notification, data = {}) {
    if (tokens.length === 0) {
      return;
    }

    await Promise.allSettled(
      tokens.map((token) =>
        fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              token,
              notification,
              data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
              android: {
                priority: 'HIGH'
              }
            }
          })
        })
      )
    );
  };
}

async function sendFirebaseNotification(env, tokens, notification, data = {}) {
  const sendNotification = await createFirebaseNotificationSender(env);
  if (!sendNotification) {
    return;
  }

  await sendNotification(tokens, notification, data);
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function userDisplayName(user) {
  return cleanText(user?.name, 'التلميذ');
}

function messageForStudent(user, message) {
  return `${userDisplayName(user)}، ${message}`;
}

function personalizedNotification(user, notification) {
  if (user.role !== 'student') {
    return notification;
  }

  return {
    ...notification,
    body: messageForStudent(user, notification.body)
  };
}

function targetUsersForAbsenceReport(data, report) {
  const absentStudentIds = new Set(
    data.absenceRecords
      .filter((record) => record.reportId === report.id && record.sentAt && !record.deletedAt)
      .map((record) => record.studentId)
  );

  return data.users.filter((user) => user.role === 'student' && user.status === 'active' && absentStudentIds.has(user.id));
}

function absenceDetailsForStudent(data, report, user) {
  return data.absenceRecords.find((record) => record.reportId === report.id && record.studentId === user.id && record.sentAt && !record.deletedAt);
}

function targetUsersForLabFaultReport(data, report) {
  return data.users.filter(
    (user) =>
      user.role === 'director' &&
      user.status === 'active' &&
      user.schoolId === report.schoolId
  );
}

async function sendNotificationsForChanges(env, previousData, nextData) {
  const notifications = [];

  createdRecords(previousData.exercises, nextData.exercises).forEach((exercise) => {
    const subjectName = subjectNames[exercise.subject] ?? 'مادة';
    notifications.push({
      users: targetUsersForExercise(nextData, exercise),
      notification: (user) => ({
        title: `تمرين ${subjectName} جديد`,
        body: messageForStudent(user, `عندك تمرين ${subjectName}: ${cleanText(exercise.title, 'تم نشر تمرين جديد لك.')}`)
      }),
      data: { type: 'exercise', id: exercise.id }
    });
  });

  createdRecords(previousData.notes, nextData.notes).forEach((note) => {
    const subjectName = note.subject ? subjectNames[note.subject] : '';
    notifications.push({
      users: targetUsersForNote(nextData, note),
      notification: (user) => ({
        title: subjectName ? `ملاحظة ${subjectName} جديدة` : 'ملاحظة جديدة',
        body: messageForStudent(user, `عندك ملاحظة${subjectName ? ` ${subjectName}` : ''}: ${cleanText(note.title, 'تم نشر ملاحظة جديدة لك.')}`)
      }),
      data: { type: 'note', id: note.id }
    });
  });

  createdRecords(previousData.announcements, nextData.announcements).forEach((announcement) => {
    notifications.push({
      users: targetUsersForAnnouncement(nextData, announcement),
      notification: (user) =>
        personalizedNotification(user, {
        title: 'إعلان مدرسي',
          body: `عندك إعلان مدرسي: ${cleanText(announcement.title, 'تم نشر إعلان جديد.')}`
        }),
      data: { type: 'announcement', id: announcement.id }
    });
  });

  createdRecords(previousData.absenceReports, nextData.absenceReports).forEach((report) => {
    notifications.push({
      users: targetUsersForAbsenceReport(nextData, report),
      notification: (user) => {
        const absenceRecord = absenceDetailsForStudent(nextData, report, user);
        const sessionName = cleanText(absenceRecord?.sessionName ?? report.sessionName, 'الحصة');
        const date = cleanText(report.date, 'اليوم');

        return {
          title: 'إشعار غياب',
          body: messageForStudent(user, `تم تسجيل غيابك في ${sessionName} بتاريخ ${date}.`)
        };
      },
      data: { type: 'absence', id: report.id, date: report.date, sessionId: report.sessionId }
    });
  });

  createdRecords(previousData.labFaultReports ?? [], nextData.labFaultReports ?? []).forEach((report) => {
    const lab = (nextData.laboratories ?? []).find((item) => item.id === report.labId);
    const reporter = nextData.users.find((user) => user.id === report.reportedBy);
    notifications.push({
      users: targetUsersForLabFaultReport(nextData, report),
      notification: {
        title: 'عطل في المخبر',
        body: `تم الإبلاغ عن عطل في ${cleanText(report.deviceName, 'جهاز')} داخل ${cleanText(lab?.name, 'المخبر')} بواسطة ${cleanText(reporter?.name, 'المخبري')}.`
      },
      data: { type: 'lab_fault', id: report.id, labId: report.labId, deviceId: report.deviceId }
    });
  });

  const sendNotification = await createFirebaseNotificationSender(env);
  if (!sendNotification) {
    return;
  }

  await Promise.allSettled(
    notifications.flatMap((item) =>
      item.users.map((user) =>
        sendNotification(tokensForUser(nextData, user), typeof item.notification === 'function' ? item.notification(user) : personalizedNotification(user, item.notification), {
          ...item.data,
          userId: user.id
        })
      )
    )
  );
}

export async function onRequestGet(context) {
  const db = getDb(context);
  if (!db) {
    return jsonResponse({ error: 'D1 binding DB is not configured.' }, { status: 503 });
  }

  await ensureStateTable(db);
  const row = await db.prepare('SELECT data, updated_at FROM app_state WHERE id = ?').bind(STATE_ID).first();

  if (new URL(context.request.url).searchParams.get('meta') === '1') {
    return jsonResponse({ updatedAt: row?.updated_at ?? null });
  }

  const data = row?.data ? normalizeState(JSON.parse(row.data)) : structuredClone(seedData);
  const normalizedDataText = JSON.stringify(data);
  let updatedAt = row?.updated_at ?? null;

  if (row?.data && row.data !== normalizedDataText) {
    updatedAt = new Date().toISOString();
    await db.prepare('UPDATE app_state SET data = ?, updated_at = ? WHERE id = ?').bind(normalizedDataText, updatedAt, STATE_ID).run();
  }

  return jsonResponse({ data, updatedAt });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders
  });
}

export async function onRequestPost(context) {
  const db = getDb(context);
  if (!db) {
    return jsonResponse({ error: 'D1 binding DB is not configured.' }, { status: 503 });
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  await ensureStateTable(db);
  const existing = await db.prepare('SELECT data FROM app_state WHERE id = ?').bind(STATE_ID).first();
  const existingData = existing?.data ? normalizeState(JSON.parse(existing.data)) : structuredClone(seedData);
  const incomingData = normalizeState(payload.data ?? payload);
  const data = mergeState(existingData, incomingData);
  const updatedAt = new Date().toISOString();

  await db
    .prepare('UPDATE app_state SET data = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(data), updatedAt, STATE_ID)
    .run();

  const notificationTask = sendNotificationsForChanges(context.env, existingData, data).catch(() => undefined);
  if (typeof context.waitUntil === 'function') {
    context.waitUntil(notificationTask);
  } else {
    await notificationTask;
  }

  return jsonResponse({ ok: true, data, updatedAt });
}
