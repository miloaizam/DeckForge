import { readFile } from "node:fs/promises";
import path from "node:path";

import { catalogSchema, type Card } from "./types";

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
  return catalogSchema.parse(JSON.parse(raw));
}

/** Las cartas de una sola edicion, por su slug. */
export async function getCardsByEdition(slug: string): Promise<Card[]> {
  const cards = await getCards();
  return cards.filter((c) => c.edicion === slug);
}
