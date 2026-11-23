"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { closureTitle } from "@/lib/address";
import type { ClosureOption } from "@/lib/cable-endpoints";

/**
 * Выбор муфты с возможностью оставить произвольный адрес.
 * Начать печатать можно сразу; на фокусе показывает все муфты объекта.
 */
export function ClosurePicker({
  label,
  name,
  closureIdName,
  closures,
  defaultClosureId = null,
  defaultValue = "",
  placeholder = "Выберите муфту или введите адрес",
}: {
  label: string;
  name: string;
  closureIdName: string;
  closures: ClosureOption[];
  defaultClosureId?: string | null;
  defaultValue?: string;
  placeholder?: string;
}) {
  const selected = closures.find((closure) => closure.id === defaultClosureId);
  const [value, setValue] = useState(selected ? closureTitle(selected) : defaultValue);
  const [closureId, setClosureId] = useState<string | null>(selected?.id ?? null);
  const [open, setOpen] = useState(false);
  // Пока поле только открыли, фильтр не применяется: иначе старый свободный
  // текст («Муфта 2») сразу давал бы «совпадений нет» и пустой список.
  const [filtering, setFiltering] = useState(false);
  // Список рисуем в портале: диалог кабеля прокручивается и обрезал бы его.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; up: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const input = inputRef.current;
      if (!input) return;
      const box = input.getBoundingClientRect();
      const below = window.innerHeight - box.bottom;
      const up = below < 260 && box.top > below;
      setRect({ top: up ? box.top : box.bottom, left: box.left, width: box.width, up });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const matches = useMemo(() => {
    const query = value.trim().toLocaleLowerCase("ru");
    if (!query || !filtering) return closures;
    return closures.filter((closure) =>
      `${closureTitle(closure)} ${closure.number}`.toLocaleLowerCase("ru").includes(query),
    );
  }, [closures, value, filtering]);

  return (
    <div className="relative block">
      <label className="label" htmlFor={`${name}-picker`}>{label}</label>
      <input
        id={`${name}-picker`}
        ref={inputRef}
        className="field"
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${name}-options`}
        aria-autocomplete="list"
        onFocus={() => {
          setFiltering(false);
          setOpen(true);
        }}
        onChange={(event) => {
          setValue(event.target.value);
          setClosureId(null);
          setFiltering(true);
          setOpen(true);
        }}
        onBlur={() => {
          // Небольшая задержка даёт обработать клик по option до закрытия.
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setFiltering(false);
          }
          if (event.key === "Enter" && open && matches.length === 1) {
            event.preventDefault();
            const option = matches[0];
            setValue(closureTitle(option));
            setClosureId(option.id);
            setFiltering(false);
            setOpen(false);
          }
        }}
      />
      <input type="hidden" name={closureIdName} value={closureId ?? ""} />
      {open &&
        rect &&
        createPortal(
          <ul
            id={`${name}-options`}
            role="listbox"
            style={{
              position: "fixed",
              left: rect.left,
              width: rect.width,
              ...(rect.up
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.top + 4 }),
            }}
            className="z-[60] max-h-52 overflow-y-auto rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-1 shadow-lg"
          >
            {matches.length ? (
              matches.map((closure) => (
                <li key={closure.id} role="option" aria-selected={closure.id === closureId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] hover:bg-[var(--color-sunken)]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setValue(closureTitle(closure));
                      setClosureId(closure.id);
                      setFiltering(false);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 truncate">{closureTitle(closure)}</span>
                    <span className="shrink-0 text-[11px] text-[var(--color-ink-400)]">
                      {closure.kind.toLowerCase()} №{closure.number}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-2.5 py-2 text-[12px] text-[var(--color-ink-400)]">
                Совпадений нет — адрес сохранится как текст
              </li>
            )}
            <li className="border-t border-[var(--color-line)] px-2.5 py-2 text-[11px] text-[var(--color-ink-400)]">
              Можно ввести свой адрес без создания муфты
            </li>
          </ul>,
          document.body,
        )}
      <span className="mt-1 block text-[11px] text-[var(--color-ink-400)]">
        Выберите муфту объекта или введите произвольный адрес
      </span>
    </div>
  );
}
