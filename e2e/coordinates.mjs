// Поле «Координаты» одной строкой: ввод, сохранение, карта на странице муфты.
// Запуск: /opt/node/bin/node e2e/coordinates.mjs
import { chromium } from "playwright";

// Адрес, пароль и каталог снимков — из e2e/env.mjs: в CI .env нет.
import { BASE, readPassword, seedProject, SHOTS } from "./env.mjs";
const password = readPassword();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let failures = 0;

function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

// Вход (мастер первого запуска тоже возможен на чистой базе).
await page.goto(`${BASE}/login`);
if (await page.locator('input[name="repeat"]').count()) {
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="repeat"]', password);
} else {
  await page.fill('input[name="password"]', password);
}
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");

const { closureHref } = await seedProject(page, BASE);

await page.goto(`${BASE}${closureHref}`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Изменить" }).first().click().catch(() => {});
if (!(await page.locator('input[name="coordinates"]').count())) {
  // Кнопка может называться иначе — ищем по любому открывающему диалогу.
  const buttons = await page.locator("button").allInnerTexts();
  console.log("кнопки:", buttons.join(" | "));
}

const coords = page.locator('input[name="coordinates"]');
check("одно поле «Координаты»", (await coords.count()) === 1);
check("нет поля «Широта»", (await page.locator('input[name="lat"][type="text"]').count()) === 0);

await coords.fill("44.7234");
await page.waitForTimeout(150);
const hint = await page.locator("text=Допишите через запятую").count();
check("половина координат — подсказка", hint > 0);
await page.screenshot({ path: `${SHOTS}/coords-half.png`, fullPage: false });

await coords.fill("44.7234, 37.7681");
const hiddenLat = await page.locator('input[type="hidden"][name="lat"]').inputValue();
const hiddenLng = await page.locator('input[type="hidden"][name="lng"]').inputValue();
check("пара разобрана в lat/lng", hiddenLat === "44.7234" && hiddenLng === "37.7681", `${hiddenLat} / ${hiddenLng}`);
await page.screenshot({ path: `${SHOTS}/coords-full.png`, fullPage: false });

await page.getByRole("button", { name: "Сохранить" }).click();
await page.waitForLoadState("networkidle");

await page.goto(`${BASE}${closureHref}`);
await page.waitForLoadState("networkidle");
// Сохранение идёт серверным экшеном с пересчётом страницы: читать один раз
// сразу после клика — гонка. Ждём нужного значения.
const mapCoords = page.locator("text=/\\d+\\.\\d+, \\d+\\.\\d+/").first();
const saved = await mapCoords
  .filter({ hasText: "44.7234, 37.7681" })
  .waitFor({ state: "visible", timeout: 15_000 })
  .then(() => true)
  .catch(() => false);
const mapValue = await mapCoords.innerText().catch(() => "нет координат");
check("координаты на странице муфты", saved, mapValue);

// Карта не грузится сама: сначала «Показать карту», иначе внешний iframe
// тянет трафик на каждом открытии муфты.
await page.getByText("Показать карту").click();
await page.waitForTimeout(500);
check("карта открывается по координатам", (await page.locator("iframe").count()) > 0);
await page.screenshot({ path: `${SHOTS}/coords-map.png`, fullPage: false });

await browser.close();
process.exit(failures ? 1 : 0);
