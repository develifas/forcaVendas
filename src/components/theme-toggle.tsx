"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "fv-theme";
type Theme = "light" | "dark";

interface Props {
  /** "store": sem escolha salva, segue o tema do aparelho. "admin": sem escolha salva, usa claro. */
  scope?: "store" | "admin";
  className?: string;
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

/** Alternador claro/escuro com escolha salva no navegador (compartilhada entre loja e painel). */
export function ThemeToggle({ scope = "store", className = "" }: Props) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // armazenamento indisponível
    }
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    const osDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(scope === "store" && osDark ? "dark" : "light");
  }, [scope]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignora
    }
  };

  const isDark = theme === "dark";
  const label = isDark ? "Mudar para o modo claro" : "Mudar para o modo escuro";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      suppressHydrationWarning
      className={className}
    >
      {theme === null ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

