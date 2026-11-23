"use client";

import { useState } from "react";
import { LocationMap } from "@/components/location-map";

/**
 * Быстрый просмотр места муфты прямо из списка на объекте: не нужно
 * открывать муфту, чтобы вспомнить, где она стоит. Карта грузится только
 * после нажатия — как и в карточке муфты.
 */
export function ClosureMapButton({
  lat,
  lng,
  title,
  address,
  className = "",
}: {
  lat: number | null;
  lng: number | null;
  title: string;
  address?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ready = lat != null && lng != null;

  return (
    <>
      <button
        type="button"
        className={`btn btn-ghost px-2 py-1 text-[12px] ${className}`}
        disabled={!ready}
        title={ready ? "Показать муфту на карте" : "Координаты не заданы"}
        onClick={(event) => {
          // Карточка целиком — ссылка: без этого клик уводил бы в муфту.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        Карта
      </button>

      {open && ready && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] sm:items-center sm:p-4"
        >
          <div className="max-h-[92dvh] w-full max-w-[620px] overflow-y-auto rounded-t-2xl bg-[var(--color-paper)] p-4 shadow-xl sm:rounded-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-[16px] leading-snug">{title}</h2>
                <p className="mt-0.5 text-[12px] text-[var(--color-ink-500)]">
                  Карта OpenStreetMap · кнопки «+ / −» меняют масштаб
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost h-8 w-8 !p-0 text-[16px]"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <LocationMap lat={lat} lng={lng} label={title} address={address} height={360} />
          </div>
        </div>
      )}
    </>
  );
}
