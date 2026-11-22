import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionValue, readSession, SESSION_COOKIE } from "@/lib/auth";
import { getPasswordState, getSessionRev } from "@/lib/password";

export type SessionCookie = { value: string; options: Record<string, unknown> };

/** Выпускает куку с текущей ревизией сессий: её ставит route handler. */
export async function issueSession(): Promise<SessionCookie> {
  const rev = await getSessionRev();
  const session = await createSessionValue(rev);
  return {
    value: session.value,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      // Приложение может жить на HTTP-порту, если TLS занят другим сервисом:
      // Secure выводим из публичного адреса, а не из NODE_ENV.
      secure: (process.env.APP_URL ?? "").startsWith("https://"),
      path: "/",
      maxAge: session.maxAge,
    },
  };
}

/** Сессия жива: подпись, срок и ревизия совпадают с БД. */
export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const parsed = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!parsed) return false;
  return parsed.rev === (await getSessionRev());
}

/**
 * Единая точка входа в интерфейс: без пароля — на мастер, без сессии — на вход.
 * Middleware проверяет только подпись куки, поэтому ревизию сверяем здесь.
 */
export async function requireSession(nextPath = "/") {
  if ((await getPasswordState()) === "missing") redirect("/setup");
  if (!(await hasValidSession())) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}
