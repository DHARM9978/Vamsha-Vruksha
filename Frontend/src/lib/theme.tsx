import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "vv.theme";

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * ThemeProvider — the single source of theme truth. All components read the
 * theme from here (backed by CSS variables); no component ever branches on
 * hard-coded theme checks.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}
