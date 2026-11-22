import { getPasswordState, verifyPassword } from "@/lib/password";
import { clientKey, isRateLimited, registerFailure, resetFailures } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-redirect";
import { SESSION_COOKIE } from "@/lib/auth";
import { issueSession } from "@/lib/session";
import { seeOther } from "@/lib/redirect";

/**
 * Вход обычным POST-запросом формы. Серверный экшен для этого не годится:
 * при отправке формы до гидратации (или без JavaScript) Next 15 вызывает
 * экшен вне контекста запроса, и cookies() падает с 500.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = safeNextPath(String(form.get("next") ?? "/"));

  const fail = (code: string) => {
    const params = new URLSearchParams({ error: code });
    if (next !== "/") params.set("next", next);
    return seeOther(`/login?${params}`);
  };

  if ((await getPasswordState()) === "missing") {
    return seeOther("/setup");
  }
  const key = clientKey(request);
  if (isRateLimited(key)) return fail("rate");
  if (!(await verifyPassword(password))) {
    registerFailure(key);
    return fail("bad");
  }

  resetFailures(key);
  const session = await issueSession();
  return seeOther(next, {
    cookies: [{ name: SESSION_COOKIE, value: session.value, options: session.options }],
  });
}
