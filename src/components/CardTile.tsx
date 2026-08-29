import Image from "next/image";
import { Plus } from "lucide-react";

import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Proporcion real del arte de las cartas MyL: 512 x 732. */
export const CARD_RATIO = "512 / 732";

interface CardTileProps {
  card: Card;
  onSelect: (card: Card) => void;
  /** Copias en el mazo. Solo el constructor las pasa. */
  copies?: number;
  /** Si viene, la carta muestra un boton para sumarla al mazo. */
  onAdd?: (card: Card) => void;
  /** Por que no se puede agregar. Si viene, el boton lo explica al pulsarlo. */
  addBlocked?: string;
}

export function CardTile({
  card,
  onSelect,
  copies = 0,
  onAdd,
  addBlocked,
}: CardTileProps) {
  return (
    // El boton de agregar va superpuesto y aparte: un <button> no puede anidar
    // otro <button>. Mismo apano que en Select.tsx con el boton de limpiar.
    <div className="group border-line bg-panel ease-out-soft hover:border-brand-500 hover:shadow-glow rounded-card relative overflow-hidden border transition duration-200 focus-within:-translate-y-1 hover:-translate-y-1">
      <button
        type="button"
        onClick={() => onSelect(card)}
        aria-label={`Ver detalle de ${card.nombre}`}
        className="focus-visible:outline-brand-500 block w-full text-left"
      >
        <Image
          src={card.thumb}
          alt={`Carta: ${card.nombre}`}
          width={200}
          height={286}
          loading="lazy"
          className="w-full"
          style={{ aspectRatio: CARD_RATIO }}
        />
        <span className="block px-2.5 py-2">
          <span className="text-ink group-hover:text-accent block truncate text-[13px] leading-tight font-medium transition-colors">
            {card.nombre}
          </span>
          <span className="text-muted mt-0.5 block truncate text-[11px]">
            {card.raza ?? card.tipo}
          </span>
        </span>
      </button>

      {/* El numero tambien va como texto para el lector de pantalla: el color
          y la posicion no pueden ser el unico indicador. */}
      {copies > 0 && (
        <span
          aria-label={`${copies} en el mazo`}
          className="bg-brand-600 rounded-chip absolute top-2 left-2 flex min-w-7 items-center justify-center px-1.5 py-1 text-[13px] font-medium text-white tabular-nums"
        >
          {copies}
        </span>
      )}

      {onAdd && (
        <button
          type="button"
          onClick={() => {
            if (!addBlocked) onAdd(card);
          }}
          // aria-disabled y no disabled: el boton sigue enfocable y al pulsarlo
          // puede EXPLICAR por que no se puede. Un disabled no dice nada.
          aria-disabled={addBlocked ? true : undefined}
          title={addBlocked}
          aria-label={addBlocked ?? `Agregar ${card.nombre} al mazo`}
          className={cn(
            "bg-surface/85 focus-visible:outline-brand-500 rounded-chip absolute top-2 right-2 flex size-11 items-center justify-center backdrop-blur transition-colors",
            addBlocked
              ? "text-muted/50 cursor-not-allowed"
              : "text-accent hover:bg-brand-600 hover:text-white",
          )}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
