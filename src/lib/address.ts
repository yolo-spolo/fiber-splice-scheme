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
