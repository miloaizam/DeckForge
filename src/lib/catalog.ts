import MiniSearch from "minisearch";

import { EDITIONS } from "./editions";
import {
  ESCUELAS,
  FRECUENCIAS,
  KEYWORDS_IMPRESAS,
  RAZAS,
  TIPOS,
  type Card,
} from "./types";

/**
 * Cuantas cartas por pagina.
 *
 * El catalogo llena siete columnas y el constructor seis, que ademas cede
 * ancho al panel del mazo: cada uno cierra sus filas con un numero distinto.
 */
export const PAGE_SIZE = 35;
export const PAGE_SIZE_BUILDER = 30;

/** Un filtro sin valor es `""`: significa "todos". */
export interface CatalogFilters {
  query: string;
  edicion: string;
  habilidad: string;
  tipo: string;
  raza: string;
  escuela: string;
  frecuencia: string;
  atributo: string;
  coste: string;
  fuerza: string;
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  edicion: "",
  habilidad: "",
  tipo: "",
  raza: "",
  escuela: "",
  frecuencia: "",
  atributo: "",
  coste: "",
  fuerza: "",
};

export function hasActiveFilters(f: CatalogFilters): boolean {
  return Object.values(f).some((v) => v !== "");
}

/**
 * Cuantos filtros hay puestos, sin contar la busqueda: es el numero que lleva
 * el boton de filtros, y la busqueda tiene su propio campo a la vista.
 */
export function countActiveFilters(f: CatalogFilters): number {
  const claves = Object.keys(f) as (keyof CatalogFilters)[];
  return claves.filter((k) => k !== "query" && f[k] !== "").length;
}

/**
 * Opciones de cada filtro.
 *
 * Tipo, raza, escuela y frecuencia usan las listas canonicas del formato: la
 * oferta es la misma en toda edicion, asi el filtro no cambia de forma segun
 * lo que este cargado. Coste, fuerza y atributo si se derivan de las cartas,
 * porque son rangos abiertos.
 *
 * `ediciones` queda vacia cuando todas las cartas son de la misma edicion: en
 * /catalogo/<edicion> el filtro no tendria nada que elegir, y un Select sin
 * opciones no se dibuja.
 */
export interface Facets {
  ediciones: string[];
  habilidades: string[];
  tipos: string[];
  razas: string[];
  escuelas: string[];
  frecuencias: string[];
  atributos: string[];
  costes: string[];
  fuerzas: string[];
}

export function buildFacets(cards: Card[]): Facets {
  const numeric = (pick: (c: Card) => number | null) =>
    [
      ...new Set(
        cards
          .map(pick)
          .filter((v): v is number => v !== null)
          .map(String),
      ),
    ].sort((a, b) => Number(a) - Number(b));

  // El orden de EDITIONS es el de salida del juego, no el alfabetico.
  const presentes = new Set(cards.map((c) => c.edicion));
  const ediciones = EDITIONS.filter((e) => presentes.has(e.slug)).map((e) => e.slug);

  // Las keywords que trae cada carta incluyen etiquetas internas de busqueda
  // de la API ("Destruir", "que controles"): al filtro solo suben las que el
  // juego imprime de verdad.
  const declaradas = new Set(cards.flatMap((c) => c.keywords));

  return {
    ediciones: ediciones.length > 1 ? ediciones : [],
    habilidades: KEYWORDS_IMPRESAS.filter((k) => declaradas.has(k)),
    tipos: [...TIPOS],
    razas: [...RAZAS],
    escuelas: [...ESCUELAS],
    frecuencias: [...FRECUENCIAS],
    atributos: [
      ...new Set(
        cards
          .map((c) => c.atributo)
          .filter((v) => v !== null)
          .map(String),
      ),
    ].sort((a, b) => a.localeCompare(b, "es")),
    costes: numeric((c) => c.coste),
    fuerzas: numeric((c) => c.fuerza),
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
      matches(c.edicion, filters.edicion) &&
      (filters.habilidad === "" || c.keywords.includes(filters.habilidad)) &&
      matches(c.tipo, filters.tipo) &&
      matches(c.raza, filters.raza) &&
      matches(c.escuela, filters.escuela) &&
      matches(c.frecuencia, filters.frecuencia) &&
      matches(c.atributo, filters.atributo) &&
      matches(c.coste, filters.coste) &&
      matches(c.fuerza, filters.fuerza),
  );
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Rango 1-indexado que se esta mostrando, para el pie de la paginacion. */
export function pageRange(
  page: number,
  total: number,
  size = PAGE_SIZE,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * size + 1, to: Math.min(page * size, total) };
}
