import {
  DECK_VERSION,
  MAX_DESCRIPCION_MAZO,
  MAX_NOMBRE_MAZO,
  type Deck,
  type DeckEntry,
} from "./types";

/**
 * Construccion y mutacion de mazos.
 *
 * Todo es puro: cada funcion devuelve un mazo nuevo, nunca toca el que recibe.
 * Las reglas del formato NO viven aqui — estan en `deck-rules.ts`. Este modulo
 * deja representar mazos ilegales a proposito: un mazo a medio armar lo es casi
 * siempre, y uno importado con cuatro copias tiene que poder entrar para que el
 * validador lo pueda reportar.
 */

export type DeckZone = "principal" | "side";

/**
 * Id local de un mazo: 10 caracteres de [a-z0-9].
 *
 * No se usa `crypto.randomUUID()` porque sus 36 caracteres con guiones ensucian
 * la URL sin aportar nada: esto no identifica a nadie ni sale del navegador.
 */
export function newDeckId(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  // El sesgo de modulo da igual: es un id local, no un secreto.
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

export function createDeck(nombre = ""): Deck {
  const ahora = Date.now();
  return {
    v: DECK_VERSION,
    id: newDeckId(),
    nombre: nombre.slice(0, MAX_NOMBRE_MAZO),
    descripcion: "",
    oroInicial: null,
    portada: null,
    principal: [],
    side: [],
    afinidadFijada: null,
    creado: ahora,
    actualizado: ahora,
  };
}

/** Marca el mazo como tocado. Todas las mutaciones pasan por aqui. */
function touch(deck: Deck, cambios: Partial<Deck>): Deck {
  return { ...deck, ...cambios, actualizado: Date.now() };
}

export function totalCards(entries: DeckEntry[]): number {
  return entries.reduce((suma, e) => suma + e.n, 0);
}

/** Copias de una impresion concreta. Para contar CARTAS, ver `deck-rules.ts`. */
export function copiesOf(deck: Deck, cardId: string, zone?: DeckZone): number {
  const zonas: DeckZone[] = zone ? [zone] : ["principal", "side"];
  return zonas.reduce(
    (suma, z) => suma + (deck[z].find((e) => e.id === cardId)?.n ?? 0),
    0,
  );
}

/**
 * Fija las copias de una impresion en una zona. Con `n <= 0` la saca.
 *
 * Si la carta que sale era el oro inicial, el puntero se limpia: dejarlo
 * apuntando a algo que ya no esta seria un estado imposible de explicar.
 */
export function setQuantity(deck: Deck, cardId: string, zone: DeckZone, n: number): Deck {
  const resto = deck[zone].filter((e) => e.id !== cardId);
  const entries = n > 0 ? [...resto, { id: cardId, n }] : resto;

  const sigueEnPrincipal =
    zone === "principal" ? n > 0 : deck.principal.some((e) => e.id === cardId);
  const oroInicial =
    deck.oroInicial === cardId && !sigueEnPrincipal ? null : deck.oroInicial;

  // La portada puede ser cualquier carta del mazo, side incluido, asi que se
  // limpia solo cuando no queda ninguna copia en ninguna de las dos zonas.
  const otraZona: DeckZone = zone === "principal" ? "side" : "principal";
  const sigueEnElMazo = n > 0 || deck[otraZona].some((e) => e.id === cardId);
  const portada = deck.portada === cardId && !sigueEnElMazo ? null : deck.portada;

  return touch(deck, { [zone]: entries, oroInicial, portada });
}

/**
 * Elige que carta hace de portada del mazo en /mazos. `null` la quita.
 *
 * No agrega la carta al mazo si no esta —al reves que el oro inicial—: la
 * portada se elige desde el detalle, entre las que el mazo ya lleva.
 */
export function setCover(deck: Deck, cardId: string | null): Deck {
  return touch(deck, { portada: cardId });
}

export function addCard(deck: Deck, cardId: string, zone: DeckZone, cuantas = 1): Deck {
  return setQuantity(deck, cardId, zone, copiesOf(deck, cardId, zone) + cuantas);
}

export function removeCard(deck: Deck, cardId: string, zone: DeckZone): Deck {
  return setQuantity(deck, cardId, zone, copiesOf(deck, cardId, zone) - 1);
}

/**
 * Elige que carta hace de oro inicial.
 *
 * Es un puntero a una carta que tambien tiene que estar en `principal`: el oro
 * inicial cuenta dentro de las 50. Si la carta no esta en el mazo, se agrega
 * una copia, que es lo que el usuario espera al elegirla.
 */
export function setStartingGold(deck: Deck, cardId: string | null): Deck {
  if (cardId === null) return touch(deck, { oroInicial: null });

  const conLaCarta =
    copiesOf(deck, cardId, "principal") > 0
      ? deck
      : setQuantity(deck, cardId, "principal", 1);

  return touch(conLaCarta, { oroInicial: cardId });
}

/**
 * Cambia el nombre. Admite dejarlo vacio.
 *
 * Reponer un relleno aqui hacia imposible borrar el campo para escribir otro
 * nombre: el texto volvia solo en cuanto se borraba la ultima letra. Que el
 * nombre sea obligatorio se resuelve al guardar, no al teclear.
 */
export function renameDeck(deck: Deck, nombre: string): Deck {
  return touch(deck, { nombre: nombre.slice(0, MAX_NOMBRE_MAZO) });
}

/** Cambia la descripcion. Es opcional: vacia es un valor legitimo. */
export function describeDeck(deck: Deck, descripcion: string): Deck {
  return touch(deck, { descripcion: descripcion.slice(0, MAX_DESCRIPCION_MAZO) });
}

/** Como se muestra un mazo que todavia no tiene nombre. */
export function deckTitle(deck: Deck): string {
  return deck.nombre.trim() || "Mazo sin nombre";
}

export function duplicateDeck(deck: Deck, nombre?: string): Deck {
  const ahora = Date.now();
  return {
    ...deck,
    id: newDeckId(),
    nombre: (nombre ?? `${deck.nombre} (copia)`).slice(0, MAX_NOMBRE_MAZO),
    creado: ahora,
    actualizado: ahora,
  };
}

export function clearDeck(deck: Deck): Deck {
  return touch(deck, { principal: [], side: [], oroInicial: null, portada: null });
}
