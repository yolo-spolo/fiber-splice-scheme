"use client";

import { useState } from "react";

/**
 * Небольшое окно с картой и отметкой места. Используется OpenStreetMap —
 * без ключей API и оплаты. Карта грузится лениво: только когда её открыли,
 * чтобы не тянуть чужие скрипты на каждой странице муфты.
 */
export function LocationMap({
  lat,
  lng,
  label,
  address,
  height = 240,
}: {
  lat: number;
  lng: number;
  label?: string;
  address?: string | null;
  height?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const delta = 0.004;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
      <div className="relative" style={{ height }}>
        {loaded ? (
          <iframe
            title={label ? `Карта: ${label}` : "Карта"}
            src={src}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[var(--color-canvas)] text-[12.5px] text-[var(--color-ink-500)]"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-ink-400)]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Показать карту
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-line)] px-2.5 py-1.5 text-[11.5px]">
        <span className="min-w-0 flex-1 truncate text-[var(--color-ink-700)]">
          {address || label || "Координаты муфты"}
        </span>
        <span className="shrink-0 font-mono tabular-nums text-[var(--color-ink-400)]">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 font-semibold text-[var(--color-accent)]"
        >
          Открыть
        </a>
      </div>
    </div>
  );
}
