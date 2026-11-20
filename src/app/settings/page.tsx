import { AppShell, PageTitle } from "@/components/app-shell";
import { FIBER_COLORS } from "@/lib/colors";
import { CLOSURE_KINDS } from "@/lib/cable-types";
import { SPLICE_KIND_LABELS, FIBER_STATUS_LABELS } from "@/lib/labels";
import { ensureCableTypeDefaults } from "@/lib/cable-presets";
import { prisma } from "@/lib/prisma";
import { CableTypesPanel } from "./cable-types-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await ensureCableTypeDefaults();
  const presets = await prisma.cableTypePreset.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });

  return (
    <AppShell breadcrumbs={[{ label: "Объекты", href: "/" }, { label: "Справочники" }]}>
      <PageTitle
        title="Справочники"
        subtitle="Цвета волокон, типы кабелей и соединений, которые используются в схемах и документах"
      />

      <div className="space-y-4">
        <section className="card p-4">
          <h2 className="text-[15px]">Палитра волокон</h2>
          <p className="mt-0.5 mb-3 text-[12.5px] text-[var(--color-ink-500)]">
            Порядок TIA-598-C, совпадает с практикой ГОСТ для 12-волоконных модулей. Цвет всегда
            дублируется номером и подписью — для дальтоников и чёрно-белой печати.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {FIBER_COLORS.map((color) => (
              <div key={color.code} className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-2.5 py-1.5">
                <span className="swatch !h-4 !w-4" style={{ background: color.hex }} />
                <span className="text-[13px] font-medium">{color.code + 1}. {color.name}</span>
                <span className="ml-auto font-mono text-[11px] text-[var(--color-ink-400)]">{color.short}</span>
              </div>
            ))}
          </div>
        </section>

        <CableTypesPanel
          presets={presets.map((p) => ({
            id: p.id,
            name: p.name,
            fiberCount: p.fiberCount,
            moduleCount: p.moduleCount,
            moduleCapacity: p.moduleCapacity,
            colorScheme: p.colorScheme,
            ownership: p.ownership,
            sheathColor: p.sheathColor,
            note: p.note,
            isBuiltIn: p.isBuiltIn,
          }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="card p-4">
            <h2 className="mb-2 text-[15px]">Типы соединений и статусы</h2>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {Object.entries(SPLICE_KIND_LABELS).map(([value, label]) => (
                <span key={value} className="chip">{label}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(FIBER_STATUS_LABELS).map(([value, label]) => (
                <span key={value} className="chip">{label}</span>
              ))}
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--color-ink-400)]">
              Типы муфт: {CLOSURE_KINDS.join(", ").toLowerCase()}.
            </p>
          </section>
        </div>

        <section className="card p-4">
          <h2 className="mb-2 text-[15px]">Нормы проверки</h2>
          <ul className="space-y-1 text-[13px] text-[var(--color-ink-700)]">
            <li>Затухание одной сварки — не более 0.5 дБ (предупреждение при превышении)</li>
            <li>Одно волокно — не более одной сварки (ошибка)</li>
            <li>Количество сварок в кассете не больше её ёмкости (ошибка)</li>
            <li>Статус «сварено» без сварки — предупреждение</li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
