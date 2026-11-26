// Кнопка «Копировать» в панели ссылок: работает и на HTTP-адресе, где
// navigator.clipboard отсутствует (живой сайт живёт без TLS).
// Запуск: /opt/node/bin/node e2e/copy-link.mjs (нужен dev/start на BASE_URL).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.E2E_BASE ?? "http://fiber.quota.ovh:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let failures = 0;

function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

await page.goto(`${BASE}/login`);
if (await page.locator('input[name="repeat"]').count()) {
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="repeat"]', password);
} else {
  await page.fill('input[name="password"]', password);
}
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");

const secure = await page.evaluate(() => window.isSecureContext);
const hasClipboard = await page.evaluate(() => Boolean(navigator.clipboard));
console.log(`   isSecureContext=${secure} clipboard=${hasClipboard}`);

await page.goto(BASE);
await page.waitForLoadState("networkidle");
const projectHref = await page.locator('a[href^="/projects/"]').first().getAttribute("href");
await page.goto(`${BASE}${projectHref}`);
await page.waitForLoadState("networkidle");
const closureHref = await page.locator('a[href^="/closures/"]').first().getAttribute("href");

await page.goto(`${BASE}${closureHref}/share`);
await page.waitForLoadState("networkidle");
if (!(await page.getByRole("button", { name: "Копировать" }).count())) {
  await page.getByRole("button", { name: "Создать ссылку" }).click();
  await page.waitForTimeout(1500);
}

const copy = page.getByRole("button", { name: "Копировать" }).first();
check("есть кнопка «Копировать»", (await copy.count()) > 0);

const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));
await copy.click();
await page.waitForTimeout(600);

const label = await page.getByRole("button", { name: /Скопировано|Выделено/ }).first().innerText().catch(() => "");
check("кнопка подтвердила копирование", /Скопировано|Выделено/.test(label), label);
check("нет исключений в консоли", pageErrors.length === 0, pageErrors.join("; "));

const value = await page.locator('input[aria-label="Ссылка для заказчика"]').first().inputValue();
check("ссылка ведёт на этот же хост", value.startsWith(BASE), value);
await page.screenshot({ path: "/tmp/opencode/copy-link.png" });

// Настоящая проверка буфера: вставляем в пустое поле сочетанием клавиш.
await page.evaluate(() => {
  const probe = document.createElement("textarea");
  probe.id = "clipboard-probe";
  probe.style.position = "fixed";
  probe.style.top = "0";
  document.body.appendChild(probe);
  probe.focus();
});
await page.keyboard.press("Control+V");
// Системный буфер в headless иногда отдаёт предыдущее значение — читаем
// несколько раз, прежде чем считать проверку проваленной.
let pasted = "";
for (let attempt = 0; attempt < 5 && pasted !== value; attempt += 1) {
  await page.locator("#clipboard-probe").fill("");
  await page.locator("#clipboard-probe").focus();
  await page.keyboard.press("Control+V");
  await page.waitForTimeout(200);
  pasted = await page.locator("#clipboard-probe").inputValue();
}
check("в буфере лежит та же ссылка", pasted === value, pasted);

// Самый плохой случай: браузер без Clipboard API и с запрещённым execCommand.
// Кнопка должна не молчать, а выделить ссылку для ручного копирования.
const blocked = await browser.newContext({ viewport: { width: 390, height: 780 } });
await blocked.addInitScript(() => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  document.execCommand = () => false;
});
const blockedPage = await blocked.newPage();
await blockedPage.goto(`${BASE}/login`);
await blockedPage.fill('input[name="password"]', password);
await blockedPage.click('button[type="submit"]');
await blockedPage.waitForLoadState("networkidle");
await blockedPage.goto(`${BASE}${closureHref}/share`);
await blockedPage.waitForLoadState("networkidle");
await blockedPage.getByRole("button", { name: "Копировать" }).first().click();
await blockedPage.waitForTimeout(500);
const fallbackNote = await blockedPage
  .locator("text=/скопируйте её вручную/")
  .first()
  .innerText()
  .catch(() => "");
check("без буфера — подсказка про ручное копирование", fallbackNote.length > 0, fallbackNote);
const fallbackLabel = await blockedPage.getByRole("button", { name: "Выделено" }).first().innerText().catch(() => "");
check("кнопка переключилась в «Выделено»", fallbackLabel === "Выделено", fallbackLabel);
const selected = await blockedPage.evaluate(() => {
  const field = document.activeElement;
  if (!(field instanceof HTMLInputElement)) return false;
  return field.selectionStart === 0 && field.selectionEnd === field.value.length && field.value.length > 0;
});
check("ссылка выделена целиком", selected);
await blockedPage.screenshot({ path: "/tmp/opencode/copy-link-fallback.png", fullPage: true });
await blocked.close();

await browser.close();
process.exit(failures ? 1 : 0);
