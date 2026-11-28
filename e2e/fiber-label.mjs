// Подпись волокна: ввод в редакторе сварок, запись в историю, печать в PDF.
// Запуск: /opt/node/bin/node e2e/fiber-label.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Адрес задаётся BASE_URL; E2E_BASE — старое имя, ещё принимается.
const BASE = process.env.BASE_URL ?? process.env.E2E_BASE ?? "http://127.0.0.1:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];
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

await page.goto(BASE);
await page.waitForLoadState("networkidle");
const projectHref = await page.locator('a[href^="/projects/"]').first().getAttribute("href");
await page.goto(`${BASE}${projectHref}`);
await page.waitForLoadState("networkidle");
const closureHref = await page.locator('a[href^="/closures/"]').first().getAttribute("href");

await page.goto(`${BASE}${closureHref}/splice`);
await page.waitForLoadState("networkidle");

// Первое волокно первого кабеля: выбираем и подписываем.
const fiber = page.locator('button[title*="М1 В1"]').first();
await fiber.click();
const labelInput = page.locator('input[placeholder*="Абонент"]');
check("поле подписи появилось", (await labelInput.count()) > 0);
await labelInput.fill(LABEL);
await page.getByRole("button", { name: "Сохранить подпись" }).click();
await page.waitForTimeout(1500);

const chipLabel = await page.locator(`text=${LABEL}`).count();
check("подпись видна на чипе волокна", chipLabel > 0);
await page.screenshot({ path: "/tmp/opencode/fiber-label.png", fullPage: false });

// История: подпись записана.
await page.goto(`${BASE}${closureHref}/history`);
await page.waitForLoadState("networkidle");
const history = await page.locator("body").innerText();
check("подпись в истории", /подпись волокна/i.test(history), history.slice(0, 200));

// PDF: подпись в документе.
await page.goto(`${BASE}${closureHref}/print`);
await page.waitForLoadState("networkidle");
const pdfPath = "/tmp/opencode/fiber-label.pdf";
const pdf = await page.pdf({ format: "A4", printBackground: true, path: pdfPath });
const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });
check("подпись попала в PDF", text.includes("Абонент: кв. 42"), `${Math.round(pdf.length / 1024)} КБ`);
// В документе заголовок набран капсом через CSS — сверяем без регистра.
check("история попала в PDF", /последние изменения/i.test(text));

await browser.close();
process.exit(failures ? 1 : 0);
