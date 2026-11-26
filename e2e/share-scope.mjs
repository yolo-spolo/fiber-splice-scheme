// Ссылки на объект и на муфту: выдача с двух мест, открытие без пароля,
// границы доступа и файлы по токену.
// Запуск: /opt/node/bin/node e2e/share-scope.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];

const browser = await chromium.launch();
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${BASE}/login`);
if (await page.locator('input[name="repeat"]').count()) {
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="repeat"]', password);
} else {
  await page.fill('input[name="password"]', password);
}
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");

// Объект с несколькими муфтами: на нём и проверим обе области ссылки.
await page.goto(BASE);
await page.waitForLoadState("networkidle");
const projectHref = await page.locator('a[href^="/projects/"]').first().getAttribute("href");
const projectId = projectHref.split("/").pop();
await page.goto(`${BASE}/projects/${projectId}/share`);
await page.waitForLoadState("networkidle");
check("страница ссылок объекта открылась", (await page.locator("text=Ссылка для заказчика").count()) > 0);

const scopeSelect = page.locator("select").first();
const scopeOptions = await scopeSelect.locator("option").allInnerTexts();
check("можно выбрать весь объект", scopeOptions.includes("Весь объект"), scopeOptions.join(" | "));
check("можно выбрать муфту", scopeOptions.some((text) => text.startsWith("Муфта:")), String(scopeOptions.length));

// Список ссылок обновляется серверным экшеном: ждём появления новой строки,
// а не фиксированную паузу — в dev-режиме перерисовка приходит с задержкой.
async function readLinkValues() {
  return page.locator('input[aria-label="Ссылка для заказчика"]').evaluateAll((nodes) =>
    nodes.map((node) => node.value),
  );
}

async function createLinkAndRead() {
  const before = await readLinkValues();
  await page.getByRole("button", { name: "Создать ссылку" }).click();
  await page.waitForFunction(
    (count) => document.querySelectorAll('input[aria-label="Ссылка для заказчика"]').length > count,
    before.length,
    { timeout: 20_000 },
  );
  const after = await readLinkValues();
  return after.find((value) => !before.includes(value)) ?? "";
}

// Ссылка на весь объект.
await scopeSelect.selectOption("project");
const projectUrl = await createLinkAndRead();
check("ссылка на объект создана", projectUrl.includes("/s/"), projectUrl);

// Ссылка на муфту — из того же места.
const closureOption = await scopeSelect.locator("option").nth(1).getAttribute("value");
await scopeSelect.selectOption(closureOption);
const closureUrl = await createLinkAndRead();
check("ссылка на муфту создана", closureUrl !== projectUrl && closureUrl.includes("/s/"), closureUrl);

const badges = await page.locator("li .chip").allInnerTexts();
check("в списке видно права и область", badges.length >= 2, badges.join(" | "));

// Ссылка с правкой: в списке она помечена «правка», гость видит свою роль.
await scopeSelect.selectOption("project");
await page.locator("select").nth(1).selectOption("EDIT");
const editUrl = await createLinkAndRead();
check("ссылка с правкой создана", editUrl.includes("/s/"), editUrl);
const editBadge = await page
  .locator("li")
  .filter({ has: page.locator(`input[value="${editUrl}"]`) })
  .locator(".chip")
  .first()
  .innerText();
check("в списке помечена правка", editBadge.toLowerCase() === "правка", editBadge);

// Гость без пароля: объект открывает список муфт.
const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
const guest = await anon.newPage();
const projectRes = await guest.goto(projectUrl);
check("ссылка на объект открывается без пароля", projectRes.status() === 200, String(projectRes.status()));
check(
  "гость видит, что ссылка только для чтения",
  (await guest.locator("text=только просмотр").count()) > 0,
);

// Ссылка с правкой сообщает о себе уже в списке муфт.
const editRes = await guest.goto(editUrl);
check("ссылка с правкой открывается", editRes.status() === 200);
check(
  "гость видит право правки",
  (await guest.locator("text=с правом правки").count()) > 0,
);
await guest.goto(projectUrl);
await guest.waitForLoadState("networkidle");
const closureLinks = await guest.locator('a[href*="/closure/"]').count();
check("в объекте есть муфты-ссылки", closureLinks > 1, String(closureLinks));
await guest.screenshot({ path: "/tmp/opencode/share-project.png", fullPage: true });

const firstClosureHref = await guest.locator('a[href*="/closure/"]').first().getAttribute("href");
const firstClosureId = firstClosureHref.split("/").pop();
// Вторую муфту запоминаем до перехода: после него список муфт уже не на экране.
const secondClosureHref = await guest.locator('a[href*="/closure/"]').nth(1).getAttribute("href");
const otherClosureId = secondClosureHref.split("/").pop();

await guest.goto(`${BASE}${firstClosureHref}`);
await guest.waitForLoadState("networkidle");
check("схема муфты открывается из объекта", (await guest.locator("article.document").count()) > 0);
await guest.screenshot({ path: "/tmp/opencode/share-closure.png", fullPage: false });

// Ссылка на муфту не должна открывать другую муфту того же объекта.
const closureToken = closureUrl.split("/s/")[1];
const forbidden = await guest.goto(`${BASE}/s/${closureToken}/closure/${otherClosureId}`);
check("чужая муфта по ссылке на муфту закрыта", forbidden.status() === 200);
check(
  "и объясняет почему",
  (await guest.locator("text=не открывает выбранную муфту").count()) > 0,
);

const ownClosure = await guest.goto(`${BASE}/s/${closureToken}/closure/${firstClosureId}`);
check("своя муфта по ссылке на муфту открыта", ownClosure.status() === 200);
check("и показывает документ", (await guest.locator("article.document").count()) > 0);

// Файлы: по ссылке на объект доступны фото любой его муфты, чужой объект — нет.
const projectToken = projectUrl.split("/s/")[1];
const otherProjectPhoto = await guest.request.get(`${BASE}/s/${projectToken}/file/nonexistent/x.jpg`);
check("файл не из этого объекта закрыт", otherProjectPhoto.status() === 403, String(otherProjectPhoto.status()));

await browser.close();
process.exit(failures ? 1 : 0);
