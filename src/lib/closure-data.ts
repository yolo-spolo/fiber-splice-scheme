import { prisma } from "@/lib/prisma";

export async function loadClosure(id: string) {
  return prisma.closure.findUnique({
    where: { id },
    include: {
      project: true,
      cassettes: { orderBy: { number: "asc" } },
      cables: {
        orderBy: { order: "asc" },
        include: { fibers: { orderBy: [{ moduleIndex: "asc" }, { position: "asc" }] } },
      },
      splices: {
        include: {
          fiberA: { include: { cable: true } },
          fiberB: { include: { cable: true } },
          cassette: true,
        },
        orderBy: { createdAt: "asc" },
      },
      photos: { orderBy: { order: "asc" } },
      shares: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type ClosureData = NonNullable<Awaited<ReturnType<typeof loadClosure>>>;
export type CableWithFibers = ClosureData["cables"][number];
export type FiberRow = CableWithFibers["fibers"][number];
export type SpliceRow = ClosureData["splices"][number];

/** Сводка по волокнам: сколько всего, сварено, свободно, транзит, повреждено. */
export function fiberStats(closure: ClosureData) {
  const total = closure.cables.reduce((n, c) => n + c.fibers.length, 0);
  const splicedIds = new Set(closure.splices.flatMap((s) => [s.fiberAId, s.fiberBId]));
  let spliced = 0;
  let transit = 0;
  let damaged = 0;
  let free = 0;
  for (const cable of closure.cables) {
    for (const fiber of cable.fibers) {
      if (fiber.status === "TRANSIT") transit += 1;
      else if (fiber.status === "DAMAGED") damaged += 1;
      else if (splicedIds.has(fiber.id) || fiber.status === "SPLICED") spliced += 1;
      else free += 1;
    }
  }
  return { total, spliced, free, transit, damaged };
}
