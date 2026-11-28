import { cookies } from "next/headers";
import { hasValidSession } from "@/lib/session";
import { resolveShareToken, shareAllowsClosureId, type ResolvedShare } from "@/lib/share";
import { shareCanEdit } from "@/lib/share-access";
import { decodeGuestCookie, guestCookieName } from "@/lib/guest-name";

export type EditActor =
  | { kind: "owner"; name: string; shareId: null }
  | { kind: "guest"; name: string; shareId: string; link: ResolvedShare };

export const GUEST_NAME_REQUIRED = "Укажите имя — оно попадёт в историю изменений";
export const EDIT_FORBIDDEN = "Эта ссылка не даёт права менять муфту";
export const NO_SESSION = "Нужно войти заново";

/**
 * Кто сейчас действует: владелец по сессии или гость по ссылке с правом
 * правки и именем в cookie. Про конкретную муфту здесь ничего не решается —
 * это отдельный шаг (`actorCanEditClosure`), потому что id муфты часто
 * известен только после чтения записи.
 *
 * Порядок важен: сначала «кто», потом «что». Если проверять муфту раньше,
 * посторонний по разным ответам узнаёт, существует ли запись.
 */
export async function resolveActor(
  shareToken: string | null | undefined,
): Promise<{ actor: EditActor } | { error: string }> {
  if (!shareToken) {
    if (await hasValidSession()) return { actor: { kind: "owner", name: "Владелец", shareId: null } };
    return { error: NO_SESSION };
  }

  const resolved = await resolveShareToken(shareToken);
  if (resolved.status !== "ok") return { error: EDIT_FORBIDDEN };
  const link = resolved.link;
  if (!shareCanEdit(link)) return { error: EDIT_FORBIDDEN };

  const store = await cookies();
  const name = decodeGuestCookie(store.get(guestCookieName(shareToken))?.value);
  if (!name) return { error: GUEST_NAME_REQUIRED };

  return { actor: { kind: "guest", name, shareId: link.id, link } };
}

/**
 * Пускает ли этот человек к этой муфте. Владельцу — всегда, гостю — по ссылке.
 * Для владельца база не нужна: сессия уже доказала право на всё приложение.
 */
export async function actorCanEditClosure(actor: EditActor, closureId: string): Promise<boolean> {
  if (actor.kind === "owner") return true;
  return shareAllowsClosureId(actor.link, closureId);
}

/**
 * Кто и может ли править эту муфту — одним вызовом, когда муфта уже известна.
 * Оставлено для действий, где id приходит из формы.
 */
export async function resolveEditor(
  shareToken: string | null | undefined,
  closureId: string,
): Promise<{ actor: EditActor } | { error: string }> {
  const resolved = await resolveActor(shareToken);
  if ("error" in resolved) return resolved;
  if (!(await actorCanEditClosure(resolved.actor, closureId))) return { error: EDIT_FORBIDDEN };
  return resolved;
}

/** Короткая проверка для страниц: можно ли этому гостю показывать редактор. */
export async function guestEditorName(shareToken: string): Promise<string | null> {
  const store = await cookies();
  return decodeGuestCookie(store.get(guestCookieName(shareToken))?.value);
}
