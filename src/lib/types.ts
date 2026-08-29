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

/**
 * El formato Escuelas Elementales no incluye Monumentos: verificado contra las
 * 10 ediciones de la API (0 cartas de ese tipo). Si alguna vez aparece una, el
 * validador la rechazara y sabremos que hay que revisar el formato.
 */
export const TIPOS = ["Aliado", "Talismán", "Arma", "Tótem", "Oro"] as const;

/**
 * Las 13 razas del formato. Verificado contra las 10 ediciones de la API: no
 * aparece ninguna otra. El orden es el de la lista, no alfabetico.
 */
export const RAZAS = [
  "Eterno",
  "Faerie",
  "Bárbaro",
  "Samurái",
  "Sacerdote",
  "Caballero",
  "Héroe",
  "Dragón",
  "Guerrero",
  "Bestia",
  "Ancestral",
  "Oni",
  "Sombra",
] as const;

export const ESCUELAS = [
  "Gremio de Paladines", // Caballero + Sacerdote
  "Clan Desafiante", // Dragón + Guerrero
  "Culto Tenebris", // Sombra + Oni
  "Vigilantes Etéreos", // Eterno + Faerie
] as const;

/**
 * Las 9 frecuencias del formato, de la mas rara a la mas comun.
 *
 * La API declara ademas Secreta, Ficha y Set Paralelo, pero no las usa ninguna
 * carta de las 10 ediciones, asi que quedan fuera.
 */
export const FRECUENCIAS = [
  "Promocional",
  "Milenaria",
  "Legendaria",
  "Ultra Real",
  "Mega Real",
  "Real",
  "Vasallo",
  "Cortesano",
  "Oro",
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

/** Slug seguro: minusculas, digitos y separadores. Sin puntos ni barras. */
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/**
 * `identidad` agrupa las impresiones de una misma carta.
 *
 * Los limites de copias del formato se cuentan por CARTA, no por impresion:
 * dos Kirin normales mas dos Kirin Milenaria son cuatro Kirin, y las variantes
 * de diseno de Wotan son un solo Wotan. El `id` no sirve de clave porque lleva
 * la edicion y el numero. La calcula `scripts/schema.py` a partir del nombre
 * normalizado, y se puede fijar a mano en `data-src` cuando dos impresiones se
 * llaman distinto.
 */

/**
 * Las rutas de imagen deben apuntar a nuestro propio directorio de cartas.
 *
 * Es la defensa contra un `cards.json` manipulado: sin esto, un valor como
 * "https://evil.example/x.png" o "../../etc/passwd" pasaria al `src` de la
 * etiqueta <img>. La CSP `img-src 'self'` lo bloquearia en el navegador, pero
 * preferimos que el build falle antes de publicar nada.
 */
const CARD_IMAGE = /^\/cards\/(?:thumb\/)?[a-z0-9-]+\.webp$/;

export const cardSchema = z.object({
  id: z.string().regex(SLUG, "el id debe ser un slug seguro"),
  codigo: z.string().min(1).max(40),
  nombre: z.string().min(1).max(120),
  identidad: z.string().regex(SLUG, "la identidad debe ser un slug seguro"),
  edicion: z.string().regex(SLUG, "la edicion debe ser un slug seguro"),
  tipo: z.enum(TIPOS),
  raza: z.enum(RAZAS).nullable().default(null),
  escuela: z.enum(ESCUELAS).nullable().default(null),
  atributo: z.enum(ATRIBUTOS).nullable().default(null),
  coste: z.number().int().nonnegative().nullable().default(null),
  fuerza: z.number().int().nullable().default(null),
  frecuencia: z.enum(FRECUENCIAS),
  habilidad: z.string().default(""),
  ilustrador: z.string().max(120).nullable().default(null),
  imagen: z.string().regex(CARD_IMAGE, "la imagen debe vivir en /cards/"),
  thumb: z.string().regex(CARD_IMAGE, "el thumb debe vivir en /cards/thumb/"),
  legalidad: z.enum(LEGALIDADES).default("libre"),
  keywords: z.array(z.string()).default([]),
});

export const catalogSchema = z.array(cardSchema);

export type Tipo = (typeof TIPOS)[number];
export type Raza = (typeof RAZAS)[number];
export type Escuela = (typeof ESCUELAS)[number];
export type Frecuencia = (typeof FRECUENCIAS)[number];
export type Atributo = (typeof ATRIBUTOS)[number];
export type Legalidad = (typeof LEGALIDADES)[number];
export type Card = z.infer<typeof cardSchema>;
