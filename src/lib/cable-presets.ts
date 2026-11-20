import { prisma } from "@/lib/prisma";

export type CablePresetInput = {
  name: string;
  fiberCount: number;
  moduleCount: number;
  moduleCapacity: number;
  ownership: "OURS" | "FOREIGN";
  sheathColor: string | null;
  note: string | null;
};

/**
 * Встроенные типы кабеля. Создаются один раз и дальше живут в БД, поэтому
 * пользователь может их переименовать или удалить — это не константы в коде.
 */
export const DEFAULT_CABLE_TYPES: CablePresetInput[] = [
  {
    name: "Воздушный подвесной",
    fiberCount: 8,
    moduleCount: 1,
    moduleCapacity: 12,
    ownership: "OURS",
    sheathColor: "Чёрный",
    note: "Самонесущий, между опорами",
  },
  {
    name: "Подземный в грунт",
    fiberCount: 24,
    moduleCount: 2,
    moduleCapacity: 12,
    ownership: "OURS",
    sheathColor: "Чёрный",
    note: "Броня, траншея",
  },
  {
    name: "Магистральный",
    fiberCount: 48,
    moduleCount: 4,
    moduleCapacity: 12,
    ownership: "OURS",
    sheathColor: "Чёрный",
    note: "Между узлами, до 96 волокон",
  },
  {
    name: "Дроп до абонента",
    fiberCount: 1,
    moduleCount: 1,
    moduleCapacity: 4,
    ownership: "OURS",
    sheathColor: "Чёрный",
    note: "Один абонент, тонкий",
  },
  {
    name: "Пигтейл",
    fiberCount: 1,
    moduleCount: 1,
    moduleCapacity: 4,
    ownership: "OURS",
    sheathColor: "Жёлтый",
    note: "Внутренний монтаж, SC/LC",
  },
  {
    name: "Транзитный чужой",
    fiberCount: 12,
    moduleCount: 1,
    moduleCapacity: 12,
    ownership: "FOREIGN",
    sheathColor: "Оранжевый",
    note: "Не наш кабель, только транзит",
  },
];

/** Идемпотентно создаёт встроенные типы, если их ещё нет. */
export async function ensureCableTypeDefaults(): Promise<void> {
  const count = await prisma.cableTypePreset.count();
  if (count > 0) return;
  await prisma.cableTypePreset.createMany({
    data: DEFAULT_CABLE_TYPES.map((preset, index) => ({
      ...preset,
      isBuiltIn: true,
      order: index,
    })),
    skipDuplicates: true,
  });
}
