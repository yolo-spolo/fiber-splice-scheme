// Поле «Координаты» одной строкой: ввод, сохранение, карта на странице муфты.
// Запуск: /opt/node/bin/node e2e/coordinates.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];

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

await page.goto(BASE);
await page.waitForLoadState("networkidle");
const projectHref = await page.locator('a[href^="/projects/"]').first().getAttribute("href");
check("объект найден", Boolean(projectHref));
await page.goto(`${BASE}${projectHref}`);
await page.waitForLoadState("networkidle");
const closureHref = await page.locator('a[href^="/closures/"]').first().getAttribute("href");
check("муфта найдена", Boolean(closureHref));

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
await page.screenshot({ path: "/tmp/opencode/coords-half.png", fullPage: false });

await coords.fill("44.7234, 37.7681");
const hiddenLat = await page.locator('input[type="hidden"][name="lat"]').inputValue();
const hiddenLng = await page.locator('input[type="hidden"][name="lng"]').inputValue();
check("пара разобрана в lat/lng", hiddenLat === "44.7234" && hiddenLng === "37.7681", `${hiddenLat} / ${hiddenLng}`);
await page.screenshot({ path: "/tmp/opencode/coords-full.png", fullPage: false });

await page.getByRole("button", { name: "Сохранить" }).click();
await page.waitForLoadState("networkidle");

await page.goto(`${BASE}${closureHref}`);
await page.waitForLoadState("networkidle");
const mapValue = await page.locator("text=/\\d+\\.\\d+, \\d+\\.\\d+/").first().innerText();
check("координаты на странице муфты", mapValue === "44.7234, 37.7681", mapValue);

// Карта не грузится сама: сначала «Показать карту», иначе внешний iframe
// тянет трафик на каждом открытии муфты.
await page.getByText("Показать карту").click();
await page.waitForTimeout(500);
check("карта открывается по координатам", (await page.locator("iframe").count()) > 0);
await page.screenshot({ path: "/tmp/opencode/coords-map.png", fullPage: false });

await browser.close();
process.exit(failures ? 1 : 0);
