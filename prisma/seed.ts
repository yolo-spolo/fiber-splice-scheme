import { PrismaClient } from "@prisma/client";
import { colorCodeForPosition } from "../src/lib/colors";

const prisma = new PrismaClient();

async function addCable(
  closureId: string,
  label: string,
  type: string,
  fiberCount: number,
  order: number,
  from: string,
  to: string,
) {
  const moduleCapacity = 12;
  const moduleCount = Math.ceil(fiberCount / moduleCapacity);
  return prisma.cable.create({
    data: {
      closureId,
      label,
      type,
      fiberCount,
      moduleCount,
      moduleCapacity,
      fromLocation: from,
      toLocation: to,
      order,
      fibers: {
        create: Array.from({ length: fiberCount }, (_, i) => ({
          moduleIndex: Math.floor(i / moduleCapacity) + 1,
          position: (i % moduleCapacity) + 1,
          colorCode: colorCodeForPosition((i % moduleCapacity) + 1),
        })),
      },
    },
    include: { fibers: { orderBy: [{ moduleIndex: "asc" }, { position: "asc" }] } },
  });
}

async function main() {
  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log("Данные уже есть — сид пропущен");
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: "ЖК «Северный», корпус 3",
      customer: "ООО «Ромашка»",
      address: "г. Москва, ул. Полярная, 12",
      contract: "№ 14/2026",
      notes: "Сдача объекта до 30.11.2026",
    },
  });

  const closure = await prisma.closure.create({
    data: {
      projectId: project.id,
      number: "12",
      kind: "МУФТА",
      model: "СТ-МТОК-96-2 (4/4)",
      address: "Колодец К-14, подъезд 2",
      status: "IN_PROGRESS",
      cassettes: {
        create: [
          { number: 1, capacity: 12, label: "Нижняя" },
          { number: 2, capacity: 12, label: "Верхняя" },
        ],
      },
    },
    include: { cassettes: { orderBy: { number: "asc" } } },
  });

  const trunk = await addCable(closure.id, "К1", "ОК-М", 24, 0, "ОРШ-3", "Колодец К-14");
  const drop = await addCable(closure.id, "К2", "ОК-Л", 12, 1, "Колодец К-14", "Подъезд 2");

  const cassette = closure.cassettes[0];
  const pairs = 12;
  for (let i = 0; i < pairs; i += 1) {
    const a = trunk.fibers[i];
    const b = drop.fibers[i];
    if (!a || !b) continue;
    await prisma.splice.create({
      data: {
        closureId: closure.id,
        cassetteId: cassette.id,
        fiberAId: a.id,
        fiberBId: b.id,
        kind: "FUSION",
        lossDb: Number((0.03 + Math.random() * 0.12).toFixed(2)),
        splicedAt: new Date(),
      },
    });
    await prisma.fiber.updateMany({
      where: { id: { in: [a.id, b.id] } },
      data: { status: "SPLICED" },
    });
  }

  console.log(`Создано: ${project.name}, муфта №${closure.number}, ${pairs} сварок`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
