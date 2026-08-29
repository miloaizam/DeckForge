"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Hammer, Layers, Plus, Trash2, TriangleAlert } from "lucide-react";

import { DeckTransfer } from "./DeckTransfer";
import { useDecks, useHydrated } from "./use-decks";
import { createDeck, duplicateDeck } from "@/lib/deck";
import {
  buildCardIndex,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
} from "@/lib/deck-rules";
import { deleteDeck, saveDeck, saveDecks } from "@/lib/deck-storage";
import type { Card, Deck } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeckListViewProps {
  cards: Card[];
}

const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });

export function DeckListView({ cards }: DeckListViewProps) {
  // La lista sale del store, no de estado propio: asi se mantiene al dia sola
  // cuando se guarda un mazo, aqui o en otra pestana.
  const decks = useDecks();
  const cargado = useHydrated();
  const [mensaje, setMensaje] = useState("");
  /** Que mazo esta esperando confirmacion de borrado. Borrar no tiene vuelta. */
  const [porBorrar, setPorBorrar] = useState<string | null>(null);

  const index = useMemo(() => buildCardIndex(cards), [cards]);

  const avisar = useCallback((texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 5000);
  }, []);

  // Ninguna de estas toca estado local: escriben en el store y la lista se
  // vuelve a leer sola.
  const borrar = (deck: Deck) => {
    deleteDeck(deck.id);
    setPorBorrar(null);
    avisar(`Borré "${deck.nombre}".`);
  };

  const duplicar = (deck: Deck) => saveDeck(duplicateDeck(deck));

  const importar = (nuevos: Deck[]) => saveDecks([...nuevos, ...decks]);

  const crear = () => saveDeck(createDeck("Mazo nuevo"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/builder"
          className="bg-brand-600 hover:bg-brand-500 rounded-chip focus-visible:outline-brand-300 inline-flex h-11 items-center gap-2 px-4 text-sm font-medium text-white transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          Armar un mazo
        </Link>
        <button
          type="button"
          onClick={crear}
          className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-4 text-[13px] transition-colors"
        >
          Crear vacío
        </button>
        <div className="ml-auto">
          <DeckTransfer decks={decks} onImport={importar} onMessage={avisar} />
        </div>
      </div>

      <p role="status" aria-live="polite" className="text-muted min-h-5 text-[13px]">
        {mensaje}
      </p>

      {!cargado ? (
        // Esqueleto, no spinner: la lista sale de localStorage al montar.
        <ul className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <li
              key={i}
              aria-hidden="true"
              className="border-line rounded-panel h-28 animate-pulse border"
            />
          ))}
        </ul>
      ) : decks.length === 0 ? (
        <div className="border-line rounded-panel border border-dashed px-6 py-20 text-center">
          <Layers
            size={28}
            aria-hidden="true"
            className="text-muted mx-auto mb-4 opacity-60"
          />
          <p className="text-ink text-lg">Todavía no tienes mazos.</p>
          <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
            Los mazos que armes se guardan solo en este navegador. Si cambias de equipo,
            expórtalos a un archivo y vuelve a importarlos allá.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => {
            const res = resolveDeck(deck, index);
            const stats = deckStats(res);
            const legal = isLegal(validateDeck(deck, index));

            return (
              <li
                key={deck.id}
                className="border-line bg-panel rounded-panel flex flex-col gap-3 border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/mazo/?m=${deck.id}`}
                      className="text-ink hover:text-accent focus-visible:outline-brand-500 block truncate rounded font-medium transition-colors"
                    >
                      {deck.nombre}
                    </Link>
                    <p className="text-muted mt-0.5 text-[13px] tabular-nums">
                      {stats.totalPrincipal} cartas
                      {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
                      {" · "}
                      {FECHA.format(new Date(deck.actualizado))}
                    </p>
                  </div>

                  {/* Icono y texto: el color no puede ser el unico indicador. */}
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-[13px]",
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
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/builder/?m=${deck.id}`}
                    className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-3 text-[13px] transition-colors"
                  >
                    <Hammer size={14} aria-hidden="true" />
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicar(deck)}
                    aria-label={`Duplicar ${deck.nombre}`}
                    className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex size-11 items-center justify-center border transition-colors"
                  >
                    <Copy size={14} aria-hidden="true" />
                  </button>
                  {/* Borrar pide confirmar en el mismo boton: el mazo solo
                      vive aqui y no hay de donde recuperarlo. */}
                  {porBorrar === deck.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => borrar(deck)}
                        className="border-brand-600 bg-accent-soft text-accent focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-3 text-[13px]"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPorBorrar(null)}
                        className="text-muted hover:text-ink border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center border px-3 text-[13px] transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPorBorrar(deck.id)}
                      aria-label={`Borrar ${deck.nombre}`}
                      className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex size-11 items-center justify-center border transition-colors"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
