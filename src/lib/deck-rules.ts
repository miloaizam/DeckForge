import { copiesOf, totalCards, type DeckZone } from "./deck";
import {
  ESCUELA_POR_RAZA,
  RAZAS_POR_ESCUELA,
  type Card,
  type Deck,
  type Escuela,
  type Legalidad,
  type Raza,
  type Tipo,
} from "./types";

/**
 * Las reglas del formato Escuelas Elementales.
 *
 * Funciones puras, sin React y sin I/O, al estilo de `catalog.ts`. Es el modulo
 * de mas consecuencia del repo: si se equivoca, declara legal un mazo que no lo
 * es. Por eso tiene tests en `deck-rules.test.ts`.
 */

export const DECK_TOTAL = 50;
export const SIDE_TOTAL = 10;
export const MIN_ALIADOS_O_TOTEMS = 15;
export const MAX_COPIAS = 3;
export const MAX_COPIAS_UNICA = 1;

/**
 * Los tipos que pueden cumplir el minimo obligatorio, cada uno POR SU CUENTA.
 *
 * El formato pide 15 Aliados o 15 Totems, no 15 entre los dos: un mazo con 14
 * Aliados y 14 Totems no cumple. Por eso el contador es el mayor de los dos y
 * no su suma.
 */
const TIPOS_DEL_MINIMO: readonly Tipo[] = ["Aliado", "Tótem"];

/**
 * Lo minimo que las reglas necesitan saber de una carta.
 *
 * No se tipa contra `Card` a proposito: asi la vista de un mazo compartido
 * puede recibir una proyeccion flaca del catalogo sin tocar este modulo.
 */
export interface RuleCard {
  id: string;
  identidad: string;
  nombre: string;
  tipo: Tipo;
  raza: Raza | null;
  coste: number | null;
  thumb: string;
  legalidad: Legalidad;
  /** Lleva la keyword Unica: 1 copia por mazo. Tambien la traen 4 Oros. */
  unica: boolean;
  /**
   * Es un Oro sin habilidad. De ese hecho salen dos reglas: puede ocupar el
   * hueco de oro inicial, y no tiene tope de copias.
   */
  oroSinHabilidad: boolean;
}

export function toRuleCard(c: Card): RuleCard {
  return {
    id: c.id,
    identidad: c.identidad,
    nombre: c.nombre,
    tipo: c.tipo,
    raza: c.raza,
    coste: c.coste,
    thumb: c.thumb,
    legalidad: c.legalidad,
    unica: c.keywords.includes("Única"),
    oroSinHabilidad: c.tipo === "Oro" && c.habilidad.trim() === "",
  };
}

export interface CardIndex {
  porId: Map<string, RuleCard>;
}

/** Caro de construir y el catalogo no cambia en runtime: memorizar con useMemo. */
export function buildCardIndex(cards: Card[]): CardIndex {
  return { porId: new Map(cards.map((c) => [c.id, toRuleCard(c)])) };
}

/* ------------------------------------------------------------------ *
 * Afinidad de raza
 * ------------------------------------------------------------------ */

export type Afinidad =
  | { modo: "vacio" }
  | { modo: "mono"; raza: Raza; escuela: Escuela | null }
  | { modo: "escuela"; escuela: Escuela; razas: readonly [Raza, Raza] }
  | { modo: "invalida"; razas: Raza[] };

/**
 * Deduce la afinidad de un conjunto de razas.
 *
 * Un mazo es o mono-raza o de una escuela (sus dos razas exactas). Con una sola
 * raza el mazo es mono-raza y ademas puede crecer hacia su escuela, si la
 * tiene: por eso `mono` la lleva de la mano.
 */
export function deckAffinity(razas: Set<Raza>): Afinidad {
  const lista = [...razas];

  if (lista.length === 0) return { modo: "vacio" };

  if (lista.length === 1) {
    const raza = lista[0];
    return { modo: "mono", raza, escuela: ESCUELA_POR_RAZA[raza] ?? null };
  }

  if (lista.length === 2) {
    const escuela = ESCUELA_POR_RAZA[lista[0]];
    if (escuela && ESCUELA_POR_RAZA[lista[1]] === escuela) {
      return { modo: "escuela", escuela, razas: RAZAS_POR_ESCUELA[escuela] };
    }
  }

  return { modo: "invalida", razas: lista };
}

/** Las razas que un mazo con esta afinidad admite. Vacio = todavia cualquiera. */
export function razasPermitidas(afinidad: Afinidad): Set<Raza> {
  switch (afinidad.modo) {
    case "vacio":
    case "invalida":
      return new Set();
    case "mono":
      return new Set(
        afinidad.escuela ? RAZAS_POR_ESCUELA[afinidad.escuela] : [afinidad.raza],
      );
    case "escuela":
      return new Set(afinidad.razas);
  }
}

/* ------------------------------------------------------------------ *
 * Resolucion del mazo contra el catalogo
 * ------------------------------------------------------------------ */

export interface ResolvedEntry {
  card: RuleCard;
  n: number;
}

export interface ResolvedDeck {
  principal: ResolvedEntry[];
  side: ResolvedEntry[];
  /** Ids que el catalogo ya no conoce. Nunca revientan: se reportan. */
  desconocidos: string[];
}

export function resolveDeck(deck: Deck, index: CardIndex): ResolvedDeck {
  const desconocidos: string[] = [];

  const resolver = (zona: DeckZone): ResolvedEntry[] =>
    deck[zona].flatMap((e) => {
      const card = index.porId.get(e.id);
      if (!card) {
        desconocidos.push(e.id);
        return [];
      }
      return [{ card, n: e.n }];
    });

  return {
    principal: resolver("principal"),
    side: resolver("side"),
    desconocidos,
  };
}

/* ------------------------------------------------------------------ *
 * Conteos
 * ------------------------------------------------------------------ */

/**
 * Copias de cada CARTA, sumando principal y side.
 *
 * La clave es `identidad`, no el id de la impresion: dos Kirin normales mas dos
 * Kirin Milenaria son cuatro Kirin y el formato no lo permite.
 */
export function copiasPorIdentidad(res: ResolvedDeck): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const { card, n } of [...res.principal, ...res.side]) {
    cuenta.set(card.identidad, (cuenta.get(card.identidad) ?? 0) + n);
  }
  return cuenta;
}

/**
 * Cuantas copias de una carta admite el mazo.
 *
 * Los Oros sin habilidad no tienen tope: son el recurso con el que se paga
 * todo y el mazo lleva las que necesite. Los cuatro Oros que SI traen
 * habilidad son todos Únicos, asi que siguen limitados a una copia.
 */
export function limiteDeCopias(card: RuleCard): number {
  if (card.unica) return MAX_COPIAS_UNICA;
  if (card.oroSinHabilidad) return Infinity;
  return MAX_COPIAS;
}

export interface DeckStats {
  totalPrincipal: number;
  totalSide: number;
  /** El mayor entre Aliados y Totems: es el que tiene que llegar al minimo. */
  aliadosOTotems: number;
  porTipo: Record<Tipo, number>;
  /** Cartas por coste, para la curva. La clave es el coste; las sin coste fuera. */
  curva: Map<number, number>;
  razas: Set<Raza>;
  afinidad: Afinidad;
}

export function deckStats(res: ResolvedDeck): DeckStats {
  const porTipo: Record<Tipo, number> = {
    Aliado: 0,
    Talismán: 0,
    Arma: 0,
    Tótem: 0,
    Oro: 0,
  };
  const curva = new Map<number, number>();
  const razas = new Set<Raza>();

  for (const { card, n } of res.principal) {
    porTipo[card.tipo] += n;
    if (card.coste !== null) curva.set(card.coste, (curva.get(card.coste) ?? 0) + n);
    // La raza la traen los Aliados y nadie mas; el resto entra en cualquier mazo.
    if (card.raza) razas.add(card.raza);
  }

  return {
    totalPrincipal: res.principal.reduce((s, e) => s + e.n, 0),
    totalSide: res.side.reduce((s, e) => s + e.n, 0),
    aliadosOTotems: Math.max(...TIPOS_DEL_MINIMO.map((t) => porTipo[t])),
    porTipo,
    curva,
    razas,
    afinidad: deckAffinity(razas),
  };
}

/* ------------------------------------------------------------------ *
 * Validacion
 * ------------------------------------------------------------------ */

export type IssueCode =
  | "sin-nombre"
  | "tamano-principal"
  | "oro-inicial-falta"
  | "oro-inicial-invalido"
  | "minimo-aliados"
  | "copias-exceso"
  | "copias-unica"
  | "razas-incompatibles"
  | "tamano-side"
  | "carta-desconocida"
  | "carta-prohibida"
  | "carta-restringida";

export interface DeckIssue {
  code: IssueCode;
  gravedad: "error" | "aviso";
  /** Texto listo para mostrar. */
  mensaje: string;
  /** A que carta apunta, para resaltar su fila en el panel. */
  identidad?: string;
}

/** El mensaje de exceso de copias vive aqui solo, para que no se contradiga. */
function mensajeDeCopias(card: RuleCard, copias: number): DeckIssue {
  if (card.unica) {
    return {
      code: "copias-unica",
      gravedad: "error",
      mensaje: `${card.nombre} es Única: solo puedes llevar 1 copia y llevas ${copias}.`,
      identidad: card.identidad,
    };
  }
  return {
    code: "copias-exceso",
    gravedad: "error",
    mensaje: `Ese mazo ya tiene ${copias} copias de ${card.nombre} (el máximo es ${MAX_COPIAS}).`,
    identidad: card.identidad,
  };
}

export function validateDeck(deck: Deck, index: CardIndex): DeckIssue[] {
  const res = resolveDeck(deck, index);
  const stats = deckStats(res);
  const issues: DeckIssue[] = [];

  if (res.desconocidos.length > 0) {
    const n = res.desconocidos.length;
    issues.push({
      code: "carta-desconocida",
      gravedad: "aviso",
      mensaje:
        n === 1
          ? "Una carta del mazo ya no está en el catálogo y no se cuenta."
          : `${n} cartas del mazo ya no están en el catálogo y no se cuentan.`,
    });
  }

  if (deck.nombre.trim() === "") {
    issues.push({
      code: "sin-nombre",
      gravedad: "error",
      mensaje: "Ponle un nombre al mazo.",
    });
  }

  if (stats.totalPrincipal !== DECK_TOTAL) {
    const falta = DECK_TOTAL - stats.totalPrincipal;
    issues.push({
      code: "tamano-principal",
      gravedad: "error",
      mensaje:
        falta > 0
          ? `El mazo debe tener ${DECK_TOTAL} cartas. Te faltan ${falta}.`
          : `El mazo debe tener ${DECK_TOTAL} cartas. Te sobran ${-falta}.`,
    });
  }

  // El oro inicial es un puntero a una carta de principal, y cuenta en las 50.
  const oro = deck.oroInicial ? index.porId.get(deck.oroInicial) : undefined;
  if (!deck.oroInicial) {
    issues.push({
      code: "oro-inicial-falta",
      gravedad: "error",
      mensaje: "Falta el oro inicial. Elige un Oro sin habilidad del mazo.",
    });
  } else if (!oro || !oro.oroSinHabilidad) {
    issues.push({
      code: "oro-inicial-invalido",
      gravedad: "error",
      mensaje: "El oro inicial debe ser una carta de Oro sin habilidad.",
      identidad: oro?.identidad,
    });
  } else if (copiesOf(deck, deck.oroInicial, "principal") === 0) {
    issues.push({
      code: "oro-inicial-invalido",
      gravedad: "error",
      mensaje: `${oro.nombre} es el oro inicial pero ya no está en el mazo. Elige otro.`,
      identidad: oro.identidad,
    });
  }

  if (stats.aliadosOTotems < MIN_ALIADOS_O_TOTEMS) {
    const falta = MIN_ALIADOS_O_TOTEMS - stats.aliadosOTotems;
    issues.push({
      code: "minimo-aliados",
      gravedad: "error",
      mensaje: `Necesitas ${MIN_ALIADOS_O_TOTEMS} Aliados o ${MIN_ALIADOS_O_TOTEMS} Tótems, que no se suman entre sí. Llevas ${stats.porTipo.Aliado} Aliados y ${stats.porTipo["Tótem"]} Tótems: te faltan ${falta} de un tipo.`,
    });
  }

  // Copias por carta, contando principal y side juntos.
  const copias = copiasPorIdentidad(res);
  const vistas = new Set<string>();
  for (const { card } of [...res.principal, ...res.side]) {
    if (vistas.has(card.identidad)) continue;
    vistas.add(card.identidad);
    const n = copias.get(card.identidad) ?? 0;
    if (n > limiteDeCopias(card)) issues.push(mensajeDeCopias(card, n));
  }

  if (stats.afinidad.modo === "invalida") {
    issues.push({
      code: "razas-incompatibles",
      gravedad: "error",
      mensaje: `No puedes mezclar razas de escuelas distintas. Llevas ${stats.afinidad.razas.join(" y ")}.`,
    });
  }

  // El side va vacio o completo; no admite un estado a medias.
  if (stats.totalSide !== 0 && stats.totalSide !== SIDE_TOTAL) {
    issues.push({
      code: "tamano-side",
      gravedad: "error",
      mensaje: `El side deck va vacío o con ${SIDE_TOTAL} cartas exactas. Lleva ${stats.totalSide}.`,
    });
  }

  // Banlist: hoy todas las cartas son "libre", asi que esto no dispara. Queda
  // escrito para que cuando lleguen las prohibidas sea solo cambiar los datos.
  for (const { card } of [...res.principal, ...res.side]) {
    if (card.legalidad === "prohibida") {
      issues.push({
        code: "carta-prohibida",
        gravedad: "error",
        mensaje: `${card.nombre} está prohibida en el formato.`,
        identidad: card.identidad,
      });
    } else if (card.legalidad === "restringida") {
      issues.push({
        code: "carta-restringida",
        gravedad: "aviso",
        mensaje: `${card.nombre} está restringida en el formato.`,
        identidad: card.identidad,
      });
    }
  }

  return issues;
}

export function isLegal(issues: DeckIssue[]): boolean {
  return !issues.some((i) => i.gravedad === "error");
}

/* ------------------------------------------------------------------ *
 * Agregar una carta
 * ------------------------------------------------------------------ */

export type AddCheck = { ok: true } | { ok: false; mensaje: string };

/**
 * Si se puede sumar una copia mas, y si no, por que.
 *
 * Comparte los contadores y los mensajes con `validateDeck` a proposito: si
 * divergieran, el boton "+" dejaria armar un mazo que el validador rechaza.
 */
export function canAdd(
  deck: Deck,
  card: RuleCard,
  zone: DeckZone,
  index: CardIndex,
): AddCheck {
  const res = resolveDeck(deck, index);
  const stats = deckStats(res);

  const copias = copiasPorIdentidad(res).get(card.identidad) ?? 0;
  if (copias + 1 > limiteDeCopias(card)) {
    return { ok: false, mensaje: mensajeDeCopias(card, copias + 1).mensaje };
  }

  if (zone === "principal" && stats.totalPrincipal >= DECK_TOTAL) {
    return { ok: false, mensaje: `El mazo ya tiene sus ${DECK_TOTAL} cartas.` };
  }

  if (zone === "side" && stats.totalSide >= SIDE_TOTAL) {
    return { ok: false, mensaje: `El side deck ya tiene sus ${SIDE_TOTAL} cartas.` };
  }

  // La raza solo restringe el mazo principal: el side admite cualquier carta.
  if (zone === "principal" && card.raza) {
    const razas = new Set(stats.razas);
    razas.add(card.raza);
    if (deckAffinity(razas).modo === "invalida") {
      return {
        ok: false,
        mensaje: `Ese mazo es de ${[...stats.razas].join(" y ")}. ${card.nombre} es ${card.raza} y no puede entrar.`,
      };
    }
  }

  if (card.legalidad === "prohibida") {
    return { ok: false, mensaje: `${card.nombre} está prohibida en el formato.` };
  }

  return { ok: true };
}

/** Los oros que pueden ocupar el hueco de oro inicial, para el selector. */
export function orosInicialesPosibles(cards: Card[]): RuleCard[] {
  return cards.map(toRuleCard).filter((c) => c.oroSinHabilidad);
}

export { totalCards };
