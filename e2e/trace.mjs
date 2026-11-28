// Трасса волокна: выбор жилы, маршрут через муфты, объяснение конца маршрута.
// Запуск: BASE_URL=http://... /opt/node/bin/node e2e/trace.mjs
//
// Сценарий ничего не меняет в базе: он только читает схему и строит маршрут.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// Адрес задаётся BASE_URL; E2E_BASE — старое имя, ещё принимается.
const BASE = process.env.BASE_URL ?? process.env.E2E_BASE ?? "http://127.0.0.1:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];

const browser = await chromium.launch();
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.setDefaultTimeout(90_000);
page.setDefaultNavigationTimeout(90_000);

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
await page.goto(`${BASE}${projectHref}`);
await page.waitForLoadState("networkidle");
const closureHref = await page.locator('a[href^="/closures/"]').first().getAttribute("href");

// Вкладка трассы есть в карточке муфты.
await page.goto(`${BASE}${closureHref}`);
await page.waitForLoadState("networkidle");
check("вкладка «Трасса» в муфте", (await page.getByRole("link", { name: "Трасса" }).count()) > 0);

await page.goto(`${BASE}${closureHref}/trace`);
await page.waitForLoadState("networkidle");
const picker = page.getByLabel("Волокно для трассы");
check("страница трассы открылась", (await picker.count()) > 0);

const values = await picker
  .locator("option")
  .evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
check("волокна объекта в списке", values.length > 0, `${values.length} шт.`);

if (values.length > 0) {
  await picker.selectOption(values[0]);
  await page.waitForTimeout(2000);
  const text = await page.locator("body").innerText();
  // Маршрут всегда объясняет оба конца: даже у одинокой жилы это «конец
  // маршрута», а не пустой экран.
  // Подписи сторон набраны заглавными в CSS, поэтому сравниваем без регистра.
  check(
    "маршрут объясняет начало и конец",
    /начало:/i.test(text) && /конец:/i.test(text),
  );
  check("в маршруте есть шаги", /№\d+/.test(text));
  await page.screenshot({ path: "/tmp/opencode/trace.png", fullPage: false });
}

// Из карточки волокна тоже можно уйти в трассу — там и возникает вопрос.
await page.goto(`${BASE}${closureHref}`);
await page.waitForLoadState("networkidle");
// Волокна в карточке кабеля свёрнуты: сначала раскрываем первый кабель.
const expand = page.getByRole("button", { name: "Волокна" }).first();
if ((await expand.count()) > 0) {
  await expand.click();
  await page.waitForTimeout(400);
}
// Чип волокна подписан цветом и статусом: «Синий · Свободно». В шапке есть
// кнопка темы с похожей подсказкой, поэтому берём чип именно в карточке кабеля.
const fiberButton = page.locator(".card button[title*=' · ']").first();
if ((await fiberButton.count()) > 0) {
  await fiberButton.click();
  const dialog = await page.locator('[role="dialog"]').innerText();
  check("в карточке волокна есть переход в трассу", dialog.includes("Показать трассу"));
}

// Несуществующее волокно не роняет страницу.
await page.goto(`${BASE}${closureHref}/trace?fiber=нет-такого`);
await page.waitForLoadState("networkidle");
const missing = await page.locator("body").innerText();
check("несуществующее волокно объяснено", missing.includes("Такого волокна нет"));

await browser.close();
process.exit(failures ? 1 : 0);
