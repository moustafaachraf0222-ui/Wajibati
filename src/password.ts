const PASSWORD_PREFIX = 'pbkdf2$';
const PBKDF2_ITERATIONS = 210000;
const textEncoder = new TextEncoder();

export const HASHED_DEFAULT_ADMIN_PASSWORD =
  'pbkdf2$210000$d2FqaWJhdGktc2VlZC1hZG1pbg==$WH+MacQiJRNZAFxrxhCMbV0010g3YX8R24DGpIYuEUA=';

export const HASHED_DEFAULT_CAFETERIA_PASSWORD =
  'pbkdf2$210000$d2FqaWJhdGktY2FmZXRlcmlhLWRlZmF1bHQ=$CRhdv91ICWU85KC+SmZeQQXzDeDXC1P5cE4Mv+iWzws=';

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveBits(plaintext: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey('raw', textEncoder.encode(plaintext), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256);
  return new Uint8Array(bits);
}

export function isHashedPassword(value: string) {
  return value.startsWith(PASSWORD_PREFIX);
}

export async function hashPassword(plaintext: string) {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const hash = await deriveBits(plaintext, salt, PBKDF2_ITERATIONS);
  return `${PASSWORD_PREFIX}${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(plaintext: string, stored: string) {
  if (!isHashedPassword(stored)) {
    return stored === plaintext;
  }

  const parts = stored.split('$');
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = await deriveBits(plaintext, salt, iterations);

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index] ^ actual[index];
  }
  return difference === 0;
}