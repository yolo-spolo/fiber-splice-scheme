"use client";

import { useMemo, useState, useTransition } from "react";
import { autoSpliceStraight, createSplice, deleteSplice } from "@/lib/actions/splices";
import { colorByCode, moduleColorCode, swatchBackground } from "@/lib/colors";
import { SPLICE_KIND_LABELS } from "@/lib/labels";
import { SubmitButton } from "@/components/ui/fields";
import { SpliceScheme } from "@/components/splice-scheme";
import { FiberColorPicker } from "@/components/fiber-color-picker";
import { useShareToken } from "@/components/edit-scope";
import { setFiberLabel } from "@/lib/actions/splices";
import type { EditorCable, EditorCassette, EditorFiber, EditorSplice } from "@/lib/editor-data";

type FiberRef = { cableLabel: string; moduleIndex: number; position: number; colorCode: number };

export function SpliceEditor({
  closureId,
  cables,
  cassettes,
  splices,
}: {
  closureId: string;
  cables: EditorCable[];
  cassettes: EditorCassette[];
  splices: EditorSplice[];
}) {
  const [pending, start] = useTransition();
  const shareToken = useShareToken();
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [cassetteId, setCassetteId] = useState<string>(cassettes[0]?.id ?? "");
  const [kind, setKind] = useState("FUSION");
  const [loss, setLoss] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; text: string } | null>(null);
  const [straightOpen, setStraightOpen] = useState(false);
  const [straightA, setStraightA] = useState("");
  const [straightB, setStraightB] = useState("");
  const [showScheme, setShowScheme] = useState(false);
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);

  const fiberIndex = useMemo(() => {
    const map = new Map<string, FiberRef>();
    for (const cable of cables) {
      for (const f of cable.fibers) {
        map.set(f.id, {
          cableLabel: cable.label,
          moduleIndex: f.moduleIndex,
          position: f.position,
          colorCode: f.colorCode,
        });
      }
    }
    return map;
  }, [cables]);

  // Подписи волокон отдельной картой: по id волокна, для панели выбранного.
  const fibersById = useMemo(() => {
    const map = new Map<string, EditorFiber>();
    for (const cable of cables) for (const fiber of cable.fibers) map.set(fiber.id, fiber);
    return map;
  }, [cables]);

  const splicedFiberIds = useMemo(
    () => new Set(splices.flatMap((s) => [s.fiberAId, s.fiberBId])),
    [splices],
  );

  const usedPerCassette = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of splices) if (s.cassetteId) map.set(s.cassetteId, (map.get(s.cassetteId) ?? 0) + 1);
    return map;
  }, [splices]);

  const visibleCables = filter === "all" ? cables : cables.filter((c) => c.id === filter);

  const remaining = useMemo(() => {
    const map = new Map<string, number>();
    for (const cable of cables) {
      map.set(cable.id, cable.fibers.filter((f) => !splicedFiberIds.has(f.id) && f.status !== "DAMAGED").length);
    }
    return map;
  }, [cables, splicedFiberIds]);

  function describe(id: string) {
    const f = fiberIndex.get(id);
    if (!f) return "?";
    return `${f.cableLabel} М${f.moduleIndex} В${f.position}`;
  }

  function handleFiberClick(fiberId: string) {
    setError(null);
    setLabelError(null);
    setLabelDraft(fibersById.get(fiberId)?.label ?? "");
    if (splicedFiberIds.has(fiberId)) {
      setError(`${describe(fiberId)} уже сварено. Сначала удалите сварку в списке.`);
      return;
    }
    if (!selectedA) {
      setSelectedA(fiberId);
      return;
    }
    if (selectedA === fiberId) {
      setSelectedA(null);
      return;
    }

    const a = selectedA;
    setSelectedA(null);
    start(async () => {
      const formData = new FormData();
      formData.set("closureId", closureId);
      formData.set("fiberAId", a);
      formData.set("fiberBId", fiberId);
      formData.set("cassetteId", cassetteId);
      formData.set("kind", kind);
      if (shareToken) formData.set("shareToken", shareToken);
      if (loss) formData.set("lossDb", loss);
      const res = await createSplice(formData);
      if (res?.error) setError(res.error);
      else {
        setUndo({ id: (res as { spliceId: string }).spliceId, text: `${describe(a)} ↔ ${describe(fiberId)}` });
        setLoss("");
      }
    });
  }

  function saveLabel(fiberId: string) {
    setLabelError(null);
    start(async () => {
      const res = await setFiberLabel(fiberId, labelDraft, shareToken);
      if (res?.error) setLabelError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 px-3.5 py-2.5">
        <span className="text-[13px] font-semibold">Сварка в кассету</span>
        <select className="field !w-auto !py-1.5 text-[13px]" value={cassetteId} onChange={(e) => setCassetteId(e.target.value)}>
          <option value="">— без кассеты —</option>
          {cassettes.map((c) => (
            <option key={c.id} value={c.id}>
              Кассета {c.number} ({usedPerCassette.get(c.id) ?? 0}/{c.capacity})
            </option>
          ))}
        </select>
        <select className="field !w-auto !py-1.5 text-[13px]" value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(SPLICE_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-[13px] text-[var(--color-ink-500)]">
          Затухание
          <input
            className="field !w-[86px] !py-1.5 text-[13px]"
            inputMode="decimal"
            placeholder="0.05"
            value={loss}
            onChange={(e) => setLoss(e.target.value)}
          />
          дБ
        </label>
        <button
          type="button"
          aria-pressed={showScheme}
          className={`btn order-last w-full px-2.5 py-1.5 text-[13px] sm:order-none sm:ml-auto sm:w-auto ${
            showScheme ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => setShowScheme((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="7" r="2" />
            <circle cx="5" cy="17" r="2" />
            <circle cx="19" cy="7" r="2" />
            <circle cx="19" cy="17" r="2" />
            <path d="M7 7h10M7 17h10M7 7c4 0 4 10 0 10M17 7c-4 0-4 10 0 10" opacity=".7" />
          </svg>
          {showScheme ? "Скрыть схему" : "Показать схему"}
        </button>
        <button type="button" className="btn btn-ghost px-2.5 py-1.5 text-[13px]" onClick={() => setStraightOpen(true)}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8h16M4 16h16M8 4v16M16 4v16" strokeLinecap="round" opacity=".45" />
            <path d="M3 12h18" strokeLinecap="round" />
          </svg>
          Прямая сварка
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-danger)]">
          <span className="font-semibold">!</span>
          <span className="flex-1">{error}</span>
          <button type="button" className="font-semibold" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      {showScheme && (
        <div className="card p-3">
          <SpliceScheme
            cassettes={cassettes}
            cables={cables}
            splices={splices}
            emptyText="Пока нет сварок — схема появится автоматически"
          />
        </div>
      )}

      {undo && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-accent)]">
          <span className="flex-1">Сварено: {undo.text}</span>
          <button
            type="button"
            className="font-semibold underline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteSplice(undo.id, shareToken);
                setUndo(null);
              })
            }
          >
            Отменить
          </button>
          <button type="button" className="font-semibold" onClick={() => setUndo(null)}>
            ×
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`chip cursor-pointer px-2.5 py-1 ${filter === "all" ? "!border-[var(--color-accent)] !bg-[var(--color-accent-soft)]" : ""}`}
              onClick={() => setFilter("all")}
            >
              Все кабели
            </button>
            {cables.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip cursor-pointer px-2.5 py-1 ${filter === c.id ? "!border-[var(--color-accent)] !bg-[var(--color-accent-soft)]" : ""}`}
                onClick={() => setFilter(c.id)}
              >
                {c.label}
                <span className="text-[var(--color-ink-400)]">{remaining.get(c.id)}</span>
              </button>
            ))}
          </div>

          {cables.length === 0 && (
            <div className="card px-4 py-8 text-center text-[13.5px] text-[var(--color-ink-500)]">
              Сначала добавьте кабели на вкладке «Кабели».
            </div>
          )}

          {visibleCables.map((cable) => {
            const modules = new Map<number, EditorFiber[]>();
            for (const f of cable.fibers) {
              const list = modules.get(f.moduleIndex) ?? [];
              list.push(f);
              modules.set(f.moduleIndex, list);
            }
            return (
              <div key={cable.id} className="card p-3.5">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14.5px] font-semibold">{cable.label}</span>
                    {cable.type && <span className="text-[11.5px] text-[var(--color-ink-400)]">{cable.type}</span>}
                  </div>
                  <span className="text-[11.5px] text-[var(--color-ink-400)]">
                    свободно {remaining.get(cable.id)} из {cable.fibers.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {[...modules.entries()].map(([moduleIndex, fibers]) => (
                    <div key={moduleIndex}>
                      <ModuleHeading
                        moduleIndex={moduleIndex}
                        colorCode={moduleColorCode(moduleIndex, cable.colorScheme, cable.moduleColors)}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {fibers.map((fiber) => {
                          const color = colorByCode(fiber.colorCode);
                          const isSpliced = splicedFiberIds.has(fiber.id);
                          const isA = selectedA === fiber.id;
                          return (
                            <button
                              key={fiber.id}
                              type="button"
                              onClick={() => handleFiberClick(fiber.id)}
                              title={`${cable.label} М${moduleIndex} В${fiber.position} — ${color.name}`}
                              className={`flex min-w-[52px] flex-col items-center gap-0.5 rounded-lg border px-1.5 py-1 transition ${
                                isA
                                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] ring-2 ring-[var(--color-accent)]/35"
                                  : isSpliced
                                    ? "border-[var(--color-line)] bg-[var(--color-track)] opacity-55"
                                    : "border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-accent)] hover:shadow-sm"
                              }`}
                            >
                              <span
                            className="h-3.5 w-full rounded-[3px] border border-[var(--color-swatch-line)]"
                                style={{ background: color.hex }}
                              />
                              <span className="font-mono text-[10.5px] leading-none text-[var(--color-ink-700)] tabular-nums">
                                {fiber.position}
                              </span>
                              {/* Подпись видна прямо на чипе: сварщик находит
                                  нужного абонента, не открывая карточку. */}
                              {fiber.label && (
                                <span className="max-w-[72px] truncate text-[9px] leading-none text-[var(--color-ink-500)]">
                                  {fiber.label}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="card sticky top-16 p-3.5">
            <div className="mb-2 text-[13px] font-semibold">Порядок действий</div>
            <ol className="mb-3 space-y-1 text-[12.5px] text-[var(--color-ink-500)]">
              <li>1. Нажмите волокно в первом кабеле</li>
              <li>2. Нажмите волокно во втором — сварка создастся</li>
            </ol>

            <div className="space-y-1.5">
              <SelectedSlot label="Волокно A" text={selectedA ? describe(selectedA) : null} />
              <SelectedSlot label="Волокно B" text={null} />
            </div>

            {selectedA && (
              <div className="mt-2 space-y-1.5">
                {/* Подпись — прямо у выбранного волокна: чаще всего именно
                    за ней волокно и открывают. */}
                <label className="block">
                  <span className="label">Подпись волокна</span>
                  <input
                    className="field !py-1.5 text-[12.5px]"
                    value={labelDraft}
                    maxLength={120}
                    placeholder="Абонент: кв. 42, Петров"
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveLabel(selectedA);
                      }
                    }}
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-2 py-0.5 text-[11.5px]"
                    disabled={pending}
                    onClick={() => saveLabel(selectedA)}
                  >
                    Сохранить подпись
                  </button>
                  {labelError && (
                    <span className="text-[11px] text-[var(--color-danger)]">{labelError}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost w-full py-1.5 text-[12.5px]"
                  onClick={() => setColorTarget(selectedA)}
                >
                  Изменить цвет жилы
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-full py-1.5 text-[12.5px]"
                  onClick={() => {
                    setSelectedA(null);
                    setLabelDraft("");
                  }}
                >
                  Сбросить выбор
                </button>
              </div>
            )}

            {colorTarget && (
              <div className="mt-2">
                <FiberColorPicker
                  fiberId={colorTarget}
                  currentCode={fiberIndex.get(colorTarget)?.colorCode ?? 0}
                  currentLabel={fibersById.get(colorTarget)?.label ?? null}
                  title={`Цвет: ${describe(colorTarget)}`}
                  onDone={() => setColorTarget(null)}
                />
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3.5 py-2.5">
              <span className="text-[13px] font-semibold">Сварки</span>
              <span className="chip !py-0.5 tabular-nums">{splices.length}</span>
            </div>
            {splices.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12.5px] text-[var(--color-ink-400)]">
                Пока ни одной сварки
              </p>
            ) : (
              <ul className="max-h-[460px] divide-y divide-[var(--color-line)] overflow-y-auto">
                {splices.map((s) => {
                  const a = fiberIndex.get(s.fiberAId);
                  const b = fiberIndex.get(s.fiberBId);
                  const cassette = cassettes.find((c) => c.id === s.cassetteId);
                  return (
                    <li key={s.id} className="flex items-start gap-2 px-3.5 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[12.5px]">
                          <FiberDot colorCode={a?.colorCode ?? 0} />
                          <span className="min-w-0 truncate">{a?.cableLabel ?? "?"}</span>
                          <span className="shrink-0 font-mono tabular-nums text-[var(--color-ink-500)]">
                            {a ? `${a.moduleIndex}:${a.position}` : ""}
                          </span>
                          <span className="shrink-0 text-[var(--color-ink-400)]">↔</span>
                          <FiberDot colorCode={b?.colorCode ?? 0} />
                          <span className="min-w-0 truncate">{b?.cableLabel ?? "?"}</span>
                          <span className="shrink-0 font-mono tabular-nums text-[var(--color-ink-500)]">
                            {b ? `${b.moduleIndex}:${b.position}` : ""}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[var(--color-ink-400)]">
                          {cassette && <span>кассета {cassette.number}</span>}
                          {s.kind !== "FUSION" && <span>{SPLICE_KIND_LABELS[s.kind]}</span>}
                          {s.lossDb != null && (
                            <span className={s.lossDb > 0.5 ? "font-semibold text-[var(--color-warn)]" : ""}>
                              {s.lossDb.toFixed(2)} дБ
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[13px] text-[var(--color-ink-400)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
                        disabled={pending}
                        title="Удалить сварку"
                        onClick={() =>
                          start(async () => {
                            const res = await deleteSplice(s.id, shareToken);
                            if (res?.error) setError(res.error);
                          })
                        }
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {straightOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] sm:items-center sm:p-4">
          <div className="w-full max-w-[480px] rounded-t-2xl bg-[var(--color-paper)] p-5 shadow-xl sm:rounded-2xl">
            <h2 className="text-[18px]">Прямая сварка</h2>
            <p className="mt-1 mb-4 text-[12.5px] text-[var(--color-ink-500)]">
              Сопоставит свободные волокна двух кабелей по порядку (1-е с 1-м, 2-е со 2-м). Уже
              сваренные пропускаются.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="label">Кабель A</span>
                <select className="field" value={straightA} onChange={(e) => setStraightA(e.target.value)}>
                  <option value="">— выберите —</option>
                  {cables.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.fibers.length} волокон)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Кабель B</span>
                <select className="field" value={straightB} onChange={(e) => setStraightB(e.target.value)}>
                  <option value="">— выберите —</option>
                  {cables
                    .filter((c) => c.id !== straightA)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.fibers.length} волокон)
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStraightOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending || !straightA || !straightB}
                onClick={() =>
                  start(async () => {
                    const res = await autoSpliceStraight(
                      closureId,
                      straightA,
                      straightB,
                      cassetteId,
                      shareToken,
                    );
                    setStraightOpen(false);
                    if (res?.error) setError(res.error);
                    else setError(null);
                  })
                }
              >
                {pending ? "Свариваю…" : "Сварить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedSlot({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--color-line)] px-2.5 py-1.5 text-[12.5px]">
      <span className="text-[var(--color-ink-400)]">{label}</span>
      <span className={text ? "font-mono font-semibold" : "text-[var(--color-ink-400)]"}>{text ?? "—"}</span>
    </div>
  );
}

/**
 * Заголовок модуля: цвет трубки плюс подпись. Сварщик находит нужный модуль
 * по цвету, а номер и название страхуют на ч/б печати и при дальтонизме.
 */
function ModuleHeading({ moduleIndex, colorCode }: { moduleIndex: number; colorCode: number }) {
  const color = colorByCode(colorCode);
  return (
    <div className="mb-1 flex items-center gap-1.5">
      <span
                        className="h-3 w-3 shrink-0 rounded-[2px] border border-[var(--color-swatch-line)]"
        style={swatchBackground(colorCode)}
      />
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
        Модуль {moduleIndex}
      </span>
      <span className="text-[10px] text-[var(--color-ink-400)]">{color.name.toLowerCase()}</span>
    </div>
  );
}

function FiberDot({ colorCode }: { colorCode: number }) {
  return <span className="swatch !h-2.5 !w-2.5" style={{ background: colorByCode(colorCode).hex }} />;
}
