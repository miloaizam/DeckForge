"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { AbilityText } from "./AbilityText";
import { CARD_RATIO } from "./CardTile";
import { editionTitle } from "@/lib/editions";
import type { Card } from "@/lib/types";

interface CardModalProps {
  card: Card | null;
  onClose: () => void;
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

export function CardModal({ card, onClose }: CardModalProps) {
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
      className="bg-surface border-line text-ink shadow-panel rounded-panel m-auto w-[min(56rem,calc(100vw-2rem))] border p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {card && (
        <div className="relative grid gap-6 p-6 sm:grid-cols-[minmax(0,17rem)_1fr] sm:gap-8 sm:p-8">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Cerrar"
            className="text-muted hover:text-ink hover:bg-panel focus-visible:outline-brand-500 rounded-chip absolute top-4 right-4 flex size-11 items-center justify-center transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <Image
            src={card.imagen}
            alt={`Carta: ${card.nombre}`}
            width={420}
            height={600}
            priority
            className="border-line rounded-card w-full border"
            style={{ aspectRatio: CARD_RATIO }}
          />

          <div className="min-w-0">
            <p className="text-muted text-[11px] tracking-[0.22em] uppercase">
              {editionTitle(card.edicion)}
            </p>
            <h2 className="mt-2 pr-12 text-3xl font-bold tracking-[-0.01em]">
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
          </div>
        </div>
      )}
    </dialog>
  );
}
