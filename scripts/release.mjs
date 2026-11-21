#!/usr/bin/env node
/**
 * Публикация релиза: проверки, версия, коммит, тег, push, GitHub Release.
 *
 *   node scripts/release.mjs check            # типы, тесты, состояние дерева
 *   node scripts/release.mjs notes [версия]   # черновик ченжлога из git log
 *   node scripts/release.mjs publish 0.2.0    # полный цикл публикации
 *   node scripts/release.mjs publish 0.2.0 --dry-run
 *
 * Токен берётся из /root/.github-token (или GITHUB_TOKEN) и передаётся git
 * через временный credential helper: в .git/config и в историю он не попадает.
 *
 * `npm run build` здесь намеренно не запускается: на боевом сервере он
 * перезаписывает .next, из которого работает приложение, и сайт на время
 * сборки отдаёт ошибки. Сборку проверяет CI на GitHub Actions при push.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOKEN_PATH = "/root/.github-token";
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const PACKAGE = path.join(ROOT, "package.json");
const LOCK = path.join(ROOT, "package-lock.json");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "inherit"],
    ...options,
  });
}

function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

function step(message) {
  console.log(`\n→ ${message}`);
}

function readToken() {
  const fromEnv = process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (!existsSync(TOKEN_PATH)) {
    fail("Нет токена GitHub", `Положите токен в ${TOKEN_PATH} или задайте GITHUB_TOKEN.`);
  }
  const token = readFileSync(TOKEN_PATH, "utf8").trim();
  if (!token) fail(`Файл ${TOKEN_PATH} пуст`);
  return token;
}

/** git с токеном, но без записи токена в конфиг репозитория. */
function git(args, { token, quiet = false } = {}) {
  const base = ["-c", "credential.helper=", "-c", `credential.helper=!f() { echo username=x-access-token; echo password=${token}; }; f`];
  return run("git", [...base, ...args], { quiet });
}

function repoSlug() {
  const url = capture("git", ["config", "--get", "remote.origin.url"]);
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (!match) fail(`Не удалось разобрать адрес репозитория: ${url}`);
  return `${match[1]}/${match[2]}`;
}

function lastTag() {
  try {
    return capture("git", ["describe", "--tags", "--abbrev=0"]);
  } catch {
    return null;
  }
}

function tagExists(tag) {
  try {
    capture("git", ["rev-parse", "--verify", `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

function packageVersion() {
  return JSON.parse(readFileSync(PACKAGE, "utf8")).version;
}

/** Раздел ченжлога для версии: от заголовка до следующего заголовка версии. */
function changelogSection(version) {
  if (!existsSync(CHANGELOG)) fail("Нет CHANGELOG.md", "Создайте его перед публикацией.");
  const text = readFileSync(CHANGELOG, "utf8");
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) {
    fail(`В CHANGELOG.md нет раздела ## [${version}]`, "Добавьте раздел перед публикацией.");
  }
  let end = lines.findIndex((line, index) => index > start && line.startsWith("## ["));
  if (end === -1) end = lines.length;
  const body = lines
    .slice(start + 1, end)
    .join("\n")
    .replace(/^\[[^\]]+\]:.*$/gm, "")
    .trim();
  return { title: lines[start].replace(/^##\s*/, ""), body };
}

async function github(method, endpoint, token, payload) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  return { ok: response.ok, status: response.status, data };
}

function bumpVersion(next) {
  if (!/^\d+\.\d+\.\d+$/.test(next)) fail(`Версия «${next}» должна быть вида 0.2.0`);

  const pkg = JSON.parse(readFileSync(PACKAGE, "utf8"));
  pkg.version = next;
  writeFileSync(PACKAGE, `${JSON.stringify(pkg, null, 2)}\n`);

  if (existsSync(LOCK)) {
    const lock = JSON.parse(readFileSync(LOCK, "utf8"));
    lock.version = next;
    if (lock.packages?.[""]) lock.packages[""].version = next;
    writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  }
  console.log(`  версия в package.json: ${next}`);
}

// --- команды ---------------------------------------------------------------

function commandCheck() {
  step("Типы");
  run("npx", ["tsc", "--noEmit"]);
  console.log("  ok");

  step("Юнит-тесты");
  run("npx", ["vitest", "run"]);

  step("Состояние дерева");
  const dirty = capture("git", ["status", "--porcelain"]);
  if (dirty) {
    const files = dirty.split("\n").filter(Boolean);
    console.log(`  изменено файлов: ${files.length} — войдут в релиз`);
    for (const file of files.slice(0, 40)) console.log(`    ${file}`);
    if (files.length > 40) console.log(`    … и ещё ${files.length - 40}`);
  } else {
    console.log("  дерево чистое");
  }

  step("Секреты не должны попасть в коммит");
  const forbidden = capture("git", ["status", "--porcelain"])
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      const file = line.replace(/^[A-Z?!]{1,2}\s+/, "").replace(/^"|"$/g, "");
      return (
        /(^|\/)\.env(\.local)?$/.test(file) ||
        file === "deploy/.env" ||
        file.startsWith("data/") ||
        /\.(png|jpg|jpeg|webp)$/.test(file)
      );
    });
  if (forbidden.length > 0) {
    fail(
      "В коммит попадут файлы с секретами, данными или скриншотами",
      `${forbidden.join(", ")}\n  Добавьте их в .gitignore или уберите из индекса.`,
    );
  }
  console.log("  чисто");

  console.log("\n✓ Проверки пройдены");
}

function commandNotes(requested) {
  const tag = lastTag();
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const log = capture("git", ["log", "--no-merges", "--format=- %s", range]);
  const committed = capture("git", ["diff", "--stat", range]);
  const working = capture("git", ["status", "--porcelain"]);

  console.log(`\nИзменения с ${tag ?? "начала истории"}:`);
  console.log(log || "  (нет коммитов)");
  if (committed) console.log(`\n${committed}`);

  // Самая частая ситуация: работа сделана, но ещё не закоммичена.
  if (working) {
    const lines = working.split("\n").filter(Boolean);
    console.log(`\nНе закоммичено — ${lines.length} файлов:`);
    for (const line of lines.slice(0, 40)) console.log(`  ${line}`);
    if (lines.length > 40) console.log(`  … и ещё ${lines.length - 40}`);
  }

  const version = requested ?? packageVersion();
  if (existsSync(CHANGELOG)) {
    const section = changelogSection(version);
    console.log(`\nЧерновик раздела ${section.title}:\n`);
    console.log(section.body);
  }
  console.log("\nПроверьте формулировки в CHANGELOG.md перед публикацией.");
}

async function commandPublish(nextVersion, dryRun) {
  const token = readToken();
  const repo = repoSlug();
  const tag = `v${nextVersion}`;

  const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") {
    fail(`Публиковать можно только из ветки main, сейчас «${branch}»`, "Переключитесь на main.");
  }

  step("Проверки");
  commandCheck();

  step(`Версия ${nextVersion}`);
  if (tagExists(tag)) {
    fail(`Тег ${tag} уже существует`, "Выберите другую версию или удалите тег.");
  }

  const existing = await github("GET", `/repos/${repo}/releases/tags/${tag}`, token);
  if (existing.ok) {
    fail(`Релиз ${tag} уже опубликован`, `https://github.com/${repo}/releases/tag/${tag}`);
  }

  const section = changelogSection(nextVersion);
  console.log(`  раздел ченжлога: ${section.title}`);

  if (dryRun) {
    console.log("\n— dry-run: ничего не публикую —");
    console.log(`\nТело релиза ${tag}:\n${section.body}`);
    return;
  }

  bumpVersion(nextVersion);

  step("Коммит");
  git(["add", "-A"]);
  const staged = capture("git", ["diff", "--cached", "--name-only"]);
  if (!staged) {
    fail("Нечего коммитить", "Нет изменений для релиза.");
  }
  git(["commit", "-m", `Release ${nextVersion}`]);

  step(`Тег ${tag}`);
  git(["tag", "-a", tag, "-m", `Версия ${nextVersion}`]);

  step("Push в GitHub");
  git(["push", "origin", "HEAD:main", tag], { token });

  step("GitHub Release");
  const created = await github("POST", `/repos/${repo}/releases`, token, {
    tag_name: tag,
    name: `Версия ${nextVersion}`,
    body: section.body,
    draft: false,
    prerelease: false,
  });
  if (!created.ok) {
    fail(`GitHub отклонил создание релиза (${created.status})`, created.data?.message ?? "");
  }

  console.log(`\n✓ Опубликовано: ${created.data.html_url}`);
  console.log(`  CI проверит сборку: https://github.com/${repo}/actions`);
}

// --- запуск ----------------------------------------------------------------

const [command, argument, flag] = process.argv.slice(2);
const dryRun = flag === "--dry-run" || argument === "--dry-run";

if (command === "check") {
  commandCheck();
} else if (command === "notes") {
  commandNotes(argument && argument !== "--dry-run" ? argument : undefined);
} else if (command === "publish") {
  if (!argument || argument === "--dry-run") {
    fail("Укажите версию", "node scripts/release.mjs publish 0.2.0");
  }
  await commandPublish(argument, dryRun);
} else {
  console.log(`Публикация релиза.

  node scripts/release.mjs check              типы, тесты, состояние дерева
  node scripts/release.mjs notes [версия]     черновик ченжлога
  node scripts/release.mjs publish 0.2.0      опубликовать
  node scripts/release.mjs publish 0.2.0 --dry-run   показать без публикации`);
}
