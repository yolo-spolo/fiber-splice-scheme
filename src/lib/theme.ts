export const THEME_STORAGE_KEY = "fiber-theme";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/** Тема, которую реально надо применить: «системная» разворачивается в настройку ОС. */
export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

/**
 * Скрипт до первой отрисовки: ставит data-theme и data-theme-mode на <html>.
 * Без него страница успевает мигнуть светлой темой, а иконка переключателя —
 * неверной. Держим строкой, чтобы не тянуть React в <head>.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var key=${JSON.stringify(THEME_STORAGE_KEY)};
var mode=localStorage.getItem(key);
if(mode!=="light"&&mode!=="dark"&&mode!=="system")mode="system";
var dark=mode==="dark"||(mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var root=document.documentElement;
root.dataset.theme=dark?"dark":"light";
root.dataset.themeMode=mode;
root.style.colorScheme=dark?"dark":"light";
}catch(e){}})()`;
