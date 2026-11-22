const COOKIE_NAME = "fiber_session";
const SESSION_DAYS = 30;

function secret(): string {
  return process.env.AUTH_SECRET ?? "insecure-dev-secret-change-me";
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const SESSION_COOKIE = COOKIE_NAME;

/**
 * Payload: <exp>.<rev>. Ревизия сверяется с БД в приложении, поэтому смена
 * пароля разлогинивает остальные устройства. Middleware (Edge) БД не видит
 * и проверяет только подпись и срок.
 */
export async function createSessionValue(rev = 0): Promise<{ value: string; maxAge: number }> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${exp}.${rev}`;
  return { value: `${payload}.${await hmac(payload)}`, maxAge: SESSION_DAYS * 24 * 60 * 60 };
}

export async function isValidSession(value: string | undefined): Promise<boolean> {
  return (await readSession(value)) !== null;
}

/** Возвращает ревизию сессии, если подпись и срок в порядке. */
export async function readSession(value: string | undefined): Promise<{ rev: number } | null> {
  if (!value) return null;
  // payload = "<exp>.<rev>", подпись отделена последней точкой.
  const cut = value.lastIndexOf(".");
  if (cut <= 0) return null;
  const payload = value.slice(0, cut);
  const sig = value.slice(cut + 1);
  if (!sig) return null;
  const [expPart, revPart] = payload.split(".");
  const exp = Number(expPart);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = await hmac(payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  const rev = Number(revPart);
  return { rev: Number.isFinite(rev) ? rev : 0 };
}

/** Secret used by the app process and the Edge middleware must be identical. */
export function authSecretConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET);
}
