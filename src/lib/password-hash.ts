import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * scrypt вместо bcrypt/argon2: встроен в Node и не требует нативной сборки
 * в Docker-образе. Формат строки — scrypt:<соль>:<хеш>, параметры фиксированы,
 * поэтому ранее записанные хеши остаются проверяемыми.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyHash(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hex] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

/** Сравнение строк без утечки длины по времени. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a.normalize("NFKC"));
  const right = Buffer.from(b.normalize("NFKC"));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
