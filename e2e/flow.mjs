import { chromium } from "playwright";
import { signIn } from "./sign-in.mjs";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.AUTH_PASSWORD;
const OUT = process.env.SHOTS_DIR ?? "e2e/screenshots";
if (!PASSWORD) throw new Error("Задайте AUTH_PASSWORD — пароль, которым вы входите в приложение");

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

function step(name) {
  console.log(`→ ${name}`);
}

step("вход");
await signIn(page, BASE, PASSWORD);
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });

step("объект");
await page.click("text=ЖК «Северный», корпус 3");
await page.waitForURL(/\/projects\//);
await page.screenshot({ path: `${OUT}/02-project.png`, fullPage: true });

step("муфта");
await page.click("text=№12");
await page.waitForURL(/\/closures\//);
await page.screenshot({ path: `${OUT}/03-closure.png`, fullPage: true });

step("редактор сварок");
const closureId = page.url().match(/closures\/([a-z0-9]+)/)[1];

step("добавление кабеля К3 на 12 волокон");
await page.getByRole("button", { name: "Добавить кабель" }).first().click();
const cableDialog = page.getByRole("dialog");
await cableDialog.locator('input[name="label"]').fill("К3");
await cableDialog.locator('input[name="fiberCount"]').fill("12");
await cableDialog.getByRole("button", { name: "Добавить кабель" }).click();
await page.waitForSelector('div:has-text("К3")', { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/03b-cables.png`, fullPage: true });

await page.locator('a[href$="/splice"]').click();
await page.waitForURL(/\/splice$/);
await page.screenshot({ path: `${OUT}/04-splice.png`, fullPage: true });

step("прямая сварка К1 ↔ К3");
const spliceCountBefore = await page.locator("ul li:has-text('↔')").count();
await page.getByRole("button", { name: "Прямая сварка" }).click();
const straightDialog = page.getByRole("dialog");
const labelA = await straightDialog.locator("select").nth(0).locator("option", { hasText: "К1" }).getAttribute("value");
const labelB = await straightDialog.locator("select").nth(1).locator("option", { hasText: "К3" }).getAttribute("value");
await straightDialog.locator("select").nth(0).selectOption(labelA);
await straightDialog.locator("select").nth(1).selectOption(labelB);
await page.screenshot({ path: `${OUT}/05-straight-dialog.png` });
await straightDialog.getByRole("button", { name: "Сварить" }).click();
await page.waitForTimeout(2500);
const spliceCountAfter = await page.locator("ul li:has-text('↔')").count();
console.log(`   сварок: ${spliceCountBefore} → ${spliceCountAfter}`);
await page.screenshot({ path: `${OUT}/06-splice-after.png`, fullPage: true });

step("проверка");
await page.goto(`${BASE}/closures/${closureId}/check`);
await page.screenshot({ path: `${OUT}/06-check.png`, fullPage: true });

step("документ");
await page.goto(`${BASE}/closures/${closureId}/print`);
await page.screenshot({ path: `${OUT}/07-document.png`, fullPage: true });
await page.emulateMedia({ media: "print" });
await page.screenshot({ path: `${OUT}/08-document-print.png`, fullPage: true });
await page.emulateMedia({ media: "screen" });

step("мобильный вид");
await context.close();
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const mp = await mobile.newPage();
await signIn(mp, BASE, PASSWORD);
await mp.screenshot({ path: `${OUT}/09-mobile-home.png`, fullPage: true });
await mp.goto(`${BASE}/closures/${closureId}/splice`);
await mp.screenshot({ path: `${OUT}/10-mobile-splice.png`, fullPage: true });

console.log(errors.length ? `\nОшибки консоли:\n${errors.join("\n")}` : "\nОшибок консоли нет");
await browser.close();
