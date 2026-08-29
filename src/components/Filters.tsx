"use client";

import { Search, X } from "lucide-react";

import type { CatalogFilters, Facets } from "@/lib/catalog";
import { hasActiveFilters } from "@/lib/catalog";

interface FiltersProps {
  filters: CatalogFilters;
  facets: Facets;
  results: number;
  onChange: (next: CatalogFilters) => void;
  onReset: () => void;
}

const SELECT_CLASS =
  "border-line bg-panel text-ink focus-visible:outline-brand-500 h-11 min-w-0 rounded-chip border px-3 text-sm";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  // Un filtro sin opciones no aporta nada: no se muestra.
  if (options.length === 0) return null;
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted text-[11px] tracking-[0.18em] uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Filters({ filters, facets, results, onChange, onReset }: FiltersProps) {
  const set = (key: keyof CatalogFilters) => (value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <section aria-label="Buscar y filtrar" className="flex flex-col gap-5">
      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="text-muted pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set("query")(e.target.value)}
          placeholder="Buscar por nombre, código o texto de habilidad…"
          aria-label="Buscar cartas"
          className="border-line bg-panel text-ink placeholder:text-muted focus-visible:outline-brand-500 rounded-card h-12 w-full border pr-4 pl-12 text-[15px]"
        />
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
          label="Escuela"
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
          label="Atributo"
          value={filters.atributo}
          options={facets.atributos}
          onChange={set("atributo")}
        />
        <Select
          label="Coste"
          value={filters.coste}
          options={facets.costes}
          onChange={set("coste")}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted text-[13px] tabular-nums" aria-live="polite">
          {results} {results === 1 ? "carta" : "cartas"}
        </p>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onReset}
            className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-4 text-[13px] transition-colors"
          >
            <X size={14} aria-hidden="true" />
            Limpiar filtros
          </button>
        )}
      </div>
    </section>
  );
}
