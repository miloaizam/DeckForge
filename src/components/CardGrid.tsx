"use client";

import { CardTile } from "./CardTile";
import type { Card } from "@/lib/types";

interface CardGridProps {
  cards: Card[];
  onSelect: (card: Card) => void;
  /** Copias en el mazo por id de carta. Solo lo pasa el constructor. */
  copies?: Map<string, number>;
  onAdd?: (card: Card) => void;
  /** Por que no se puede agregar cada carta, si es que no se puede. */
  addBlocked?: (card: Card) => string | undefined;
}

export function CardGrid({ cards, onSelect, copies, onAdd, addBlocked }: CardGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <CardTile
            card={card}
            onSelect={onSelect}
            copies={copies?.get(card.id) ?? 0}
            onAdd={onAdd}
            addBlocked={addBlocked?.(card)}
          />
        </li>
      ))}
    </ul>
  );
}
