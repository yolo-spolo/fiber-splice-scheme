/**
 * Скриншоты для README. Запуск:
 *
 *   npm run demo:data        # один раз: объект, муфта, кабели, фото
 *   npm run screenshots      # сервер должен быть уже запущен
 *
 * Пишет PNG в docs/screenshots. Адрес берётся из BASE_URL, пароль — из
 * AUTH_PASSWORD, как и у e2e-скриптов.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.AUTH_PASSWORD;
const OUT = process.env.SHOTS_DIR ?? "docs/screenshots";

if (!PASSWORD) {
  console.error("AUTH_PASSWORD не задан. Пример: AUTH_PASSWORD='пароль' npm run screenshots");
  process.exit(1);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

async function newPage(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    locale: "ru-RU",
  });
  const page = await context.newPage();
  return { context, page };
}

async function login(page) {
  // На чистой базе сначала показывается мастер первого запуска.
  await page.goto(`${BASE}/login`);
  if (page.url().includes("/setup")) {
    await page.fill('input[name="password"]', PASSWORD);
    await page.fill('input[name="repeat"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);
    return;
  }
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`);
}

async function shoot(page, name, options = {}) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${name}.png`, ...options });
  console.log(`✓ ${name}.png`);
}

// ─── Десктоп ────────────────────────────────────────────────────────────────
const { context, page } = await newPage();
await login(page);

await shoot(page, "01-objects", { clip: { x: 0, y: 0, width: 1440, height: 480 } });

await page.click("text=ЖК «Северный», корпус 3");
await page.waitForURL(/\/projects\//);
await shoot(page, "02-project", { clip: { x: 0, y: 0, width: 1440, height: 480 } });

await page.click("text=№12");
await page.waitForURL(/\/closures\//);
const closureId = page.url().match(/closures\/([a-z0-9]+)/)[1];

// Карта грузится только по нажатию — открываем, чтобы на снимке был адрес и место.
const mapButton = page.getByRole("button", { name: "Показать карту" });
if (await mapButton.count()) {
  await mapButton.first().click();
  await page.waitForTimeout(2500);
}
await shoot(page, "03-closure-cables");

// Диалог нового кабеля с предпросмотром раскладки
await page.getByRole("button", { name: "Добавить кабель" }).first().click();
await page.waitForSelector('[role="dialog"]');
const dialog = page.locator('[role="dialog"]');
await dialog.locator('input[name="label"]').fill("К4");
await dialog.locator('input[name="fiberCount"]').fill("24");
await dialog.locator('input[name="moduleCount"]').fill("2");
await dialog.locator('input[name="moduleCount"]').blur();
await dialog.locator('input[name="fromLocation"]').fill("Колодец К-14");
await dialog.locator('input[name="toLocation"]').fill("Подъезд 3");
await page.waitForTimeout(400);
await shoot(page, "04-new-cable");
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// Редактор сварок: снимок рабочей области без шапки муфты
await page.goto(`${BASE}/closures/${closureId}/splice`);
await page.waitForSelector("text=Прямая сварка");
await shoot(page, "05-splice-editor");
console.log("✓ 05-splice-editor.png");

// Схема соединений
await page.getByRole("button", { name: "Показать схему" }).click();
await page.waitForTimeout(600);
const schemeCard = page.locator("figure", { hasText: "Кассета 1 — Нижняя" }).first();
await schemeCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await schemeCard.screenshot({ path: `${OUT}/06-splice-scheme.png` });
console.log("✓ 06-splice-scheme.png");

// Проверка схемы
await page.goto(`${BASE}/closures/${closureId}/check`);
await page.waitForSelector("text=Проверяются двойные сварки");
await shoot(page, "07-check");

// Фото с метками
await page.goto(`${BASE}/closures/${closureId}/photos`);
await page.waitForSelector("text=Снимок с телефона");
await page.locator("button:has(img)").first().click();
await page.waitForTimeout(700);
await shoot(page, "08-photo-pins");
await page.getByRole("button", { name: "Закрыть" }).click();
await page.waitForTimeout(300);

// Публичная ссылка: панель управления
await page.goto(`${BASE}/closures/${closureId}/share`);
await page.waitForSelector("text=Ссылка для заказчика");
await shoot(page, "09-share-panel");

// Документ A4
await page.goto(`${BASE}/closures/${closureId}/print`);
await page.waitForSelector("text=Схема оптических сварок");
await page.waitForTimeout(900);
await shoot(page, "10-document", { fullPage: true });

// Справочники
await page.goto(`${BASE}/settings`);
await page.waitForSelector("text=Палитра волокон");
await shoot(page, "11-settings", { clip: { x: 0, y: 0, width: 1440, height: 900 } });

// Публичная страница без авторизации
const publicToken = process.env.PUBLIC_TOKEN;
if (publicToken) {
  const anon = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const anonPage = await anon.newPage();
  await anonPage.goto(`${BASE}/s/${publicToken}`);
  await anonPage.waitForTimeout(900);
  await anonPage.screenshot({ path: `${OUT}/12-public.png`, fullPage: true });
  console.log("✓ 12-public.png");
  await anon.close();
}

await context.close();

// ─── Мобильный вид ──────────────────────────────────────────────────────────
const mobile = await newPage({ width: 390, height: 844 });
await login(mobile.page);
await mobile.page.goto(`${BASE}/closures/${closureId}/splice`);
await mobile.page.waitForSelector("text=Прямая сварка");
await mobile.page.getByRole("button", { name: "Показать схему" }).click();
await mobile.page.waitForTimeout(700);
await mobile.page.screenshot({ path: `${OUT}/13-mobile-scheme.png` });
console.log("✓ 13-mobile-scheme.png");
await mobile.context.close();

await browser.close();

// Ужимаем до 1600 px по ширине: на GitHub крупнее не нужно, а вес падает втрое.
for (const name of await readdir(OUT)) {
  if (!name.endsWith(".png")) continue;
  const file = path.join(OUT, name);
  const meta = await sharp(file).metadata();
  if ((meta.width ?? 0) > 1600) {
    const buffer = await sharp(file).resize({ width: 1600 }).png({ compressionLevel: 9 }).toBuffer();
    await sharp(buffer).toFile(file);
  }
}

console.log(`\nГотово: ${OUT}`);
