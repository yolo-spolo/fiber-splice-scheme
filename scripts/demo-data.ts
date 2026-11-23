/**
 * Демонстрационные данные для скриншотов и ручной проверки интерфейса.
 *
 *   npm run demo:data
 *
 * Создаёт объект «ЖК Северный», муфту с тремя кабелями, сварками, кассетами,
 * фото с метками и публичной ссылкой. Если объект уже есть — ничего не делает,
 * поэтому команду можно запускать повторно. Данные пишутся в базу из
 * DATABASE_URL, то есть в ту же, что у приложения.
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { colorCodeForPosition, colorByCode } from "../src/lib/colors";

const prisma = new PrismaClient();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads");
const PROJECT_NAME = "ЖК «Северный», корпус 3";

function fibersFor(fiberCount: number, moduleCapacity: number) {
  return Array.from({ length: fiberCount }, (_, i) => ({
    moduleIndex: Math.floor(i / moduleCapacity) + 1,
    position: (i % moduleCapacity) + 1,
    colorCode: colorCodeForPosition((i % moduleCapacity) + 1),
  }));
}

async function addCable(
  closureId: string,
  cable: {
    label: string;
    type: string;
    fiberCount: number;
    moduleCapacity: number;
    from: string;
    to: string;
    ownership?: "OURS" | "FOREIGN";
    sheathColor?: string;
    order: number;
  },
) {
  const moduleCount = Math.ceil(cable.fiberCount / cable.moduleCapacity);
  return prisma.cable.create({
    data: {
      closureId,
      label: cable.label,
      type: cable.type,
      fiberCount: cable.fiberCount,
      moduleCount,
      moduleCapacity: cable.moduleCapacity,
      ownership: cable.ownership ?? "OURS",
      sheathColor: cable.sheathColor ?? "Чёрный",
      fromLocation: cable.from,
      toLocation: cable.to,
      order: cable.order,
      fibers: { create: fibersFor(cable.fiberCount, cable.moduleCapacity) },
    },
    include: { fibers: { orderBy: [{ moduleIndex: "asc" }, { position: "asc" }] } },
  });
}

/** Рисует правдоподобное фото муфты: корпус, две кассеты, цветные волокна. */
async function drawClosurePhoto(closureId: string) {
  const dir = path.join(UPLOAD_DIR, closureId);
  await mkdir(dir, { recursive: true });
  const base = "demo-closure";

  const fibersRow = (count: number, x0: number, y: number) =>
    Array.from({ length: count }, (_, i) => {
      const color = colorByCode(i);
      return `<rect x="${x0 + i * 62}" y="${y}" width="38" height="118" rx="19" fill="${color.hex}" stroke="#0b1220" stroke-width="3"/>`;
    }).join("");

  const cassette1 = fibersRow(12, 245, 245);
  const cassette2 = fibersRow(8, 245, 540);

  const svg = `<svg width="1400" height="1000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a4a5e"/><stop offset="1" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="cass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#b6c2d1"/>
      </linearGradient>
    </defs>
    <rect width="1400" height="1000" fill="#2b3a4a"/>
    <rect x="90" y="60" width="1220" height="880" rx="46" fill="url(#body)" stroke="#0f172a" stroke-width="8"/>
    <rect x="120" y="90" width="1160" height="820" rx="34" fill="none" stroke="#475569" stroke-width="3"/>
    <rect x="200" y="150" width="1000" height="250" rx="20" fill="url(#cass)"/>
    <rect x="200" y="445" width="1000" height="250" rx="20" fill="url(#cass)"/>
    <text x="240" y="205" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#1e293b">КАССЕТА 1</text>
    <text x="240" y="500" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#1e293b">КАССЕТА 2</text>
    <text x="1010" y="205" font-family="Arial, sans-serif" font-size="28" fill="#475569">12 / 12</text>
    <text x="1010" y="500" font-family="Arial, sans-serif" font-size="28" fill="#475569">8 / 12</text>
    ${cassette1}
    ${cassette2}
    <rect x="300" y="750" width="800" height="110" rx="16" fill="#0f172a" opacity="0.55"/>
    <text x="340" y="818" font-family="Arial, sans-serif" font-size="32" fill="#94a3b8">МУФТА №12 · СТ-МТОК-96-2</text>
  </svg>`;

  const image = sharp(Buffer.from(svg));
  const full = await image.clone().jpeg({ quality: 86 }).toBuffer();
  const thumb = await image.clone().resize({ width: 420 }).jpeg({ quality: 78 }).toBuffer();
  await writeFile(path.join(dir, `${base}.jpg`), full);
  await writeFile(path.join(dir, `${base}-thumb.jpg`), thumb);
  return { file: path.posix.join(closureId, `${base}.jpg`), thumb: path.posix.join(closureId, `${base}-thumb.jpg`) };
}

async function main() {
  const existing = await prisma.project.findFirst({ where: { name: PROJECT_NAME } });
  if (existing) {
    console.log(`«${PROJECT_NAME}» уже есть — демо-данные не добавлены`);
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: PROJECT_NAME,
      customer: "ООО «Ромашка»",
      address: "г. Москва, ул. Полярная, 12",
      contract: "№ 14/2026",
      notes: "Сдача объекта до 30.11.2026. Схемы согласовать с технадзором.",
    },
  });

  await prisma.project.create({
    data: {
      name: "БЦ «Гранит», 2-я очередь",
      customer: "АО «СтройСвязь»",
      address: "г. Москва, ул. Складочная, 1",
      contract: "№ 07/2026",
      notes: "Проектирование, муфты ещё не заведены.",
    },
  });

  const closure = await prisma.closure.create({
    data: {
      projectId: project.id,
      number: "12",
      kind: "МУФТА",
      model: "СТ-МТОК-96-2 (4/4)",
      status: "IN_PROGRESS",
      city: "Москва",
      street: "Полярная",
      house: "12",
      lat: 55.8637,
      lng: 37.5312,
      notes: "Колодец К-14, подъезд 2. Муфта на стене, доступ свободный.",
      cassettes: {
        create: [
          { number: 1, capacity: 12, label: "Нижняя" },
          { number: 2, capacity: 12, label: "Верхняя" },
        ],
      },
    },
    include: { cassettes: { orderBy: { number: "asc" } } },
  });

  const trunk = await addCable(closure.id, {
    label: "К1",
    type: "Магистральный",
    fiberCount: 24,
    moduleCapacity: 12,
    from: "ОРШ-3",
    to: "Колодец К-14",
    order: 0,
  });
  const drop = await addCable(closure.id, {
    label: "К2",
    type: "Дроп до абонента",
    fiberCount: 12,
    moduleCapacity: 12,
    from: "Колодец К-14",
    to: "Подъезд 2",
    order: 1,
  });
  const transit = await addCable(closure.id, {
    label: "К3",
    type: "Транзитный чужой",
    fiberCount: 12,
    moduleCapacity: 12,
    from: "Колодец К-14",
    to: "ОРШ-5",
    ownership: "FOREIGN",
    sheathColor: "Оранжевый",
    order: 2,
  });

  const lower = closure.cassettes[0];
  const upper = closure.cassettes[1];

  let loss = 0.04;
  for (let i = 0; i < 12; i += 1) {
    const a = trunk.fibers[i];
    const b = drop.fibers[i];
    if (!a || !b) continue;
    await prisma.splice.create({
      data: {
        closureId: closure.id,
        cassetteId: lower.id,
        fiberAId: a.id,
        fiberBId: b.id,
        kind: "FUSION",
        lossDb: Number((loss + (i % 4) * 0.012).toFixed(2)),
        splicedAt: new Date("2026-11-18T09:20:00Z"),
      },
    });
    await prisma.fiber.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { status: "SPLICED" } });
    loss += 0.01;
  }

  // Верхняя кассета: транзит на чужой кабель, одна сварка с повышенным затуханием.
  for (let i = 0; i < 8; i += 1) {
    const a = trunk.fibers[12 + i];
    const b = transit.fibers[i];
    if (!a || !b) continue;
    const high = i === 5;
    await prisma.splice.create({
      data: {
        closureId: closure.id,
        cassetteId: upper.id,
        fiberAId: a.id,
        fiberBId: b.id,
        kind: i === 7 ? "MECHANICAL" : "FUSION",
        lossDb: high ? 0.72 : Number((0.05 + (i % 3) * 0.01).toFixed(2)),
        note: high ? "Переварка после ремонта, затухание выше нормы" : null,
        splicedAt: new Date("2026-11-18T10:05:00Z"),
      },
    });
    await prisma.fiber.updateMany({ where: { id: { in: [a.id, b.id] } }, data: { status: "SPLICED" } });
  }

  const photo = await drawClosurePhoto(closure.id);
  await prisma.photo.create({
    data: {
      closureId: closure.id,
      file: photo.file,
      thumb: photo.thumb,
      width: 1400,
      height: 1000,
      caption: "Муфта №12 до закрытия: кассеты 1 и 2",
      order: 0,
      pins: [
        { x: 0.36, y: 0.27, refType: "cassette", refId: lower.id, label: "Кассета 1" },
        { x: 0.36, y: 0.57, refType: "cassette", refId: upper.id, label: "Кассета 2" },
      ],
    },
  });

  await prisma.shareLink.create({
    data: {
      token: randomBytes(24).toString("base64url"),
      projectId: project.id,
      closureId: closure.id,
      expiresAt: new Date("2026-12-31T00:00:00Z"),
    },
  });

  const counts = {
    cables: 3,
    splices: await prisma.splice.count({ where: { closureId: closure.id } }),
  };
  console.log(`Создано: ${project.name}, муфта №${closure.number}, ${counts.cables} кабеля, ${counts.splices} сварок`);
  const share = await prisma.shareLink.findFirst({ where: { closureId: closure.id } });
  if (share) console.log(`Публичная ссылка: ${process.env.APP_URL ?? "http://localhost:3000"}/s/${share.token}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
