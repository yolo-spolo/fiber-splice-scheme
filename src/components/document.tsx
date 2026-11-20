import { colorByCode, FIBER_COLORS } from "@/lib/colors";
import { SPLICE_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { ClosureData } from "@/lib/closure-data";
import { SpliceScheme } from "@/components/splice-scheme";

export function SpliceDocument({
  closure,
  qrDataUrl,
  shareUrl,
  generatedAt = new Date(),
  compact = false,
  fileBase = "/api/files",
}: {
  closure: ClosureData;
  qrDataUrl?: string;
  shareUrl?: string;
  generatedAt?: Date;
  compact?: boolean;
  fileBase?: string;
}) {
  const fiberById = new Map(
    closure.cables.flatMap((cable) =>
      cable.fibers.map((f) => [
        f.id,
        {
          cableLabel: cable.label,
          moduleIndex: f.moduleIndex,
          position: f.position,
          colorCode: f.colorCode,
        },
      ]),
    ),
  );

  const splicesByCassette = new Map<string, typeof closure.splices>();
  for (const splice of closure.splices) {
    const key = splice.cassetteId ?? "none";
    const list = splicesByCassette.get(key) ?? [];
    list.push(splice);
    splicesByCassette.set(key, list);
  }

  const totalFibers = closure.cables.reduce((n, c) => n + c.fibers.length, 0);
  const photos = closure.photos.slice(0, compact ? 2 : 4);

  return (
    <article className="document mx-auto w-full max-w-[820px] min-w-0 bg-white text-[var(--color-ink-900)]">
      <header className="print-page mb-5 border-b-2 border-[var(--color-ink-900)] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Схема оптических сварок
            </div>
            <h1 className="mt-1 text-[24px] leading-tight">
              Муфта №{closure.number}
              {closure.model ? ` · ${closure.model}` : ""}
            </h1>
            <div className="mt-1.5 text-[13px] text-[var(--color-ink-700)]">
              {closure.project.name}
              {closure.project.address ? `, ${closure.project.address}` : ""}
            </div>
          </div>
          {qrDataUrl && (
            <div className="shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR на схему" className="h-[74px] w-[74px]" />
              <div className="mt-0.5 text-[8.5px] leading-tight text-[var(--color-ink-400)]">
                схема
                <br />
                онлайн
              </div>
            </div>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-4">
          <Meta label="Заказчик" value={closure.project.customer ?? "—"} />
          <Meta label="Договор" value={closure.project.contract ?? "—"} />
          <Meta label="Адрес установки" value={closure.address ?? closure.project.address ?? "—"} />
          <Meta label="Тип" value={closure.kind} />
          <Meta label="Статус" value={STATUS_LABELS[closure.status]} />
          <Meta label="Кабелей" value={`${closure.cables.length}`} />
          <Meta label="Волокон" value={`${totalFibers}`} />
          <Meta label="Сварок" value={`${closure.splices.length}`} />
        </dl>

        {closure.notes && (
          <p className="mt-3 rounded border border-[var(--color-line)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-ink-700)]">
            {closure.notes}
          </p>
        )}
      </header>

      <section className="print-page mb-5">
        <h2 className="mb-2 text-[14px] uppercase tracking-wide">Кабели</h2>

        {/* Телефон: карточки вместо широкой таблицы — ничего не обрезается */}
        <ul className="space-y-1.5 sm:hidden print:hidden">
          {closure.cables.map((cable) => (
            <li key={cable.id} className="rounded-lg border border-[var(--color-line)] px-2.5 py-2 text-[11.5px]">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{cable.label}</span>
                {cable.type && <span className="text-[var(--color-ink-500)]">{cable.type}</span>}
                <span className="ml-auto tabular-nums text-[var(--color-ink-500)]">
                  {cable.fiberCount} вол. · {cable.moduleCount} × {cable.moduleCapacity}
                </span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-[var(--color-ink-500)]">
                {cable.fromLocation ?? "—"} → {cable.toLocation ?? "—"}
              </div>
              <span className="mt-1 flex flex-wrap gap-[2px]">
                {Array.from({ length: Math.min(cable.moduleCapacity, 24) }, (_, i) => (
                  <span
                    key={i}
                    className="h-[9px] w-[9px] border border-black/20"
                    style={{ background: colorByCode(i).hex }}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>

        <table className="hidden w-full border-collapse text-[11.5px] sm:table print:table">
          <thead>
            <tr className="border-b border-[var(--color-ink-900)] text-left">
              <Th>Метка</Th>
              <Th>Тип</Th>
              <Th>Волокон</Th>
              <Th>Модули</Th>
              <Th>Направление</Th>
              <Th>Цвета волокон</Th>
            </tr>
          </thead>
          <tbody>
            {closure.cables.map((cable) => (
              <tr key={cable.id} className="border-b border-[var(--color-line)]">
                <Td>
                  <span className="font-semibold">{cable.label}</span>
                  {cable.ownership === "FOREIGN" && (
                    <span className="ml-1 text-[9.5px] uppercase text-[var(--color-warn)]">чужой</span>
                  )}
                </Td>
                <Td>{cable.type ?? "—"}</Td>
                <Td>{cable.fiberCount}</Td>
                <Td>
                  {cable.moduleCount} × {cable.moduleCapacity}
                </Td>
                <Td>
                  {cable.fromLocation ?? "—"} → {cable.toLocation ?? "—"}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-[2px]">
                    {Array.from({ length: Math.min(cable.moduleCapacity, 24) }, (_, i) => (
                      <span
                        key={i}
                        className="h-[9px] w-[9px] border border-black/20"
                        style={{ background: colorByCode(i).hex }}
                      />
                    ))}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-ink-500)]">
          <span className="font-semibold">Порядок цветов:</span>
          {FIBER_COLORS.map((c) => (
            <span key={c.code} className="inline-flex items-center gap-1">
              <span className="h-[9px] w-[9px] border border-black/20" style={{ background: c.hex }} />
              {c.code + 1}. {c.name.toLowerCase()}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-[14px] uppercase tracking-wide">Сварки</h2>
        {closure.splices.length === 0 ? (
          <p className="text-[12px] text-[var(--color-ink-500)]">Сварки не внесены.</p>
        ) : (
          <div className="space-y-3">
            <div className="mb-4">
              <h3 className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--color-ink-400)]">
                Схема соединений
              </h3>
              <SpliceScheme
                cassettes={closure.cassettes}
                cables={closure.cables.map((c) => ({
                  id: c.id,
                  label: c.label,
                  order: c.order,
                  fibers: c.fibers.map((f) => ({
                    id: f.id,
                    moduleIndex: f.moduleIndex,
                    position: f.position,
                    colorCode: f.colorCode,
                  })),
                }))}
                splices={closure.splices.map((s) => ({
                  id: s.id,
                  fiberAId: s.fiberAId,
                  fiberBId: s.fiberBId,
                  cassetteId: s.cassetteId,
                  kind: s.kind,
                  lossDb: s.lossDb,
                }))}
              />
            </div>
            <h3 className="text-[11px] uppercase tracking-wide text-[var(--color-ink-400)]">Таблица сварок</h3>
            {[...splicesByCassette.entries()].map(([cassetteId, list]) => {
              const cassette = closure.cassettes.find((c) => c.id === cassetteId);
              return (
                <div key={cassetteId} className="break-inside-avoid">
                  <div className="mb-1 flex items-baseline justify-between border-b border-[var(--color-line)] pb-0.5">
                    <span className="text-[12px] font-semibold">
                      {cassette ? `Кассета ${cassette.number}` : "Без кассеты"}
                      {cassette?.label ? ` — ${cassette.label}` : ""}
                    </span>
                    <span className="text-[10.5px] text-[var(--color-ink-400)]">
                      {list.length}
                      {cassette ? ` / ${cassette.capacity}` : ""} сварок
                    </span>
                  </div>
                  <table className="w-full border-collapse text-[11.5px]">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] text-left text-[10px] uppercase tracking-wide text-[var(--color-ink-400)]">
                        <Th className="w-6">№</Th>
                        <Th>Волокно A</Th>
                        <Th>Волокно B</Th>
                        <Th className="hidden sm:table-cell print:table-cell">Тип</Th>
                        <Th className="text-right">дБ</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((splice, index) => {
                        const a = fiberById.get(splice.fiberAId);
                        const b = fiberById.get(splice.fiberBId);
                        return (
                          <tr key={splice.id} className="border-b border-[#eef2f7]">
                            <Td className="w-6 tabular-nums text-[var(--color-ink-400)]">{index + 1}</Td>
                            <Td>
                              <FiberCell fiber={a} short />
                            </Td>
                            <Td>
                              <FiberCell fiber={b} short />
                            </Td>
                            <Td className="hidden sm:table-cell print:table-cell">{SPLICE_KIND_LABELS[splice.kind]}</Td>
                            <Td className="text-right tabular-nums">
                              {splice.lossDb != null ? splice.lossDb.toFixed(2) : "—"}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {photos.length > 0 && (
        <section className="print-page mb-5">
          <h2 className="mb-2 text-[14px] uppercase tracking-wide">Фото муфты</h2>
          <div className={`grid gap-3 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {photos.map((photo) => (
              <figure key={photo.id} className="break-inside-avoid">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${fileBase}/${photo.file}`}
                    alt={photo.caption ?? ""}
                    className="max-h-[78mm] w-full rounded border border-[var(--color-line)] object-cover print:max-h-[70mm]"
                  />
                  {(photo.pins as { x: number; y: number; label: string }[]).map((pin, i) => (
                    <span
                      key={i}
                      className="absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-white ring-2 ring-white"
                      style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
                <figcaption className="mt-1 text-[10.5px] text-[var(--color-ink-500)]">
                  {photo.caption ?? "Фото муфты"}
                  {(photo.pins as { label: string }[]).length > 0 && (
                    <>
                      {" — "}
                      {(photo.pins as { label: string }[]).map((p, i) => `${i + 1}. ${p.label}`).join(", ")}
                    </>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-6 break-inside-avoid border-t border-[var(--color-line)] pt-4">
        <div className="grid grid-cols-1 gap-6 text-[11.5px] sm:grid-cols-2 sm:gap-8">
          <SignatureLine label="Исполнитель" />
          <SignatureLine label="Представитель заказчика" />
        </div>
        <div className="mt-4 flex items-end justify-between gap-4 text-[9.5px] text-[var(--color-ink-400)]">
          <span>
            Документ сформирован {generatedAt.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}
          </span>
          {shareUrl && <span className="truncate">Проверка схемы: {shareUrl}</span>}
        </div>
      </footer>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9.5px] uppercase tracking-wide text-[var(--color-ink-400)]">{label}</dt>
      <dd className="break-words font-medium leading-snug">{value}</dd>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`py-1 pr-2 font-semibold ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`py-1 pr-2 align-top ${className}`}>{children}</td>;
}

function FiberCell({
  fiber,
  short = false,
}: {
  fiber?: { cableLabel: string; moduleIndex: number; position: number; colorCode: number };
  short?: boolean;
}) {
  if (!fiber) return <span>—</span>;
  const color = colorByCode(fiber.colorCode);
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="h-[10px] w-[10px] shrink-0 border border-black/25" style={{ background: color.hex }} />
      <span className="shrink-0 font-semibold">{fiber.cableLabel}</span>
      <span className="shrink-0 tabular-nums text-[var(--color-ink-500)]">
        {fiber.moduleIndex}:{fiber.position}
      </span>
      <span
        className={`truncate text-[10px] text-[var(--color-ink-400)] ${short ? "hidden sm:inline print:inline" : ""}`}
      >
        {color.name.toLowerCase()}
      </span>
    </span>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="h-8 border-b border-[var(--color-ink-900)]" />
      <div className="mt-1 flex flex-wrap justify-between gap-x-2 text-[9.5px] text-[var(--color-ink-400)]">
        <span className="min-w-0">{label}</span>
        <span className="shrink-0">подпись / ФИО</span>
      </div>
    </div>
  );
}
