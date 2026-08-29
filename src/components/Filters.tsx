"use client";

import { useId, useState } from "react";
import { Funnel, Search, X } from "lucide-react";

import { Select } from "./Select";
import type { CatalogFilters, Facets } from "@/lib/catalog";
import { countActiveFilters } from "@/lib/catalog";
import { editionTitle } from "@/lib/editions";
import { cn } from "@/lib/utils";

interface FiltersProps {
  filters: CatalogFilters;
  facets: Facets;
  onChange: (next: CatalogFilters) => void;
  onReset: () => void;
}

/**
 * Busqueda siempre a la vista y el resto de los filtros detras de un boton.
 *
 * Nueve selectores desplegados de entrada empujaban la grilla fuera de la
 * pantalla, sobre todo en el telefono; plegados, la primera cosa que se ve al
 * entrar al catalogo son las cartas.
 */
export function Filters({ filters, facets, onChange, onReset }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const set = (key: keyof CatalogFilters) => (value: string) =>
    onChange({ ...filters, [key]: value });

  const activos = countActiveFilters(filters);

  return (
    <section aria-label="Buscar y filtrar" className="flex flex-col gap-4">
      {/* En un telefono los dos botones no caben junto al buscador, asi que la
          fila envuelve: buscador arriba y botones abajo, siempre a la derecha. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 basis-full sm:basis-1/2">
          <Search
            size={17}
            aria-hidden="true"
            className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set("query")(e.target.value)}
            placeholder="Buscar por nombre o habilidad…"
            aria-label="Buscar cartas"
            className="border-line bg-panel text-ink placeholder:text-muted focus-visible:outline-brand-500 rounded-chip h-11 w-full border pr-4 pl-10 text-sm"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {(activos > 0 || filters.query !== "") && (
            <button
              type="button"
              onClick={onReset}
              className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 shrink-0 items-center gap-1.5 border px-4 text-[13px] whitespace-nowrap transition-colors"
            >
              <X size={14} aria-hidden="true" />
              Limpiar filtros
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className={cn(
              "focus-visible:outline-brand-500 rounded-chip inline-flex h-11 shrink-0 items-center gap-2 border px-4 text-sm whitespace-nowrap transition-colors",
              open || activos > 0
                ? "border-brand-600 bg-accent-soft text-ink"
                : "border-line text-muted hover:border-brand-500 hover:text-ink",
            )}
          >
            <Funnel size={15} aria-hidden="true" />
            Filtros
            {activos > 0 && (
              <span
                aria-label={`${activos} filtros aplicados`}
                className="bg-brand-600 inline-flex size-5 items-center justify-center rounded-full text-[11px] font-medium text-white tabular-nums"
              >
                {activos}
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div
          id={panelId}
          className="border-line bg-surface rounded-panel border p-4 sm:p-5"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {/* La edicion solo aparece en /catalogo: en la pagina de una
                edicion la faceta viene vacia y el Select no se dibuja. */}
            <Select
              label="Edición"
              value={filters.edicion}
              options={facets.ediciones}
              onChange={set("edicion")}
              format={editionTitle}
            />
            <Select
              label="Habilidad"
              value={filters.habilidad}
              options={facets.habilidades}
              onChange={set("habilidad")}
              placeholder="Todas"
            />
            <Select
              label="Tipo"
              value={filters.tipo}
              options={facets.tipos}
              onChange={set("tipo")}
            />
            <Select
              label="Raza"
              value={filters.raza}
              options={facets.razas}
              onChange={set("raza")}
            />
            <Select
              label="Escuela elemental"
              value={filters.escuela}
              options={facets.escuelas}
              onChange={set("escuela")}
            />
            <Select
              label="Frecuencia"
              value={filters.frecuencia}
              options={facets.frecuencias}
              onChange={set("frecuencia")}
            />
            <Select
              label="Coste"
              value={filters.coste}
              options={facets.costes}
              onChange={set("coste")}
            />
            <Select
              label="Fuerza"
              value={filters.fuerza}
              options={facets.fuerzas}
              onChange={set("fuerza")}
            />
            <Select
              label="Atributo"
              value={filters.atributo}
              options={facets.atributos}
              onChange={set("atributo")}
            />
          </div>
        </div>
      )}
    </section>
  );
}
