// Координаты в документе для заказчика: экран, эмуляция печати и настоящий
// PDF (Chromium печатает в файл — так видно, что попало на бумагу).
// Запуск: /opt/node/bin/node e2e/pdf-coordinates.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = process.env.E2E_BASE ?? "http://127.0.0.1:3100";
const password = /^AUTH_PASSWORD="?([^"\n]*)"?/m.exec(readFileSync(".env", "utf8"))?.[1];
const COORD_RE = /\d{2,3}\.\d+,\s*-?\d{2,3}\.\d+/;

const browser = await chromium.launch();
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

// Снимок — вспомогательный шаг: на печатной медиа он иногда не успевает
// отрисоваться, и падение скриншота не должно валить проверку документа.
async function shot(target, path, options = {}) {
  try {
    await target.screenshot({ path, timeout: 15_000, animations: "disabled", ...options });
  } catch (error) {
    console.log(`   (снимок ${path} не сделан: ${String(error).split("\n")[0]})`);
  }
}

async function signIn(page) {
  await page.goto(`${BASE}/login`);
  if (await page.locator('input[name="repeat"]').count()) {
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="repeat"]', password);
  } else {
    await page.fill('input[name="password"]', password);
  }
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

// Муфта с координатами — та, что правили на этапе 1.
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await signIn(page);
await page.goto(BASE);
await page.waitForLoadState("networkidle");
const projectHref = await page.locator('a[href^="/projects/"]').first().getAttribute("href");
await page.goto(`${BASE}${projectHref}`);
await page.waitForLoadState("networkidle");
const closureHref = await page.locator('a[href^="/closures/"]').first().getAttribute("href");

// 1. Документ муфты.
await page.goto(`${BASE}${closureHref}/print`);
await page.waitForLoadState("networkidle");
const docText = await page.locator("article.document").first().innerText();
check("координаты есть в документе муфты", COORD_RE.test(docText), docText.match(COORD_RE)?.[0] ?? "нет");
await shot(page, "/tmp/opencode/pdf-closure.png");

// 2. Документ объекта: титул с составом.
await page.goto(`${BASE}${projectHref}/print`);
await page.waitForLoadState("networkidle");
const coverText = await page.locator("article.document-cover").first().innerText();
check("координаты есть в составе объекта", COORD_RE.test(coverText), coverText.match(COORD_RE)?.[0] ?? "нет");
await shot(page, "/tmp/opencode/pdf-cover.png");

// 3. Эмуляция печати на узком вьюпорте: телефон/планшет — там ломалась печать.
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await signIn(phone);
await phone.emulateMedia({ media: "print" });
await phone.goto(`${BASE}${closureHref}/print`);
await phone.waitForLoadState("networkidle");
await shot(phone, "/tmp/opencode/pdf-phone-print.png");
const phoneText = await phone.locator("article.document").first().innerText();
check("в печатной версии на телефоне координаты видны", COORD_RE.test(phoneText));
// Сам лист в печати шире окна телефона — так и задумано (188 мм). Проверяем,
// что внутри документа ничего не вылезает за его поля.
const overflow = await phone.evaluate(() => {
  const doc = document.querySelector("article.document");
  if (!doc) return -1;
  return doc.scrollWidth - doc.clientWidth;
});
check("внутри листа нет горизонтального переполнения", overflow >= 0 && overflow <= 1, `${overflow}px`);
await phone.screenshot({ path: "/tmp/opencode/pdf-phone.png", fullPage: false });

// 4. Настоящий PDF: координаты должны попасть в текстовый слой файла.
// Поток PDF сжат, поэтому текст достаём pdftotext, а не поиском по байтам.
const pdfPath = "/tmp/opencode/doc-coordinates.pdf";
const pdf = await page.pdf({ format: "A4", printBackground: true, path: pdfPath });
check("PDF собрался", pdf.length > 20_000, `${Math.round(pdf.length / 1024)} КБ`);
const pdfText = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });
const found = (pdfText.match(/\d{2}\.\d{3,},\s*-?\d{2,3}\.\d{3,}/g) ?? []).slice(0, 3);
console.log(`   координаты в PDF: ${found.join(" | ") || "—"}`);
check("в PDF есть координаты", found.length > 0);

await browser.close();
process.exit(failures ? 1 : 0);
