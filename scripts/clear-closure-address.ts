#!/usr/bin/env tsx
/**
 * Разовая очистка старого поля «Адрес установки» (`Closure.address`).
 *
 * В 0.5.0 у муфты остался один адрес — почтовый (`city`/`street`/`house`),
 * он же имя муфты в списках и документах. Свободный `address` больше нигде
 * не выводится; этот скрипт стирает его из базы, когда вы решите.
 *
 * Запуск: npm run data:clear-address            (покажет, что будет стёрто)
 *         npm run data:clear-address -- --yes   (выполнит очистку)
 *
 * Перед запуском на живых данных сделайте резервную копию:
 *   docker exec fiber-db pg_dump -U fiber -d fiber > backup.sql
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const confirmed = process.argv.includes("--yes");
  const rows = await prisma.closure.findMany({
    where: { NOT: [{ address: null }, { address: "" }] },
    select: { id: true, number: true, projectId: true, address: true },
    orderBy: [{ projectId: "asc" }, { number: "asc" }],
  });

  if (rows.length === 0) {
    console.log("✓ Старых адресов нет — очищать нечего.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Муфт со старым адресом: ${rows.length}`);
  for (const row of rows) {
    console.log(`  №${row.number} — ${row.address}`);
  }

  if (!confirmed) {
    console.log("\nЭто был пробный прогон. Повторите с --yes, чтобы стереть адреса.");
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.closure.updateMany({
    where: { NOT: [{ address: null }, { address: "" }] },
    data: { address: null },
  });
  console.log(`✓ Очищено записей: ${result.count}.`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("✗ Не удалось очистить адреса:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
