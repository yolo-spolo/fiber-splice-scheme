import type { ClosureData } from "@/lib/closure-data";

/**
 * Данные муфты в том виде, в каком их ждут редакторы на клиенте.
 *
 * Раньше каждая страница сама перебирала `ClosureData` в пропсы
 * `SpliceEditor`, `PhotoManager` и `CableCard` — и гостевой редактор держал
 * свою копию той же проводки. Новое поле волокна приходилось добавлять в двух
 * местах, и забытое просто становилось `undefined`: ни `tsc`, ни тесты этого
 * не ловили. Теперь форма пропсов объявлена здесь один раз.
 */

type FiberRow = ClosureData["cables"][number]["fibers"][number];
type CableRow = ClosureData["cables"][number];
type CassetteRow = ClosureData["cassettes"][number];
type SpliceRow = ClosureData["splices"][number];
type PhotoRow = ClosureData["photos"][number];

/**
 * Поля берутся через Pick от строк Prisma: переименование или удаление поля
 * в схеме уронит сборку здесь, а не тихо обнулит пропс на экране.
 */
export type EditorFiber = Pick<
  FiberRow,
  "id" | "moduleIndex" | "position" | "colorCode" | "label" | "status"
>;

export type EditorCable = Pick<
  CableRow,
  "id" | "label" | "type" | "ownership" | "moduleCount" | "colorScheme" | "moduleColors"
> & { fibers: EditorFiber[] };

export type EditorCassette = Pick<CassetteRow, "id" | "number" | "capacity" | "label">;

export type EditorSplice = Pick<
  SpliceRow,
  "id" | "fiberAId" | "fiberBId" | "cassetteId" | "kind" | "lossDb"
>;

export type PhotoPin = { x: number; y: number; refType: string; refId: string; label: string };

export type EditorPhoto = Pick<
  PhotoRow,
  "id" | "file" | "thumb" | "caption" | "cassetteId"
> & { pins: PhotoPin[] };

export type ClosureEditorData = {
  cables: EditorCable[];
  cassettes: EditorCassette[];
  splices: EditorSplice[];
  photos: EditorPhoto[];
};

/** Волокно кабеля → пропс редактора. Вынесено, чтобы проверялось без базы. */
export function editorFiber(fiber: EditorFiber): EditorFiber {
  return {
    id: fiber.id,
    moduleIndex: fiber.moduleIndex,
    position: fiber.position,
    colorCode: fiber.colorCode,
    label: fiber.label,
    status: fiber.status,
  };
}

/**
 * Пины фото хранятся в JSON и могли быть записаны до появления поля —
 * пустой массив вместо падения на `undefined.length`.
 */
export function photoPins(pins: unknown): PhotoPin[] {
  return Array.isArray(pins) ? (pins as PhotoPin[]) : [];
}

/** Одна муфта → все пропсы редакторов. Страницы больше не знают форму данных. */
export function closureEditorData(closure: ClosureData): ClosureEditorData {
  return {
    cables: closure.cables.map((cable) => ({
      id: cable.id,
      label: cable.label,
      type: cable.type,
      ownership: cable.ownership,
      moduleCount: cable.moduleCount,
      colorScheme: cable.colorScheme,
      moduleColors: cable.moduleColors,
      fibers: cable.fibers.map(editorFiber),
    })),
    cassettes: closure.cassettes.map((cassette) => ({
      id: cassette.id,
      number: cassette.number,
      capacity: cassette.capacity,
      label: cassette.label,
    })),
    splices: closure.splices.map((splice) => ({
      id: splice.id,
      fiberAId: splice.fiberAId,
      fiberBId: splice.fiberBId,
      cassetteId: splice.cassetteId,
      kind: splice.kind,
      lossDb: splice.lossDb,
    })),
    photos: closure.photos.map((photo) => ({
      id: photo.id,
      file: photo.file,
      thumb: photo.thumb,
      caption: photo.caption,
      cassetteId: photo.cassetteId,
      pins: photoPins(photo.pins),
    })),
  };
}

/** Волокна, которые уже заняты сваркой: по ним карточка кабеля считает «сварено». */
export function splicedFiberIds(closure: ClosureData): string[] {
  return [...new Set(closure.splices.flatMap((splice) => [splice.fiberAId, splice.fiberBId]))];
}
