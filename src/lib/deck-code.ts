import lzString from "lz-string";
import { z } from "zod";

import { createDeck } from "./deck";
import { deckSchema, MAX_NOMBRE_MAZO, type Deck } from "./types";

/**
 * Codificar y decodificar un mazo para compartirlo por enlace.
 *
 * El mazo entero no viaja: se arma una tupla posicional, se pasa a JSON y se
 * comprime con lz-string. Fuera quedan el id local, las fechas y la afinidad
 * fijada — no le sirven a quien recibe el enlace y solo alargan la URL.
 *
 * El primer elemento es la version del formato. Sirve para que un decodificador
 * viejo pueda RECHAZAR un codigo nuevo con un mensaje claro, en vez de
 * malinterpretarlo y mostrar un mazo equivocado.
 */

/**
 * lz-string es CommonJS y no expone exports con nombre que Node pueda leer en
 * ESM. Se importa por defecto y se desestructura: asi funciona igual bajo el
 * bundler de Next y bajo `node --test`.
 */
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;

const WIRE_VERSION = 1;

/** Cota antes de descomprimir: una URL hostil no puede hacernos trabajar. */
const MAX_CODIGO = 4000;
const MAX_JSON = 64 * 1024;

/** Sobre el que se largo un enlace deja de ser comodo de compartir. */
export const LARGO_INCOMODO = 1800;

const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** Mismo tope que el esquema del mazo: los Oros sin habilidad no tienen limite. */
const entradasSchema = z.array(
  z.tuple([z.string().regex(SLUG), z.number().int().min(1).max(50)]),
);

/** [ version, nombre, oroInicial, principal, side ] */
const wireSchema = z.tuple([
  z.literal(WIRE_VERSION),
  z.string().max(MAX_NOMBRE_MAZO),
  z.string().regex(SLUG).nullable(),
  entradasSchema.max(60),
  entradasSchema.max(20),
]);

export function encodeDeck(deck: Deck): string {
  const wire = [
    WIRE_VERSION,
    deck.nombre,
    deck.oroInicial,
    deck.principal.map((e) => [e.id, e.n]),
    deck.side.map((e) => [e.id, e.n]),
  ];
  return compressToEncodedURIComponent(JSON.stringify(wire));
}

export type DecodeResult =
  | { ok: true; deck: Deck }
  | { ok: false; motivo: "vacio" | "largo" | "ilegible" | "version"; mensaje: string };

/**
 * Reconstruye un mazo desde un codigo. Nunca lanza.
 *
 * Solo valida la FORMA. Que las cartas existan se resuelve despues, en
 * `resolveDeck`, que reporta las desconocidas: asi un enlace viejo se sigue
 * abriendo aunque una carta haya cambiado de id.
 */
export function decodeDeck(codigo: string | null | undefined): DecodeResult {
  if (!codigo) {
    return { ok: false, motivo: "vacio", mensaje: "Ese enlace no trae ningún mazo." };
  }
  if (codigo.length > MAX_CODIGO) {
    return {
      ok: false,
      motivo: "largo",
      mensaje: "Ese enlace es demasiado largo para ser un mazo.",
    };
  }

  const ilegible: DecodeResult = {
    ok: false,
    motivo: "ilegible",
    mensaje: "No pude leer el mazo de ese enlace. Puede que esté cortado.",
  };

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(codigo);
  } catch {
    return ilegible;
  }
  if (!json || json.length > MAX_JSON) return ilegible;

  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    return ilegible;
  }

  // La version se mira antes que el resto, para poder distinguir "viene de una
  // version mas nueva" de "esto no es un mazo".
  if (Array.isArray(bruto) && bruto[0] !== WIRE_VERSION) {
    return {
      ok: false,
      motivo: "version",
      mensaje: "Ese enlace viene de otra versión de DeckForge y no lo puedo leer.",
    };
  }

  const parsed = wireSchema.safeParse(bruto);
  if (!parsed.success) return ilegible;

  const [, nombre, oroInicial, principal, side] = parsed.data;

  // Id nuevo y fechas de ahora: para quien lo recibe, es un mazo suyo.
  const base = createDeck(nombre || "Mazo compartido");
  const deck: Deck = {
    ...base,
    oroInicial,
    principal: principal.map(([id, n]) => ({ id, n })),
    side: side.map(([id, n]) => ({ id, n })),
  };

  const revalidado = deckSchema.safeParse(deck);
  return revalidado.success ? { ok: true, deck: revalidado.data } : ilegible;
}

/** El enlace completo para compartir, con la barra final que usa el sitio. */
export function shareUrl(deck: Deck, origen: string): string {
  return `${origen.replace(/\/$/, "")}/mazo/?d=${encodeDeck(deck)}`;
}

/* ------------------------------------------------------------------ *
 * Archivo de respaldo
 * ------------------------------------------------------------------ */

const FILE_VERSION = 1;

const archivoSchema = z.object({
  app: z.literal("deckforge"),
  v: z.literal(FILE_VERSION),
  mazos: z.array(z.unknown()).max(200),
});

export function exportFile(decks: Deck[]): string {
  return JSON.stringify(
    {
      app: "deckforge",
      v: FILE_VERSION,
      exportado: new Date().toISOString(),
      mazos: decks,
    },
    null,
    2,
  );
}

export interface ImportResult {
  mazos: Deck[];
  /** Cuantas entradas del archivo no se pudieron leer. */
  descartados: number;
}

/**
 * Lee un archivo de respaldo. Nunca lanza.
 *
 * Cada mazo se valida por separado y se le asigna un id nuevo, para que
 * importar dos veces el mismo archivo no pise lo que ya habia.
 */
export function importFile(texto: string): ImportResult | null {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return null;
  }

  const sobre = archivoSchema.safeParse(bruto);
  if (!sobre.success) return null;

  const mazos: Deck[] = [];
  let descartados = 0;
  for (const m of sobre.data.mazos) {
    const parsed = deckSchema.safeParse(m);
    if (!parsed.success) {
      descartados++;
      continue;
    }
    mazos.push({ ...parsed.data, id: createDeck().id });
  }

  return { mazos, descartados };
}
