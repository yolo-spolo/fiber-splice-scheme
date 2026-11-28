/**
 * Адрес, от которого собираются публичные ссылки и QR.
 *
 * Раньше каждая страница писала `process.env.APP_URL ?? "http://localhost:3000"`
 * — и на живом сайте без APP_URL ссылка для заказчика вела на localhost.
 * Это был настоящий баг 0.6.0. Запасного значения здесь нет намеренно:
 * лучше честная ошибка, чем ссылка в никуда.
 */
export function shareBaseUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (!raw) {
    throw new Error(
      "APP_URL не задан: без него нельзя собрать ссылку для заказчика. " +
        "Укажите адрес сайта в .env, например APP_URL=http://fiber.example:4325",
    );
  }
  // Хвостовой слэш даёт двойной в пути: `${base}/s/…`.
  return raw.replace(/\/+$/, "");
}

/** Готовая ссылка по токену. Одна на все страницы и на QR. */
export function shareLinkUrl(token: string): string {
  return `${shareBaseUrl()}/s/${token}`;
}
