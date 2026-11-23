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
