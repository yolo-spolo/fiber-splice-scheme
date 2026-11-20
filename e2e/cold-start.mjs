import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.AUTH_PASSWORD;
const OUT = process.env.SHOTS_DIR ?? "e2e/screenshots";
if (!PASSWORD) throw new Error("Задайте AUTH_PASSWORD — тот же пароль, что в .env приложения");

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`);

const stamp = Date.now().toString().slice(-5);
console.log("→ новый объект");
await page.getByRole("button", { name: "Новый объект" }).click();
let dialog = page.getByRole("dialog");
await dialog.locator('input[name="name"]').fill(`Тестовый объект ${stamp}`);
await dialog.locator('input[name="customer"]').fill("ООО «Проверка»");
await dialog.getByRole("button", { name: "Создать объект" }).click();
await page.waitForURL(/\/projects\//);
console.log(`   ${page.url()}`);

console.log("→ новая муфта");
await page.getByRole("button", { name: "Добавить муфту" }).first().click();
dialog = page.getByRole("dialog");
await dialog.locator('input[name="number"]').fill("77");
await dialog.locator('input[name="model"]').fill("СТ-МТОК-24");
await dialog.getByRole("button", { name: "Создать" }).click();
await page.waitForURL(/\/closures\//);
const closureId = page.url().match(/closures\/([a-z0-9]+)/)[1];
console.log(`   муфта ${closureId}`);

console.log("→ дубль номера должен дать понятную ошибку");
const projectId = await page.evaluate(() => {
  const link = document.querySelector('a[href^="/projects/"]');
  return link ? link.getAttribute("href").split("/").pop() : null;
});
await page.goto(`${BASE}/projects/${projectId}`);
await page.getByRole("button", { name: "Добавить муфту" }).first().click();
dialog = page.getByRole("dialog");
await dialog.locator('input[name="number"]').fill("77");
await dialog.getByRole("button", { name: "Создать" }).click();
await page.waitForTimeout(1200);
const dupError = await dialog.locator("text=уже есть").count();
console.log(`   ошибка дубля: ${dupError > 0 ? "есть" : "НЕТ"}`);
await page.keyboard.press("Escape");
await dialog.getByRole("button", { name: "Отмена" }).click();
await page.goto(`${BASE}/closures/${closureId}`);

console.log("→ кабели 8 и 8 волокон");
for (const [label, count] of [
  ["К1", "8"],
  ["К2", "8"],
]) {
  await page.getByRole("button", { name: "Добавить кабель" }).first().click();
  dialog = page.getByRole("dialog");
  await dialog.locator('input[name="label"]').fill(label);
  await dialog.locator('input[name="fiberCount"]').fill(count);
  await dialog.getByRole("button", { name: "Добавить кабель" }).click();
  await page.waitForTimeout(1200);
}

console.log("→ сварка вручную в два клика");
await page.locator('a[href$="/splice"]').click();
await page.waitForURL(/\/splice$/);
await page.locator("button[title*='К1 М1 В1']").click();
await page.locator("button[title*='К2 М1 В1']").click();
await page.waitForTimeout(1800);
const spliceRows = await page.locator("ul li:has-text('↔')").count();
console.log(`   сварок: ${spliceRows}`);

console.log("→ повторная сварка того же волокна блокируется");
await page.locator("button[title*='К1 М1 В1']").click();
await page.waitForTimeout(600);
const blocked = await page.locator("text=уже сварено").count();
console.log(`   сообщение об ошибке: ${blocked > 0 ? "есть" : "НЕТ"}`);

console.log("→ проверка показывает незавершённость");
await page.goto(`${BASE}/closures/${closureId}/check`);
const status = await page.locator(".card").first().innerText();
console.log(`   ${status.split("\n")[0]}`);

console.log("→ печать открывается");
await page.goto(`${BASE}/closures/${closureId}/print`);
const hasTitle = await page.locator("text=Схема оптических сварок").count();
console.log(`   документ: ${hasTitle > 0 ? "ок" : "НЕТ"}`);

await page.goto(`${BASE}/closures/${closureId}`);
await page.screenshot({ path: `${OUT}/20-cold-closure.png`, fullPage: true });

console.log(errors.length ? `Ошибки: ${errors.join("; ")}` : "Ошибок нет");
await browser.close();
