"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** Texto de la opcion vacia, que siempre va primera. */
  placeholder?: string;
}

/**
 * Selector de una opcion, con la estetica de la marca.
 *
 * El <select> nativo no se puede estilizar: el navegador dibuja la lista con
 * los colores del sistema y queda fuera de la paleta. Este componente es un
 * listbox segun el patron ARIA, asi que conserva lo que el nativo daba gratis:
 * anuncio del rol, navegacion con flechas, Inicio/Fin, Enter, Escape y foco
 * visible.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Todos",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  // La opcion vacia va primera y equivale a "sin filtrar".
  const items = ["", ...options];
  const selectedIndex = Math.max(0, items.indexOf(value));

  const close = (devolverFoco = true) => {
    setOpen(false);
    if (devolverFoco) buttonRef.current?.focus();
  };

  const pick = (index: number) => {
    onChange(items[index]);
    close();
  };

  // El indice activo se fija al abrir, no en un efecto: hacerlo en un efecto
  // dispara un render extra en cascada.
  const toggle = () => {
    if (open) {
      close(false);
      return;
    }
    setActive(selectedIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Al abrir, el foco pasa a la lista para que las flechas la recorran.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Mantiene visible la opcion activa cuando se navega con el teclado.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  // Un filtro sin opciones no aporta nada: no se muestra.
  if (options.length === 0) return null;

  const activo = value !== "";

  return (
    <div ref={rootRef} className="relative flex min-w-0 flex-col gap-1.5">
      <span
        id={`${id}-label`}
        className="text-muted text-[11px] tracking-[0.18em] uppercase"
      >
        {label}
      </span>

      {/* El boton de limpiar va aparte y superpuesto: un <button> no puede
          anidar otro <button>. */}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}-value`}
          className={cn(
            "focus-visible:outline-brand-500 rounded-chip flex h-11 w-full items-center gap-2 border pr-10 pl-3 text-sm transition-colors",
            activo
              ? "border-brand-600 bg-brand-800/25 text-ink"
              : "border-line bg-panel text-muted hover:border-brand-500 hover:text-ink",
          )}
        >
          <span id={`${id}-value`} className="truncate">
            {value || placeholder}
          </span>
        </button>

        {activo ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label={`Quitar el filtro ${label}`}
            className="text-brand-300 hover:text-ink hover:bg-brand-700/40 focus-visible:outline-brand-500 absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={cn(
              "text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onKeyDown}
          className="border-line bg-panel shadow-panel rounded-card absolute top-full right-0 left-0 z-20 mt-1.5 max-h-72 scrollbar-none overflow-y-auto border py-1.5 outline-none"
        >
          {items.map((item, i) => {
            const seleccionada = item === value;
            return (
              <li
                key={item || "__todos"}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={seleccionada}
                onClick={() => pick(i)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors",
                  i === active && "bg-surface",
                  seleccionada ? "text-brand-200" : "text-ink",
                  !item && "text-muted",
                )}
              >
                <span className="truncate">{item || placeholder}</span>
                {seleccionada && (
                  <Check size={14} aria-hidden="true" className="shrink-0" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
