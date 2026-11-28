"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  initialMode,
  isGuestPath,
  isThemeMode,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolved: "light",
  setMode: () => {},
});

function apply(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  const resolved = resolveTheme(mode, prefersDark);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Начальное значение постоянное: так серверный и клиентский рендер совпадают.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  // Тему до первой отрисовки уже поставил inline-скрипт — здесь только
  // повторяем его решение. Своё не применяем: состояние ещё «system», и на
  // гостевой странице это вернуло бы тему ОС, то есть тёмную. Читаем DOM,
  // а не хранилище, чтобы не расходиться со скриптом; повторный вызов в
  // Strict Mode идемпотентен.
  useEffect(() => {
    const root = document.documentElement;
    const fromScript = root.dataset.themeMode;
    setModeState(
      isThemeMode(fromScript)
        ? fromScript
        : initialMode(
            localStorage.getItem(THEME_STORAGE_KEY),
            isGuestPath(window.location.pathname),
          ),
    );
    setResolved(root.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    // В режиме «как в системе» следим за сменой настроек ОС.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") setResolved(apply("system", media.matches));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setModeState(next);
    setResolved(apply(next, window.matchMedia("(prefers-color-scheme: dark)").matches));
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
