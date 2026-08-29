"use client";

import { Search, X } from "lucide-react";

import { Select } from "./Select";
import type { CatalogFilters, Facets } from "@/lib/catalog";
import { hasActiveFilters } from "@/lib/catalog";

interface FiltersProps {
  filters: CatalogFilters;
  facets: Facets;
  onChange: (next: CatalogFilters) => void;
  onReset: () => void;
}

export function Filters({ filters, facets, onChange, onReset }: FiltersProps) {
  const set = (key: keyof CatalogFilters) => (value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <section aria-label="Buscar y filtrar" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            aria-hidden="true"
            className="text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set("query")(e.target.value)}
            placeholder="Buscar por nombre o texto de habilidad…"
            aria-label="Buscar cartas"
            className="border-line bg-panel text-ink placeholder:text-muted focus-visible:outline-brand-500 rounded-chip h-11 w-full border pr-4 pl-10 text-sm"
          />
        </div>

        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onReset}
            className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 shrink-0 items-center gap-1.5 border px-4 text-[13px] whitespace-nowrap transition-colors"
          >
            <X size={14} aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
    </section>
  );
}
