"use client";

import { useMemo, useState } from "react";

import { CardGrid } from "./CardGrid";
import { CardModal } from "./CardModal";
import { Filters } from "./Filters";
import { Pagination } from "./Pagination";
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
import type { Card } from "@/lib/types";

interface CatalogViewProps {
  cards: Card[];
}

/**
 * Isla interactiva del catalogo. La busqueda y los filtros corren en memoria:
 * no hay servidor al que preguntarle.
 */
export function CatalogView({ cards }: CatalogViewProps) {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Card | null>(null);

  // El indice es caro de construir y el catalogo no cambia en runtime.
  const index = useMemo(() => buildSearchIndex(cards), [cards]);
  const facets = useMemo(() => buildFacets(cards), [cards]);

  const results = useMemo(
    () => applyFilters(cards, filters, index),
    [cards, filters, index],
  );

  const totalPages = pageCount(results.length);
  // Si los filtros achican el resultado, la pagina actual puede quedar fuera
  // de rango; la acotamos al vuelo en vez de guardar estado derivado.
  const currentPage = Math.min(page, totalPages);
  const visible = paginate(results, currentPage);

  const update = (next: CatalogFilters) => {
    setFilters(next);
    setPage(1);
  };

  const goTo = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-8">
      <Filters
        filters={filters}
        facets={facets}
        onChange={update}
        onReset={() => update(EMPTY_FILTERS)}
      />

      {cards.length === 0 ? (
        <p className="text-muted border-line rounded-panel border border-dashed px-6 py-16 text-center">
          Esta edición todavía no está cargada.
        </p>
      ) : results.length === 0 ? (
        <div className="border-line rounded-panel border border-dashed px-6 py-16 text-center">
          <p className="text-ink">Ninguna carta coincide con esa búsqueda.</p>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => update(EMPTY_FILTERS)}
              className="text-accent focus-visible:outline-brand-500 mt-3 rounded text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
            >
              Limpiar los filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <CardGrid cards={visible} onSelect={setSelected} />
          <Pagination
            page={currentPage}
            total={totalPages}
            range={pageRange(currentPage, results.length)}
            results={results.length}
            onChange={goTo}
          />
        </>
      )}

      <CardModal card={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
