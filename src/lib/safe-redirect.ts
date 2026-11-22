/**
 * Разрешает редирект только на собственный путь. Простое `startsWith("/")`
 * пропускает `//evil.example` и `/\evil.example`: браузер трактует их как
 * протокол-относительный адрес и уводит на чужой домен.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // Управляющие символы и перевод строки в заголовке Location недопустимы.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  return raw;
}
