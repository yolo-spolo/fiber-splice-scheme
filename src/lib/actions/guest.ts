"use server";

import { cookies } from "next/headers";
import { resolveShareToken } from "@/lib/share";
import { shareCanEdit } from "@/lib/share-access";
import { encodeGuestCookie, guestCookieName, normalizeGuestName } from "@/lib/guest-name";

const HALF_YEAR = 60 * 60 * 24 * 180;

/**
 * Имя гостя по ссылке с правкой. Cookie своя у каждого токена и живёт полгода:
 * человек не вводит имя на каждой странице, а чужие ссылки его не путают.
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
    maxAge: HALF_YEAR,
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
  });

  return { ok: true, name };
}
