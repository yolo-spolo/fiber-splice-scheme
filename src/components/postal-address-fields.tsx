"use client";

import { useState } from "react";
import { geocode } from "@/lib/geocode";
import { formatCoordinates, parseCoordinates } from "@/lib/address";

/**
 * Единственный адрес муфты: почтовый, он же имя в списках и на карте.
 * Координаты живут рядом, потому что нужны той же карте и кнопке
 * «Определить по адресу». Отдельного «адреса установки» больше нет.
 */
export function PostalAddressFields({
  defaultCity = "",
  defaultStreet = "",
  defaultHouse = "",
  defaultLat = "",
  defaultLng = "",
}: {
  defaultCity?: string;
  defaultStreet?: string;
  defaultHouse?: string;
  defaultLat?: string;
  defaultLng?: string;
}) {
  const [city, setCity] = useState(defaultCity);
  const [street, setStreet] = useState(defaultStreet);
  const [house, setHouse] = useState(defaultHouse);
  // Координаты — одним полем, как их копируют из карт: «44.7234, 37.7681».
  const [coordinates, setCoordinates] = useState(
    formatCoordinates(
      defaultLat ? Number(defaultLat) : null,
      defaultLng ? Number(defaultLng) : null,
    ) ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Пока координаты введены наполовину, поле остаётся под контролем и
  // подсказывает, чего не хватает; отправляются только обе.
  const parsed = parseCoordinates(coordinates);
  const coordinateError =
    "error" in parsed
      ? parsed.error
      : parsed.lat != null && parsed.lng == null
        ? "Допишите через запятую долготу: «44.7234, 37.7681»"
        : null;
  const latValue = "error" in parsed || parsed.lng == null ? "" : String(parsed.lat);
  const lngValue = "error" in parsed || parsed.lng == null ? "" : String(parsed.lng);

  async function lookup() {
    const query = [city && `г. ${city}`, street && `ул. ${street}`, house && `д. ${house}`]
      .filter(Boolean)
      .join(", ");
    if (!query) {
      setError("Заполните город и улицу");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await geocode(query);
    if ("error" in result) setError(result.error);
    else setCoordinates(formatCoordinates(result.lat, result.lng) ?? "");
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-[var(--color-line)] p-2.5">
      <div className="mb-2 text-[12.5px] font-semibold">Адрес муфты</div>
      <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_90px]">
        <label className="block">
          <span className="label">Город</span>
          <input
            className="field"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Симферополь"
          />
        </label>
        <label className="block">
          <span className="label">Улица</span>
          <input
            className="field"
            name="street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Коцюбинского"
          />
        </label>
        <label className="block">
          <span className="label">Дом</span>
          <input
            className="field"
            name="house"
            value={house}
            onChange={(e) => setHouse(e.target.value)}
            placeholder="26А"
          />
        </label>
      </div>

      {/* Отправляются два скрытых поля: сервер и его схема не меняются. */}
      <input type="hidden" name="lat" value={latValue} />
      <input type="hidden" name="lng" value={lngValue} />
      <label className="mt-2 block">
        <span className="label">Координаты</span>
        <input
          className="field"
          name="coordinates"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={coordinates}
          onChange={(e) => setCoordinates(e.target.value)}
          placeholder="44.7234, 37.7681"
        />
        <span className="mt-1 block text-[11px] text-[var(--color-ink-400)]">
          Широта и долгота одной строкой, как в картах: «44.7234, 37.7681»
        </span>
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost px-2.5 py-1 text-[12px]"
          disabled={busy}
          onClick={lookup}
        >
          {busy ? "Ищу…" : "Определить по адресу"}
        </button>
        <span className="text-[11px] text-[var(--color-ink-400)]">Или вставьте координаты из карт</span>
      </div>
      {coordinateError && (
        <p className="mt-1.5 text-[11.5px] text-[var(--color-warn)]">{coordinateError}</p>
      )}
      {error && <p className="mt-1.5 text-[11.5px] text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
