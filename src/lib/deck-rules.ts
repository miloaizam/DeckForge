import { copiesOf, totalCards, type DeckZone } from "./deck";
import {
  ESCUELA_POR_RAZA,
  RAZAS_POR_ESCUELA,
  type Atributo,
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
/** El side no tiene minimo: es el tope, no un tamano exacto. */
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
  /**
   * Luz, Oscuridad o ninguno. Lo imprimen tambien Talismanes, Armas, Totems y
   * Oros, pero para las reglas solo cuenta el de los Aliados: el atributo
   * restringe el mazo igual que la raza, y por los mismos motivos.
   */
  atributo: Atributo | null;
  coste: number | null;
  thumb: string;
  legalidad: Legalidad;
  /** Lleva la keyword Unica: 1 copia por mazo. Tambien la traen seis Oros. */
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
    atributo: c.atributo,
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
 * Afinidad
 *
 * Un mazo del formato se arma de una de tres formas: por raza, por escuela
 * elemental (las dos razas exactas de una) o por atributo (todos sus Aliados
 * Luz, o todos Oscuridad). Son ALTERNATIVAS, no niveles: basta con cumplir una.
 *
 * La via del atributo llega con Steampunk, que es la primera edicion que
 * imprime Luz y Oscuridad, y es la que justifica que esto sea una lista de
 * vias abiertas y no un solo veredicto: mientras el mazo se arma suele cumplir
 * varias a la vez —el primer Aliado abre todas las que le corresponden— y se
 * van cerrando a medida que entran cartas. Un mazo de Aliados Luz de cuatro
 * razas distintas es legal, y ninguna via de raza lo explica.
 * ------------------------------------------------------------------ */

/** Solo los Aliados llevan afinidad; el resto entra en cualquier mazo. */
export interface ConAfinidad {
  tipo: Tipo;
  raza: Raza | null;
  atributo: Atributo | null;
}

export type Via =
  | { modo: "raza"; raza: Raza }
  | { modo: "escuela"; escuela: Escuela; razas: readonly [Raza, Raza] }
  | { modo: "atributo"; atributo: Atributo };

export interface Afinidad {
  /** El mazo no tiene Aliados todavia: sigue abierto a cualquier cosa. */
  vacio: boolean;
  /**
   * Las vias que los Aliados del mazo todavia cumplen, de la mas estrecha a la
   * mas ancha. Si el mazo tiene Aliados y esto queda vacio, es ilegal.
   */
  vias: Via[];
}

/** Lo que las reglas de afinidad miran de los Aliados de un mazo. */
export interface Afinidades {
  razas: Set<Raza>;
  atributos: Set<Atributo>;
  /** Hay al menos un Aliado sin atributo impreso. Cierra la via del atributo. */
  neutros: boolean;
}

/** La escuela comun a todas esas razas, o nada si no comparten una. */
function escuelaComun(razas: Raza[]): Escuela | null {
  const escuela = ESCUELA_POR_RAZA[razas[0]];
  if (!escuela) return null;
  return razas.every((r) => ESCUELA_POR_RAZA[r] === escuela) ? escuela : null;
}

/**
 * Deduce que vias sigue cumpliendo un mazo.
 *
 * Cada via es una condicion sobre TODOS los Aliados ("todos de esta raza",
 * "todos de este atributo"), asi que una via abierta sigue abierta al agregar
 * un Aliado si y solo si ese Aliado la cumple. De ahi sale `admite()`.
 */
export function deckAffinity({ razas, atributos, neutros }: Afinidades): Afinidad {
  const lista = [...razas];

  // Todos los Aliados llevan raza impresa, asi que sin razas no hay Aliados.
  if (lista.length === 0) return { vacio: true, vias: [] };

  const vias: Via[] = [];

  if (lista.length === 1) vias.push({ modo: "raza", raza: lista[0] });

  // Con una sola raza la via de escuela se abre igual: el mazo todavia puede
  // crecer hacia la otra raza de su escuela.
  const escuela = escuelaComun(lista);
  if (escuela) {
    vias.push({ modo: "escuela", escuela, razas: RAZAS_POR_ESCUELA[escuela] });
  }

  // Un Aliado sin atributo no es "de los dos": no hay mazo de atributo que lo
  // admita, igual que un Aliado de otra raza cierra la via de la raza.
  if (!neutros && atributos.size === 1) {
    vias.push({ modo: "atributo", atributo: [...atributos][0] });
  }

  return { vacio: false, vias };
}

export function afinidadValida(afinidad: Afinidad): boolean {
  return afinidad.vacio || afinidad.vias.length > 0;
}

function viaAdmite(via: Via, card: ConAfinidad): boolean {
  switch (via.modo) {
    case "raza":
      return card.raza === via.raza;
    case "escuela":
      return card.raza !== null && via.razas.includes(card.raza);
    case "atributo":
      return card.atributo === via.atributo;
  }
}

/**
 * Si esa carta puede entrar en un mazo con esta afinidad.
 *
 * Los que no son Aliados entran siempre: la afinidad restringe los Aliados y
 * nadie mas, asi que un Talisman Oscuridad cabe en un mazo Luz. Es la misma
 * regla de siempre para la raza, ahora tambien para el atributo.
 */
export function admite(afinidad: Afinidad, card: ConAfinidad): boolean {
  if (card.tipo !== "Aliado") return true;
  if (afinidad.vacio) return true;
  return afinidad.vias.some((via) => viaAdmite(via, card));
}

/**
 * Como se lee la afinidad en una linea.
 *
 * Muestra la via de raza mas estrecha que siga abierta y, si el mazo ademas
 * comparte atributo, tambien ese: "Caballero", "Gremio de Paladines · Luz".
 * Las dos vias de raza juntas ("Caballero" y "Gremio de Paladines") dirian lo
 * mismo dos veces, asi que manda la estrecha.
 */
export function affinityLabel(afinidad: Afinidad): string {
  if (afinidad.vacio) return "Sin afinidad aún";
  if (afinidad.vias.length === 0) return "Afinidad incompatible";

  const porRaza = afinidad.vias.find((v) => v.modo === "raza" || v.modo === "escuela");
  const porAtributo = afinidad.vias.find((v) => v.modo === "atributo");

  const partes: string[] = [];
  if (porRaza) partes.push(porRaza.modo === "raza" ? porRaza.raza : porRaza.escuela);
  if (porAtributo) partes.push(porAtributo.atributo);
  return partes.join(" · ");
}

/**
 * Que Aliados admite todavia el mazo, en prosa, para explicar por que el
 * catalogo del constructor esta acotado.
 *
 * Cuando sigue abierta la via de la escuela, la de la raza sobra: las razas de
 * la escuela ya incluyen la suya.
 */
export function affinityAdmits(afinidad: Afinidad): string {
  const porEscuela = afinidad.vias.some((v) => v.modo === "escuela");
  return afinidad.vias
    .filter((v) => !(porEscuela && v.modo === "raza"))
    .map((via) => {
      switch (via.modo) {
        case "raza":
          return `de raza ${via.raza}`;
        case "escuela":
          return `de ${via.escuela} (${via.razas.join(" y ")})`;
        case "atributo":
          return `de ${via.atributo}`;
      }
    })
    .join(" o ");
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
 * todo y el mazo lleva las que necesite. Los que SI traen habilidad son cartas
 * como cualquier otra y van al tope de 3, salvo los que ademas son Únicos.
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
  /** Los atributos que llevan los Aliados del mazo. Vacio hasta Steampunk. */
  atributos: Set<Atributo>;
  /** Hay Aliados sin atributo impreso. Junto a `atributos`, explica el error. */
  aliadosNeutros: boolean;
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
  const atributos = new Set<Atributo>();
  let aliadosNeutros = false;

  for (const { card, n } of res.principal) {
    porTipo[card.tipo] += n;
    if (card.coste !== null) curva.set(card.coste, (curva.get(card.coste) ?? 0) + n);
  }

  // La afinidad se mira sobre las 60 cartas, no sobre las 50: el side es una
  // extension del mazo y entra a el entre partidas, asi que no puede traer una
  // raza ni un atributo que el mazo no admite. Los contadores y la curva, en
  // cambio, siguen siendo del principal: son lo que se juega de salida.
  for (const { card } of [...res.principal, ...res.side]) {
    // La afinidad la llevan los Aliados y nadie mas. La raza basta para
    // reconocerlos en la practica, pero el atributo lo imprimen tambien
    // Talismanes, Armas, Totems y Oros, asi que aqui hay que mirar el tipo.
    if (card.tipo !== "Aliado") continue;
    if (card.raza) razas.add(card.raza);
    if (card.atributo) atributos.add(card.atributo);
    else aliadosNeutros = true;
  }

  return {
    totalPrincipal: res.principal.reduce((s, e) => s + e.n, 0),
    totalSide: res.side.reduce((s, e) => s + e.n, 0),
    aliadosOTotems: Math.max(...TIPOS_DEL_MINIMO.map((t) => porTipo[t])),
    porTipo,
    curva,
    razas,
    atributos,
    aliadosNeutros,
    afinidad: deckAffinity({ razas, atributos, neutros: aliadosNeutros }),
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
  | "afinidad-incompatible"
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

/**
 * Por que los Aliados del mazo no forman ninguna afinidad.
 *
 * Decir solo las razas ya no basta: desde Steampunk un mazo puede romperse por
 * el atributo con las razas en orden ("todos Sombra, pero uno es Oscuridad y
 * otro no"), o por los dos a la vez.
 */
function mensajeDeAfinidad(stats: DeckStats): string {
  const razas = [...stats.razas].join(", ");
  const base = `Los Aliados de un mazo comparten una raza, una escuela o un atributo. Llevas ${razas}`;

  if (stats.atributos.size > 1) return `${base}, y mezclas Luz con Oscuridad.`;
  if (stats.atributos.size === 1 && stats.aliadosNeutros) {
    const [atributo] = [...stats.atributos];
    return `${base}, y junto a los Aliados ${atributo} hay Aliados sin atributo.`;
  }
  return `${base}.`;
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

  if (!afinidadValida(stats.afinidad)) {
    issues.push({
      code: "afinidad-incompatible",
      gravedad: "error",
      mensaje: mensajeDeAfinidad(stats),
    });
  }

  // El side es libre entre 0 y SIDE_TOTAL: cualquier cantidad vale, incluidas
  // ninguna y las diez. Lo unico que no se admite es pasarse.
  if (stats.totalSide > SIDE_TOTAL) {
    issues.push({
      code: "tamano-side",
      gravedad: "error",
      mensaje: `El side deck admite hasta ${SIDE_TOTAL} cartas. Lleva ${stats.totalSide}.`,
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

/** Como se nombra un Aliado al explicar por que no entra: "Sombra Oscuridad". */
function describirCarta(card: RuleCard): string {
  return [card.raza, card.atributo].filter(Boolean).join(" ") || card.tipo;
}

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

  // La afinidad restringe las dos zonas: un side de otra escuela o de otro
  // atributo seria un mazo ilegal en cuanto se usara.
  if (!admite(stats.afinidad, card)) {
    return {
      ok: false,
      mensaje: `Ese mazo es de ${affinityLabel(stats.afinidad)}. ${card.nombre} es ${describirCarta(card)} y no puede entrar.`,
    };
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
