/** Почтовый адрес одной строкой: «г. Москва, ул. Полярная, д. 12». */
export function formatPostalAddress(input: {
  city?: string | null;
  street?: string | null;
  house?: string | null;
}): string | null {
  const parts = [
    input.city ? `г. ${input.city}` : null,
    input.street ? `ул. ${input.street}` : null,
    input.house ? `д. ${input.house}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Название типа муфты для заголовка: «МУФТА» → «Муфта», «КРОСС» → «Кросс». */
export function closureKindLabel(kind?: string | null): string {
  const raw = kind?.trim();
  if (!raw) return "Муфта";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Сколько знаков после запятой у координаты: 5 — около метра, для муфты достаточно. */
const COORD_DIGITS = 5;

/**
 * Координаты для печати: «44.72340, 37.76810». Обе половины или ничего —
 * половина координаты в документе бесполезна и выглядит как ошибка.
 */
export function formatLatLng(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const short = (value: number) =>
    value.toFixed(COORD_DIGITS).replace(/0+$/, "").replace(/\.$/, "");
  return `${short(lat)}, ${short(lng)}`;
}

/** То же для формы: свободный ввод одной строкой «широта, долгота». */
export function formatCoordinates(lat?: number | null, lng?: number | null): string | null {
  return formatLatLng(lat, lng);
}

export type ParsedCoordinates =
  | { lat: number | null; lng: number | null }
  | { error: string };

const NUMBER_RE = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;

/**
 * Разбор поля «Координаты»: одна строка как в картах — «44.7234, 37.7681».
 *
 * Разделитель — запятая, точка с запятой или пробел. Десятичная запятая
 * допускается только без второго разделителя («44,95398»), а пара чисел
 * вводится как в картах — «44,95398, 34,12554»: цифры по разные стороны от
 * запятой делают её десятичной, поэтому вторая запятая в той же строке
 * становится разделителем пары.
 */
export function parseCoordinates(raw: string): ParsedCoordinates {
  const text = raw.trim();
  if (!text) return { lat: null, lng: null };

  // Пробел или «;» разделяют глухие числа: «44.7 37.7».
  const chunks = text.split(/[\s;]+/).map((part) => part.replace(/^,|,$/g, "")).filter(Boolean);
  if (chunks.length > 2) {
    return { error: "Нужны два числа: широта и долгота" };
  }
  let parts = chunks;
  if (chunks.length === 1) {
    const commas = chunks[0].match(/,/g)?.length ?? 0;
    if (commas >= 2) {
      parts = chunks[0].split(",");
    } else if (commas === 1) {
      // Одна запятая: цифры справа длинны, как у координаты — значит, это
      // разделитель пары; короткий хвост («44,725») — десятичная запятая.
      const [left, right] = chunks[0].split(",");
      const leftDigits = left.replace(/\D/g, "").length;
      const rightDigits = right.replace(/\D/g, "").length;
      const isSeparator = leftDigits >= 3 && rightDigits >= 3;
      parts = isSeparator ? [left, right] : [chunks[0]];
    }
  }

  // Пока пользователь вводит первую половину, сохраняем её локально; форма
  // отправляет обе координаты только при валидной паре.
  if (parts.length === 1) {
    const normalized = parts[0].replace(",", ".");
    if (!NUMBER_RE.test(parts[0])) return { error: "Похоже на координаты, но числа не нашлись" };
    const lat = Number(normalized);
    if (Math.abs(lat) > 90) return { error: "Широта должна быть от -90 до 90" };
    return { lat, lng: null };
  }
  if (parts.length !== 2) return { error: "Нужны два числа: широта и долгота" };

  const numbers: number[] = [];
  for (const part of parts) {
    const normalized = part.replace(",", ".");
    if (!NUMBER_RE.test(part)) return { error: "Похоже на координаты, но числа не нашлись" };
    numbers.push(Number(normalized));
  }

  const [lat, lng] = numbers;
  if (Math.abs(lat) > 90) return { error: "Широта должна быть от -90 до 90" };
  if (lng != null && Math.abs(lng) > 180) return { error: "Долгота должна быть от -180 до 180" };

  return { lat, lng };
}

/**
 * Как называть муфту в интерфейсе и документах. Почтовый адрес — первичное
 * имя: по нему муфту ищут на объекте, он же стоит в списке и на карте.
 * Если адрес не заполнен, остаётся привычное «Муфта №N».
 */
export function closureTitle(input: {
  number: string;
  kind?: string | null;
  city?: string | null;
  street?: string | null;
  house?: string | null;
}): string {
  return formatPostalAddress(input) ?? `${closureKindLabel(input.kind)} №${input.number}`;
}
