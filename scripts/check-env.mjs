#!/usr/bin/env node
/**
 * Проверка локальной конфигурации до первого запуска.
 * Запуск: npm run setup:check
 *
 * Читает .env (если есть) и подсказывает, что осталось заполнить.
 * Ничего не печатает из значений секретов — только имена переменных.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");

const REQUIRED = [
  { name: "DATABASE_URL", hint: "postgresql://user:password@localhost:5433/fiber?schema=public" },
  { name: "AUTH_SECRET", hint: "openssl rand -hex 32" },
  { name: "APP_URL", hint: "http://localhost:3000" },
];

const PLACEHOLDERS = [
  "change-me",
  "change-me-strong",
  "replace-with-32-random-bytes",
  "insecure-dev-secret",
];

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!existsSync(envPath)) {
  console.error("✗ Файл .env не найден.");
  console.error("");
  console.error("  Создайте его из шаблона:");
  console.error("    cp .env.example .env");
  console.error("");
  console.error("  Затем заполните обязательные переменные:");
  for (const { name, hint } of REQUIRED) console.error(`    ${name.padEnd(14)} — ${hint}`);
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const problems = [];

for (const { name, hint } of REQUIRED) {
  const value = env[name];
  if (!value) {
    problems.push(`${name} не задана — ${hint}`);
    continue;
  }
  const lowered = value.toLowerCase();
  const looksLikePlaceholder = PLACEHOLDERS.some((p) => lowered.includes(p));
  if (looksLikePlaceholder) {
    problems.push(`${name} всё ещё содержит значение из шаблона — замените своим (${hint})`);
    continue;
  }
  if (name === "AUTH_SECRET" && value.length < 32) {
    problems.push("AUTH_SECRET короче 32 символов — сгенерируйте: openssl rand -hex 32");
  }
  if (name === "APP_URL" && !/^https?:\/\//.test(value)) {
    problems.push("APP_URL должен начинаться с http:// или https://");
  }
}

// AUTH_PASSWORD необязательна: пароль задаётся при первом запуске.
// Но если её указали — она должна быть не короче политики приложения.
const legacyPassword = env.AUTH_PASSWORD;
if (legacyPassword && !PLACEHOLDERS.some((p) => legacyPassword.toLowerCase().includes(p))) {
  if (legacyPassword.length < 8) {
    problems.push("AUTH_PASSWORD короче 8 символов — выберите пароль надёжнее");
  }
}

if (problems.length > 0) {
  console.error("✗ Конфигурация заполнена не полностью:\n");
  for (const p of problems) console.error(`  • ${p}`);
  console.error("\n  Подробнее — в разделе «Заполните .env» в README.md");
  process.exit(1);
}

console.log("✓ .env заполнен: обязательные переменные заданы, значения не из шаблона.");
console.log("  Дальше: docker compose up -d && npx prisma db push && npm run dev");
