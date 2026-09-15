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
  admite,
  affinityLabel,
  buildCardIndex,
  canAdd,
  deckAffinity,
  deckStats,
  isLegal,
  resolveDeck,
  toRuleCard,
  validateDeck,
  DECK_TOTAL,
  MIN_ALIADOS_O_TOTEMS,
  SIDE_TOTAL,
  type Afinidad,
  type CardIndex,
} from "./deck-rules";
import { catalogSchema, type Atributo, type Card, type Deck, type Raza } from "./types";

/** Atajo para pedirle una afinidad a `deckAffinity` con solo las razas. */
const porRazas = (...razas: Raza[]): Afinidad =>
  deckAffinity({
    razas: new Set(razas),
    atributos: new Set(),
    neutros: razas.length > 0,
  });

/** La misma, pero de un mazo cuyos Aliados llevan todos ese atributo. */
const porAtributo = (atributo: Atributo, ...razas: Raza[]): Afinidad =>
  deckAffinity({ razas: new Set(razas), atributos: new Set([atributo]), neutros: false });

/** Los modos de las vias abiertas, ordenados, para comparar de un vistazo. */
const modos = (a: Afinidad): string[] => a.vias.map((v) => v.modo).sort();

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
 * Arma un mazo legal con los Aliados que cumplan ese criterio: 50 cartas, oro
 * inicial puesto y de sobra sobre el minimo de Aliados y Totems.
 */
function mazoConAliados(elegir: (c: Card) => boolean): Deck {
  let deck = setStartingGold(createDeck("Prueba"), SHODO.id);

  // Las copias se cuentan por identidad, no por impresion: Fuku y Wani tienen
  // dos impresiones cada una, y llenar 3 de cada una serian 6 de la misma
  // carta. Este helper tiene que respetar la regla que va a comprobar.
  const puestas = new Map<string, number>([[SHODO.identidad, 1]]);
  const cabe = (c: Card) => (c.keywords.includes("Única") ? 1 : 3);

  const aliados = cards.filter((c) => c.tipo === "Aliado" && elegir(c));
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

/** El caso de siempre: un mazo mono-raza. Es la base de casi todos los tests. */
const mazoLegal = (raza: Raza): Deck => mazoConAliados((c) => c.raza === raza);

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

test("el minimo de Aliados o Totems cuenta copias", () => {
  let deck = setStartingGold(createDeck(), SHODO.id);
  const aliado = cards.find((c) => c.tipo === "Aliado" && c.raza === "Dragón")!;

  // Un solo Aliado repetido no llega al minimo por mucho que se rellene.
  deck = setQuantity(deck, aliado.id, "principal", 3);
  const stats = deckStats(resolveDeck(deck, index));
  assert.equal(stats.aliadosOTotems, 3);
  assert.ok(
    validateDeck(deck, index).some((i) => i.code === "minimo-aliados"),
    `con ${stats.aliadosOTotems} de ${MIN_ALIADOS_O_TOTEMS} deberia faltar`,
  );
});

test("Aliados y Totems NO se suman para el minimo", () => {
  // Doce Aliados Dragon y doce Totems son 24 cartas, pero ninguno de los dos
  // tipos llega solo a las 15: el mazo no cumple.
  const aliados = cards.filter((c) => c.tipo === "Aliado" && c.raza === "Dragón");
  const totems = cards.filter((c) => c.tipo === "Tótem");
  assert.ok(aliados.length >= 4 && totems.length >= 4);

  let deck = setStartingGold(createDeck(), SHODO.id);
  for (const c of aliados.slice(0, 4)) deck = setQuantity(deck, c.id, "principal", 3);
  for (const c of totems.slice(0, 4)) deck = setQuantity(deck, c.id, "principal", 3);

  const stats = deckStats(resolveDeck(deck, index));
  assert.equal(stats.porTipo.Aliado, 12);
  assert.equal(stats.porTipo["Tótem"], 12);
  assert.equal(stats.aliadosOTotems, 12, "el contador es el mayor, no la suma");
  assert.ok(
    validateDeck(deck, index).some((i) => i.code === "minimo-aliados"),
    "12 y 12 no cumplen el minimo de 15 de un tipo",
  );

  // Con un quinto Aliado a tres copias, los Aliados solos llegan a 15.
  deck = setQuantity(deck, aliados[4].id, "principal", 3);
  assert.equal(deckStats(resolveDeck(deck, index)).aliadosOTotems, 15);
  assert.ok(
    !validateDeck(deck, index).some((i) => i.code === "minimo-aliados"),
    "15 Aliados cumplen aunque los Totems se queden en 12",
  );
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
  assert.deepEqual(modos(deckStats(resolveDeck(mixto, index)).afinidad), ["escuela"]);
  assert.ok(!validateDeck(mixto, index).some((i) => i.code === "afinidad-incompatible"));

  // Eterno + Dragón son de escuelas distintas: ilegal.
  mixto = addCard(mixto, dragon.id, "principal");
  assert.deepEqual(deckStats(resolveDeck(mixto, index)).afinidad.vias, []);
  assert.ok(validateDeck(mixto, index).some((i) => i.code === "afinidad-incompatible"));
});

test("una raza sin escuela puede armar mazo mono-raza", () => {
  // Samurái no pertenece a ninguna escuela: solo puede ir sola, y eso es legal.
  const deck = mazoLegal("Samurái");
  const { afinidad } = deckStats(resolveDeck(deck, index));
  assert.deepEqual(modos(afinidad), ["raza"], "sin escuela hacia la que crecer");
  assert.equal(affinityLabel(afinidad), "Samurái");
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

test("admite acota el catalogo del constructor", () => {
  const aliado = (raza: Raza) =>
    toRuleCard(cards.find((c) => c.tipo === "Aliado" && c.raza === raza)!);

  // Vacio: todavia cabe cualquier cosa.
  const vacio = porRazas();
  assert.ok(admite(vacio, aliado("Dragón")) && admite(vacio, aliado("Oni")));

  // Con una raza de escuela caben las dos de esa escuela: el mazo aun puede
  // crecer hacia ella.
  const conDragon = porRazas("Dragón");
  assert.ok(admite(conDragon, aliado("Guerrero")));
  assert.ok(!admite(conDragon, aliado("Oni")));

  // Una raza sin escuela solo se admite a si misma.
  const conSamurai = porRazas("Samurái");
  assert.ok(admite(conSamurai, aliado("Samurái")));
  assert.ok(!admite(conSamurai, aliado("Bestia")));

  // Los que no son Aliados entran siempre: la afinidad no los mira.
  assert.ok(admite(conSamurai, toRuleCard(SHODO)));
});

test("deckAffinity abre una via por cada forma que el mazo cumple", () => {
  assert.ok(porRazas().vacio);
  // Una raza con escuela deja las dos vias abiertas a la vez.
  assert.deepEqual(modos(porRazas("Dragón")), ["escuela", "raza"]);
  // Una raza sin escuela, solo la suya.
  assert.deepEqual(modos(porRazas("Samurái")), ["raza"]);
  // Ya formada la escuela, la via de raza se cierra.
  assert.deepEqual(modos(porRazas("Dragón", "Guerrero")), ["escuela"]);
  // Razas de escuelas distintas y sin atributo comun: no queda ninguna.
  assert.deepEqual(porRazas("Dragón", "Faerie").vias, []);
  assert.deepEqual(porRazas("Dragón", "Guerrero", "Faerie").vias, []);
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

test("el side admite de 0 a 10 cartas, y ni una mas", () => {
  const base = mazoLegal("Dragón");
  assert.ok(isLegal(validateDeck(base, index)), "side vacio es legal");

  // Talismanes: no llevan raza, asi que no tocan la afinidad del mazo.
  const sueltas = cards.filter(
    (c) => c.tipo === "Talismán" && !c.keywords.includes("Única"),
  );

  const conN = (n: number): Deck => {
    let deck = base;
    for (let i = 0; i < n; i++) deck = addCard(deck, sueltas[i].id, "side");
    return deck;
  };

  for (const n of [1, 7, SIDE_TOTAL]) {
    assert.ok(
      !validateDeck(conN(n), index).some((i) => i.code === "tamano-side"),
      `${n} cartas en el side es legal`,
    );
  }

  // La 11 no se puede ni agregar, asi que se arma a mano para validarla.
  const once: Deck = {
    ...base,
    side: sueltas.slice(0, 11).map((c) => ({ id: c.id, n: 1 })),
  };
  assert.ok(
    validateDeck(once, index).some((i) => i.code === "tamano-side"),
    "11 se pasa del tope",
  );
  assert.equal(
    canAdd(conN(SIDE_TOTAL), index.porId.get(sueltas[SIDE_TOTAL].id)!, "side", index).ok,
    false,
    "y el boton + frena en las diez",
  );
});

test("el side tampoco puede romper la afinidad", () => {
  // El mazo principal es de Dragón; un Oni en el side lo rompe igual, porque
  // el side entra al mazo entre partidas.
  const base = mazoLegal("Dragón");
  const oni = cards.find((c) => c.tipo === "Aliado" && c.raza === "Oni")!;
  const conOni = addCard(base, oni.id, "side");
  assert.ok(
    validateDeck(conOni, index).some((i) => i.code === "afinidad-incompatible"),
    "una raza ajena en el side deja el mazo ilegal",
  );

  const rc = index.porId.get(oni.id)!;
  assert.equal(
    canAdd(base, rc, "side", index).ok,
    false,
    "y el boton + tampoco deja agregarla",
  );

  // La otra raza de la escuela si entra: Dragón y Guerrero son Dragones de Ley.
  const guerrero = cards.find((c) => c.tipo === "Aliado" && c.raza === "Guerrero")!;
  const conGuerrero = addCard(base, guerrero.id, "side");
  assert.ok(
    !validateDeck(conGuerrero, index).some((i) => i.code === "afinidad-incompatible"),
    "la escuela entera sigue siendo legal en el side",
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

/* ------------------------------------------------------------------ *
 * Afinidad por atributo (Luz / Oscuridad)
 *
 * Llega con Steampunk, la primera edicion que los imprime. Es la tercera forma
 * de armar un mazo, alternativa a la raza y a la escuela: no las reemplaza ni
 * se suma a ellas.
 * ------------------------------------------------------------------ */

const aliadosLuz = cards.filter((c) => c.tipo === "Aliado" && c.atributo === "Luz");
const aliadosOscuridad = cards.filter(
  (c) => c.tipo === "Aliado" && c.atributo === "Oscuridad",
);

test("el catalogo trae Aliados Luz y Oscuridad de varias razas", () => {
  // Si esto falla, los tests de abajo no estan probando nada.
  assert.ok(aliadosLuz.length > 0 && aliadosOscuridad.length > 0);
  const razasLuz = new Set(aliadosLuz.map((c) => c.raza));
  assert.ok(razasLuz.size > 2, "la gracia del atributo es que cruza escuelas");
});

test("un atributo comun sostiene un mazo que la raza no explica", () => {
  // Sacerdote y Heroe son de escuelas distintas (Heroe no tiene ninguna), asi
  // que por raza este mazo seria ilegal. Por atributo no lo es.
  const af = porAtributo("Luz", "Sacerdote", "Héroe");
  assert.deepEqual(modos(af), ["atributo"]);
  assert.equal(affinityLabel(af), "Luz");
});

test("un Aliado sin atributo cierra la via del atributo", () => {
  // Un Aliado neutro no es "de los dos": no hay mazo Luz que lo admita.
  const conNeutro = deckAffinity({
    razas: new Set<Raza>(["Sacerdote", "Héroe"]),
    atributos: new Set<Atributo>(["Luz"]),
    neutros: true,
  });
  assert.deepEqual(conNeutro.vias, [], "y sin via de raza, el mazo es ilegal");

  // Con una sola raza el mazo se sostiene igual, pero por la raza, no por Luz.
  const monoRaza = deckAffinity({
    razas: new Set<Raza>(["Héroe"]),
    atributos: new Set<Atributo>(["Luz"]),
    neutros: true,
  });
  assert.deepEqual(modos(monoRaza), ["raza"]);
});

test("Luz y Oscuridad no se mezclan", () => {
  const mezcla = deckAffinity({
    razas: new Set<Raza>(["Héroe", "Sombra"]),
    atributos: new Set<Atributo>(["Luz", "Oscuridad"]),
    neutros: false,
  });
  assert.deepEqual(mezcla.vias, []);
});

test("un mazo de Aliados Luz de varias razas es legal", () => {
  const deck = mazoConAliados((c) => c.atributo === "Luz");
  const stats = deckStats(resolveDeck(deck, index));
  const issues = validateDeck(deck, index);

  assert.ok(stats.razas.size > 1, "y de verdad cruza razas");
  assert.deepEqual(modos(stats.afinidad), ["atributo"]);
  assert.ok(isLegal(issues), `deberia ser legal: ${issues.map((i) => i.mensaje)}`);

  // Un Aliado del atributo contrario lo rompe, venga por donde venga.
  const conOscuridad = addCard(deck, aliadosOscuridad[0].id, "side");
  assert.ok(
    validateDeck(conOscuridad, index).some((i) => i.code === "afinidad-incompatible"),
    "el side tampoco puede romper el atributo",
  );
  assert.equal(
    canAdd(deck, index.porId.get(aliadosOscuridad[0].id)!, "side", index).ok,
    false,
    "y el boton + tampoco deja agregarlo",
  );
});

test("el atributo solo restringe a los Aliados", () => {
  // Decision del proyecto: un Talisman Oscuridad cabe en un mazo Luz, igual
  // que un Talisman cualquiera cabe en un mazo de una raza que no es la suya.
  const talismanOscuro = cards.find(
    (c) => c.tipo !== "Aliado" && c.atributo === "Oscuridad",
  );
  assert.ok(talismanOscuro, "Steampunk imprime cartas de atributo que no son Aliados");

  const deck = mazoConAliados((c) => c.atributo === "Luz");
  const { afinidad } = deckStats(resolveDeck(deck, index));
  assert.ok(admite(afinidad, talismanOscuro));
  assert.ok(canAdd(deck, index.porId.get(talismanOscuro.id)!, "side", index).ok);
});
