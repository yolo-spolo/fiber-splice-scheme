import { chromium } from "playwright";
import { signIn } from "./sign-in.mjs";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.AUTH_PASSWORD;
const OUT = process.env.SHOTS_DIR ?? "e2e/screenshots";
if (!PASSWORD) throw new Error("Задайте AUTH_PASSWORD — пароль, которым вы входите в приложение");

await mkdir(OUT, { recursive: true });

// Тестовое фото муфты
const photoPath = path.join(tmpdir(), "test-mufta.jpg");
execFileSync("node", [
  "-e",
  `const s=require('sharp');
   s({create:{width:1200,height:900,channels:3,background:'#2b3a4a'}})
    .composite([{input:Buffer.from('<svg width="1200" height="900"><rect x="120" y="140" width="420" height="260" rx="18" fill="#3f5164"/><rect x="640" y="420" width="420" height="300" rx="18" fill="#465a70"/><text x="150" y="300" font-size="46" fill="#cfe0f0" font-family="sans-serif">КАССЕТА 1</text><text x="670" y="580" font-size="46" fill="#cfe0f0" font-family="sans-serif">КАССЕТА 2</text></svg>')}])
    .jpeg().toFile('${photoPath}')`,
]);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await signIn(page, BASE, PASSWORD);

await page.click("text=ЖК «Северный», корпус 3");
await page.waitForURL(/\/projects\//);
await page.click("text=№12");
await page.waitForURL(/\/closures\//);
const closureId = page.url().match(/closures\/([a-z0-9]+)/)[1];

console.log("→ загрузка фото");
await page.goto(`${BASE}/closures/${closureId}/photos`);
await page.setInputFiles('input[type="file"]', photoPath);
await page.waitForSelector("text=без меток", { timeout: 20000 });
await page.screenshot({ path: `${OUT}/11-photos.png`, fullPage: true });

console.log("→ метка на фото");
await page.click('button:has-text("без меток")');
await page.waitForSelector("text=Поставить метку");
await page.click('button:has-text("Поставить метку")');
await page.click('button:has-text("Кликните по фото")', { trial: true }).catch(() => {});
const img = page.locator("img[alt]").last();
const box = await img.boundingBox();
await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.4);
await page.waitForTimeout(400);
await page.fill('input[placeholder="Подпись к фото"]', "Муфта после монтажа кассет");
await page.screenshot({ path: `${OUT}/12-photo-pin.png` });
await page.click('button:has-text("Сохранить")');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/13-photos-saved.png`, fullPage: true });

console.log("→ публичная ссылка");
await page.goto(`${BASE}/closures/${closureId}/share`);
await page.click('button:has-text("Создать ссылку")');
await page.waitForSelector("text=/s/", { timeout: 15000 });
await page.screenshot({ path: `${OUT}/14-share.png`, fullPage: true });
const shareUrl = await page.locator("li .font-mono").first().innerText();
console.log(`   ссылка: ${shareUrl.trim()}`);

console.log("→ проверка публичной ссылки без авторизации");
const anon = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const anonPage = await anon.newPage();
const res = await anonPage.goto(shareUrl.trim());
console.log(`   статус: ${res.status()}`);
const imagesOk = await anonPage.evaluate(() =>
  Array.from(document.images).map((i) => ({ src: i.src, ok: i.complete && i.naturalWidth > 0 })),
);
console.log(`   картинок: ${imagesOk.length}, загрузилось: ${imagesOk.filter((i) => i.ok).length}`);
await anonPage.screenshot({ path: `${OUT}/15-public.png`, fullPage: true });

console.log("→ прямой доступ к чужому файлу по токену");
const forbidden = await anonPage.request.get(`${shareUrl.trim()}/file/other-closure/secret.jpg`);
console.log(`   подделка пути: ${forbidden.status()}`);
const noAuth = await anonPage.request.get(`${BASE}/api/files/${closureId}/x.jpg`);
console.log(`   /api/files без сессии: ${noAuth.status()}`);

console.log(errors.length ? `Ошибки: ${errors.join("; ")}` : "Ошибок нет");
await browser.close();
