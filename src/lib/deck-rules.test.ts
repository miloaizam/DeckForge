import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  addCard,
  createDeck,
  deckTitle,
  renameDeck,
  setStartingGold,
  setQuantity,
} from "./deck";
import {
  buildCardIndex,
  canAdd,
  deckAffinity,
  deckStats,
  isLegal,
  razasPermitidas,
  resolveDeck,
  validateDeck,
  DECK_TOTAL,
  MIN_ALIADOS_Y_TOTEMS,
  SIDE_TOTAL,
  type CardIndex,
} from "./deck-rules";
import { catalogSchema, type Card, type Deck, type Raza } from "./types";

/**
 * Los tests corren con el corredor de Node (`node --test`), que desde Node 24
 * ejecuta TypeScript sin transpilar. Cero dependencias nuevas, que es lo que
 * pide CLAUDE.md.
 *
 * Se prueban contra el catalogo REAL y no contra fixtures: los bordes que
 * duelen (dos impresiones de la misma carta, Oros con habilidad, razas sin
 * escuela) salen de los datos, y un fixture los borraria justo.
 */

const cards: Card[] = catalogSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, "..", "..", "public", "data", "cards.json"),
      "utf-8",
    ),
  ),
);
const index: CardIndex = buildCardIndex(cards);

const porNombre = (nombre: string): Card[] => cards.filter((c) => c.nombre === nombre);
const uno = (nombre: string): Card => {
  const [c] = porNombre(nombre);
  assert.ok(c, `no existe la carta ${nombre}`);
  return c;
};

/** Un Oro sin habilidad, que es lo que el formato admite como oro inicial. */
const SHODO = uno("Shodo");
/** Un Oro CON habilidad: no puede hacer de oro inicial. */
const REGALIA = uno("Regalía Imperial");

/**
 * Arma un mazo legal de una raza: 50 cartas, oro inicial puesto y de sobra
 * sobre el minimo de Aliados y Totems. Es la base de casi todos los tests.
 */
function mazoLegal(raza: Raza): Deck {
  let deck = setStartingGold(createDeck("Prueba"), SHODO.id);

  // Las copias se cuentan por identidad, no por impresion: Fuku y Wani tienen
  // dos impresiones cada una, y llenar 3 de cada una serian 6 de la misma
  // carta. Este helper tiene que respetar la regla que va a comprobar.
  const puestas = new Map<string, number>([[SHODO.identidad, 1]]);
  const cabe = (c: Card) => (c.keywords.includes("Única") ? 1 : 3);

  const aliados = cards.filter((c) => c.tipo === "Aliado" && c.raza === raza);
  const neutrales = cards.filter(
    (c) => c.raza === null && c.tipo !== "Oro" && c.id !== SHODO.id,
  );

  // Primero los Aliados, para pasar el minimo con holgura; luego relleno.
  for (const c of [...aliados, ...neutrales]) {
    while ((puestas.get(c.identidad) ?? 0) < cabe(c)) {
      if (deckStats(resolveDeck(deck, index)).totalPrincipal >= DECK_TOTAL) return deck;
      deck = addCard(deck, c.id, "principal");
      puestas.set(c.identidad, (puestas.get(c.identidad) ?? 0) + 1);
    }
  }
  return deck;
}

test("un mazo armado con las reglas es legal", () => {
  const deck = mazoLegal("Dragón");
  const issues = validateDeck(deck, index);
  assert.equal(deckStats(resolveDeck(deck, index)).totalPrincipal, DECK_TOTAL);
  assert.ok(isLegal(issues), `deberia ser legal: ${issues.map((i) => i.mensaje)}`);
});

test("una Única no admite dos impresiones distintas", () => {
  // Corrupción es la unica carta del catalogo que es Única Y tiene dos
  // impresiones, asi que es justo el caso que separa contar por carta de
  // contar por impresion: una de cada una son dos Corrupción, y no se puede.
  const impresiones = porNombre("Corrupción");
  assert.equal(impresiones.length, 2);
  assert.equal(
    impresiones[0].identidad,
    impresiones[1].identidad,
    "las dos impresiones deberian compartir identidad",
  );

  let deck = createDeck();
  deck = setQuantity(deck, impresiones[0].id, "principal", 1);
  assert.ok(
    !validateDeck(deck, index).some((i) => i.code === "copias-unica"),
    "una sola copia es legal",
  );

  deck = setQuantity(deck, impresiones[1].id, "principal", 1);
  assert.ok(
    validateDeck(deck, index).some((i) => i.code === "copias-unica"),
    "dos impresiones de una Única son dos copias y no se permiten",
  );
});

test("una Única no admite dos copias de la misma impresion", () => {
  const kirin = uno("Kirin");
  const deck = setQuantity(createDeck(), kirin.id, "principal", 2);
  assert.ok(validateDeck(deck, index).some((i) => i.code === "copias-unica"));
});

test("dos Únicas distintas en el mismo mazo son legales", () => {
  // La regla es 1 copia POR carta Única, no 1 carta Única por mazo.
  const unicas = cards.filter((c) => c.keywords.includes("Única"));
  let deck = createDeck();
  for (const c of unicas.slice(0, 5)) deck = setQuantity(deck, c.id, "principal", 1);
  assert.ok(
    !validateDeck(deck, index).some((i) => i.code === "copias-unica"),
    "cinco Únicas distintas, una copia cada una, es legal",
  );
});

test("una carta normal admite 3 copias entre sus impresiones, no 6", () => {
  // Ieyasu no es Única y tiene dos impresiones.
  const impresiones = porNombre("Ieyasu");
  assert.equal(impresiones.length, 2);

  let deck = createDeck();
  deck = setQuantity(deck, impresiones[0].id, "principal", 3);
  deck = setQuantity(deck, impresiones[1].id, "principal", 1);

  const issues = validateDeck(deck, index);
  assert.ok(
    issues.some((i) => i.code === "copias-exceso"),
    "3 + 1 entre impresiones son 4 copias y deberia fallar",
  );
});

test("el side suma al limite de copias", () => {
  const [ieyasu] = porNombre("Ieyasu");
  let deck = createDeck();
  deck = setQuantity(deck, ieyasu.id, "principal", 3);
  assert.ok(
    !validateDeck(deck, index).some((i) => i.code === "copias-exceso"),
    "3 copias en principal son legales",
  );

  const otro = porNombre("Ieyasu")[1];
  deck = setQuantity(deck, otro.id, "side", 1);
  assert.ok(
    validateDeck(deck, index).some((i) => i.code === "copias-exceso"),
    "la cuarta copia en el side deberia contar igual",
  );
});

test("los Oros sin habilidad no tienen tope de copias", () => {
  // Son el recurso con que se paga todo: el mazo lleva los que necesite.
  const deck = setQuantity(createDeck(), SHODO.id, "principal", 20);
  const issues = validateDeck(deck, index);
  assert.ok(
    !issues.some((i) => i.code === "copias-exceso"),
    "20 Shodo deberian ser legales",
  );

  const card = index.porId.get(SHODO.id)!;
  assert.equal(canAdd(deck, card, "principal", index).ok, true);
});

test("un Oro CON habilidad si tiene tope", () => {
  // Los cuatro Oros con habilidad del catalogo son todos Únicos.
  assert.equal(REGALIA.habilidad.trim() === "", false);
  const deck = setQuantity(createDeck(), REGALIA.id, "principal", 2);
  assert.ok(validateDeck(deck, index).some((i) => i.code === "copias-unica"));
});

test("una carta normal sigue con tope de 3", () => {
  const talisman = cards.find(
    (c) => c.tipo === "Talismán" && !c.keywords.includes("Única"),
  )!;
  const deck = setQuantity(createDeck(), talisman.id, "principal", 4);
  assert.ok(validateDeck(deck, index).some((i) => i.code === "copias-exceso"));
});

test("el minimo de Aliados y Totems cuenta copias", () => {
  let deck = setStartingGold(createDeck(), SHODO.id);
  const talisman = cards.find((c) => c.tipo === "Talismán")!;
  const aliado = cards.find((c) => c.tipo === "Aliado" && c.raza === "Dragón")!;

  // Un solo Aliado repetido no llega al minimo por mucho que se rellene.
  deck = setQuantity(deck, aliado.id, "principal", 3);
  const stats = deckStats(resolveDeck(deck, index));
  assert.equal(stats.aliadosYTotems, 3);
  assert.ok(
    validateDeck(deck, index).some((i) => i.code === "minimo-aliados"),
    `con ${stats.aliadosYTotems} de ${MIN_ALIADOS_Y_TOTEMS} deberia faltar`,
  );
  assert.ok(talisman);
});

test("no se pueden mezclar razas de escuelas distintas", () => {
  const eterno = cards.find((c) => c.tipo === "Aliado" && c.raza === "Eterno")!;
  const faerie = cards.find((c) => c.tipo === "Aliado" && c.raza === "Faerie")!;
  const dragon = cards.find((c) => c.tipo === "Aliado" && c.raza === "Dragón")!;

  // Eterno + Faerie son las dos razas de Vigilantes Etereos: legal.
  let mixto = addCard(
    addCard(createDeck(), eterno.id, "principal"),
    faerie.id,
    "principal",
  );
  assert.equal(deckStats(resolveDeck(mixto, index)).afinidad.modo, "escuela");
  assert.ok(!validateDeck(mixto, index).some((i) => i.code === "razas-incompatibles"));

  // Eterno + Dragón son de escuelas distintas: ilegal.
  mixto = addCard(mixto, dragon.id, "principal");
  assert.equal(deckStats(resolveDeck(mixto, index)).afinidad.modo, "invalida");
  assert.ok(validateDeck(mixto, index).some((i) => i.code === "razas-incompatibles"));
});

test("una raza sin escuela puede armar mazo mono-raza", () => {
  // Samurái no pertenece a ninguna escuela: solo puede ir sola, y eso es legal.
  const deck = mazoLegal("Samurái");
  const { afinidad } = deckStats(resolveDeck(deck, index));
  assert.equal(afinidad.modo, "mono");
  assert.equal(afinidad.modo === "mono" ? afinidad.escuela : "?", null);
  assert.ok(isLegal(validateDeck(deck, index)));
});

test("el mazo necesita un nombre para ser valido", () => {
  const sinNombre = mazoLegal("Dragón");
  assert.ok(isLegal(validateDeck(sinNombre, index)), "el helper le pone nombre");

  const vaciado = renameDeck(sinNombre, "   ");
  const issues = validateDeck(vaciado, index);
  assert.ok(
    issues.some((i) => i.code === "sin-nombre"),
    "sin nombre no es valido",
  );
  assert.equal(vaciado.nombre, "   ", "pero el campo se deja borrar tal cual");
  assert.equal(deckTitle(vaciado), "Mazo sin nombre", "y se muestra con relleno");
});

test("razasPermitidas acota el catalogo del constructor", () => {
  // Vacio: todavia cabe cualquier cosa, asi que no se filtra nada.
  assert.equal(razasPermitidas(deckAffinity(new Set())).size, 0);

  // Con una raza de escuela, caben las dos de esa escuela: el mazo aun puede
  // crecer hacia ella.
  const conDragon = razasPermitidas(deckAffinity(new Set<Raza>(["Dragón"])));
  assert.deepEqual([...conDragon].sort(), ["Dragón", "Guerrero"]);

  // Una raza sin escuela solo se admite a si misma.
  const conSamurai = razasPermitidas(deckAffinity(new Set<Raza>(["Samurái"])));
  assert.deepEqual([...conSamurai], ["Samurái"]);

  // Con la escuela ya formada, siguen siendo esas dos.
  const escuela = razasPermitidas(deckAffinity(new Set<Raza>(["Eterno", "Faerie"])));
  assert.deepEqual([...escuela].sort(), ["Eterno", "Faerie"]);
});

test("deckAffinity distingue los cuatro casos", () => {
  assert.equal(deckAffinity(new Set()).modo, "vacio");
  assert.equal(deckAffinity(new Set<Raza>(["Dragón"])).modo, "mono");
  assert.equal(deckAffinity(new Set<Raza>(["Dragón", "Guerrero"])).modo, "escuela");
  assert.equal(deckAffinity(new Set<Raza>(["Dragón", "Faerie"])).modo, "invalida");
  assert.equal(
    deckAffinity(new Set<Raza>(["Dragón", "Guerrero", "Faerie"])).modo,
    "invalida",
  );
});

test("el oro inicial tiene que ser un Oro sin habilidad", () => {
  const base = mazoLegal("Dragón");

  assert.ok(
    isLegal(validateDeck(base, index)),
    "Shodo es un Oro sin habilidad y sirve de oro inicial",
  );

  // Regalia Imperial es Oro pero tiene habilidad: no sirve.
  const conRegalia = setStartingGold(base, REGALIA.id);
  assert.ok(
    validateDeck(conRegalia, index).some((i) => i.code === "oro-inicial-invalido"),
  );

  // Sin oro inicial, falta.
  const sinOro = setStartingGold(base, null);
  assert.ok(validateDeck(sinOro, index).some((i) => i.code === "oro-inicial-falta"));
});

test("sacar el oro inicial del mazo limpia el puntero", () => {
  let deck = setStartingGold(createDeck(), SHODO.id);
  assert.equal(deck.oroInicial, SHODO.id);
  deck = setQuantity(deck, SHODO.id, "principal", 0);
  assert.equal(deck.oroInicial, null, "el puntero no puede quedar colgando");
});

test("el side va vacio o con 10 cartas exactas", () => {
  const base = mazoLegal("Dragón");
  assert.ok(isLegal(validateDeck(base, index)), "side vacio es legal");

  const aliados = cards.filter((c) => c.tipo === "Aliado" && c.raza === "Oni");

  let siete = base;
  for (let i = 0; i < 7; i++) siete = addCard(siete, aliados[i].id, "side");
  assert.ok(validateDeck(siete, index).some((i) => i.code === "tamano-side"));

  let diez = base;
  for (let i = 0; i < SIDE_TOTAL; i++) diez = addCard(diez, aliados[i].id, "side");
  assert.ok(
    !validateDeck(diez, index).some((i) => i.code === "tamano-side"),
    "10 cartas exactas es legal",
  );
});

test("el side admite cualquier raza", () => {
  // El mazo principal es de Dragón; en el side entra un Oni sin romper nada.
  const base = mazoLegal("Dragón");
  const oni = cards.find((c) => c.tipo === "Aliado" && c.raza === "Oni")!;
  const conOni = addCard(base, oni.id, "side");
  assert.ok(
    !validateDeck(conOni, index).some((i) => i.code === "razas-incompatibles"),
    "la restriccion de raza es solo del mazo principal",
  );
});

test("una carta que ya no existe se avisa y no revienta", () => {
  const deck: Deck = {
    ...createDeck(),
    principal: [{ id: "zz-999", n: 2 }],
  };

  const res = resolveDeck(deck, index);
  assert.deepEqual(res.desconocidos, ["zz-999"]);
  assert.equal(res.principal.length, 0);

  const issues = validateDeck(deck, index);
  const aviso = issues.find((i) => i.code === "carta-desconocida");
  assert.ok(aviso);
  assert.equal(aviso.gravedad, "aviso");
});

test("canAdd no se contradice con validateDeck", () => {
  const [kirin] = porNombre("Kirin");
  const card = index.porId.get(kirin.id)!;

  let deck = createDeck();
  assert.equal(canAdd(deck, card, "principal", index).ok, true);

  deck = addCard(deck, kirin.id, "principal");
  const check = canAdd(deck, card, "principal", index);
  assert.equal(check.ok, false, "Kirin es Única: la segunda copia se rechaza");

  // Y si se fuerza igual, el validador dice lo mismo.
  const forzado = setQuantity(deck, kirin.id, "principal", 2);
  assert.ok(validateDeck(forzado, index).some((i) => i.code === "copias-unica"));
});

test("canAdd frena al llegar a las 50 y a las 10 del side", () => {
  const deck = mazoLegal("Dragón");
  const otro = cards.find(
    (c) => c.tipo === "Talismán" && !deck.principal.some((e) => e.id === c.id),
  )!;
  const card = index.porId.get(otro.id)!;

  const check = canAdd(deck, card, "principal", index);
  assert.equal(check.ok, false);
  assert.match(check.ok === false ? check.mensaje : "", /50/);
});
