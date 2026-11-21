"use client";

import { useMemo, useState } from "react";

/**
 * Окно с картой и отметкой места. OpenStreetMap — без ключей API и оплаты.
 * Карта грузится лениво: только когда её открыли, чтобы не тянуть чужие
 * скрипты на каждой странице муфты.
 *
 * Масштаб по умолчанию ближний: сварщику нужно узнать двор и подъезд,
 * а не район. Кнопки «+ / −» меняют охват от ~25 м до ~1 км.
 */
const ZOOM_STEPS = [0.00012, 0.00035, 0.0008, 0.002, 0.0045];
const DEFAULT_ZOOM = 2;

export function LocationMap({
  lat,
  lng,
  label,
  address,
  height = 300,
}: {
  lat: number;
  lng: number;
  label?: string;
  address?: string | null;
  height?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const delta = ZOOM_STEPS[zoom];
  const src = useMemo(() => {
    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [lat, lng, delta]);

  const approxMeters = Math.round(delta * 2 * 111000);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
      <div className="relative" style={{ height }}>
        {loaded ? (
          <>
            <iframe
              title={label ? `Карта: ${label}` : "Карта"}
              src={src}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute right-2 top-2 flex flex-col gap-1">
              <ZoomButton
                label="Приблизить"
                disabled={zoom === 0}
                onClick={() => setZoom((value) => Math.max(0, value - 1))}
              >
                +
              </ZoomButton>
              <ZoomButton
                label="Отдалить"
                disabled={zoom === ZOOM_STEPS.length - 1}
                onClick={() => setZoom((value) => Math.min(ZOOM_STEPS.length - 1, value + 1))}
              >
                −
              </ZoomButton>
            </div>
            <span className="pointer-events-none absolute bottom-1.5 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--color-ink-500)]">
              ≈ {approxMeters < 1000 ? `${approxMeters} м` : `${(approxMeters / 1000).toFixed(1)} км`} по ширине
            </span>
          </>
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
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`}
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

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-line)] bg-white/95 text-[17px] font-semibold leading-none text-[var(--color-ink-700)] shadow-sm transition hover:border-[var(--color-accent)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}
