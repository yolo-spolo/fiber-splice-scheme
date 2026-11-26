import { cookies } from "next/headers";
import { hasValidSession } from "@/lib/session";
import { resolveShareToken, type ResolvedShare } from "@/lib/share";
import { shareAllowsClosure, shareCanEdit } from "@/lib/share-access";
import { decodeGuestCookie, guestCookieName } from "@/lib/guest-name";

export type EditActor =
  | { kind: "owner"; name: string; shareId: null }
  | { kind: "guest"; name: string; shareId: string; link: ResolvedShare };

export const GUEST_NAME_REQUIRED = "Укажите имя — оно попадёт в историю изменений";
export const EDIT_FORBIDDEN = "Эта ссылка не даёт права менять муфту";

/**
 * Кто сейчас меняет муфту. Владелец — по сессии; гость — по ссылке с правом
 * правки и имени в cookie. Токен передаётся явно: серверный экшен не знает
 * адрес страницы, с которой его вызвали, а угадывать его нельзя.
 */
export async function resolveEditor(
  shareToken: string | null | undefined,
  closureId: string,
): Promise<{ actor: EditActor } | { error: string }> {
  if (!shareToken) {
    if (await hasValidSession()) return { actor: { kind: "owner", name: "Владелец", shareId: null } };
    return { error: "Нужно войти заново" };
  }

  const resolved = await resolveShareToken(shareToken);
  if (resolved.status !== "ok") return { error: EDIT_FORBIDDEN };
  const link = resolved.link;
  if (!shareCanEdit(link)) return { error: EDIT_FORBIDDEN };
  if (!shareAllowsClosure(link, closureId)) return { error: EDIT_FORBIDDEN };

  const store = await cookies();
  const name = decodeGuestCookie(store.get(guestCookieName(shareToken))?.value);
  if (!name) return { error: GUEST_NAME_REQUIRED };

  return { actor: { kind: "guest", name, shareId: link.id, link } };
}

/** Короткая проверка для страниц: можно ли этому гостю показывать редактор. */
export async function guestEditorName(shareToken: string): Promise<string | null> {
  const store = await cookies();
  return decodeGuestCookie(store.get(guestCookieName(shareToken))?.value);
}
