"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  total: number;
  /** Rango de cartas visible y total de resultados, para el contador. */
  range: { from: number; to: number };
  results: number;
  onChange: (page: number) => void;
}

/**
 * Ventana de paginas alrededor de la actual, con la primera y la ultima
 * siempre visibles. `null` marca donde va una elipsis.
 */
function pageWindow(page: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, page]);
  if (page > 1) pages.add(page - 1);
  if (page < total) pages.add(page + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

const BUTTON =
  "inline-flex h-11 min-w-11 items-center justify-center rounded-chip border px-3 text-sm transition-colors focus-visible:outline-brand-500";
const NEUTRAL =
  "border-line text-muted hover:text-ink hover:border-brand-500 disabled:pointer-events-none disabled:opacity-40";

/** Campo para saltar a una pagina concreta. */
function PageJump({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  // Input no controlado con `key={page}`: cuando la pagina cambia por otra via
  // (flechas, filtros) el campo se remonta con el valor nuevo. Sincronizarlo
  // con un efecto dispararia un render en cascada.
  const commit = (input: HTMLInputElement) => {
    const n = Number(input.value);
    if (Number.isInteger(n) && n >= 1 && n <= total && n !== page) {
      onChange(n);
      return;
    }
    input.value = String(page); // fuera de rango: se descarta en silencio
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("pagina") as HTMLInputElement;
        commit(input);
        input.blur();
      }}
      className="text-muted flex items-center gap-2 text-[13px]"
    >
      <label htmlFor="ir-a-pagina">Ir a</label>
      <input
        key={page}
        id="ir-a-pagina"
        name="pagina"
        type="text"
        inputMode="numeric"
        defaultValue={page}
        onChange={(e) => {
          e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, "");
        }}
        onBlur={(e) => commit(e.currentTarget)}
        aria-label={`Ir a una página, entre 1 y ${total}`}
        className="border-line bg-panel text-ink focus-visible:outline-brand-500 rounded-chip h-11 w-16 border px-2 text-center text-sm tabular-nums"
      />
      <span className="tabular-nums">de {total}</span>
    </form>
  );
}

export function Pagination({ page, total, range, results, onChange }: PaginationProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      {total > 1 && (
        <nav
          aria-label="Paginación"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            aria-label="Página anterior"
            className={cn(BUTTON, NEUTRAL)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>

          {pageWindow(page, total).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="text-muted px-1" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                aria-label={`Página ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  BUTTON,
                  "tabular-nums",
                  p === page
                    ? "border-brand-600 bg-brand-600 font-medium text-white"
                    : NEUTRAL,
                )}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page === total}
            aria-label="Página siguiente"
            className={cn(BUTTON, NEUTRAL)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <p className="text-muted text-[13px] tabular-nums" aria-live="polite">
          Mostrando {range.from}–{range.to} de {results} cartas
        </p>
        {total > 1 && <PageJump page={page} total={total} onChange={onChange} />}
      </div>
    </div>
  );
}
