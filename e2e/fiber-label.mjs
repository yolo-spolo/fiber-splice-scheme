// Подпись волокна: ввод в редакторе сварок, запись в историю, печать в PDF.
// Запуск: /opt/node/bin/node e2e/fiber-label.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

// Адрес, пароль и каталог снимков — из e2e/env.mjs: в CI .env нет.
import { BASE, readPassword, seedProject, SHOTS } from "./env.mjs";
const password = readPassword();
const LABEL = "Абонент: кв. 42, Петров";

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

const { closureHref } = await seedProject(page, BASE);

await page.goto(`${BASE}${closureHref}/splice`);
await page.waitForLoadState("networkidle");

// Первое волокно схемы. Оно в сиде уже сварено — и это как раз проверка:
// подписать нужно именно подключённого абонента, а раньше по сваренной жиле
// клик только ругался, и подпись требовала удалить сварку.
const labelInput = page.locator('input[placeholder*="Абонент"]');
await page.locator('button[title*=" — "]').first().click();
const selected = await labelInput
  .first()
  .waitFor({ state: "visible", timeout: 5000 })
  .then(() => true)
  .catch(() => false);
check("сваренное волокно открывается для подписи", selected);
await labelInput.fill(LABEL);
await page.getByRole("button", { name: "Сохранить подпись" }).click();
await page.waitForTimeout(1500);

const chipLabel = await page.locator(`text=${LABEL}`).count();
check("подпись видна на чипе волокна", chipLabel > 0);
await page.screenshot({ path: `${SHOTS}/fiber-label.png`, fullPage: false });

// История: подпись записана.
await page.goto(`${BASE}${closureHref}/history`);
await page.waitForLoadState("networkidle");
const history = await page.locator("body").innerText();
check("подпись в истории", /подпись волокна/i.test(history), history.slice(0, 200));

// PDF: подпись в документе.
await page.goto(`${BASE}${closureHref}/print`);
await page.waitForLoadState("networkidle");
const pdfPath = `${SHOTS}/fiber-label.pdf`;
const pdf = await page.pdf({ format: "A4", printBackground: true, path: pdfPath });
const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });
check("подпись попала в PDF", text.includes("Абонент: кв. 42"), `${Math.round(pdf.length / 1024)} КБ`);
// В документе заголовок набран капсом через CSS — сверяем без регистра.
check("история попала в PDF", /последние изменения/i.test(text));

await browser.close();
process.exit(failures ? 1 : 0);
