"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { decodeDeck } from "@/lib/deck-code";
import { readDeck } from "@/lib/deck-storage";
import type { Deck } from "@/lib/types";

interface DeckParamLoaderProps {
  onLoad: (deck: Deck) => void;
  onError: (mensaje: string) => void;
}

/**
 * Lee `?m=` (un mazo guardado) o `?d=` (uno compartido) y lo entrega arriba.
 *
 * No pinta nada: existe solo para aislar `useSearchParams` detras de su propio
 * <Suspense>. Si el gancho se llamara desde la isla entera, todo lo que hay por
 * encima —filtros, grilla, paginacion— dejaria de prerenderizarse y se perderia
 * el HTML estatico, que es justo lo caro de esta pagina.
 *
 * Se usa el gancho y no `window.location.search` porque navegar de
 * `/builder/?m=a` a `/builder/?m=b` no remonta la isla: leyendo `window` una
 * sola vez el mazo se quedaria pegado en el primero.
 */
export function DeckParamLoader({ onLoad, onError }: DeckParamLoaderProps) {
  const params = useSearchParams();
  const m = params.get("m");
  const d = params.get("d");

  // Cada combinacion de parametros se carga una sola vez: sin esto, cualquier
  // render volveria a pisar lo que el usuario lleve editado.
  const cargado = useRef<string | null>(null);

  useEffect(() => {
    if (!m && !d) return;

    const clave = `${m ?? ""}|${d ?? ""}`;
    if (cargado.current === clave) return;
    cargado.current = clave;

    // El codigo compartido manda: si vienen los dos, es un enlace recibido.
    if (d) {
      const r = decodeDeck(d);
      if (r.ok) onLoad(r.deck);
      else onError(r.mensaje);
      return;
    }

    const guardado = readDeck(m!);
    if (guardado) onLoad(guardado);
    else onError("No encontré ese mazo en este navegador.");
  }, [m, d, onLoad, onError]);

  return null;
}
