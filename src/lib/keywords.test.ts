import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { keywordsPropias } from "./ability";
import { catalogSchema, KEYWORDS_IMPRESAS, type Card } from "./types";

/**
 * El campo `keywords` es lo que filtra el catalogo por habilidad, y tiene que
 * significar UNA sola cosa: la carta tiene esa keyword.
 *
 * La API no lo garantiza —sus flags marcan la mencion, no la posesion: Kaidan
 * (SN-139) llegaba etiquetado Indestructible porque convierte tus Oros en
 * Aliados Indestructibles—, asi que el campo se deriva de lo que la carta
 * declara y esta prueba vigila que no se vuelva a colar una mencion.
 *
 * Va contra el catalogo real, como ability.test.ts: eran 201 etiquetas falsas
 * repartidas por las nueve ediciones y ningun fixture escrito a mano las habria
 * destapado.
 */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);

/**
 * Las unicas cartas que TIENEN una keyword sin declararla: su propio texto se
 * la atribuye bajo una condicion de juego ("Mientras este Aliado porte un Arma
 * es Imbloqueable"). Son trece en 1833 cartas, no hay forma de reconocerlas sin
 * entender la frase, y por eso van a mano en `data-src/`.
 *
 * Lo que NO entra aqui es el aura sobre una clase de Aliados ("los Aliados de
 * Raza Heroe que controles son Indestructibles"), aunque alcance a la propia
 * carta: eso es repartir la keyword, y a esas cartas el jugador llega por el
 * filtro de raza. La linea es que el texto se nombre a si mismo.
 */
const CONDICIONALES: Record<string, string[]> = {
  "BU-041": ["Imbloqueable"], // si controlas Aliados de coste 3 o menos, este Aliado es Imbloqueable
  "BU-185": ["Imbloqueable"], // Mientras este Aliado porte un Arma es Imbloqueable
  "CA-040": ["Imbloqueable"], // Mientras tengas cuatro o menos cartas en tu mano, este Aliado es Imbloqueable
  "CA-096": ["Imbloqueable"], // Mientras todos los demas Aliados que controles sean de Raza Caballero, este Aliado es Imbloqueable
  "CA-098": ["Imbloqueable"], // puedes pagar un Oro para que este Aliado sea Imbloqueable
  "AI-086": ["Indestructible"], // Cuando este Aliado sea declarado atacante, es Indestructible
  "BU-055": ["Indestructible"], // Mientras no haya Aliados en tu Cementerio, este Aliado es Indestructible
  "BU-186": ["Indestructible"], // Mientras este Aliado porte un Arma es Indestructible
  "CA-051": ["Indestructible"], // Mientras todos los Aliados que controles sean de Raza Ancestral, este Aliado es Indestructible
  "SN-004": ["Indestructible"], // Mientras todos los Aliados que controles sean de Raza Samurai, este Aliado es Indestructible
  "SP-011": ["Indestructible"], // Mientras esa carta este en juego, este Aliado es Indestructible
  "AI-146": ["Furia"], // puedes elegir que este Aliado tenga Furia hasta la Fase Final
  "LG-180": ["Retador"], // Mientras todos los Aliados que controles sean Oscuridad..., este Aliado tiene Retador
};

test("ninguna carta lleva una keyword que no se declara a si misma", () => {
  const sobran = CATALOGO.flatMap((c) => {
    const propias = new Set([
      ...keywordsPropias(c.habilidad),
      ...(CONDICIONALES[c.codigo] ?? []),
    ]);
    return c.keywords
      .filter((k) => !propias.has(k))
      .map((k) => `${c.codigo} ${c.nombre}: ${k}`);
  });
  assert.deepEqual(sobran, []);
});

test("ninguna carta se deja fuera una keyword que declara", () => {
  const faltan = CATALOGO.flatMap((c) =>
    keywordsPropias(c.habilidad)
      .filter((k) => !c.keywords.includes(k))
      .map((k) => `${c.codigo} ${c.nombre}: ${k}`),
  );
  assert.deepEqual(faltan, []);
});

test("el campo keywords solo trae keywords impresas, sin etiquetas de la API", () => {
  // La API mezcla sus propias etiquetas de busqueda ("Destruir", "que
  // controles") con las keywords del juego. El filtro las descarta contra
  // KEYWORDS_IMPRESAS, pero en los datos tampoco pintan nada.
  const impresas = new Set<string>(KEYWORDS_IMPRESAS);
  const intrusas = [
    ...new Set(CATALOGO.flatMap((c) => c.keywords).filter((k) => !impresas.has(k))),
  ];
  assert.deepEqual(intrusas, []);
});

test("cada condicional de la lista sigue existiendo y sin declarar la keyword", () => {
  // Si una correccion futura hace que la carta declare la keyword de verdad, la
  // excepcion sobra y esta prueba lo dice en vez de dejarla envejecer sola.
  for (const [codigo, keywords] of Object.entries(CONDICIONALES)) {
    const card = CATALOGO.find((c) => c.codigo === codigo);
    assert.ok(card, `${codigo} ya no esta en el catalogo`);
    const propias = keywordsPropias(card.habilidad);
    for (const k of keywords) {
      assert.ok(card.keywords.includes(k), `${codigo} perdio la keyword ${k}`);
      assert.ok(!propias.includes(k), `${codigo} ya declara ${k}: sobra la excepcion`);
    }
  }
});

test("una carta que reparte la keyword no se la queda", () => {
  // Kaidan, el caso que destapo todo: convierte tus Oros en Aliados
  // Indestructibles, y el Talisman no es Indestructible.
  const kaidan = CATALOGO.find((c) => c.codigo === "SN-139");
  assert.ok(kaidan);
  assert.ok(kaidan.habilidad.includes("Indestructibles"));
  assert.deepEqual(kaidan.keywords, []);
});

test("la declaracion cuenta aunque no abra el texto", () => {
  // Pulcinela antepone una condicion de juego y declara Guardian en la segunda
  // linea. Asi se escapo de la revision a mano de Guardian, que miraba la
  // primera.
  const pulcinela = CATALOGO.find((c) => c.codigo === "DO-176");
  assert.ok(pulcinela);
  assert.ok(pulcinela.keywords.includes("Guardián"));
});

test("keywordsPropias no confunde repartir con tener", () => {
  assert.deepEqual(
    keywordsPropias(
      "Hasta la Fase Final, los Oros que controlas se Convierten en Aliados de Fuerza 2 Indestructibles.",
    ),
    [],
  );
  assert.deepEqual(
    keywordsPropias("El Aliado portador gana 1 a la Fuerza y es Imbloqueable."),
    [],
  );
  assert.deepEqual(
    keywordsPropias(
      "Puedes jugar este Aliado en Guerra de Talismanes.\n" +
        "Guardián (Este Aliado no puede ser declarado atacante).\n" +
        "Cuando este Aliado entra en juego, Roba una carta.",
    ),
    ["Guardián"],
  );
  assert.deepEqual(
    keywordsPropias("Oscuridad.\nTraición - Botar dos cartas (…).\nFuria (…)."),
    ["Oscuridad", "Traición", "Furia"],
  );
});
