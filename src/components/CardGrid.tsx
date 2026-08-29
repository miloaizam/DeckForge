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

/**
 * Flex y no grid, para poder centrar la ultima fila.
 *
 * Con `grid-cols-N` la ultima fila queda pegada a la izquierda y el hueco se
 * acumula a la derecha: 30 cartas en 4 columnas dejan media fila vacia, y la
 * ultima pagina del catalogo (26 cartas) deja cuatro huecos. CSS Grid no tiene
 * forma de centrar una fila incompleta.
 *
 * El `basis` reproduce el ancho que tenian las columnas —para N columnas hay
 * N-1 huecos de `gap-4`, o sea (N-1)rem— asi que el mosaico se ve igual que
 * antes salvo por la ultima fila, que ahora va centrada.
 *
 * El medio pixel que se resta es un seguro: con un ajuste exacto, el redondeo
 * sub-pixel de algunos navegadores puede tirar la ultima tarjeta a la linea
 * siguiente y dejar una columna de menos. Medio pixel no se ve; una columna
 * perdida si.
 */
export function CardGrid({ cards, onSelect, copies, onAdd, addBlocked }: CardGridProps) {
  return (
    <ul className="flex flex-wrap justify-center gap-4">
      {cards.map((card) => (
        <li
          key={card.id}
          className="min-w-0 basis-[calc((100%-1rem)/2-0.5px)] sm:basis-[calc((100%-2rem)/3-0.5px)] md:basis-[calc((100%-3rem)/4-0.5px)] lg:basis-[calc((100%-4rem)/5-0.5px)]"
        >
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
