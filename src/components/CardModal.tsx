"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";

import { AbilityText } from "./AbilityText";
import { CARD_RATIO } from "./CardTile";
import { editionTitle } from "@/lib/editions";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CardModalProps {
  card: Card | null;
  onClose: () => void;
  /** Copias en el mazo. Solo las pasa el constructor. */
  copies?: number;
  /** Si viene, el modal ofrece agregar la carta al mazo. */
  onAdd?: () => void;
  /** Por que no se puede agregar, si es que no se puede. */
  addBlocked?: string;
}

/** Dato con etiqueta. No se renderiza si el valor viene vacio. */
function Stat({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === "") return null;
  return (
    <div>
      <dt className="text-muted text-[11px] tracking-[0.18em] uppercase">{label}</dt>
      <dd className="text-ink mt-1 text-[15px] tabular-nums">{value}</dd>
    </div>
  );
}

export function CardModal({
  card,
  onClose,
  copies = 0,
  onAdd,
  addBlocked,
}: CardModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Usamos <dialog> nativo: trae foco atrapado, cierre con Esc y devolucion
  // del foco al elemento que lo abrio, sin librerias ni codigo propio.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (card && !dialog.open) dialog.showModal();
    if (!card && dialog.open) dialog.close();
  }, [card]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el backdrop (fuera del contenido) tambien cierra.
        if (e.target === ref.current) ref.current?.close();
      }}
      // El alto lo pone el area que scrollea, no el dialogo: asi hay un solo
      // lugar donde vive el tope y el dialogo se dimensiona por su contenido.
      // `overflow-hidden` esta solo para que las esquinas redondeadas recorten.
      className="bg-surface border-line text-ink shadow-panel rounded-panel m-auto w-[min(56rem,calc(100vw-2rem))] overflow-hidden border p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {card && (
        <div className="relative">
          {/* El boton queda sobre el dialogo, no dentro del area que scrollea:
              cerrar tiene que estar siempre a mano. */}
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Cerrar"
            className="text-muted hover:text-ink bg-surface/80 hover:bg-panel focus-visible:outline-brand-500 rounded-chip absolute top-3 right-3 z-10 flex size-11 items-center justify-center backdrop-blur transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>

          {/* En un telefono la carta no cabe entera. `dvh` y no `vh` para que la
              barra del navegador movil no deje el ultimo trozo fuera de
              alcance, y `overscroll-contain` para que al llegar al final el
              scroll no se encadene a la pagina de atras. */}
          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
            <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,17rem)_1fr] sm:gap-8 sm:p-8">
              <Image
                src={card.imagen}
                alt={`Carta: ${card.nombre}`}
                width={420}
                height={600}
                priority
                className="border-line rounded-card mx-auto w-full max-w-[13rem] border sm:max-w-none"
                style={{ aspectRatio: CARD_RATIO }}
              />

              <div className="min-w-0">
                <p className="text-muted pr-12 text-[11px] tracking-[0.22em] uppercase">
                  {editionTitle(card.edicion)}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
                  {card.nombre}
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border-line bg-accent-soft text-accent rounded-chip border px-2.5 py-1 text-xs">
                    {card.tipo}
                  </span>
                  {card.raza && (
                    <span className="border-line bg-panel text-muted rounded-chip border px-2.5 py-1 text-xs">
                      {card.raza}
                    </span>
                  )}
                  {card.escuela && (
                    <span className="border-line bg-panel text-muted rounded-chip border px-2.5 py-1 text-xs">
                      {card.escuela}
                    </span>
                  )}
                </div>

                <dl className="border-line mt-6 grid grid-cols-3 gap-4 border-t pt-5">
                  {/* Mismo orden que la carta impresa: fuerza a la izquierda,
                      coste a la derecha. */}
                  <Stat label="Fuerza" value={card.fuerza} />
                  <Stat label="Coste" value={card.coste} />
                  <Stat label="Frecuencia" value={card.frecuencia} />
                </dl>

                {card.habilidad && (
                  <div className="border-line mt-5 border-t pt-5">
                    <h3 className="text-muted text-[11px] tracking-[0.18em] uppercase">
                      Habilidad
                    </h3>
                    <div className="mt-2">
                      <AbilityText text={card.habilidad} />
                    </div>
                  </div>
                )}

                {card.ilustrador && (
                  <p className="text-muted border-line mt-5 border-t pt-5 text-[13px]">
                    Ilustración de <span className="text-ink">{card.ilustrador}</span>
                  </p>
                )}

                {onAdd && (
                  <div className="border-line mt-5 flex flex-wrap items-center gap-3 border-t pt-5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!addBlocked) onAdd();
                      }}
                      // aria-disabled y no disabled: sigue enfocable, y asi al
                      // pulsarlo puede explicar por que no se puede.
                      aria-disabled={addBlocked ? true : undefined}
                      title={addBlocked}
                      className={cn(
                        "rounded-chip focus-visible:outline-brand-500 inline-flex h-11 items-center gap-2 px-4 text-sm font-medium transition-colors",
                        addBlocked
                          ? "border-line text-muted/60 cursor-not-allowed border"
                          : "bg-brand-600 hover:bg-brand-500 text-white",
                      )}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Agregar al mazo
                    </button>
                    <span className="text-muted text-[13px] tabular-nums">
                      {copies === 0
                        ? "Todavía no está en el mazo"
                        : `${copies} en el mazo`}
                    </span>
                    {addBlocked && (
                      <span className="text-muted w-full text-[13px]">{addBlocked}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
