import {
  bumpSessionRev,
  replacePasswordHash,
  validatePassword,
  verifyPassword,
} from "@/lib/password";
import { issueSession } from "@/lib/session";
import { SESSION_COOKIE } from "@/lib/auth";
import { seeOther } from "@/lib/redirect";

/** Смена пароля из Справочников. Route handler — чтобы работало без JavaScript. */
export async function POST(request: Request) {
  const form = await request.formData();
  const current = String(form.get("current") ?? "");
  const password = String(form.get("password") ?? "");
  const repeat = String(form.get("repeat") ?? "");

  const back = (query: string, cookies?: { name: string; value: string; options: object }[]) =>
    seeOther(`/settings?${query}`, { cookies });

  if (!(await verifyPassword(current))) return back("error=current");

  const check = validatePassword(password);
  if (!check.ok) return back(`error=${check.code}`);
  if (password !== repeat) return back("error=mismatch");
  if (password === current) return back("error=same");

  await replacePasswordHash(password);
  await bumpSessionRev();

  // Текущее устройство остаётся в системе: выпускаем куку с новой ревизией.
  const session = await issueSession();
  return back("ok=password", [{ name: SESSION_COOKIE, value: session.value, options: session.options }]);
}
