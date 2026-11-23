/**
 * Координаты по адресу через собственный маршрут `/api/geocode`
 * (Nominatim, без ключей API). Ошибка возвращается значением, а не
 * исключением: диалоги показывают её текстом рядом с кнопкой.
 */
export async function geocode(
  query: string,
): Promise<{ lat: number; lng: number } | { error: string }> {
  try {
    const res = await fetch("/api/geocode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (!res.ok || typeof data.lat !== "number") {
      return { error: data.error ?? "Не удалось определить координаты" };
    }
    return { lat: data.lat, lng: data.lon };
  } catch {
    return { error: "Сеть недоступна" };
  }
}
