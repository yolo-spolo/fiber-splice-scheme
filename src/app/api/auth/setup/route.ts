import { bumpSessionRev, createPasswordHash, getPasswordState, validatePassword } from "@/lib/password";
import { issueSession } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/auth";
import { seeOther } from "@/lib/redirect";

/**
 * Первый запуск: пароля нет ни в БД, ни в AUTH_PASSWORD.
 * Route handler вместо экшена — чтобы мастер работал без JavaScript.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const repeat = String(form.get("repeat") ?? "");

  const fail = (code: string) => seeOther(`/setup?error=${code}`);

  if ((await getPasswordState()) !== "missing") return fail("exists");

  const check = validatePassword(password);
  if (!check.ok) return fail(check.code);
  if (password !== repeat) return fail("mismatch");

  try {
    // create вместо upsert: два одновременных мастера не перезапишут друг друга.
    await createPasswordHash(password);
  } catch {
    // Гонка: пароль успел задать другой запрос.
    return fail("exists");
  }

  await bumpSessionRev();
  const session = await issueSession();
  return seeOther("/", {
    cookies: [{ name: SESSION_COOKIE, value: session.value, options: session.options }],
  });
}
