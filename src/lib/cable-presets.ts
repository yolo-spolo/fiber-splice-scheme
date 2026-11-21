import { prisma } from "@/lib/prisma";
import { cableTemplatePresets, type CableTemplatePreset } from "@/lib/cable-templates";

/**
 * Типы кабелей в справочнике создаются из шаблонов (`cable-templates.ts`).
 * Шаблоны живут в БД, поэтому пользователь может их переименовать или удалить.
 */
export type CablePresetInput = CableTemplatePreset;

/** Встроенные типы кабеля — 7 раскладок × 2 стандарта цветовки. */
export const DEFAULT_CABLE_TYPES: CablePresetInput[] = cableTemplatePresets();

/**
 * Создаёт встроенные типы при первом запуске — когда справочник пуст.
 *
 * Удалённые пользователем типы не восстанавливаются: иначе «Удалить»
 * переставало бы работать. Обновление справочника до новых шаблонов —
 * разовое действие при выпуске версии, а не побочный эффект открытия страницы.
 */
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
