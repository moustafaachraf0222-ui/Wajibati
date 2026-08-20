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

function base64UrlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    const body = await response.text();
    throw new Error(`Firebase access token failed with ${response.status}: ${body.slice(0, 200)}`);
  }

  const payload = await response.json();
  return payload.access_token;
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

  const userId = typeof payload?.userId === 'string' ? payload.userId : null;
  if (!userId) {
    return jsonResponse({ error: 'Missing userId.' }, { status: 400 });
  }

  const row = await db.prepare('SELECT data FROM app_state WHERE id = ?').bind(STATE_ID).first();
  if (!row?.data) {
    return jsonResponse({ error: 'State not found.' }, { status: 404 });
  }

  const data = JSON.parse(row.data);
  const user = data.users.find((item) => item.id === userId);
  if (!user) {
    return jsonResponse({ error: `User ${userId} not found.` }, { status: 404 });
  }

  const tokenSet = new Set();
  (data.pushTokens[userId] ?? []).forEach((record) => {
    if (record?.token) {
      tokenSet.add(record.token);
    }
  });
  const tokens = [...tokenSet];
  if (tokens.length === 0) {
    return jsonResponse({ error: 'No push tokens registered for this user.', tokens: 0 });
  }

  const serviceAccount = firebaseServiceAccount(context.env);
  if (!serviceAccount) {
    return jsonResponse({ error: 'FIREBASE_SERVICE_ACCOUNT (or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY) is not configured.' });
  }

  let accessToken;
  try {
    accessToken = await firebaseAccessToken(serviceAccount);
  } catch (error) {
    return jsonResponse({ error: `Access token failed: ${error?.message ?? error}` });
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
  const results = [];
  for (const token of tokens) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: 'رسالة اختبار', body: 'تم اختبار الإشعارات بنجاح.' },
            data: { type: 'test' },
            android: { priority: 'HIGH' }
          }
        })
      });
      if (response.ok) {
        results.push({ status: response.status });
      } else {
        results.push({ status: response.status, error: (await response.text()).slice(0, 300) });
      }
    } catch (error) {
      results.push({ error: error?.message ?? String(error) });
    }
  }

  return jsonResponse({ ok: true, user: user.name, project: serviceAccount.project_id, tokens: results });
}