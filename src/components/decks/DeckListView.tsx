"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Hammer,
  Layers,
  Link2,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { copyShareLink, downloadDeck } from "./actions";
import { DeckTransfer } from "./DeckTransfer";
import { useDecks, useHydrated } from "./use-decks";
import { deckTitle, duplicateDeck } from "@/lib/deck";
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
import { CARD_RATIO } from "../CardTile";

interface DeckListViewProps {
  cards: Card[];
}

const FECHA = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" });

/**
 * Los botones de una tarjeta, mas compactos que los de una pagina.
 *
 * Aqui van cinco seguidos bajo dos lineas de texto: a la altura de un boton
 * suelto (h-11) la fila pesaba mas que el mazo que describe. A 36px siguen
 * comodos de pulsar y la tarjeta se lee de una.
 */
const ACCION =
  "text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-9 items-center gap-1.5 border px-2.5 text-[13px] transition-colors";
const ACCION_ICONO =
  "text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex size-9 items-center justify-center border transition-colors";

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
    avisar(`Borré "${deckTitle(deck)}".`);
  };

  const duplicar = (deck: Deck) => saveDeck(duplicateDeck(deck));

  const importar = (nuevos: Deck[]) => saveDecks([...nuevos, ...decks]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/builder"
          className="bg-brand-600 hover:bg-brand-500 rounded-chip focus-visible:outline-brand-300 inline-flex h-11 items-center gap-2 px-4 text-sm font-medium text-white transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
          Armar un mazo
        </Link>

        {/* El aviso va en la fila de los botones y no en una linea propia: ahi
            reservaba su alto siempre —para no empujar la lista al aparecer— y
            eran 20px de aire permanente entre los botones y los mazos. Con
            flex-1 y min-w-0 ocupa el hueco del medio y encoge hasta cero. */}
        <p
          role="status"
          aria-live="polite"
          className="text-muted min-w-0 flex-1 truncate px-1 text-[13px]"
        >
          {mensaje}
        </p>

        <DeckTransfer decks={decks} onImport={importar} onMessage={avisar} />
      </div>

      {!cargado ? (
        // Esqueleto, no spinner: la lista sale de localStorage al montar.
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const res = resolveDeck(deck, index);
            const stats = deckStats(res);
            const legal = isLegal(validateDeck(deck, index));
            const portada = deck.portada ? index.porId.get(deck.portada) : undefined;

            return (
              <li
                key={deck.id}
                className="border-line bg-panel rounded-panel flex gap-3 border p-3.5"
              >
                {/* La portada la elige el usuario en /mazo, y va a la izquierda
                    de todo lo demas. Si la carta ya no esta en el catalogo no
                    se dibuja nada: un hueco vacio diria menos que la tarjeta
                    sin foto. */}
                {portada && (
                  <Image
                    src={portada.thumb}
                    alt=""
                    width={64}
                    height={92}
                    loading="lazy"
                    style={{ aspectRatio: CARD_RATIO }}
                    // Del titulo al pie de los botones. El ancho es el que
                    // pide la proporcion de la carta a ese alto (92 por 131): a
                    // 64 el recorte se comia los bordes del arte. Y como la
                    // proporcion tambien da el alto minimo, la tarjeta sin nota
                    // crece hasta la foto en vez de recortarla.
                    className="border-line w-[92px] shrink-0 self-stretch rounded border object-cover"
                  />
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/mazo/?m=${deck.id}`}
                        className="text-ink hover:text-accent focus-visible:outline-brand-500 block truncate rounded font-medium transition-colors"
                      >
                        {deckTitle(deck)}
                      </Link>
                      <p className="text-muted mt-0.5 text-[13px] tabular-nums">
                        {stats.totalPrincipal} cartas
                        {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
                        {" · "}
                        {FECHA.format(new Date(deck.actualizado))}
                      </p>
                      {/* Dos lineas como mucho: la tarjeta tiene que seguir
                          midiendo lo mismo lleve nota o no. */}
                      {deck.descripcion.trim() !== "" && (
                        <p className="text-muted mt-1 line-clamp-2 text-[13px] leading-snug">
                          {deck.descripcion}
                        </p>
                      )}
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

                  {/* `mt-auto` los manda al fondo: la portada fija el alto de
                      la tarjeta y los botones cierran contra su borde. */}
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Link href={`/builder/?m=${deck.id}`} className={ACCION}>
                      <Hammer size={14} aria-hidden="true" />
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => void copyShareLink(deck).then(avisar)}
                      aria-label={`Compartir ${deckTitle(deck)}`}
                      title="Copiar enlace"
                      className={ACCION_ICONO}
                    >
                      <Link2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDeck(deck)}
                      aria-label={`Exportar ${deckTitle(deck)}`}
                      title="Exportar a un archivo"
                      className={ACCION_ICONO}
                    >
                      <Download size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicar(deck)}
                      aria-label={`Duplicar ${deckTitle(deck)}`}
                      title="Duplicar"
                      className={ACCION_ICONO}
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
                          className={cn(
                            ACCION,
                            "border-brand-600 bg-accent-soft text-accent",
                          )}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPorBorrar(null)}
                          className={ACCION}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPorBorrar(deck.id)}
                        aria-label={`Borrar ${deckTitle(deck)}`}
                        className={ACCION_ICONO}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
