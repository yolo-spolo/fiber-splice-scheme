/**
 * Лимит попыток входа: 5 неудач за 15 минут на адрес. Приложение рассчитано
 * на один процесс, поэтому счётчик живёт в памяти. При нескольких инстансах
 * лимит будет считаться отдельно в каждом — это осознанное упрощение.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type Bucket = { count: number; firstAt: number };
type RateLimitGlobal = typeof globalThis & { __fiberAuthBuckets?: Map<string, Bucket> };

// Dev HMR переисполняет модули, поэтому храним map на globalThis.
const globalForRateLimit = globalThis as RateLimitGlobal;
const buckets = (globalForRateLimit.__fiberAuthBuckets ??= new Map<string, Bucket>());

export function isRateLimited(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (now - bucket.firstAt > WINDOW_MS) {
    buckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_FAILURES;
}

export function registerFailure(key: string, now = Date.now()): void {
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.firstAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAt: now });
    return;
  }
  bucket.count += 1;
}

export function resetFailures(key: string): void {
  buckets.delete(key);
}

export const RATE_LIMIT_MESSAGE = "Слишком много попыток. Подождите 15 минут.";

/**
 * Ключ лимита — адрес клиента. Без этого одна серия неудачных попыток
 * блокировала бы вход всем, включая владельца установки.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  return `login:${ip}`;
}
