import { prisma } from "@/lib/prisma";
import { hashPassword, safeEqual, verifyHash } from "@/lib/password-hash";

const PASSWORD_KEY = "auth.password";
const SESSION_REV_KEY = "auth.sessionRev";

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from "@/lib/password-policy";

async function readPasswordHash(): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key: PASSWORD_KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) return null;
  const hash = (row.value as { hash?: unknown }).hash;
  return typeof hash === "string" ? hash : null;
}

/**
 * missing — пароля нет вообще, нужен мастер первого запуска;
 * bootstrap — пароль только в AUTH_PASSWORD (.env), вход уже возможен;
 * stored — пароль задан в приложении и лежит в БД.
 */
export async function getPasswordState(): Promise<"missing" | "bootstrap" | "stored"> {
  if (await readPasswordHash()) return "stored";
  return process.env.AUTH_PASSWORD ? "bootstrap" : "missing";
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = await readPasswordHash();
  if (stored) return verifyHash(input, stored);
  const fromEnv = process.env.AUTH_PASSWORD;
  return fromEnv ? safeEqual(input, fromEnv) : false;
}

/**
 * Записывает хеш. create вместо upsert: при гонке двух мастеров второй
 * получит P2002 и не перезапишет пароль первого.
 */
export async function createPasswordHash(password: string): Promise<void> {
  await prisma.setting.create({
    data: {
      key: PASSWORD_KEY,
      value: { hash: await hashPassword(password), updatedAt: new Date().toISOString() },
    },
  });
}

export async function replacePasswordHash(password: string): Promise<void> {
  const value = { hash: await hashPassword(password), updatedAt: new Date().toISOString() };
  await prisma.setting.upsert({
    where: { key: PASSWORD_KEY },
    create: { key: PASSWORD_KEY, value },
    update: { value },
  });
}

/**
 * Ревизия сессий: смена пароля увеличивает число, и куки со старой ревизией
 * перестают подходить. Middleware ревизию не проверяет (нет доступа к БД),
 * это делает requireSession на серверных страницах.
 */
export async function getSessionRev(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: SESSION_REV_KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) return 0;
  const rev = (row.value as { rev?: unknown }).rev;
  return typeof rev === "number" && Number.isFinite(rev) ? rev : 0;
}

export async function bumpSessionRev(): Promise<number> {
  const rev = (await getSessionRev()) + 1;
  const value = { rev };
  await prisma.setting.upsert({
    where: { key: SESSION_REV_KEY },
    create: { key: SESSION_REV_KEY, value },
    update: { value },
  });
  return rev;
}
