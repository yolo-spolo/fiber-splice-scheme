import { RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

/**
 * Ошибки авторизации передаются между route handler и страницей кодом
 * в query-параметре: так вход работает без JavaScript и до гидратации.
 */
export const AUTH_ERRORS = {
  bad: "Неверный пароль",
  rate: RATE_LIMIT_MESSAGE,
  short: `Пароль короче ${PASSWORD_MIN_LENGTH} символов`,
  long: `Пароль длиннее ${PASSWORD_MAX_LENGTH} символов`,
  spaces: "Пароль не может состоять из одних пробелов",
  mismatch: "Пароли не совпадают",
  same: "Новый пароль совпадает с текущим",
  current: "Текущий пароль не подходит",
  exists: "Пароль уже задан — войдите с ним",
} as const;

export function authErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return AUTH_ERRORS[code as keyof typeof AUTH_ERRORS];
}
