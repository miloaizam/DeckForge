"use client";

import { CardTile } from "./CardTile";
import type { Card } from "@/lib/types";

interface CardGridProps {
  cards: Card[];
  onSelect: (card: Card) => void;
}

export function CardGrid({ cards, onSelect }: CardGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cards.map((card) => (
        <li key={card.id}>
          <CardTile card={card} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
