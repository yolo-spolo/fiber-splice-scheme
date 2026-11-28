"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  const firstRun = useRef(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (firstRun.current) {
      firstRun.current = false;
      // Тему до первой отрисовки уже поставил inline-скрипт. Применять здесь
      // состояние «system» нельзя: на гостевой странице оно вернуло бы тему
      // ОС и светлая страница успела бы мигнуть тёмной.
      const fromScript = document.documentElement.dataset.themeMode;
      setModeState(
        isThemeMode(fromScript)
          ? fromScript
          : initialMode(
              localStorage.getItem(THEME_STORAGE_KEY),
              isGuestPath(window.location.pathname),
            ),
      );
      setResolved(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    } else {
      setResolved(apply(mode, media.matches));
    }

    // В режиме «как в системе» следим за сменой настроек ОС.
    const onChange = () => {
      if (mode === "system") setResolved(apply("system", media.matches));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
