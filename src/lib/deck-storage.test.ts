import { test } from "node:test";
import assert from "node:assert/strict";

import { createDeck, setQuantity } from "./deck";
import { parseDecks, MAX_MAZOS } from "./deck-storage";

/**
 * `localStorage` lo puede editar el usuario o cualquier extension del
 * navegador, asi que lo que importa aqui es que ninguna entrada rara lance ni
 * se lleve por delante los mazos que si estan bien.
 */

const sobre = (mazos: unknown[]) => JSON.stringify({ v: 1, mazos });

test("lee un sobre normal", () => {
  const uno = setQuantity(createDeck("Uno"), "bu-001", "principal", 3);
  const dos = createDeck("Dos");
  const leidos = parseDecks(sobre([uno, dos]));
  assert.equal(leidos.length, 2);
  assert.equal(leidos[0].nombre, "Uno");
});

test("un mazo corrupto no se lleva a los demas", () => {
  const bueno = createDeck("Bueno");
  const leidos = parseDecks(sobre([{ nombre: "roto" }, bueno, null, 42, []]));
  assert.equal(leidos.length, 1, "el bueno se rescata");
  assert.equal(leidos[0].nombre, "Bueno");
});

test("acepta tambien un array pelado, por si el sobre cambia", () => {
  assert.equal(parseDecks(JSON.stringify([createDeck("Suelto")])).length, 1);
});

test("nada de lo que llegue hace lanzar", () => {
  const basura = [
    null,
    "",
    "{",
    "no es json",
    "null",
    "[]",
    "42",
    '"texto"',
    JSON.stringify({ v: 1 }),
    JSON.stringify({ v: 1, mazos: "no es lista" }),
    sobre([{ v: 99, id: "x" }]),
  ];
  for (const raw of basura) {
    assert.doesNotThrow(() => parseDecks(raw), `deberia aguantar ${raw}`);
    assert.ok(Array.isArray(parseDecks(raw)));
  }
});

test("un valor gigante se descarta antes de parsearlo", () => {
  assert.deepEqual(parseDecks("x".repeat(600 * 1024)), []);
});

test("se acota el numero de mazos", () => {
  const muchos = Array.from({ length: MAX_MAZOS + 20 }, (_, i) => createDeck(`M${i}`));
  assert.equal(parseDecks(sobre(muchos)).length, MAX_MAZOS);
});
