import {
  colorByCode,
  COLOR_SCHEMES,
  FIBER_COLORS_STRIPED,
  schemeOrder,
  swatchBackground,
} from "@/lib/colors";

/**
 * Легенда цветовки. В папке объекта печатается один раз на титуле, чтобы
 * не повторять двенадцать цветов под каждым кабелем каждой муфты.
 *
 * Оба стандарта рядом: у РФ/США и Европы разный порядок, и сварщик должен
 * видеть, по какому считан номер. Цвет всегда продублирован номером
 * и подписью — легенда читается и на чёрно-белой печати.
 */
const SCHEME_ROWS = COLOR_SCHEMES.filter(
  (scheme) => scheme.value === "TIA598" || scheme.value === "DIN",
);

export function ColorLegend({ className = "" }: { className?: string }) {
  return (
    <section className={`break-inside-avoid ${className}`}>
      <h2 className="mb-1.5 text-[14px] uppercase tracking-wide">Порядок цветов жил</h2>

      <div className="grid gap-x-6 gap-y-2 text-[10px] sm:grid-cols-2">
        {SCHEME_ROWS.map((scheme) => (
          <div key={scheme.value}>
            <div className="mb-0.5 flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-semibold">{scheme.label}</span>
              <span className="text-[9px] text-[var(--color-ink-400)]">{scheme.hint}</span>
            </div>
            <ol className="grid grid-cols-2 gap-x-3 gap-y-[1px]">
              {schemeOrder(scheme.value).map((code, index) => (
                <li key={`${scheme.value}-${index}`} className="flex items-center gap-1">
                  <span
                    className="flex h-[11px] min-w-[11px] items-center justify-center border border-black/25 text-[7.5px] font-bold tabular-nums"
                    style={swatchBackground(code)}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate">{colorByCode(code).name.toLowerCase()}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      {/* Вторая дюжина: те же цвета с чёрной полосой — иначе 13-е волокно
          не отличить от первого. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9.5px] text-[var(--color-ink-500)]">
        <span className="font-semibold">13–24-е волокна:</span>
        <span>те же цвета с чёрной полосой</span>
        <span className="flex flex-wrap gap-[2px]">
          {FIBER_COLORS_STRIPED.map((color) => (
            <span
              key={color.code}
              className="flex h-[11px] min-w-[11px] items-center justify-center border border-black/25 text-[7.5px] font-bold tabular-nums"
              style={swatchBackground(color.code)}
              title={color.name}
            >
              {color.code + 1}
            </span>
          ))}
        </span>
      </div>

      <p className="mt-1 text-[9.5px] leading-snug text-[var(--color-ink-500)]">
        Схема «все белые» — все жилы белые, различаются только номерами. Тот же порядок
        присвоен модулям (трубкам) кабеля.
      </p>
    </section>
  );
}
