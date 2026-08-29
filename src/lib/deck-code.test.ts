import { test } from "node:test";
import assert from "node:assert/strict";
import lzString from "lz-string";

import { createDeck, setQuantity, setStartingGold } from "./deck";
import {
  decodeDeck,
  encodeDeck,
  exportFile,
  importFile,
  shareUrl,
  LARGO_INCOMODO,
} from "./deck-code";
import type { Deck } from "./types";

/**
 * El codigo del enlace y el archivo de respaldo son entrada externa: los puede
 * escribir cualquiera. Lo que se prueba aqui no es solo que el viaje de ida y
 * vuelta funcione, sino sobre todo que **nada de lo que llegue haga lanzar**.
 */

function mazoDePrueba(): Deck {
  let deck = setStartingGold(createDeck("Dragones de prueba"), "bu-225");
  deck = setQuantity(deck, "bu-001", "principal", 1);
  deck = setQuantity(deck, "bu-058", "principal", 3);
  deck = setQuantity(deck, "bu-045", "side", 2);
  return deck;
}

test("un mazo sobrevive el viaje de ida y vuelta", () => {
  const original = mazoDePrueba();
  const resultado = decodeDeck(encodeDeck(original));

  assert.ok(resultado.ok);
  assert.equal(resultado.deck.nombre, original.nombre);
  assert.equal(resultado.deck.oroInicial, original.oroInicial);
  assert.deepEqual(
    [...resultado.deck.principal].sort((a, b) => a.id.localeCompare(b.id)),
    [...original.principal].sort((a, b) => a.id.localeCompare(b.id)),
  );
  assert.deepEqual(resultado.deck.side, original.side);
});

test("el mazo decodificado trae id propio y no el del que lo compartio", () => {
  const original = mazoDePrueba();
  const resultado = decodeDeck(encodeDeck(original));
  assert.ok(resultado.ok);
  assert.notEqual(resultado.deck.id, original.id, "el id local no debe viajar");
});

test("un mazo lleno cabe comodo en una URL", () => {
  // 50 cartas distintas es el peor caso realista para el largo del codigo.
  let deck = setStartingGold(createDeck("Mazo largo"), "bu-225");
  for (let i = 1; i <= 49; i++) {
    deck = setQuantity(deck, `bu-${String(i).padStart(3, "0")}`, "principal", 1);
  }
  const url = shareUrl(deck, "https://deckforge-myl.pages.dev");
  assert.ok(
    url.length < LARGO_INCOMODO,
    `la URL mide ${url.length} y deberia bajar de ${LARGO_INCOMODO}`,
  );
  assert.match(url, /\/mazo\/\?d=/, "la ruta lleva barra final antes del parametro");
});

test("decodeDeck no lanza con basura", () => {
  const basura = [
    null,
    undefined,
    "",
    "no-es-un-codigo",
    "////",
    "%%%%",
    "a".repeat(5000),
    encodeDeck(mazoDePrueba()).slice(0, 12), // cortado a la mitad
  ];
  for (const c of basura) {
    const r = decodeDeck(c as string);
    assert.equal(r.ok, false, `deberia rechazar ${JSON.stringify(c)?.slice(0, 20)}`);
    assert.ok(r.ok === false && r.mensaje.length > 0, "y explicar por que");
  }
});

test("un codigo demasiado largo se rechaza antes de descomprimir", () => {
  const r = decodeDeck("x".repeat(5000));
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.motivo : "", "largo");
});

test("un codigo de otra version se distingue de uno ilegible", () => {
  // Forma perfectamente valida, version desconocida: el usuario merece saber
  // que el enlace es de otra version, no que "no se pudo leer".
  const deOtraVersion = lzString.compressToEncodedURIComponent(
    JSON.stringify([99, "Del futuro", null, [], []]),
  );
  const r = decodeDeck(deOtraVersion);
  assert.equal(r.ok, false);
  assert.equal(r.ok === false ? r.motivo : "", "version");

  // Y la version actual si se lee.
  assert.ok(decodeDeck(encodeDeck(mazoDePrueba())).ok);
});

test("el archivo de respaldo va y vuelve", () => {
  const mazos = [mazoDePrueba(), createDeck("Otro")];
  const resultado = importFile(exportFile(mazos));

  assert.ok(resultado);
  assert.equal(resultado.mazos.length, 2);
  assert.equal(resultado.descartados, 0);
  assert.equal(resultado.mazos[0].nombre, "Dragones de prueba");
});

test("importar asigna ids nuevos, para no pisar lo que ya habia", () => {
  const original = mazoDePrueba();
  const resultado = importFile(exportFile([original]));
  assert.ok(resultado);
  assert.notEqual(resultado.mazos[0].id, original.id);
});

test("importFile rescata los mazos buenos y cuenta los malos", () => {
  const bueno = mazoDePrueba();
  const archivo = JSON.stringify({
    app: "deckforge",
    v: 1,
    mazos: [bueno, { nombre: "roto" }, null, 42],
  });

  const resultado = importFile(archivo);
  assert.ok(resultado);
  assert.equal(resultado.mazos.length, 1, "el bueno se rescata");
  assert.equal(resultado.descartados, 3, "los tres malos se cuentan");
});

test("importFile no lanza con basura", () => {
  for (const c of ["", "{", "null", "[]", '{"app":"otra","v":1,"mazos":[]}', "[1,2,3]"]) {
    assert.doesNotThrow(() => importFile(c));
  }
  assert.equal(importFile("no es json"), null);
});
