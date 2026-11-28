/**
 * Настройки прогона: адрес, пароль, каталог снимков.
 *
 * Пароль берётся из окружения, а `.env` читается только если файла нет в
 * окружении. В CI `.env` не существует, и прежняя версия падала бы на
 * `readFileSync` ещё до первого шага. На рабочем сервере, наоборот, пароль
 * записан в `.env`, и повторять его в командной строке незачем.
 */
import { existsSync, readFileSync } from "node:fs";

/** Адрес приложения. `E2E_BASE` — старое имя переменной, ещё принимается. */
export const BASE =
  process.env.BASE_URL ?? process.env.E2E_BASE ?? "http://127.0.0.1:3100";

/** Куда складывать снимки. По умолчанию /tmp/opencode — репозиторий не засоряется. */
export const SHOTS = process.env.SHOTS_DIR ?? "/tmp/opencode";


/** Пароль владельца: сначала окружение, потом `.env`, если он есть. */
export function readPassword() {
  const fromEnv = process.env.AUTH_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  if (existsSync(".env")) {
    const match = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"));
    if (match?.[1]) return match[1];
  }

  throw new Error(
    "Не задан AUTH_PASSWORD: передайте его в окружении или положите в .env",
  );
}

/**
 * Объект из сида и его первая муфта.
 *
 * Привязываться к «первому объекту в списке» нельзя: список отсортирован по
 * времени изменения, а `cold-start` создаёт свой объект и делает его первым.
 * Тогда все следующие сценарии молча работали бы не с тем объектом. Поэтому
 * объект ищем по названию, а «первый» — запасной вариант для чужой базы.
 */
export async function seedProject(page, base, projectName = "ЖК «Северный», корпус 3") {
  await page.goto(base);
  await page.waitForLoadState("networkidle");

  const named = page.locator('a[href^="/projects/"]', { hasText: projectName }).first();
  const projectHref =
    (await named.count()) > 0
      ? await named.getAttribute("href")
      : await page.locator('a[href^="/projects/"]').first().getAttribute("href");
  if (!projectHref) throw new Error("В базе нет объектов — запустите npm run db:seed");

  await page.goto(`${base}${projectHref}`);
  await page.waitForLoadState("networkidle");
  const closureHref = await page.locator('a[href^="/closures/"]').first().getAttribute("href");
  if (!closureHref) throw new Error(`В объекте «${projectName}» нет муфт`);

  return { projectHref, closureHref };
}
