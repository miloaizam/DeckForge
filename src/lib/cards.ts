import { readFile } from "node:fs/promises";
import path from "node:path";

import { EDITIONS } from "./editions";
import { catalogSchema, FRECUENCIAS, type Card } from "./types";

const RANGO_FRECUENCIA = new Map(FRECUENCIAS.map((f, i) => [f, i]));
const RANGO_EDICION = new Map(EDITIONS.map((e, i) => [e.slug, i]));

/**
 * El oro inicial de una edicion: la carta a arte completo, sin habilidad, con
 * que empieza la partida. Va nombrada "Oro Inicial <edicion>" en `data-src/`
 * (ver la seccion de datos de CLAUDE.md), que es lo que la reconoce aqui.
 *
 * La API le pone el numero mas alto de la edicion, asi que por codigo caeria
 * al final de los Oros; en la practica es el primero que se busca.
 */
function esOroInicial(card: Card): boolean {
  return card.tipo === "Oro" && card.nombre.startsWith("Oro Inicial");
}

/**
 * Orden de presentacion del catalogo: por frecuencia, de la mas rara a la mas
 * comun (el orden de FRECUENCIAS), y los Oros al final.
 *
 * Los JSON de `data-src/` vienen en el orden en que los entrega la API, que
 * agrupa por frecuencia dentro de cada edicion pero no entre ediciones: sin
 * este orden, /catalogo mezclaba las promocionales de Bushido con las comunes
 * de Dominio. Dentro de una misma frecuencia mandan la salida de la edicion
 * (el orden de EDITIONS), luego el oro inicial si lo hay, y luego el numero de
 * la carta.
 */
function porFrecuencia(a: Card, b: Card): number {
  const frecuencia =
    RANGO_FRECUENCIA.get(a.frecuencia)! - RANGO_FRECUENCIA.get(b.frecuencia)!;
  if (frecuencia !== 0) return frecuencia;

  // Una edicion que no este en EDITIONS va al final en vez de reventar.
  const edicion =
    (RANGO_EDICION.get(a.edicion) ?? EDITIONS.length) -
    (RANGO_EDICION.get(b.edicion) ?? EDITIONS.length);
  if (edicion !== 0) return edicion;

  const inicial = Number(esOroInicial(b)) - Number(esOroInicial(a));
  if (inicial !== 0) return inicial;

  return a.codigo.localeCompare(b.codigo, "es", { numeric: true });
}

/**
 * Lee el catalogo generado por `scripts/build_cards.py`.
 *
 * Corre solo en tiempo de build (Server Component + `output: "export"`), asi
 * que el JSON nunca viaja entero al navegador salvo que lo pidamos. Se valida
 * con Zod aunque sea un archivo propio: si el generador cambia de forma,
 * preferimos fallar en el build y no en la cara del usuario.
 */
export async function getCards(): Promise<Card[]> {
  const file = path.join(process.cwd(), "public", "data", "cards.json");
  const raw = await readFile(file, "utf-8");
  return catalogSchema.parse(JSON.parse(raw)).sort(porFrecuencia);
}

/** Las cartas de una sola edicion, por su slug. */
export async function getCardsByEdition(slug: string): Promise<Card[]> {
  const cards = await getCards();
  return cards.filter((c) => c.edicion === slug);
}
