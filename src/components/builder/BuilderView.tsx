"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";

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
  PAGE_SIZE_BUILDER,
  type CatalogFilters,
} from "@/lib/catalog";
import {
  addCard,
  clearDeck,
  createDeck,
  describeDeck,
  renameDeck,
  setQuantity,
  setStartingGold,
  type DeckZone,
} from "@/lib/deck";
import {
  buildCardIndex,
  canAdd,
  deckStats,
  isLegal,
  razasPermitidas,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
  SIDE_TOTAL,
} from "@/lib/deck-rules";
import { saveDeck } from "@/lib/deck-storage";
import { MAX_DESCRIPCION_MAZO, MAX_NOMBRE_MAZO, type Card, type Deck } from "@/lib/types";
import { DECK_NAME_FIELD, DECK_NOTE_FIELD } from "@/lib/ui";
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

function GuardarButton({
  guardado,
  onGuardar,
}: {
  guardado: boolean;
  onGuardar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGuardar}
      className="bg-brand-600 hover:bg-brand-500 rounded-chip focus-visible:outline-brand-300 inline-flex h-11 items-center gap-1.5 px-4 text-[13px] font-medium text-white transition-colors"
    >
      {guardado ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Save size={14} aria-hidden="true" />
      )}
      {guardado ? "Guardado" : "Guardar mazo"}
    </button>
  );
}

/**
 * A donde van las cartas que se agregan: al mazo o al side.
 *
 * El side deck es opcional y admite de 0 a SIDE_TOTAL cartas, pero no
 * es un mazo aparte: comparte el tope de copias y las Unicas con el principal.
 * Por eso esto elige un destino y no abre una vista distinta.
 */
function ZonaSwitch({
  zona,
  onZona,
  enPrincipal,
  enElSide,
}: {
  zona: DeckZone;
  onZona: (z: DeckZone) => void;
  enPrincipal: number;
  enElSide: number;
}) {
  const opciones: { z: DeckZone; texto: string; cuenta: string }[] = [
    { z: "principal", texto: "Mazo", cuenta: `${enPrincipal}/${DECK_TOTAL}` },
    { z: "side", texto: "Side deck", cuenta: `${enElSide}/${SIDE_TOTAL}` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-muted">Agregar a:</span>
      <div className="border-line rounded-chip flex gap-1 border p-1">
        {opciones.map(({ z, texto, cuenta }) => (
          <button
            key={z}
            type="button"
            onClick={() => onZona(z)}
            aria-pressed={zona === z}
            className={cn(
              "rounded-chip focus-visible:outline-brand-500 px-3 py-1.5 transition-colors",
              zona === z
                ? "bg-brand-600 font-medium text-white"
                : "text-muted hover:text-ink",
            )}
          >
            {texto} <span className="tabular-nums opacity-80">{cuenta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuilderView({ cards }: BuilderViewProps) {
  const [deck, setDeck] = useState<Deck>(() => createDeck());
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aviso, setAviso] = useState("");
  const [guardado, setGuardado] = useState(false);
  /**
   * A que zona van las cartas que se agregan desde el catalogo.
   *
   * El side es una EXTENSION del mazo, no un mazo aparte: comparte el tope de
   * copias, las Unicas y la afinidad de raza, de eso se encarga `canAdd`. Aqui
   * solo se elige el destino.
   */
  const [zona, setZona] = useState<DeckZone>("principal");
  const router = useRouter();

  // Caros de construir y el catalogo no cambia en runtime.
  const search = useMemo(() => buildSearchIndex(cards), [cards]);
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

  /**
   * Solo las cartas que pueden entrar en ESTE mazo.
   *
   * En cuanto el mazo tiene un Aliado, su raza queda fija: o sigue mono-raza o
   * crece hacia su escuela. Ofrecer cartas que el validador va a rechazar solo
   * hace perder el tiempo. La raza la llevan los Aliados y nadie mas, asi que
   * Talismanes, Armas, Totems y Oros entran en cualquier mazo y nunca se
   * filtran.
   */
  const permitidas = useMemo(() => razasPermitidas(stats.afinidad), [stats.afinidad]);
  // El filtro de raza vale para las dos zonas: el side entra al mazo entre
  // partidas, asi que no puede traer una raza que el mazo no admite.
  const acotarPorRaza = permitidas.size > 0;
  const disponibles = useMemo(
    () =>
      acotarPorRaza
        ? cards.filter((c) => c.raza === null || permitidas.has(c.raza))
        : cards,
    [cards, permitidas, acotarPorRaza],
  );

  // Las facetas salen de lo que de verdad se puede agregar: si el filtro de
  // raza ofreciera razas que la grilla ya escondio, no devolveria nada nunca.
  const facets = useMemo(() => buildFacets(disponibles), [disponibles]);

  const results = useMemo(
    () => applyFilters(disponibles, filters, search),
    [disponibles, filters, search],
  );
  const totalPages = pageCount(results.length, PAGE_SIZE_BUILDER);
  const currentPage = Math.min(page, totalPages);
  const visible = paginate(results, currentPage, PAGE_SIZE_BUILDER);

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

  // Guardar termina el trabajo del constructor, asi que lleva a la ficha del
  // mazo: es donde se ve entero, se comparte y se borra. El mazo ya esta en
  // localStorage cuando navegamos, y /mazo lo lee de ahi por su id.
  const guardar = () => {
    if (deck.nombre.trim() === "") {
      mostrarAviso("Ponle un nombre al mazo antes de guardarlo.");
      return;
    }
    if (!saveDeck(deck)) {
      mostrarAviso("No pude guardarlo: el almacenamiento del navegador está lleno.");
      return;
    }
    setGuardado(true);
    router.push(`/mazo/?m=${deck.id}`);
  };

  const agregar = (card: Card, zone: DeckZone = zona) => {
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
    const check = canAdd(deck, rc, zona, index);
    return check.ok ? undefined : check.mensaje;
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

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5">
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

          <ZonaSwitch
            zona={zona}
            onZona={setZona}
            enElSide={stats.totalSide}
            enPrincipal={stats.totalPrincipal}
          />

          {/* Que el catalogo este acotado tiene que verse, o parece que faltan
              cartas. */}
          {acotarPorRaza && (
            <p className="text-muted -mt-2 text-[13px]">
              Mostrando solo cartas que caben en este mazo: Aliados de{" "}
              <span className="text-ink">{[...permitidas].join(" y ")}</span>, más
              Talismanes, Armas, Tótems y Oros. Para cambiar de raza, quita los Aliados
              del mazo.
            </p>
          )}

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
                variante="constructor"
              />
              <Pagination
                page={currentPage}
                total={totalPages}
                range={pageRange(currentPage, results.length, PAGE_SIZE_BUILDER)}
                results={results.length}
                onChange={(n) => {
                  setPage(n);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </div>

        {/* En escritorio el panel acompana al catalogo; bajo lg pasa a hoja.
            Quien scrollea es el div de dentro, no el <aside>: asi la barra
            —y las flechas que dibujan Windows y macOS en sus extremos— cae
            dentro del panel y no montada sobre su esquina redondeada. */}
        <aside className="border-line bg-panel rounded-panel sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col overflow-hidden border p-2 lg:flex">
          <div className="scrollbar-slim flex min-h-0 flex-col gap-4 overflow-y-auto p-2">
            <input
              value={deck.nombre}
              onChange={(e) => setDeck((d) => renameDeck(d, e.target.value))}
              placeholder="Nombre del mazo"
              maxLength={MAX_NOMBRE_MAZO}
              aria-label="Nombre del mazo"
              className={cn(DECK_NAME_FIELD, "bg-surface")}
            />
            <textarea
              value={deck.descripcion}
              onChange={(e) => setDeck((d) => describeDeck(d, e.target.value))}
              placeholder="Descripción (opcional)"
              aria-label="Descripción del mazo"
              maxLength={MAX_DESCRIPCION_MAZO}
              rows={2}
              className={cn(DECK_NOTE_FIELD, "bg-surface")}
            />
            {panel}
            <div className="border-line flex flex-wrap gap-2 border-t pt-4">
              <GuardarButton guardado={guardado} onGuardar={guardar} />
              <DeckClearButton onClear={() => setDeck((d) => clearDeck(d))} />
            </div>
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
          placeholder="Nombre del mazo"
          maxLength={MAX_NOMBRE_MAZO}
          aria-label="Nombre del mazo"
          className={DECK_NAME_FIELD}
        />
        <textarea
          value={deck.descripcion}
          onChange={(e) => setDeck((d) => describeDeck(d, e.target.value))}
          placeholder="Descripción (opcional)"
          aria-label="Descripción del mazo"
          maxLength={MAX_DESCRIPCION_MAZO}
          rows={2}
          className={cn(DECK_NOTE_FIELD, "mt-2 mb-4")}
        />
        {panel}
        <div className="border-line mt-4 flex flex-wrap gap-2 border-t pt-4">
          <GuardarButton guardado={guardado} onGuardar={guardar} />
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
