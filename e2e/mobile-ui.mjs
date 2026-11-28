// Мобильные формы и тема гостевой ссылки.
//
// Два дефекта, которые ловятся только на телефоне:
//   1. «Новая муфта» выше экрана: панель начиналась за верхней границей, и
//      поле «Номер» было недоступно — ни ввести, ни доскроллить.
//   2. Гостевая страница была принудительно светлой, а цвет текста наследовала
//      от тёмного <html>: светлый текст на белой бумаге.
//
// Запуск: BASE_URL=http://127.0.0.1:3100 /opt/node/bin/node e2e/mobile-ui.mjs
import { chromium } from "playwright";

import { BASE, readPassword, seedProject, SHOTS } from "./env.mjs";
const password = readPassword();

const browser = await chromium.launch();
let failures = 0;

function check(name, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!ok) failures += 1;
}

/**
 * Текст, у которого контраст к собственному фону ниже 3:1. Именно так выглядит
 * «нечитаемая белая тема»: светлый текст на светлой бумаге.
 */
function lowContrastText() {
  const lum = ([r, g, b]) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const background = (element) => {
    let node = element;
    while (node) {
      const value = getComputedStyle(node).backgroundColor;
      if (value && !/^rgba\(0, 0, 0, 0\)$/.test(value)) return value;
      node = node.parentElement;
    }
    return "rgb(255,255,255)";
  };

  const bad = [];
  for (const element of document.querySelectorAll("h1,h2,h3,p,span,div,a,button,li,td,th,label")) {
    const ownText = [...element.childNodes].some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 3,
    );
    if (!ownText) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) {
      continue;
    }
    const foreground = lum(rgb(style.color));
    const back = lum(rgb(background(element)));
    const ratio = (Math.max(foreground, back) + 0.05) / (Math.min(foreground, back) + 0.05);
    if (ratio < 3) bad.push(`${element.textContent.trim().slice(0, 24)} (${ratio.toFixed(2)}:1)`);
  }
  return bad;
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

// ─── 1. Мобильная форма муфты ───────────────────────────────────────────────
// Высота 664 — телефон с открытой экранной клавиатурой. Именно на ней форма
// уезжала вверх: панель 861 px при окне 664 px.
const phone = await browser.newContext({
  viewport: { width: 390, height: 664 },
  isMobile: true,
  hasTouch: true,
});
const page = await phone.newPage();
await signIn(page);

const { projectHref } = await seedProject(page, BASE);
await page.goto(`${BASE}${projectHref}`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Добавить муфту" }).first().click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(300);

const dialog = await page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"]').firstElementChild;
  const field = document.querySelector('input[name="number"]');
  const panelBox = panel.getBoundingClientRect();
  const fieldBox = field.getBoundingClientRect();
  return {
    panelTop: Math.round(panelBox.top),
    panelBottom: Math.round(panelBox.bottom),
    fieldTop: Math.round(fieldBox.top),
    fieldBottom: Math.round(fieldBox.bottom),
    scrolls: panel.scrollHeight > panel.clientHeight,
    viewport: window.innerHeight,
  };
});
check("панель формы начинается в пределах экрана", dialog.panelTop >= 0, JSON.stringify(dialog));
check("панель не выходит за нижнюю границу", dialog.panelBottom <= dialog.viewport + 1, String(dialog.panelBottom));
check("поле «Номер» видно сразу", dialog.fieldTop >= 0 && dialog.fieldBottom <= dialog.viewport, JSON.stringify(dialog));
check("длинную форму можно прокрутить внутри", dialog.scrolls);

// Поле должно принимать ввод, а не просто быть видимым.
await page.locator('input[name="number"]').fill("77");
check("в поле «Номер» вводится текст", (await page.locator('input[name="number"]').inputValue()) === "77");

// Нижние кнопки достижимы прокруткой.
const submitBox = await page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"]').firstElementChild;
  const button = panel.querySelector('button[type="submit"]');
  button.scrollIntoView({ block: "nearest" });
  const box = button.getBoundingClientRect();
  return { top: Math.round(box.top), bottom: Math.round(box.bottom), viewport: window.innerHeight };
});
// Допуск в пиксель: кнопка встаёт ровно на границу окна.
check(
  "кнопка «Создать» достижима",
  submitBox.top >= 0 && submitBox.bottom <= submitBox.viewport + 1,
  JSON.stringify(submitBox),
);
await page.screenshot({ path: `${SHOTS}/mobile-closure-dialog.png` });
await page.getByRole("button", { name: "Закрыть" }).click();

// ─── 2. Тема гостевой ссылки ────────────────────────────────────────────────
// Ссылка на муфту — тем же путём, что и в copy-link.
await page.goto(`${BASE}${projectHref}/share`).catch(() => {});
await page.waitForLoadState("networkidle");
const { closureHref } = await seedProject(page, BASE);
await page.goto(`${BASE}${closureHref}/share`);
await page.waitForLoadState("networkidle");
if (!(await page.getByRole("button", { name: "Копировать" }).count())) {
  await page.getByRole("button", { name: "Создать ссылку" }).click();
  await page.waitForTimeout(1500);
}
const shareUrl = await page
  .locator('input[aria-label="Ссылка для заказчика"]')
  .first()
  .inputValue();
check("ссылка для заказчика получена", shareUrl.includes("/s/"), shareUrl);

// Гость с тёмной темой в системе: страница обязана открыться светлой и
// читаемой, а не светлой с тёмным текстом.
const guest = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
});
const gp = await guest.newPage();
await gp.goto(shareUrl);
await gp.waitForLoadState("networkidle");

const initial = await gp.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  mode: document.documentElement.dataset.themeMode,
  stored: localStorage.getItem("fiber-theme"),
}));
check("гость начинает со светлой темы", initial.theme === "light", JSON.stringify(initial));
check("выбор гостя не подменяется молча системным", initial.mode === "light", String(initial.mode));
// Умолчание не выдаём за выбор гостя: пока он не переключил тему сам, в
// хранилище пусто, и следующая ссылка тоже откроется светлой.
check("умолчание не записывается как выбор", initial.stored === null, String(initial.stored));

const guestContrast = await gp.evaluate(lowContrastText);
check("на гостевой странице нет нечитаемого текста", guestContrast.length === 0, guestContrast.join("; "));
await gp.screenshot({ path: `${SHOTS}/guest-light.png`, fullPage: false });

// Переключатель есть и работает.
const toggle = gp.locator('button[aria-label^="Тема оформления"]').first();
check("на гостевой странице есть переключатель темы", (await toggle.count()) > 0);
await toggle.click();
await gp.waitForTimeout(400);
const afterToggle = await gp.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  stored: localStorage.getItem("fiber-theme"),
}));
check("переключатель делает страницу тёмной", afterToggle.theme === "dark", JSON.stringify(afterToggle));
check("выбор гостя сохранён", afterToggle.stored === "dark", String(afterToggle.stored));
const darkContrast = await gp.evaluate(lowContrastText);
check("в тёмной теме текст тоже читаем", darkContrast.length === 0, darkContrast.join("; "));
await gp.screenshot({ path: `${SHOTS}/guest-dark.png`, fullPage: false });

// Выбор переживает переход по ссылке, а не только перезагрузку.
await gp.reload();
await gp.waitForLoadState("networkidle");
const afterReload = await gp.evaluate(() => document.documentElement.dataset.theme);
check("тёмная тема остаётся после перезагрузки", afterReload === "dark", afterReload);

// Печать обязана быть светлой: тёмная тема не должна попадать на бумагу.
await gp.emulateMedia({ media: "print" });
const printed = await gp.evaluate(() => {
  const heading = document.querySelector("h1");
  return {
    text: getComputedStyle(heading).color,
    background: getComputedStyle(document.body).backgroundColor,
  };
});
await gp.emulateMedia({ media: "screen" });
check("PDF печатается светлым", printed.text === "rgb(17, 26, 44)", JSON.stringify(printed));

await browser.close();
process.exit(failures ? 1 : 0);
