import MiniSearch from "minisearch";

import type { Card } from "./types";

export const PAGE_SIZE = 30;

/** Un filtro sin valor es `""`: significa "todos". */
export interface CatalogFilters {
  query: string;
  tipo: string;
  raza: string;
  escuela: string;
  frecuencia: string;
  atributo: string;
  coste: string;
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  tipo: "",
  raza: "",
  escuela: "",
  frecuencia: "",
  atributo: "",
  coste: "",
};

export function hasActiveFilters(f: CatalogFilters): boolean {
  return Object.values(f).some((v) => v !== "");
}

/**
 * Opciones reales presentes en el catalogo cargado.
 *
 * Se derivan de las cartas y no de los enums: asi un filtro nunca ofrece un
 * valor que no devuelve resultados, y aparece solo cuando la edicion lo usa
 * (Luz/Oscuridad, por ejemplo, no existen en Bushido).
 */
export interface Facets {
  tipos: string[];
  razas: string[];
  escuelas: string[];
  frecuencias: string[];
  atributos: string[];
  costes: string[];
}

export function buildFacets(cards: Card[]): Facets {
  const collect = (pick: (c: Card) => string | null) =>
    [...new Set(cards.map(pick).filter((v): v is string => v !== null))].sort((a, b) =>
      a.localeCompare(b, "es"),
    );

  return {
    tipos: collect((c) => c.tipo),
    razas: collect((c) => c.raza),
    escuelas: collect((c) => c.escuela),
    frecuencias: collect((c) => c.frecuencia),
    atributos: collect((c) => c.atributo),
    costes: [
      ...new Set(
        cards
          .map((c) => c.coste)
          .filter((v): v is number => v !== null)
          .map(String),
      ),
    ].sort((a, b) => Number(a) - Number(b)),
  };
}

/**
 * Indice de busqueda por nombre y habilidad.
 *
 * `prefix` deja que "kyu" encuentre "Kyubi"; `fuzzy` tolera una letra mal
 * escrita, que con nombres japoneses transliterados pasa seguido.
 */
export function buildSearchIndex(cards: Card[]): MiniSearch<Card> {
  const index = new MiniSearch<Card>({
    idField: "id",
    fields: ["nombre", "habilidad", "raza", "codigo"],
    storeFields: ["id"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { nombre: 3, codigo: 2 },
    },
  });
  index.addAll(cards);
  return index;
}

export function applyFilters(
  cards: Card[],
  filters: CatalogFilters,
  index: MiniSearch<Card>,
): Card[] {
  let result = cards;

  const query = filters.query.trim();
  if (query) {
    const ranked = index.search(query);
    const order = new Map(ranked.map((r, i) => [r.id as string, i]));
    result = result
      .filter((c) => order.has(c.id))
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }

  const matches = (value: string | number | null, wanted: string) =>
    wanted === "" || String(value) === wanted;

  return result.filter(
    (c) =>
      matches(c.tipo, filters.tipo) &&
      matches(c.raza, filters.raza) &&
      matches(c.escuela, filters.escuela) &&
      matches(c.frecuencia, filters.frecuencia) &&
      matches(c.atributo, filters.atributo) &&
      matches(c.coste, filters.coste),
  );
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}
