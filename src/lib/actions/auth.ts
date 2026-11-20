"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionValue, SESSION_COOKIE } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!checkPassword(password)) {
    return { error: "Неверный пароль" };
  }

  const session = await createSessionValue();
  const store = await cookies();
  store.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    // The app may be published on a plain HTTP alternate port when TLS/443
    // is owned by another service. Derive Secure from the public URL instead
    // of NODE_ENV, otherwise browsers silently discard the session cookie.
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: session.maxAge,
  });

  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
