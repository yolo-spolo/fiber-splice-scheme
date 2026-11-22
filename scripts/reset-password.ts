#!/usr/bin/env tsx
/**
 * Сброс пароля из терминала — на случай, если пароль забыт.
 * Запуск: npm run auth:reset            (спросит пароль скрыто)
 *         npm run auth:reset -- "новый" (пароль аргументом, попадёт в историю)
 *
 * Требует DATABASE_URL. AUTH_SECRET не нужен: скрипт не выпускает сессии,
 * но поднимает их ревизию — все устройства потребуют вход заново.
 */
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password-hash";
import { PASSWORD_MIN_LENGTH, validatePassword } from "../src/lib/password-policy";

const prisma = new PrismaClient();

async function readHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const anyRl = rl as unknown as { _writeToOutput?: (s: string) => void };
  const original = anyRl._writeToOutput;
  anyRl._writeToOutput = function (chunk: string) {
    if (chunk.includes(question)) original?.call(rl, chunk);
    else original?.call(rl, "*");
  };

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      anyRl._writeToOutput = original;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const fromArgs = process.argv[2];
  const password = fromArgs ?? (await readHidden(`Новый пароль (минимум ${PASSWORD_MIN_LENGTH} символов): `));

  const check = validatePassword(password);
  if (!check.ok) {
    console.error(`✗ ${check.error}`);
    process.exit(1);
  }

  if (!fromArgs) {
    const repeat = await readHidden("Повторите пароль: ");
    if (repeat !== password) {
      console.error("✗ Пароли не совпадают");
      process.exit(1);
    }
  }

  const value = { hash: await hashPassword(password), updatedAt: new Date().toISOString() };

  await prisma.setting.upsert({
    where: { key: "auth.password" },
    create: { key: "auth.password", value },
    update: { value },
  });

  const revRow = await prisma.setting.findUnique({ where: { key: "auth.sessionRev" } });
  const current = (revRow?.value as { rev?: number } | null)?.rev ?? 0;
  const nextRev = { rev: current + 1 };
  await prisma.setting.upsert({
    where: { key: "auth.sessionRev" },
    create: { key: "auth.sessionRev", value: nextRev },
    update: { value: nextRev },
  });

  console.log("✓ Пароль обновлён. Все устройства потребуют вход заново.");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("✗ Не удалось сменить пароль:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
