import {
  colorByCode,
  colorsForScheme,
  moduleColorCodes,
  swatchBackground,
} from "@/lib/colors";
import { SPLICE_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { ClosureData } from "@/lib/closure-data";
import { SpliceScheme } from "@/components/splice-scheme";
import { ColorLegend } from "@/components/color-legend";
import { closureKindLabel, formatLatLng, formatPostalAddress } from "@/lib/address";
import { actorLabel } from "@/lib/history-labels";

export type DocumentHistoryItem = {
  id: string;
  actorKind: string;
  actorName: string;
  summary: string;
  createdAt: string;
};

export function SpliceDocument({
  closure,
  qrDataUrl,
  shareUrl,
  generatedAt = new Date(),
  compact = false,
  fileBase = "/api/files",
  legend = true,
  signatures = true,
  history = [],
}: {
  closure: ClosureData;
  qrDataUrl?: string;
  shareUrl?: string;
  generatedAt?: Date;
  compact?: boolean;
  fileBase?: string;
  /** Легенда цветов под таблицей кабелей. В папке объекта печатается один раз на титуле. */
  legend?: boolean;
  /** Подписи сторон. В папке объекта — один раз в конце, у последней муфты. */
  signatures?: boolean;
  /** Последние изменения: кто и что поправил, включая правки по ссылке. */
  history?: DocumentHistoryItem[];
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
          label: f.label,
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
  const title = formatPostalAddress(closure) ?? `${closureKindLabel(closure.kind)} №${closure.number}`;
  // Координаты в документе нужны монтажнику: по ним муфту находят в поле,
  // даже когда адрес записан неточно.
  const coordinates = formatLatLng(closure.lat, closure.lng);

  // Документ всегда на бумаге: светлый остров, даже если интерфейс тёмный.
  return (
    <article
      data-theme="light"
      className="document mx-auto w-full max-w-[820px] min-w-0 bg-[var(--color-paper)] text-[var(--color-ink-900)]"
    >
      <header className="mb-5 border-b-2 border-[var(--color-ink-900)] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Схема оптических сварок
            </div>
            <h1 className="mt-1 text-[24px] leading-tight">
              {title}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[13px] text-[var(--color-ink-700)]">
              {/* С адресом в заголовке номер нужен рядом; без адреса он уже в нём. */}
              {formatPostalAddress(closure) && (
                <span className="font-semibold tabular-nums">
                  {closureKindLabel(closure.kind)} №{closure.number}
                </span>
              )}
              {closure.model && (
                <span>
                  {formatPostalAddress(closure) ? "· " : ""}
                  {closure.model}
                </span>
              )}
            </div>
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

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-3">
          <Meta label="Заказчик" value={closure.project.customer ?? "—"} />
          <Meta label="Договор" value={closure.project.contract ?? "—"} />
          <Meta
            label="Адрес"
            value={formatPostalAddress(closure) ?? closure.project.address ?? "—"}
          />
          <Meta label="Координаты" value={coordinates ?? "—"} mono />
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

      <section className="mb-5">
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
              <span className="mt-1 flex flex-wrap items-center gap-[2px]">
                {moduleColorCodes(cable.moduleCount, cable.colorScheme, cable.moduleColors).map(
                  (code, i) => (
                    <span
                      key={`m${i}`}
                      className="flex h-[13px] min-w-[13px] items-center justify-center border border-black/25 text-[7.5px] font-bold tabular-nums"
                      style={swatchBackground(code)}
                    >
                      {i + 1}
                    </span>
                  ),
                )}
                <span className="mx-1 text-[9px] text-[var(--color-ink-400)]">жилы:</span>
                {colorsForScheme(cable.colorScheme, cable.moduleCapacity, cable.colorOrder)
                  .slice(0, 24)
                  .map((code, i) => (
                    <span
                      key={`f${i}`}
                      className="h-[9px] w-[9px] border border-black/20"
                      style={swatchBackground(code)}
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
              <Th>Цвета модулей</Th>
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
                    {moduleColorCodes(cable.moduleCount, cable.colorScheme, cable.moduleColors).map((code, i) => (
                      <span
                        key={i}
                        className="flex h-[13px] min-w-[13px] items-center justify-center border border-black/25 text-[7.5px] font-bold tabular-nums"
                        style={swatchBackground(code)}
                        title={`Модуль ${i + 1} — ${colorByCode(code).name}`}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-[2px]">
                    {colorsForScheme(cable.colorScheme, cable.moduleCapacity, cable.colorOrder)
                      .slice(0, 24)
                      .map((code, i) => (
                      <span
                        key={i}
                        className="h-[9px] w-[9px] border border-black/20"
                        style={swatchBackground(code)}
                      />
                    ))}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>

        {legend && <ColorLegend className="mt-3" />}
      </section>

      {/*
        Фото идут сразу после кабелей, до схемы сварок: так лист муфты делится
        на «что за муфта и её кабели с фото» и «сварки» — обе половины заполнены,
        а фото не образуют отдельный полупустой лист в конце документа.
      */}
      {photos.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-[14px] uppercase tracking-wide">Фото муфты</h2>
          <div className={`doc-photos grid gap-3 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {photos.map((photo) => (
              <figure key={photo.id} className="doc-photo break-inside-avoid">
                {/* Рамка по размеру снимка: метки на фото считаются в процентах
                    от неё и не съезжают, когда фото уже колонки. */}
                <div className="relative w-fit max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${fileBase}/${photo.file}`}
                    alt={photo.caption ?? ""}
                    className="doc-photo-img max-h-[78mm] w-full rounded border border-[var(--color-line)] object-cover"
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

      {/* Длинный блок сварок (24+) печатается с переносом между листами:
          целиком он выше листа, а такие блоки WebKit выбрасывает. */}
      <section
        className={`doc-splices mb-5 ${closure.splices.length > 12 ? "doc-splices-long" : ""}`}
      >
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
                  moduleCount: c.moduleCount,
                  colorScheme: c.colorScheme,
                  moduleColors: c.moduleColors,
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
                      <tr key={splice.id} className="border-b border-[var(--color-track)]">
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

      <footer className="doc-footer mt-6 break-inside-avoid border-t border-[var(--color-line)] pt-4">
        {history.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-1 text-[11px] uppercase tracking-wide text-[var(--color-ink-400)]">
              Последние изменения
            </h2>
            <ul className="space-y-0.5 text-[10.5px] text-[var(--color-ink-700)]">
              {history.slice(0, 5).map((event) => (
                <li key={event.id} className="flex flex-wrap gap-x-1.5">
                  <span className="shrink-0 tabular-nums text-[var(--color-ink-400)]">
                    {new Date(event.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="shrink-0 font-medium">{actorLabel(event)}</span>
                  <span className="min-w-0 break-words">{event.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {signatures && (
          <div className="grid grid-cols-1 gap-6 text-[11.5px] sm:grid-cols-2 sm:gap-8">
            <SignatureLine label="Исполнитель" />
            <SignatureLine label="Представитель заказчика" />
          </div>
        )}
        <div
          className={`flex items-end justify-between gap-4 text-[9.5px] text-[var(--color-ink-400)] ${signatures ? "mt-4" : ""}`}
        >
          <span>
            Документ сформирован {generatedAt.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}
          </span>
          {shareUrl && <span className="truncate">Проверка схемы: {shareUrl}</span>}
        </div>
      </footer>
    </article>
  );
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9.5px] uppercase tracking-wide text-[var(--color-ink-400)]">{label}</dt>
      <dd className={`break-words font-medium leading-snug ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
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
  fiber?: {
    cableLabel: string;
    moduleIndex: number;
    position: number;
    colorCode: number;
    label?: string | null;
  };
  short?: boolean;
}) {
  if (!fiber) return <span>—</span>;
  const color = colorByCode(fiber.colorCode);
  return (
    <span className="inline-flex min-w-0 flex-col">
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
      {/* Подпись печатается под волокном: по ней находят абонента или объект. */}
      {fiber.label && (
        <span className="break-words text-[10px] leading-tight text-[var(--color-ink-700)]">
          {fiber.label}
        </span>
      )}
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
