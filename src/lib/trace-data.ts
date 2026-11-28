import { prisma } from "@/lib/prisma";
import type { TraceData } from "./fiber-trace";

/**
 * Данные для трассировки по объекту.
 *
 * Берём весь объект, а не только муфту: маршрут абонента проходит через
 * несколько муфт, и по одной его не построить. Объём ограничен размером
 * объекта — это сотни волокон, а не миллионы, поэтому один запрос дешевле,
 * чем десяток запросов по шагам маршрута.
 */
export async function loadTraceData(projectId: string): Promise<TraceData> {
  const closures = await prisma.closure.findMany({
    where: { projectId },
    select: { id: true, number: true, kind: true, city: true, street: true, house: true },
    orderBy: { number: "asc" },
  });
  const closureIds = closures.map((closure) => closure.id);

  const cables = await prisma.cable.findMany({
    where: { closureId: { in: closureIds } },
    select: {
      id: true,
      label: true,
      closureId: true,
      fromClosureId: true,
      toClosureId: true,
      fromLocation: true,
      toLocation: true,
    },
    orderBy: { order: "asc" },
  });

  const [fibers, splices] = await Promise.all([
    prisma.fiber.findMany({
      where: { cableId: { in: cables.map((cable) => cable.id) } },
      select: {
        id: true,
        cableId: true,
        moduleIndex: true,
        position: true,
        status: true,
        label: true,
      },
      orderBy: [{ moduleIndex: "asc" }, { position: "asc" }],
    }),
    prisma.splice.findMany({
      where: { closureId: { in: closureIds } },
      select: { closureId: true, fiberAId: true, fiberBId: true, lossDb: true },
    }),
  ]);

  return { closures, cables, fibers, splices };
}
