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
  exercises: [],
  announcements: [],
  notes: [],
  completions: {},
  completionDates: {},
  feedback: {},
  pushTokens: {},
  deletedSchoolIds: [],
  deletedExerciseIds: [],
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
    exercises: data.exercises.filter((exercise) => !deletedSchoolIds.has(exercise.schoolId)),
    announcements: data.announcements.filter((announcement) => !deletedSchoolIds.has(announcement.schoolId)),
    notes: data.notes.filter((note) => !deletedSchoolIds.has(note.schoolId)),
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

function applyDeletionTombstones(data) {
  return applyDeletedExerciseTombstones(applyDeletedSchoolTombstones(data));
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
    exercises: Array.isArray(value.exercises) ? value.exercises : [],
    announcements: Array.isArray(value.announcements) ? value.announcements : [],
    notes: Array.isArray(value.notes) ? value.notes : [],
    completions: value.completions && typeof value.completions === 'object' ? value.completions : {},
    completionDates: value.completionDates && typeof value.completionDates === 'object' ? value.completionDates : {},
    feedback: value.feedback && typeof value.feedback === 'object' ? value.feedback : {},
    pushTokens: value.pushTokens && typeof value.pushTokens === 'object' ? value.pushTokens : {},
    deletedSchoolIds: Array.isArray(value.deletedSchoolIds) ? uniqueStrings(value.deletedSchoolIds) : [],
    deletedExerciseIds: Array.isArray(value.deletedExerciseIds) ? uniqueStrings(value.deletedExerciseIds) : [],
    settings: {
      ...seedData.settings,
      ...(value.settings ?? {})
    }
  };

  return applyDeletionTombstones(normalized);
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

function tokensForUsers(data, users) {
  const tokenSet = new Set();
  users.forEach((user) => {
    const records = data.pushTokens[user.id] ?? [];
    records.forEach((record) => {
      if (record?.token) {
        tokenSet.add(record.token);
      }
    });
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

async function sendFirebaseNotification(env, tokens, notification, data = {}) {
  const serviceAccount = firebaseServiceAccount(env);
  if (!serviceAccount || tokens.length === 0) {
    return;
  }

  const accessToken = await firebaseAccessToken(serviceAccount);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
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
}

async function sendNotificationsForChanges(env, previousData, nextData) {
  const notifications = [];

  createdRecords(previousData.exercises, nextData.exercises).forEach((exercise) => {
    const subjectName = subjectNames[exercise.subject] ?? 'مادة';
    notifications.push({
      users: targetUsersForExercise(nextData, exercise),
      notification: {
        title: `تمرين ${subjectName} جديد`,
        body: exercise.title || 'تم نشر تمرين جديد لك.'
      },
      data: { type: 'exercise', id: exercise.id }
    });
  });

  createdRecords(previousData.notes, nextData.notes).forEach((note) => {
    const subjectName = note.subject ? subjectNames[note.subject] : '';
    notifications.push({
      users: targetUsersForNote(nextData, note),
      notification: {
        title: subjectName ? `ملاحظة ${subjectName} جديدة` : 'ملاحظة جديدة',
        body: note.title || 'تم نشر ملاحظة جديدة لك.'
      },
      data: { type: 'note', id: note.id }
    });
  });

  createdRecords(previousData.announcements, nextData.announcements).forEach((announcement) => {
    notifications.push({
      users: targetUsersForAnnouncement(nextData, announcement),
      notification: {
        title: 'إعلان مدرسي',
        body: announcement.title || 'تم نشر إعلان جديد.'
      },
      data: { type: 'announcement', id: announcement.id }
    });
  });

  await Promise.allSettled(
    notifications.map((item) => sendFirebaseNotification(env, tokensForUsers(nextData, item.users), item.notification, item.data))
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
  const data = applyDeletionTombstones({
    ...incomingData,
    deletedSchoolIds: uniqueStrings([...(existingData.deletedSchoolIds ?? []), ...(incomingData.deletedSchoolIds ?? [])]),
    deletedExerciseIds: uniqueStrings([...(existingData.deletedExerciseIds ?? []), ...(incomingData.deletedExerciseIds ?? [])])
  });
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

  return jsonResponse({ ok: true, updatedAt });
}
