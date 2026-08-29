import { z } from "zod";

/**
 * Modelo de dominio de DeckForge.
 *
 * Espejo exacto de `scripts/schema.py` (Pydantic). Si cambias un valor aqui,
 * cambialo alli tambien: Python valida al generar `public/data/cards.json` y
 * este esquema valida al consumirlo en el navegador.
 *
 * Regla de seguridad: nada que venga de fuera del bundle (JSON, localStorage,
 * query string) se usa sin pasar antes por un esquema de este archivo.
 */

export const TIPOS = ["Aliado", "Talismán", "Arma", "Tótem", "Oro", "Monumento"] as const;

export const ESCUELAS = [
  "Gremio de Paladines", // Caballero + Sacerdote
  "Clan Desafiante", // Dragón + Guerrero
  "Culto Tenebris", // Sombra + Oni
  "Vigilantes Etéreos", // Eterno + Faerie
] as const;

/** Orden de menor a mayor rareza. Espejo de la tabla `rarities` de api.myl.cl. */
export const FRECUENCIAS = [
  "Vasallo",
  "Cortesano",
  "Real",
  "Mega Real",
  "Ultra Real",
  "Milenaria",
  "Legendaria",
  "Secreta",
  "Oro",
  "Promocional",
  "Ficha",
  "Set Paralelo",
] as const;

/**
 * Luz y Oscuridad llegan como keywords (flags 16 y 32), no como campo propio.
 * En el formato aparecen en Steampunk, Hijos del Sol y Legado Gotico.
 */
export const ATRIBUTOS = ["Luz", "Oscuridad"] as const;

/**
 * Keywords que el juego imprime como declaracion en la carta ("Única.",
 * "Furia."). Se resaltan en el texto de habilidad.
 *
 * Excluye a proposito "Destruir" y "que controles": son etiquetas internas de
 * busqueda de la API, no keywords impresas, y resaltarlas ensuciaria la prosa.
 */
export const KEYWORDS_IMPRESAS = [
  "Única",
  "Imbloqueable",
  "Indesterrable",
  "Indestructible",
  "Luz",
  "Oscuridad",
  "Furia",
  "Inmunidad",
  "Alimentar",
  "Purificar",
  "Retador",
  "Ilusión",
  "Espectral",
  "Honor",
  "Errante",
  "Exhumar",
  "Mercenario",
] as const;

export const LEGALIDADES = ["libre", "restringida", "prohibida"] as const;

export const cardSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  edicion: z.string().min(1),
  tipo: z.enum(TIPOS),
  raza: z.string().nullable().default(null),
  escuela: z.enum(ESCUELAS).nullable().default(null),
  atributo: z.enum(ATRIBUTOS).nullable().default(null),
  coste: z.number().int().nonnegative().nullable().default(null),
  fuerza: z.number().int().nullable().default(null),
  frecuencia: z.enum(FRECUENCIAS),
  habilidad: z.string().default(""),
  ilustrador: z.string().nullable().default(null),
  imagen: z.string().min(1),
  thumb: z.string().min(1),
  legalidad: z.enum(LEGALIDADES).default("libre"),
  keywords: z.array(z.string()).default([]),
});

export const catalogSchema = z.array(cardSchema);

export type Tipo = (typeof TIPOS)[number];
export type Escuela = (typeof ESCUELAS)[number];
export type Frecuencia = (typeof FRECUENCIAS)[number];
export type Atributo = (typeof ATRIBUTOS)[number];
export type Legalidad = (typeof LEGALIDADES)[number];
export type Card = z.infer<typeof cardSchema>;
