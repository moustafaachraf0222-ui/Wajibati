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
  settings: {
    allowExerciseImages: true,
    maintenanceMode: false
  }
};

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

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

  return {
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
    settings: {
      ...seedData.settings,
      ...(value.settings ?? {})
    }
  };
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

export async function onRequestGet(context) {
  const db = getDb(context);
  if (!db) {
    return jsonResponse({ error: 'D1 binding DB is not configured.' }, { status: 503 });
  }

  await ensureStateTable(db);
  const row = await db.prepare('SELECT data, updated_at FROM app_state WHERE id = ?').bind(STATE_ID).first();
  const data = row?.data ? normalizeState(JSON.parse(row.data)) : structuredClone(seedData);
  const normalizedDataText = JSON.stringify(data);
  let updatedAt = row?.updated_at ?? null;

  if (row?.data && row.data !== normalizedDataText) {
    updatedAt = new Date().toISOString();
    await db.prepare('UPDATE app_state SET data = ?, updated_at = ? WHERE id = ?').bind(normalizedDataText, updatedAt, STATE_ID).run();
  }

  return jsonResponse({ data, updatedAt });
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

  const data = normalizeState(payload.data ?? payload);
  const updatedAt = new Date().toISOString();

  await ensureStateTable(db);
  await db
    .prepare('UPDATE app_state SET data = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(data), updatedAt, STATE_ID)
    .run();

  return jsonResponse({ ok: true, updatedAt });
}
