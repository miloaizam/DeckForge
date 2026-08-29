"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  total: number;
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

export function Pagination({ page, total, onChange }: PaginationProps) {
  if (total <= 1) return null;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
        className={cn(
          BUTTON,
          "border-line text-muted hover:text-ink hover:border-brand-500 disabled:pointer-events-none disabled:opacity-40",
        )}
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
                : "border-line text-muted hover:text-ink hover:border-brand-500",
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
        className={cn(
          BUTTON,
          "border-line text-muted hover:text-ink hover:border-brand-500 disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
