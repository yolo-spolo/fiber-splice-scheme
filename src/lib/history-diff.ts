/**
 * «Было → стало» из снимков истории.
 *
 * Снимки в `ClosureEvent.before/after` — это то, что писали действия: голые
 * машинные имена и коды. Показывать их как есть бессмысленно: `colorCode: 3`
 * монтажник не прочитает, а `{pins: [...]}` — это килобайт координат.
 *
 * Здесь только известные поля с человеческими подписями и значениями. Всё,
 * чего нет в словаре, молча пропускается: лучше показать меньше, чем вывалить
 * в интерфейс внутренности записи. Модуль без базы и без React — его можно
 * проверять тестами.
 */
import { colorByCode } from "./colors";
import { FIBER_STATUS_LABELS, STATUS_LABELS } from "./labels";

export type HistoryChange = { field: string; label: string; before: string; after: string };

/** Подписи полей — те же слова, что в формах, а не имена из схемы. */
const FIELD_LABELS: Record<string, string> = {
  // муфта
  number: "номер",
  kind: "тип",
  model: "модель",
  city: "город",
  street: "улица",
  house: "дом",
  lat: "широта",
  lng: "долгота",
  notes: "заметки",
  status: "статус",
  // кабель
  label: "подпись",
  type: "тип кабеля",
  fiberCount: "волокон",
  moduleCount: "модулей",
  fromLocation: "откуда",
  toLocation: "куда",
  ownership: "принадлежность",
  // сварка и кассета
  lossDb: "потери, дБ",
  capacity: "ёмкость",
  // фото
  pins: "метки на фото",
  caption: "подпись фото",
  // жила
  colorCode: "цвет",
};

/** Служебные поля: адрес записи, а не её содержимое. */
const HIDDEN = new Set(["targetId", "id", "pairs"]);

const OWNERSHIP_LABELS: Record<string, string> = {
  OURS: "наш",
  FOREIGN: "чужой / транзитный",
};

/** Статус муфты и статус жилы — разные словари, но поле одно. */
function statusLabel(value: string): string {
  return STATUS_LABELS[value] ?? FIBER_STATUS_LABELS[value] ?? value;
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/** Значение поля человеку: цвет — названием, координата — числом, пусто — прочерком. */
function formatValue(field: string, value: unknown): string {
  if (isEmpty(value)) return "—";
  if (field === "status" && typeof value === "string") return statusLabel(value);
  if (field === "ownership" && typeof value === "string") return OWNERSHIP_LABELS[value] ?? value;
  if (field === "colorCode" && typeof value === "number") return colorByCode(value).name;
  if (field === "lat" || field === "lng") {
    return typeof value === "number" ? String(Number(value.toFixed(5))) : String(value);
  }
  if (field === "lossDb" && typeof value === "number") return `${value} дБ`;
  // Массивы не выводим: у меток на фото важен их счёт, а не координаты.
  if (Array.isArray(value)) {
    return value.length === 0 ? "нет" : `${value.length} шт.`;
  }
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "object") return "изменено";
  return String(value);
}

function same(before: unknown, after: unknown): boolean {
  if (isEmpty(before) && isEmpty(after)) return true;
  if (Array.isArray(before) || Array.isArray(after)) {
    return JSON.stringify(before ?? []) === JSON.stringify(after ?? []);
  }
  return String(before ?? "") === String(after ?? "");
}

/**
 * Что изменилось. Пустой список — нормальный ответ: у создания и удаления
 * «было» нет вовсе, а у некоторых действий снимки содержат только служебные
 * поля (сколько сварок добавила автосварка).
 */
export function describeChanges(
  before: unknown,
  after: unknown,
): HistoryChange[] {
  if (!before && !after) return [];
  const left = (before ?? {}) as Record<string, unknown>;
  const right = (after ?? {}) as Record<string, unknown>;
  const fields = new Set([...Object.keys(left), ...Object.keys(right)]);

  const changes: HistoryChange[] = [];
  for (const field of fields) {
    if (HIDDEN.has(field)) continue;
    const label = FIELD_LABELS[field];
    if (!label) continue;
    if (same(left[field], right[field])) continue;
    changes.push({
      field,
      label,
      before: formatValue(field, left[field]),
      after: formatValue(field, right[field]),
    });
  }
  return changes;
}

/**
 * Изменения, которых ещё нет в подписи события. У статуса муфты подпись и
 * есть ответ («Сдана → В работе»), и повторять его таблицей незачем. У правки
 * кабеля подпись — только название, поэтому там показывать есть что.
 */
export function unrepeatedChanges(summary: string, changes: HistoryChange[]): HistoryChange[] {
  return changes.filter((change) => !summary.includes(`${change.before} → ${change.after}`));
}
