"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_KEY } from "@/lib/theme";

/**
 * Cambia entre el tema oscuro (por defecto) y el claro.
 *
 * El tema vive en el atributo `data-theme` de <html> y en localStorage, no en
 * estado de React: el icono correcto lo elige el CSS. Asi no hay desajuste de
 * hidratacion ni un parpadeo del icono equivocado al cargar.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const claro = root.dataset.theme === "light";

    if (claro) {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = "light";
    }

    // localStorage puede fallar (ventana privada, cookies bloqueadas): que el
    // tema no persista es aceptable, que reviente la pagina no.
    try {
      localStorage.setItem(THEME_KEY, claro ? "dark" : "light");
    } catch {
      /* sin persistencia */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar tema"
      className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip flex size-11 shrink-0 items-center justify-center border transition-colors"
    >
      <Sun size={16} aria-hidden="true" className="solo-oscuro" />
      <Moon size={16} aria-hidden="true" className="solo-claro" />
    </button>
  );
}
