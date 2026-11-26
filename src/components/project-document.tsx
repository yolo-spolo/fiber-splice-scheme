import {
  closureKindLabel,
  closureTitle,
  formatLatLng,
  formatPostalAddress,
} from "@/lib/address";
import { STATUS_LABELS } from "@/lib/labels";
import { ColorLegend } from "@/components/color-legend";
import type { ClosureData } from "@/lib/closure-data";

/**
 * Титульный лист объекта: по нему заказчик понимает, что за папка перед ним
 * и из каких муфт она состоит. Дальше идут документы муфт, каждый с нового листа.
 */
export function ProjectCover({
  project,
  closures,
  generatedAt = new Date(),
}: {
  project: {
    name: string;
    customer: string | null;
    address: string | null;
    contract: string | null;
    notes: string | null;
  };
  closures: ClosureData[];
  generatedAt?: Date;
}) {
  const totals = closures.reduce(
    (acc, closure) => {
      acc.cables += closure.cables.length;
      acc.fibers += closure.cables.reduce((n, cable) => n + cable.fibers.length, 0);
      acc.splices += closure.splices.length;
      return acc;
    },
    { cables: 0, fibers: 0, splices: 0 },
  );

  return (
    <article
      data-theme="light"
      className="document document-cover mx-auto w-full max-w-[820px] min-w-0 bg-[var(--color-paper)] text-[var(--color-ink-900)]"
    >
      {/* Титул и состав — один лист: заголовку разрыв страницы не нужен. */}
      <header className="mb-5 border-b-2 border-[var(--color-ink-900)] pb-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Схемы оптических сварок · объект
        </div>
        <h1 className="mt-1 text-[26px] leading-tight">{project.name}</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-4">
          <Meta label="Заказчик" value={project.customer ?? "—"} />
          <Meta label="Договор" value={project.contract ?? "—"} />
          <Meta label="Адрес объекта" value={project.address ?? "—"} />
          <Meta label="Муфт в папке" value={String(closures.length)} />
        </dl>

        {project.notes && (
          <p className="mt-3 rounded border border-[var(--color-line)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-ink-700)]">
            {project.notes}
          </p>
        )}
      </header>

      {/* Разрыв ставит обёртка `.print-doc` в порядке печати: если продублировать
          его здесь, Chromium добавляет пустой лист между титулом и первой муфтой. */}
      <section className="mb-5">
        <h2 className="mb-2 text-[14px] uppercase tracking-wide">Состав документа</h2>

        {closures.length === 0 ? (
          <p className="text-[12px] text-[var(--color-ink-500)]">На объекте пока нет муфт.</p>
        ) : (
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-[var(--color-ink-900)] text-left">
                <Th className="w-8">№</Th>
                <Th>Муфта</Th>
                <Th>Тип</Th>
                <Th>Статус</Th>
                <Th className="text-right">Кабелей</Th>
                <Th className="text-right">Волокон</Th>
                <Th className="text-right">Сварок</Th>
              </tr>
            </thead>
            <tbody>
              {closures.map((closure, index) => {
                const fibers = closure.cables.reduce((n, cable) => n + cable.fibers.length, 0);
                const coordinates = formatLatLng(closure.lat, closure.lng);
                return (
                  <tr key={closure.id} className="border-b border-[var(--color-track)]">
                    <Td className="tabular-nums text-[var(--color-ink-400)]">{index + 1}</Td>
                    <Td>
                      <span className="font-semibold">{closureTitle(closure)}</span>
                      {/* Без адреса в заголовке уже стоит «Муфта №N» — не повторяем. */}
                      {formatPostalAddress(closure) ? (
                        <span className="ml-1 text-[10px] text-[var(--color-ink-400)]">
                          {closureKindLabel(closure.kind).toLowerCase()} №{closure.number}
                        </span>
                      ) : (
                        <div className="text-[10px] text-[var(--color-ink-400)]">адрес не указан</div>
                      )}
                      {/* Координаты — под названием: по ним находят муфту, когда
                          адрес описан приблизительно. */}
                      {coordinates && (
                        <div className="font-mono text-[9.5px] tabular-nums text-[var(--color-ink-400)]">
                          {coordinates}
                        </div>
                      )}
                    </Td>
                    <Td>{closure.kind}</Td>
                    <Td>{STATUS_LABELS[closure.status]}</Td>
                    <Td className="text-right tabular-nums">{closure.cables.length}</Td>
                    <Td className="text-right tabular-nums">{fibers}</Td>
                    <Td className="text-right tabular-nums">{closure.splices.length}</Td>
                  </tr>
                );
              })}
              <tr className="border-t border-[var(--color-ink-900)] font-semibold">
                <Td />
                <Td>Всего</Td>
                <Td />
                <Td />
                <Td className="text-right tabular-nums">{totals.cables}</Td>
                <Td className="text-right tabular-nums">{totals.fibers}</Td>
                <Td className="text-right tabular-nums">{totals.splices}</Td>
              </tr>
            </tbody>
          </table>
        )}

        <p className="mt-3 text-[10.5px] leading-relaxed text-[var(--color-ink-500)]">
          Далее — документ каждой муфты: кабели с раскладкой цветов, схема соединений,
          таблица сварок и фото. Нумерация муфт совпадает с таблицей выше.
        </p>
      </section>

      {/* Цветовка нужна на каждой муфте, но повторять её пять раз незачем:
          в папке объекта легенда печатается один раз здесь, на титуле. */}
      <ColorLegend className="mb-5 border-t border-[var(--color-line)] pt-3" />

      <footer className="break-inside-avoid border-t border-[var(--color-line)] pt-3 text-[9.5px] text-[var(--color-ink-400)]">
        Документ сформирован{" "}
        {generatedAt.toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}
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
