/** Имя гостя по ссылке с правкой: без него история изменений бесполезна. */
export const GUEST_NAME_MAX = 60;
export const GUEST_COOKIE_PREFIX = "fiber_guest_";

/** Cookie своя у каждой ссылки: гость может держать открытыми две разные. */
export function guestCookieName(token: string): string {
  return `${GUEST_COOKIE_PREFIX}${token}`;
}

/**
 * Приводит введённое имя к виду для cookie и истории: схлопывает пробелы,
 * обрезает длину. Пустое имя не принимается — иначе в журнале появится
 * «кто-то», и требование «обязательно указать имя» ничего не значит.
 */
export function normalizeGuestName(raw: string | null | undefined): string | null {
  const value = (raw ?? "").replace(/\s+/g, " ").trim();
  if (value.length < 2) return null;
  return value.slice(0, GUEST_NAME_MAX);
}

/** Имя из cookie приходит в URL-кодировке. */
export function decodeGuestCookie(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return normalizeGuestName(decodeURIComponent(value));
  } catch {
    return normalizeGuestName(value);
  }
}

export function encodeGuestCookie(name: string): string {
  return encodeURIComponent(name);
}
