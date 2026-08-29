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

/**
 * Las dos razas de cada escuela elemental.
 *
 * Espejo de ESCUELA_POR_RAZA en scripts/fetch_edition.py. Un mazo del formato
 * es o mono-raza o de una escuela (sus dos razas exactas): no se pueden mezclar
 * razas de escuelas distintas.
 */
export const RAZAS_POR_ESCUELA: Record<Escuela, readonly [Raza, Raza]> = {
  "Gremio de Paladines": ["Caballero", "Sacerdote"],
  "Clan Desafiante": ["Dragón", "Guerrero"],
  "Culto Tenebris": ["Sombra", "Oni"],
  "Vigilantes Etéreos": ["Eterno", "Faerie"],
};

/**
 * La escuela de cada raza, o nada si no tiene.
 *
 * Cinco razas (Bárbaro, Samurái, Héroe, Bestia y Ancestral) no pertenecen a
 * ninguna escuela: solo pueden armar mazos mono-raza. Por eso es `Partial`.
 */
export const ESCUELA_POR_RAZA: Partial<Record<Raza, Escuela>> = Object.fromEntries(
  Object.entries(RAZAS_POR_ESCUELA).flatMap(([escuela, razas]) =>
    razas.map((raza) => [raza, escuela]),
  ),
);

/* ------------------------------------------------------------------ *
 * Mazos
 *
 * Un mazo no viene de la API: lo arma el usuario y vive en su navegador
 * (localStorage) o viaja en un enlace. O sea que es entrada externa y no se
 * usa sin validar, igual que el catalogo.
 * ------------------------------------------------------------------ */

export const DECK_VERSION = 1;

/** Tope del nombre que el usuario le pone al mazo. */
export const MAX_NOMBRE_MAZO = 60;

/**
 * Cotas de forma, deliberadamente mas anchas que las reglas del formato.
 *
 * El esquema describe lo que se puede REPRESENTAR, no lo que es legal. Si
 * recortara a 3 copias, un mazo importado con 4 se volveria legal en silencio
 * al leerlo; asi en cambio entra, y el validador lo reporta.
 */
const MAX_ENTRADAS = 60;
const MAX_ENTRADAS_SIDE = 20;
const MAX_COPIAS_REPRESENTABLES = 10;

/** Id local de un mazo. Nunca sale del navegador ni viaja en el enlace. */
const DECK_ID = /^[a-z0-9]{10}$/;

export const deckEntrySchema = z.object({
  /** Id de IMPRESION: el usuario eligio ese arte y hay que respetarselo. */
  id: z.string().regex(SLUG),
  n: z.number().int().min(1).max(MAX_COPIAS_REPRESENTABLES),
});

/** Raza sola o escuela: las dos formas que puede tomar un mazo del formato. */
export const deckAffinitySchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("raza"), valor: z.enum(RAZAS) }),
  z.object({ modo: z.literal("escuela"), valor: z.enum(ESCUELAS) }),
]);

export const deckSchema = z.object({
  v: z.literal(DECK_VERSION),
  id: z.string().regex(DECK_ID),
  nombre: z.string().min(1).max(MAX_NOMBRE_MAZO),
  /**
   * Que carta del mazo hace de oro inicial. Es un PUNTERO a una entrada de
   * `principal`, no una zona aparte: el oro inicial cuenta dentro de las 50,
   * y darle un hueco propio garantizaba un error de conteo de uno.
   */
  oroInicial: z.string().regex(SLUG).nullable().default(null),
  principal: z.array(deckEntrySchema).max(MAX_ENTRADAS),
  side: z.array(deckEntrySchema).max(MAX_ENTRADAS_SIDE),
  /**
   * Preferencia de la interfaz, no fuente de verdad. Sirve para filtrar el
   * catalogo del constructor. La legalidad del mazo SIEMPRE se decide por las
   * cartas que lleva, nunca por este campo.
   */
  afinidadFijada: deckAffinitySchema.nullable().default(null),
  creado: z.number().int().nonnegative(),
  actualizado: z.number().int().nonnegative(),
});

export type DeckEntry = z.infer<typeof deckEntrySchema>;
export type DeckAffinity = z.infer<typeof deckAffinitySchema>;
export type Deck = z.infer<typeof deckSchema>;

export type Tipo = (typeof TIPOS)[number];
export type Raza = (typeof RAZAS)[number];
export type Escuela = (typeof ESCUELAS)[number];
export type Frecuencia = (typeof FRECUENCIAS)[number];
export type Atributo = (typeof ATRIBUTOS)[number];
export type Legalidad = (typeof LEGALIDADES)[number];
export type Card = z.infer<typeof cardSchema>;
