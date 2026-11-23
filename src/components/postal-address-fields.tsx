"use client";

import { useState } from "react";
import { geocode } from "@/lib/geocode";

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
  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    else {
      setLat(String(result.lat));
      setLng(String(result.lng));
    }
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

      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="label">Широта</span>
          <input
            className="field"
            name="lat"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="44.95398"
          />
        </label>
        <label className="block">
          <span className="label">Долгота</span>
          <input
            className="field"
            name="lng"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="34.12554"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost px-2.5 py-1 text-[12px]"
          disabled={busy}
          onClick={lookup}
        >
          {busy ? "Ищу…" : "Определить по адресу"}
        </button>
        <span className="text-[11px] text-[var(--color-ink-400)]">
          Или вставьте координаты из карт
        </span>
      </div>
      {error && <p className="mt-1.5 text-[11.5px] text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
