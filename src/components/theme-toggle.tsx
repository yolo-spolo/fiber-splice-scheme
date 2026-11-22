"use client";

import { useTheme } from "./theme-provider";
import { type ThemeMode } from "@/lib/theme";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

const LABELS: Record<ThemeMode, string> = {
  light: "Светлая тема",
  dark: "Тёмная тема",
  system: "Как в системе",
};

function Icon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.6v2.2M12 19.2v2.2M4.6 12H2.4M21.6 12h-2.2M6.8 6.8L5.2 5.2M18.8 18.8l-1.6-1.6M17.2 6.8l1.6-1.6M5.2 18.8l1.6-1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.5 14.4A8.6 8.6 0 019.6 3.5a8.6 8.6 0 1010.9 10.9z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2.6" y="4.2" width="18.8" height="12.4" rx="2" />
      <path d="M8.5 20.2h7M12 16.6v3.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Компактная кнопка для шапки: цикл светлая → тёмная → системная.
 * Название режима видно в title и в подписи для скринридера.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      className={`btn btn-ghost px-2.5 py-1.5 text-[13px] ${className}`}
      title={`${LABELS[mode]} · переключить на «${LABELS[next].toLowerCase()}»`}
      aria-label={`Тема оформления: ${LABELS[mode].toLowerCase()}. Переключить.`}
    >
      <Icon mode={mode} />
    </button>
  );
}

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
  { value: "system", label: "Как в системе" },
];

/** Полный выбор режима для Справочников. */
export function ThemePicker() {
  const { mode, setMode } = useTheme();

  return (
    <div role="radiogroup" aria-label="Тема оформления" className="flex flex-wrap gap-1.5">
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setMode(option.value)}
            className={`btn ${active ? "btn-primary" : "btn-ghost"} px-3 py-1.5 text-[13px]`}
          >
            <Icon mode={option.value} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
