#!/usr/bin/env node
/**
 * Резервная копия данных и текущей сборки.
 *
 *   npm run backup                 # дамп БД + фото, проверка и ротация
 *   npm run backup -- --keep 30    # сколько последних наборов хранить (по умолчанию 14)
 *
 * Куда: /root/backups/fiber (или BACKUP_DIR). Каждый запуск создаёт набор
 * с одной меткой времени: db-*.sql.gz, uploads-*.tar.gz, next-build-*.tar.gz.
 * Дамп сразу восстанавливается в одноразовую базу и сверяется по счётчикам —
 * «бэкап, который не проверяли» бэкапом не считается.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = process.env.BACKUP_DIR ?? "/root/backups/fiber";
const DB_CONTAINER = process.env.BACKUP_DB_CONTAINER ?? "fiber-db";
const DB_NAME = process.env.BACKUP_DB_NAME ?? "fiber";
const DB_USER = process.env.BACKUP_DB_USER ?? "fiber";
const VERIFY_DB = "fiber_backup_verify";
const keepArg = process.argv.indexOf("--keep");
const KEEP = keepArg > -1 ? Number(process.argv[keepArg + 1]) || 14 : 14;

function stamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function sh(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", ...options });
}

function step(text) {
  console.log(`→ ${text}`);
}

const label = stamp();
mkdirSync(DIR, { recursive: true });

step("дамп базы");
const dbFile = path.join(DIR, `db-${label}.sql.gz`);
execFileSync("bash", [
  "-c",
  `docker exec ${DB_CONTAINER} pg_dump -U ${DB_USER} -d ${DB_NAME} --no-owner --no-privileges | gzip -9 > "${dbFile}"`,
]);

step("фото муфт");
const uploadsDir = path.resolve(ROOT, process.env.UPLOAD_DIR ?? "./data/uploads");
const uploadsFile = path.join(DIR, `uploads-${label}.tar.gz`);
if (existsSync(uploadsDir)) {
  sh("tar", ["-czf", uploadsFile, "-C", path.dirname(uploadsDir), path.basename(uploadsDir)]);
} else {
  console.log(`  ${uploadsDir} нет — архив фото пропущен`);
}

step("проверка: восстановление во временную базу");
sh("docker", ["exec", DB_CONTAINER, "dropdb", "-U", DB_USER, "--force", "--if-exists", VERIFY_DB]);
sh("docker", ["exec", DB_CONTAINER, "createdb", "-U", DB_USER, VERIFY_DB]);
try {
  execFileSync("bash", [
    "-c",
    `gunzip -c "${dbFile}" | docker exec -i ${DB_CONTAINER} psql -q -U ${DB_USER} -d ${VERIFY_DB} > /dev/null`,
  ]);

  const counts = (database) =>
    sh("docker", [
      "exec",
      DB_CONTAINER,
      "psql",
      "-U",
      DB_USER,
      "-d",
      database,
      "-tAc",
      `select (select count(*) from "Project") || '/' || (select count(*) from "Closure") || '/' ||
              (select count(*) from "Cable") || '/' || (select count(*) from "Fiber") || '/' ||
              (select count(*) from "Splice") || '/' || (select count(*) from "Photo")`,
    ]).trim();

  const live = counts(DB_NAME);
  const restored = counts(VERIFY_DB);
  if (live !== restored) {
    console.error(`✗ Дамп не совпал с базой: было ${live}, восстановлено ${restored}`);
    process.exit(1);
  }
  console.log(`  объекты/муфты/кабели/волокна/сварки/фото: ${restored} — совпадает`);
} finally {
  sh("docker", ["exec", DB_CONTAINER, "dropdb", "-U", DB_USER, "--force", "--if-exists", VERIFY_DB]);
}

step("текущая сборка .next");
const buildDir = path.join(ROOT, ".next");
const buildFile = path.join(DIR, `next-build-${label}.tar.gz`);
if (existsSync(buildDir)) {
  sh("tar", ["-czf", buildFile, "-C", ROOT, ".next"]);
} else {
  console.log("  .next нет — архив сборки пропущен");
}

step(`ротация: оставляю последние ${KEEP} наборов`);
const labels = [
  ...new Set(
    readdirSync(DIR)
      .map((name) => name.match(/^(?:db|uploads|next-build)-(.+)\.(?:sql\.gz|tar\.gz)$/)?.[1])
      .filter(Boolean),
  ),
].sort();
for (const old of labels.slice(0, Math.max(0, labels.length - KEEP))) {
  for (const prefix of ["db", "uploads", "next-build"]) {
    for (const suffix of ["sql.gz", "tar.gz"]) {
      const file = path.join(DIR, `${prefix}-${old}.${suffix}`);
      if (existsSync(file)) rmSync(file);
    }
  }
}

console.log("\nГотово:");
for (const name of readdirSync(DIR).filter((n) => n.includes(label)).sort()) {
  const size = (statSync(path.join(DIR, name)).size / 1024 / 1024).toFixed(1);
  console.log(`  ${name} — ${size} МБ`);
}
console.log(`  каталог: ${DIR}`);
