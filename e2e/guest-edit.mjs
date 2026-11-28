// Гостевая правка по ссылке: обязательное имя, изменения от имени гостя,
// история и запрет правки по ссылке «только чтение».
// Запуск: /opt/node/bin/node e2e/guest-edit.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// Адрес задаётся BASE_URL; E2E_BASE — старое имя, ещё принимается.
const BASE = process.env.BASE_URL ?? process.env.E2E_BASE ?? "http://127.0.0.1:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];

const browser = await chromium.launch();
// Dev-сервер компилирует страницы на первом заходе — это десятки секунд.
const TIMEOUT = 90_000;
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

// Владелец выдаёт две ссылки на одну муфту: с правкой и только для чтения.
const owner = await browser.newPage({ viewport: { width: 1280, height: 900 } });
owner.setDefaultTimeout(TIMEOUT);
owner.setDefaultNavigationTimeout(TIMEOUT);
await owner.goto(`${BASE}/login`);
if (await owner.locator('input[name="repeat"]').count()) {
  await owner.fill('input[name="password"]', password);
  await owner.fill('input[name="repeat"]', password);
} else {
  await owner.fill('input[name="password"]', password);
}
await owner.click('button[type="submit"]');
await owner.waitForLoadState("networkidle");

await owner.goto(BASE);
await owner.waitForLoadState("networkidle");
const projectHref = await owner.locator('a[href^="/projects/"]').first().getAttribute("href");
await owner.goto(`${BASE}${projectHref}`);
await owner.waitForLoadState("networkidle");
const closureHref = await owner.locator('a[href^="/closures/"]').first().getAttribute("href");

await owner.goto(`${BASE}${closureHref}/share`);
await owner.waitForLoadState("networkidle");

async function issueLink(mode) {
  // В шапке муфты тоже есть select (статус), поэтому ищем по подписи поля.
  await owner.locator('label:has-text("Права") select').selectOption(mode);
  const before = await owner
    .locator('input[aria-label="Ссылка для заказчика"]')
    .evaluateAll((nodes) => nodes.map((node) => node.value));
  await owner.getByRole("button", { name: "Создать ссылку" }).click();
  await owner.waitForFunction(
    (count) => document.querySelectorAll('input[aria-label="Ссылка для заказчика"]').length > count,
    before.length,
    { timeout: 20_000 },
  );
  const after = await owner
    .locator('input[aria-label="Ссылка для заказчика"]')
    .evaluateAll((nodes) => nodes.map((node) => node.value));
  return after.find((value) => !before.includes(value));
}

const editUrl = await issueLink("EDIT");
const readUrl = await issueLink("READ");
check("ссылка с правкой выдана", Boolean(editUrl), editUrl);

// 1. Гость по ссылке с правкой сначала вводит имя.
const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
const g = await guest.newPage();
g.setDefaultTimeout(TIMEOUT);
g.setDefaultNavigationTimeout(TIMEOUT);
await g.goto(editUrl);
await g.waitForLoadState("networkidle");
check("сначала просят имя", (await g.locator("text=Представьтесь").count()) > 0);
check("редактора до имени нет", (await g.locator("text=Добавить кабель").count()) === 0);

await g.fill('input[name="name"]', "Сергей Монтажник");
await g.getByRole("button", { name: "Продолжить" }).click();
// router.refresh() перерисовывает страницу без навигации, поэтому ждём
// появления редактора, а не события загрузки.
const editorReady = await g
  .getByRole("button", { name: "Добавить кабель" })
  .waitFor({ timeout: 60_000 })
  .then(() => true)
  .catch(() => false);
check("после имени открылся редактор", editorReady);
check("имя видно в шапке", (await g.locator("text=Сергей Монтажник").count()) > 0);
await g.screenshot({ path: "/tmp/opencode/guest-editor.png", fullPage: false });

// 2. Гость меняет статус муфты и параметры кабеля.
await g.locator("select").first().selectOption("IN_PROGRESS");
await g.waitForTimeout(1200);

await g.getByRole("button", { name: "Изменить" }).first().click();
await g.waitForTimeout(400);
const notesField = g.locator('textarea[name="notes"]');
check("диалог муфты открылся", (await notesField.count()) > 0);
await notesField.fill("Правка по ссылке: заменили кассету");
await g.getByRole("button", { name: "Сохранить" }).click();
await g.waitForTimeout(1500);

// 3. История: обе правки от имени гостя.
await g.getByRole("button", { name: "История" }).click();
const guestSeen = await g
  .locator("text=Сергей Монтажник (по ссылке)")
  .first()
  .waitFor({ timeout: 30_000 })
  .then(() => true)
  .catch(() => false);
const historyText = await g.locator("body").innerText();
check("в истории есть гость", guestSeen, historyText.slice(0, 200));
check("в истории есть правка заметок", historyText.includes("заметки"), historyText.slice(0, 300));
await g.screenshot({ path: "/tmp/opencode/guest-history.png", fullPage: false });

// 3b. «Вся история» гостя: страница открывается, возврата на ней нет.
await g.getByRole("link", { name: "Вся история" }).click();
const fullHistory = await g
  .locator("text=История изменений: кто и что менял")
  .waitFor({ timeout: 30_000 })
  .then(() => true)
  .catch(() => false);
check("ссылка «Вся история» открывает страницу", fullHistory, g.url());
check("на гостевой истории нет возврата", (await g.getByRole("button", { name: "Вернуть" }).count()) === 0);
check(
  "гостевая история видит правки гостя",
  (await g.locator("text=Сергей Монтажник (по ссылке)").count()) > 0,
);
await g.screenshot({ path: "/tmp/opencode/guest-full-history.png", fullPage: false });

// 4. Ссылка «только чтение» редактора не даёт.
const viewer = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const v = await viewer.newPage();
v.setDefaultTimeout(TIMEOUT);
v.setDefaultNavigationTimeout(TIMEOUT);
await v.goto(readUrl);
await v.waitForLoadState("networkidle");
check("по read-ссылке редактора нет", (await v.locator("text=Добавить кабель").count()) === 0);
check("по read-ссылке нет формы имени", (await v.locator("text=Представьтесь").count()) === 0);

// 5. Владелец видит историю и может вернуть поле.
await owner.goto(`${BASE}${closureHref}/history`);
await owner.waitForLoadState("networkidle");
const ownerHistory = await owner.locator("body").innerText();
check("владелец видит правку гостя", ownerHistory.includes("Сергей Монтажник (по ссылке)"));
const restore = owner.getByRole("button", { name: "Вернуть" }).first();
check("есть кнопка возврата", (await restore.count()) > 0);
await restore.click();
const restored = await owner
  // Запись возврата начинается со слова «возврат», дальше — тире и действие.
  .locator("text=/возврат/")
  .first()
  .waitFor({ timeout: 30_000 })
  .then(() => true)
  .catch(() => false);
check("возврат записан в историю", restored);
await owner.screenshot({ path: "/tmp/opencode/owner-history.png", fullPage: true });

await browser.close();
process.exit(failures ? 1 : 0);
