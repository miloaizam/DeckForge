import { deckSchema, type Deck } from "./types";

/**
 * Los mazos del usuario, guardados en su navegador.
 *
 * No lleva `"use client"` a proposito: asi un Server Component puede importar
 * la clave sin que Next le entregue una referencia de cliente en vez del valor
 * (es la trampa documentada en `src/lib/theme.ts`). Las funciones que tocan
 * `localStorage` se defienden solas de correr en el servidor.
 */

export const DECKS_KEY = "deckforge-decks";

/** Tope de mazos guardados. Es un limite de cordura, no del formato. */
export const MAX_MAZOS = 50;

/** Cota antes de parsear: localStorage puede traer cualquier cosa. */
const MAX_CHARS = 512 * 1024;

const disponible = () => typeof window !== "undefined";

/**
 * Convierte lo que haya en localStorage en mazos, descartando lo que no cuadre.
 *
 * `localStorage` lo puede editar el usuario o cualquier extension, asi que se
 * valida con `safeParse` y **cada mazo por separado**: uno corrupto no puede
 * llevarse por delante a los otros diecinueve. Cualquier fallo devuelve lo que
 * se haya podido rescatar, nunca una excepcion.
 */
export function parseDecks(raw: string | null): Deck[] {
  if (!raw || raw.length > MAX_CHARS) return [];

  let bruto: unknown;
  try {
    bruto = JSON.parse(raw);
  } catch {
    return [];
  }

  // El sobre se parsea flojo para poder rescatar los mazos uno a uno.
  const lista = Array.isArray(bruto)
    ? bruto
    : typeof bruto === "object" && bruto !== null && "mazos" in bruto
      ? bruto.mazos
      : null;
  if (!Array.isArray(lista)) return [];

  return lista
    .map((m) => deckSchema.safeParse(m))
    .filter((r) => r.success)
    .map((r) => r.data)
    .slice(0, MAX_MAZOS);
}

export function readDecks(): Deck[] {
  if (!disponible()) return [];
  try {
    return parseDecks(localStorage.getItem(DECKS_KEY));
  } catch {
    return []; // ventana privada, cookies bloqueadas
  }
}

export function readDeck(id: string): Deck | null {
  return readDecks().find((d) => d.id === id) ?? null;
}

/* ------------------------------------------------------------------ *
 * Los mazos como sistema externo
 *
 * localStorage no existe en tiempo de build, asi que la lista no se puede
 * calcular al renderizar. Se expone como un store para que React la lea con
 * `useSyncExternalStore`, que es el primitivo hecho para esto: nada de leerla
 * en un efecto y llamar a setState, que dispara renders en cascada.
 *
 * De paso se gana sincronizacion entre pestanas: si guardas un mazo en una, la
 * lista de la otra se entera.
 * ------------------------------------------------------------------ */

/**
 * `useSyncExternalStore` compara la instantanea por identidad, asi que tiene
 * que ser la MISMA referencia mientras nada cambie o React entra en bucle.
 */
let cache: Deck[] | null = null;
const oyentes = new Set<() => void>();

/** Instantanea del servidor y del primer render: siempre el mismo array. */
const VACIO: Deck[] = [];

function avisar(): void {
  cache = null;
  for (const cb of oyentes) cb();
}

function alCambiarStorage(e: StorageEvent): void {
  if (e.key === DECKS_KEY || e.key === null) avisar();
}

export function subscribeDecks(cb: () => void): () => void {
  if (oyentes.size === 0 && disponible()) {
    window.addEventListener("storage", alCambiarStorage);
  }
  oyentes.add(cb);

  return () => {
    oyentes.delete(cb);
    if (oyentes.size === 0 && disponible()) {
      window.removeEventListener("storage", alCambiarStorage);
    }
  };
}

export function getDecksSnapshot(): Deck[] {
  if (cache === null) cache = readDecks();
  return cache;
}

export function getServerDecksSnapshot(): Deck[] {
  return VACIO;
}

/**
 * Guarda la lista completa. Devuelve si pudo.
 *
 * Puede fallar por cuota llena, y que el mazo no persista es molesto pero que
 * reviente la pagina es peor: quien llame decide como avisarlo.
 */
export function saveDecks(decks: Deck[]): boolean {
  if (!disponible()) return false;
  try {
    const sobre = { v: 1, mazos: decks.slice(0, MAX_MAZOS) };
    localStorage.setItem(DECKS_KEY, JSON.stringify(sobre));
    avisar();
    return true;
  } catch {
    return false;
  }
}

/** Inserta o reemplaza un mazo, dejando el mas reciente primero. */
export function saveDeck(deck: Deck): boolean {
  const resto = readDecks().filter((d) => d.id !== deck.id);
  return saveDecks([deck, ...resto]);
}

export function deleteDeck(id: string): boolean {
  return saveDecks(readDecks().filter((d) => d.id !== id));
}
