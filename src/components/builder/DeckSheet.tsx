"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check, ChevronUp, TriangleAlert, X } from "lucide-react";

import { DECK_TOTAL } from "@/lib/deck-rules";
import { cn } from "@/lib/utils";

interface DeckSheetProps {
  total: number;
  legal: boolean;
  /** Resumen corto de la afinidad, del estilo "Dragón" o "Clan Desafiante". */
  afinidad: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * El panel del mazo en pantallas chicas: barra fija abajo que lo abre.
 *
 * DESIGN.md pide que el panel de mazo pase a hoja inferior en pantallas chicas
 * y que el estado del mazo este siempre a la vista, asi que la barra muestra el
 * conteo y la legalidad aunque la hoja este cerrada.
 *
 * La hoja es un <dialog> nativo, igual que CardModal: trae foco atrapado,
 * cierre con Esc y devolucion del foco sin librerias. Y el alto lo pone el
 * area que scrollea, que es la leccion que dejo el modal de carta.
 */
export function DeckSheet({
  total,
  legal,
  afinidad,
  open,
  onOpenChange,
  children,
}: DeckSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="border-line bg-panel/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Abrir el panel del mazo"
          className="focus-visible:outline-brand-500 flex h-14 w-full items-center gap-3 px-4"
        >
          <span className="text-ink text-lg font-bold tabular-nums">
            {total}
            <span className="text-muted text-sm font-normal">/{DECK_TOTAL}</span>
          </span>

          {/* Icono y texto, nunca solo color. */}
          <span
            className={cn(
              "flex items-center gap-1.5 text-[13px]",
              legal ? "text-accent" : "text-muted",
            )}
          >
            {legal ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <TriangleAlert size={14} aria-hidden="true" />
            )}
            {legal ? "Legal" : "Incompleto"}
          </span>

          <span className="text-muted ml-auto truncate text-[13px]">{afinidad}</span>
          <ChevronUp size={16} aria-hidden="true" className="text-muted shrink-0" />
        </button>
      </div>

      <dialog
        ref={ref}
        onClose={() => onOpenChange(false)}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="bg-surface border-line text-ink shadow-panel rounded-t-panel mt-auto mb-0 w-full max-w-none border-t p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="relative">
          <div className="border-line bg-surface sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-ink text-[15px] font-medium">El mazo</h3>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Cerrar el panel del mazo"
              className="text-muted hover:text-ink hover:bg-panel focus-visible:outline-brand-500 rounded-chip flex size-11 items-center justify-center transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="scrollbar-slim max-h-[70dvh] overflow-y-auto overscroll-contain px-4 py-4">
            {children}
          </div>
        </div>
      </dialog>
    </div>
  );
}
