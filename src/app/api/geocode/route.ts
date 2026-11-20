import { NextResponse } from "next/server";

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

/**
 * Геокодирование адреса через Nominatim (OpenStreetMap).
 * Ключ API не нужен. Требование сервиса — осмысленный User-Agent
 * и не больше одного запроса в секунду, поэтому кэшируем ответ на сутки.
 */
export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: string };
    query = (body.query ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (query.length < 3) {
    return NextResponse.json({ error: "Слишком короткий адрес" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "ru");

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "FiberSplice/1.0 (optical splice documentation tool)",
        accept: "application/json",
      },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Сервис карт недоступен" }, { status: 502 });
    }

    const results = (await response.json()) as NominatimResult[];
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: "Адрес не найден" }, { status: 404 });
    }

    const [first] = results;
    return NextResponse.json({
      lat: Number(first.lat),
      lon: Number(first.lon),
      displayName: first.display_name,
    });
  } catch {
    return NextResponse.json({ error: "Не удалось связаться с сервисом карт" }, { status: 502 });
  }
}
