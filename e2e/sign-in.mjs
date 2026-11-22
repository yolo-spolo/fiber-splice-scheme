/**
 * Вход в приложение для E2E-скриптов.
 * На чистой базе приложение сначала показывает мастер первого запуска —
 * тогда пароль из AUTH_PASSWORD и становится паролем установки.
 */
export async function signIn(page, base, password) {
  await page.goto(`${base}/login`);

  if (page.url().includes("/setup")) {
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="repeat"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${base}/`);
    return "setup";
  }

  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${base}/`);
  return "login";
}
