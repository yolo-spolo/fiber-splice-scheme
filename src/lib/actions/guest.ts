"use server";

import { cookies } from "next/headers";
import { resolveShareToken } from "@/lib/share";
import { shareCanEdit } from "@/lib/share-access";
import {
  encodeGuestCookie,
  GUEST_COOKIE_MAX_AGE,
  guestCookieName,
  normalizeGuestName,
} from "@/lib/guest-name";

/**
 * Имя гостя по ссылке с правкой. Cookie своя у каждого токена и живёт месяц:
 * человек не вводит имя на каждой странице, а чужие ссылки его не путают.
 *
 * Этой же функцией имя меняется: запись cookie перезаписывает прежнее.
 */
export async function saveGuestName(token: string, rawName: string) {
  const resolved = await resolveShareToken(token);
  if (resolved.status !== "ok") return { error: "Ссылка недействительна" };
  if (!shareCanEdit(resolved.link)) return { error: "Эта ссылка не даёт права правки" };

  const name = normalizeGuestName(rawName);
  if (!name) return { error: "Укажите имя — хотя бы две буквы" };

  const store = await cookies();
  store.set(guestCookieName(token), encodeGuestCookie(name), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
  });

  return { ok: true, name };
}

/**
 * Забыть имя гостя по этой ссылке. Вызывается со страницы «ссылка не
 * работает»: сама ссылка уже мертва, и её cookie в браузере больше ни к чему.
 */
export async function forgetGuestName(token: string) {
  const store = await cookies();
  store.delete(guestCookieName(token));
  return { ok: true };
}
