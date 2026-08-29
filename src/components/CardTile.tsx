import Image from "next/image";

import type { Card } from "@/lib/types";

/** Proporcion real del arte de las cartas MyL: 512 x 732. */
export const CARD_RATIO = "512 / 732";

interface CardTileProps {
  card: Card;
  onSelect: (card: Card) => void;
}

export function CardTile({ card, onSelect }: CardTileProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      aria-label={`Ver detalle de ${card.nombre}`}
      className="group border-line bg-panel ease-out-soft focus-visible:outline-brand-500 hover:border-brand-500 hover:shadow-glow rounded-card block overflow-hidden border text-left transition duration-200 hover:-translate-y-1"
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
        <span className="text-ink group-hover:text-brand-200 block truncate text-[13px] leading-tight font-medium transition-colors">
          {card.nombre}
        </span>
        <span className="text-muted mt-0.5 block truncate text-[11px]">
          {card.raza ?? card.tipo}
        </span>
      </span>
    </button>
  );
}
