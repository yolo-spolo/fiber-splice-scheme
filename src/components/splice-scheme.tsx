import { colorByCode, moduleColorCode } from "@/lib/colors";

export type SchemeCable = {
  id: string;
  label: string;
  order?: number;
  moduleCount?: number;
  colorScheme?: string;
  moduleColors?: number[];
  fibers: { id: string; moduleIndex: number; position: number; colorCode: number }[];
};

export type SchemeSplice = {
  id: string;
  fiberAId: string;
  fiberBId: string;
  cassetteId: string | null;
  kind: string;
  lossDb?: number | null;
};

export type SchemeCassette = { id: string; number: number; capacity: number; label: string | null };

type FiberRef = {
  cableId: string;
  cableLabel: string;
  moduleIndex: number;
  position: number;
  colorCode: number;
  moduleColorCode: number;
};

const WIDE = { width: 720, row: 26, head: 24, chip: 13, labelX: 6, gap: 210 };
const NARROW = { width: 360, row: 30, head: 22, chip: 14, labelX: 5, gap: 68 };

/**
 * Схематическая визуализация сварок: для каждой кассеты рисуются два кабеля
 * и цветные линии между конкретными волокнами. Один компонент используется
 * и в приложении, и в документе — схема в PDF не расходится с экраном.
 */
export function SpliceScheme({
  cables,
  cassettes,
  splices,
  showHeader = true,
  emptyText = "Сварки не внесены",
}: {
  cables: SchemeCable[];
  cassettes: SchemeCassette[];
  splices: SchemeSplice[];
  showHeader?: boolean;
  emptyText?: string;
}) {
  const fiberById = new Map<string, FiberRef>();
  for (const cable of cables) {
    for (const fiber of cable.fibers) {
      fiberById.set(fiber.id, {
        cableId: cable.id,
        cableLabel: cable.label,
        moduleIndex: fiber.moduleIndex,
        position: fiber.position,
        colorCode: fiber.colorCode,
        moduleColorCode: moduleColorCode(
          fiber.moduleIndex,
          cable.colorScheme ?? "TIA598",
          cable.moduleColors ?? [],
        ),
      });
    }
  }

  const cableOrder = new Map<string, number>();
  cables.forEach((cable, index) => cableOrder.set(cable.id, cable.order ?? index));

  const byCassette = new Map<string, SchemeSplice[]>();
  for (const splice of splices) {
    const key = splice.cassetteId ?? "none";
    const list = byCassette.get(key) ?? [];
    list.push(splice);
    byCassette.set(key, list);
  }

  const blocks = [...byCassette.entries()]
    .map(([cassetteId, list]) => {
      const cassette = cassettes.find((c) => c.id === cassetteId) ?? null;

      const pairs = new Map<string, { cableA: string; cableB: string; rows: SchemeSplice[] }>();
      for (const splice of list) {
        const a = fiberById.get(splice.fiberAId);
        const b = fiberById.get(splice.fiberBId);
        if (!a || !b) continue;
        const aFirst = (cableOrder.get(a.cableId) ?? 0) <= (cableOrder.get(b.cableId) ?? 0);
        const left = aFirst ? a : b;
        const right = aFirst ? b : a;
        const key = `${left.cableId}|${right.cableId}`;
        const group = pairs.get(key) ?? { cableA: left.cableId, cableB: right.cableId, rows: [] };
        group.rows.push(splice);
        pairs.set(key, group);
      }

      const ordered = [...pairs.values()].map((group) => ({
        ...group,
        rows: [...group.rows].sort((x, y) => {
          const fx = fiberById.get(x.fiberAId)!;
          const fy = fiberById.get(y.fiberAId)!;
          return (
            (cableOrder.get(fx.cableId) ?? 0) - (cableOrder.get(fy.cableId) ?? 0) ||
            fx.moduleIndex - fy.moduleIndex ||
            fx.position - fy.position
          );
        }),
      }));

      return { cassetteId, cassette, count: list.length, pairs: ordered };
    })
    .sort((a, b) => (a.cassette?.number ?? 999) - (b.cassette?.number ?? 999));

  if (blocks.length === 0) {
    return <p className="text-[12px] text-[var(--color-ink-500)]">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <figure key={block.cassetteId} className="break-inside-avoid">
          <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="text-[12.5px] font-semibold">
              {block.cassette ? `Кассета ${block.cassette.number}` : "Без кассеты"}
              {block.cassette?.label ? ` — ${block.cassette.label}` : ""}
            </span>
            <span className="text-[10.5px] text-[var(--color-ink-400)]">
              {block.count} сварок
              {block.cassette ? ` / ёмкость ${block.cassette.capacity}` : ""}
            </span>
          </figcaption>

          <div className="space-y-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-1.5">
            {block.pairs.map((pair) => {
              const cableA = cables.find((c) => c.id === pair.cableA);
              const cableB = cables.find((c) => c.id === pair.cableB);
              return (
                <div key={`${pair.cableA}-${pair.cableB}`}>
                  <PairScheme
                    pair={pair}
                    cableA={cableA}
                    cableB={cableB}
                    fiberById={fiberById}
                    metrics={WIDE}
                    className="doc-scheme-wide hidden sm:block"
                  />
                  <PairScheme
                    pair={pair}
                    cableA={cableA}
                    cableB={cableB}
                    fiberById={fiberById}
                    metrics={NARROW}
                    className="doc-scheme-narrow block sm:hidden"
                    compact
                  />
                </div>
              );
            })}
          </div>
        </figure>
      ))}

      {showHeader && (
        <p className="text-[10px] text-[var(--color-ink-400)]">
          М — модуль, число после двоеточия — волокно. Кружок — цвет модуля (трубки), квадрат —
          цвет жилы. Цвет линии — цвет волокна. Пунктир — транзит или механический соединитель.
        </p>
      )}
    </div>
  );
}

type Metrics = typeof WIDE;

/** Белый и жёлтый на белой бумаге не видны — таким линиям нужна тёмная подложка. */
function isLightColor(hex: string): boolean {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
}

function PairScheme({
  pair,
  cableA,
  cableB,
  fiberById,
  metrics,
  className,
  compact = false,
}: {
  pair: { cableA: string; cableB: string; rows: SchemeSplice[] };
  cableA?: SchemeCable;
  cableB?: SchemeCable;
  fiberById: Map<string, FiberRef>;
  metrics: Metrics;
  className?: string;
  compact?: boolean;
}) {
  const { width, row, head, chip, labelX, gap } = metrics;
  const height = head + pair.rows.length * row + 6;
  const mid = width / 2;
  const textSize = compact ? 9 : 10.5;
  const shortSize = compact ? 8 : 9;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`${className} h-auto w-full`}
      role="img"
      aria-label={`Схема сварок ${cableA?.label ?? ""} и ${cableB?.label ?? ""}`}
    >
      <text x={labelX} y={13} fontSize={compact ? 10 : 11} fontWeight="700" fill="var(--color-ink-900)">
        {cableA?.label}
      </text>
      <text x={width - labelX} y={13} fontSize={compact ? 10 : 11} fontWeight="700" fill="var(--color-ink-900)" textAnchor="end">
        {cableB?.label}
      </text>
      <line x1={labelX} y1={head - 5} x2={width - labelX} y2={head - 5} stroke="var(--color-line)" strokeWidth="1" />

      {pair.rows.map((splice, index) => {
        const leftRef = fiberById.get(splice.fiberAId)!;
        const rightRef = fiberById.get(splice.fiberBId)!;
        const y = head + index * row + row / 2;
        const dashed = splice.kind === "TRANSIT" || splice.kind === "MECHANICAL";
        const leftColor = colorByCode(leftRef.colorCode);
        const rightColor = colorByCode(rightRef.colorCode);
        // Маркер модуля — кружок, чип жилы — квадрат: формы разные, поэтому
        // их не спутать ни на цветной, ни на ч/б печати.
        const tube = compact ? 6 : 7;
        return (
          <g key={splice.id}>
            <circle
              cx={labelX + tube / 2}
              cy={y}
              r={tube / 2}
              fill={colorByCode(leftRef.moduleColorCode).hex}
              stroke="var(--color-swatch-line)"
              strokeWidth="0.7"
              strokeDasharray={colorByCode(leftRef.moduleColorCode).striped ? "2 1.2" : undefined}
            />
            <rect
              x={labelX + tube + 3}
              y={y - chip / 2}
              width={chip}
              height={chip}
              rx="2.5"
              fill={leftColor.hex}
              stroke="var(--color-swatch-line)"
              strokeWidth="0.8"
            />
            <text x={labelX + tube + chip + 7} y={y + 3.4} fontSize={textSize} fill="var(--color-ink-700)">
              М{leftRef.moduleIndex}:{leftRef.position}
            </text>
            {!compact && (
              <text x={labelX + tube + chip + 47} y={y + 3.4} fontSize={shortSize} fill="var(--color-ink-400)">
                {leftColor.short}
              </text>
            )}

            {isLightColor(leftColor.hex) && (
              <path
                d={`M ${mid - gap} ${y} C ${mid - gap / 3} ${y}, ${mid + gap / 3} ${y}, ${mid + gap} ${y}`}
                fill="none"
                stroke="var(--color-line-backing)"
                strokeWidth={compact ? 2.6 : 3}
                strokeLinecap="round"
              />
            )}
            <path
              d={`M ${mid - gap} ${y} C ${mid - gap / 3} ${y}, ${mid + gap / 3} ${y}, ${mid + gap} ${y}`}
              fill="none"
              stroke={leftColor.hex}
              strokeWidth={compact ? 1.5 : 1.7}
              strokeLinecap="round"
              strokeDasharray={dashed ? "4 3" : undefined}
              opacity="0.92"
            />
            <circle cx={mid - gap} cy={y} r="2.2" fill={leftColor.hex} />
            <circle cx={mid + gap} cy={y} r="2.2" fill={rightColor.hex} />

            {splice.lossDb != null && (
              <text x={mid} y={y - 4.5} fontSize={compact ? 7.5 : 8.5} fill="var(--color-ink-400)" textAnchor="middle">
                {splice.lossDb.toFixed(2)} дБ
              </text>
            )}

            <rect
              x={width - labelX - chip}
              y={y - chip / 2}
              width={chip}
              height={chip}
              rx="2.5"
              fill={rightColor.hex}
              stroke="var(--color-swatch-line)"
              strokeWidth="0.8"
            />
            <text
              x={width - labelX - chip - tube - 7}
              y={y + 3.4}
              fontSize={textSize}
              fill="var(--color-ink-700)"
              textAnchor="end"
            >
              М{rightRef.moduleIndex}:{rightRef.position}
            </text>
            {!compact && (
              <text
                x={width - labelX - chip - tube - 47}
                y={y + 3.4}
                fontSize={shortSize}
                fill="var(--color-ink-400)"
                textAnchor="end"
              >
                {rightColor.short}
              </text>
            )}
            <circle
              cx={width - labelX - chip - tube - 3 + tube / 2}
              cy={y}
              r={tube / 2}
              fill={colorByCode(rightRef.moduleColorCode).hex}
              stroke="var(--color-swatch-line)"
              strokeWidth="0.7"
              strokeDasharray={colorByCode(rightRef.moduleColorCode).striped ? "2 1.2" : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
