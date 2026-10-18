// Light/dark mode of an app: the choice lives in <html data-theme> (the theme tokens switch on it) and in localStorage.
export type ThemeMode = "light" | "dark" | "system";
const KEY = "xgen-theme";

const systemDark = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? (systemDark() ? "dark" : "light") : mode;
}

export function applyTheme(mode: ThemeMode): void {
  const r = resolveTheme(mode);
  const root = document.documentElement;
  root.dataset.theme = r;
  root.classList.toggle("dark", r === "dark");
  root.style.colorScheme = r;
}

/** the mode of the visit: the saved choice, else the app default */
export function initTheme(fallback: ThemeMode): void {
  let mode: ThemeMode = fallback;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") mode = saved;
  } catch { /* storage is blocked: keep the default */ }
  applyTheme(mode);
}

export function toggleTheme(): void {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  applyTheme(next);
}
