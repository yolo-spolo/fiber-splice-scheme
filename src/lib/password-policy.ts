/**
 * Политика пароля без серверных зависимостей: те же правила нужны форме
 * первого запуска (клиент) и серверным экшенам.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordErrorCode = "short" | "long" | "spaces";

export type PasswordCheck = { ok: true } | { ok: false; error: string; code: PasswordErrorCode };

/**
 * Только длина и «не одни пробелы». Спецсимволы, цифры и регистр
 * не обязательны — пользователь один, пароль придумывает владелец установки.
 */
export function validatePassword(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, code: "short", error: `Пароль короче ${PASSWORD_MIN_LENGTH} символов` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, code: "long", error: `Пароль длиннее ${PASSWORD_MAX_LENGTH} символов` };
  }
  if (password.trim().length === 0) {
    return { ok: false, code: "spaces", error: "Пароль не может состоять из одних пробелов" };
  }
  return { ok: true };
}
