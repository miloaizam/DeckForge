"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { DeckClearButton, DeckPanel } from "./DeckPanel";
import { DeckParamLoader } from "./DeckParamLoader";
import { DeckSheet } from "./DeckSheet";
import { CardGrid } from "../CardGrid";
import { CardModal } from "../CardModal";
import { Filters } from "../Filters";
import { Pagination } from "../Pagination";
import {
  applyFilters,
  buildFacets,
  buildSearchIndex,
  EMPTY_FILTERS,
  hasActiveFilters,
  pageCount,
  pageRange,
  paginate,
  type CatalogFilters,
} from "@/lib/catalog";
import {
  addCard,
  clearDeck,
  createDeck,
  renameDeck,
  setQuantity,
  setStartingGold,
  type DeckZone,
} from "@/lib/deck";
import { shareUrl } from "@/lib/deck-code";
import {
  buildCardIndex,
  canAdd,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
} from "@/lib/deck-rules";
import { saveDeck } from "@/lib/deck-storage";
import type { Card, Deck } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BuilderViewProps {
  cards: Card[];
}

/** Como se lee la afinidad del mazo en una linea. */
function textoAfinidad(stats: ReturnType<typeof deckStats>): string {
  switch (stats.afinidad.modo) {
    case "vacio":
      return "Sin raza aún";
    case "mono":
      return stats.afinidad.raza;
    case "escuela":
      return stats.afinidad.escuela;
    case "invalida":
      return "Razas incompatibles";
  }
}

export function BuilderView({ cards }: BuilderViewProps) {
  const [deck, setDeck] = useState<Deck>(() => createDeck());
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Caros de construir y el catalogo no cambia en runtime.
  const search = useMemo(() => buildSearchIndex(cards), [cards]);
  const facets = useMemo(() => buildFacets(cards), [cards]);
  const index = useMemo(() => buildCardIndex(cards), [cards]);

  const res = useMemo(() => resolveDeck(deck, index), [deck, index]);
  const stats = useMemo(() => deckStats(res), [res]);
  const issues = useMemo(() => validateDeck(deck, index), [deck, index]);
  const legal = isLegal(issues);

  /** Copias por impresion, para el numerito de cada carta de la grilla. */
  const copiasPorId = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of [...deck.principal, ...deck.side]) {
      m.set(e.id, (m.get(e.id) ?? 0) + e.n);
    }
    return m;
  }, [deck]);

  const results = useMemo(
    () => applyFilters(cards, filters, search),
    [cards, filters, search],
  );
  const totalPages = pageCount(results.length);
  const currentPage = Math.min(page, totalPages);
  const visible = paginate(results, currentPage);

  // El aviso se borra solo: es un mensaje de paso, no un estado del mazo.
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrarAviso = useCallback((mensaje: string) => {
    setAviso(mensaje);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 5000);
  }, []);
  useEffect(
    () => () => {
      if (avisoTimer.current) clearTimeout(avisoTimer.current);
    },
    [],
  );

  // Autoguardado: el mazo vive en el navegador y no hay boton de "guardar".
  // Se espera medio segundo para no escribir en cada clic del boton "+".
  useEffect(() => {
    if (deck.principal.length === 0 && deck.side.length === 0) return;
    const t = setTimeout(() => saveDeck(deck), 500);
    return () => clearTimeout(t);
  }, [deck]);

  const agregar = (card: Card, zone: DeckZone = "principal") => {
    const rc = index.porId.get(card.id);
    if (!rc) return;
    const check = canAdd(deck, rc, zone, index);
    if (!check.ok) {
      mostrarAviso(check.mensaje);
      return;
    }
    // addCard cuenta las copias de ESA zona; copiasPorId suma las dos y aqui
    // daria la cuenta equivocada si la carta ya estuviera en el side.
    setDeck((d) => addCard(d, card.id, zone));
  };

  const bloqueoDe = (card: Card): string | undefined => {
    const rc = index.porId.get(card.id);
    if (!rc) return undefined;
    const check = canAdd(deck, rc, "principal", index);
    return check.ok ? undefined : check.mensaje;
  };

  const compartir = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(deck, window.location.origin));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      mostrarAviso("No pude copiar el enlace. Cópialo desde la barra del navegador.");
    }
  };

  const panel = (
    <DeckPanel
      deck={deck}
      res={res}
      stats={stats}
      issues={issues}
      index={index}
      onSetQuantity={(id, zone, n) => setDeck((d) => setQuantity(d, id, zone, n))}
      onSetStartingGold={(id) => setDeck((d) => setStartingGold(d, id))}
      onBlocked={mostrarAviso}
    />
  );

  return (
    <>
      {/* Aislar useSearchParams aqui deja prerenderizar todo lo de arriba. */}
      <Suspense fallback={null}>
        <DeckParamLoader onLoad={setDeck} onError={mostrarAviso} />
      </Suspense>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-8">
          <Filters
            filters={filters}
            facets={facets}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            onReset={() => {
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          />

          {results.length === 0 ? (
            <div className="border-line rounded-panel border border-dashed px-6 py-16 text-center">
              <p className="text-ink">Ninguna carta coincide con esa búsqueda.</p>
              {hasActiveFilters(filters) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(EMPTY_FILTERS);
                    setPage(1);
                  }}
                  className="text-accent focus-visible:outline-brand-500 mt-3 rounded text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
                >
                  Limpiar los filtros
                </button>
              )}
            </div>
          ) : (
            <>
              <CardGrid
                cards={visible}
                onSelect={setSelected}
                copies={copiasPorId}
                onAdd={(c) => agregar(c)}
                addBlocked={bloqueoDe}
              />
              <Pagination
                page={currentPage}
                total={totalPages}
                range={pageRange(currentPage, results.length)}
                results={results.length}
                onChange={(n) => {
                  setPage(n);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </div>

        {/* En escritorio el panel acompana al catalogo; bajo lg pasa a hoja. */}
        <aside className="border-line bg-panel rounded-panel sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col gap-4 overflow-y-auto border p-4 lg:flex">
          <input
            value={deck.nombre}
            onChange={(e) => setDeck((d) => renameDeck(d, e.target.value))}
            aria-label="Nombre del mazo"
            className="border-line bg-surface text-ink focus-visible:outline-brand-500 rounded-chip h-11 w-full border px-3 text-sm"
          />
          {panel}
          <div className="border-line flex flex-wrap gap-2 border-t pt-4">
            <button
              type="button"
              onClick={compartir}
              className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-4 text-[13px] transition-colors"
            >
              {copiado ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <Link2 size={14} aria-hidden="true" />
              )}
              {copiado ? "Enlace copiado" : "Compartir"}
            </button>
            <DeckClearButton onClear={() => setDeck((d) => clearDeck(d))} />
          </div>
        </aside>
      </div>

      {/* Un solo lugar donde se anuncian los rechazos, para lector de pantalla. */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "border-line bg-panel shadow-panel rounded-card fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md border px-4 py-3 text-[13px] transition-opacity lg:bottom-6",
          aviso ? "text-ink opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {aviso}
      </div>

      <DeckSheet
        total={stats.totalPrincipal}
        legal={legal}
        afinidad={textoAfinidad(stats)}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      >
        <input
          value={deck.nombre}
          onChange={(e) => setDeck((d) => renameDeck(d, e.target.value))}
          aria-label="Nombre del mazo"
          className="border-line bg-panel text-ink focus-visible:outline-brand-500 rounded-chip mb-4 h-11 w-full border px-3 text-sm"
        />
        {panel}
        <div className="border-line mt-4 flex flex-wrap gap-2 border-t pt-4">
          <button
            type="button"
            onClick={compartir}
            className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-4 text-[13px] transition-colors"
          >
            <Link2 size={14} aria-hidden="true" />
            {copiado ? "Enlace copiado" : "Compartir"}
          </button>
          <DeckClearButton onClear={() => setDeck((d) => clearDeck(d))} />
        </div>
      </DeckSheet>

      <CardModal
        card={selected}
        onClose={() => setSelected(null)}
        copies={selected ? (copiasPorId.get(selected.id) ?? 0) : 0}
        onAdd={selected ? () => agregar(selected) : undefined}
        addBlocked={selected ? bloqueoDe(selected) : undefined}
      />
    </>
  );
}
