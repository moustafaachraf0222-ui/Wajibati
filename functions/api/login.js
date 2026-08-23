const STATE_ID = 'main';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function verifyPassword(plaintext, stored) {
  if (!stored.startsWith('pbkdf2$')) {
    return stored === plaintext;
  }

  const parts = stored.split('$');
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(plaintext), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);
  const actual = new Uint8Array(bits);

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index] ^ actual[index];
  }
  return difference === 0;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: jsonHeaders
  });
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) {
    return jsonResponse({ error: 'D1 binding DB is not configured.' }, { status: 503 });
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload?.password === 'string' ? payload.password : '';
  if (!email || !password) {
    return jsonResponse({ error: 'Missing credentials.' }, { status: 400 });
  }

  const row = await db.prepare('SELECT data FROM app_state WHERE id = ?').bind(STATE_ID).first();
  if (!row?.data) {
    return jsonResponse({ error: 'State not found.' }, { status: 404 });
  }

  const users = JSON.parse(row.data).users ?? [];
  const account = users.find((user) => String(user.email ?? '').toLowerCase() === email);
  const valid = account ? await verifyPassword(password, account.password) : false;

  if (!account || !valid) {
    return jsonResponse({ error: 'Invalid credentials.' }, { status: 401 });
  }
  if (account.status !== 'active') {
    return jsonResponse({ error: 'Account disabled.' }, { status: 403 });
  }

  const school = account.schoolId ? (JSON.parse(row.data).schools ?? []).find((item) => item.id === account.schoolId) : null;
  if (school?.deletedAt) {
    return jsonResponse({ error: 'Account disabled.' }, { status: 403 });
  }

  return jsonResponse({
    ok: true,
    userId: account.id,
    role: account.role,
    name: account.name,
    schoolId: account.schoolId ?? null
  });
}
