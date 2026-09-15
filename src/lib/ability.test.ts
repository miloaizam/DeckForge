import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { splitAbility, KEYWORD_EN_PROSA } from "./ability";
import { catalogSchema, KEYWORDS_IMPRESAS, type Card } from "./types";

/**
 * Van contra el catalogo real: el bug que motivo estas pruebas solo aparecia en
 * dos ediciones, y con un fixture escrito a mano no habria salido nunca.
 */
const CATALOGO: Card[] = catalogSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "public/data/cards.json"), "utf8")),
);

/** Las keywords se declaran al inicio; esto detecta que el texto abre con una. */
const ABRE_CON_KEYWORD = new RegExp(
  `^(?:${KEYWORDS_IMPRESAS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`,
  "u",
);

test("reconoce la keyword declarada a secas, como la imprimen Bushido y Sol Naciente", () => {
  const { keywords, cuerpo } = splitAbility(
    "Única. Furia. Cuando este Aliado entra en juego, Roba una carta.",
  );
  assert.deepEqual(keywords, ["Única", "Furia"]);
  assert.equal(cuerpo, "Cuando este Aliado entra en juego, Roba una carta.");
});

test("reconoce la keyword con el recordatorio entre parentesis de Dominio y ContraAtaque", () => {
  const { keywords, cuerpo } = splitAbility(
    "Única (Sólo puedes tener una copia de esta carta en tu Mazo Castillo).\n" +
      "Furia (Este Aliado no necesita pasar por una Fase de Agrupación para ser declarado atacante).\n" +
      "Cuando este Aliado entra en juego, Roba una carta.",
  );
  assert.deepEqual(keywords, ["Única", "Furia"]);
  assert.equal(cuerpo, "Cuando este Aliado entra en juego, Roba una carta.");
});

test("el recordatorio no se cuela en el cuerpo ni en la fila de keywords", () => {
  const { keywords, cuerpo } = splitAbility(
    "Guardián (Este Aliado no puede ser declarado atacante).\nRoba una carta.",
  );
  assert.deepEqual(keywords, ["Guardián"]);
  assert.ok(!cuerpo.includes("("), `el cuerpo arrastro el recordatorio: ${cuerpo}`);
});

test("una keyword dentro de la prosa se resalta con y sin recordatorio", () => {
  for (const texto of [
    "Ese Aliado gana Furia. Luego, Roba una carta.",
    "Ese Aliado gana Furia (No necesita pasar por una Fase de Agrupación). Luego, Roba una carta.",
  ]) {
    const trozos = texto.split(KEYWORD_EN_PROSA);
    assert.ok(trozos.includes("Furia"), `no resalto la keyword en: ${texto}`);
  }
});

test("no confunde una palabra que solo empieza igual", () => {
  assert.deepEqual(splitAbility("Deshonor. Roba una carta.").keywords, []);
});

test("toda carta del catalogo que abre con keyword la muestra en su fila", () => {
  const mudas = CATALOGO.filter(
    (c) =>
      c.habilidad &&
      ABRE_CON_KEYWORD.test(c.habilidad) &&
      splitAbility(c.habilidad).keywords.length === 0,
  );
  assert.deepEqual(
    mudas.map((c) => c.codigo),
    [],
    "estas cartas declaran una keyword que la UI no esta pintando",
  );
});

test("ninguna edicion se queda sin keywords declaradas", () => {
  const porEdicion = new Map<string, number>();
  for (const c of CATALOGO) {
    if (c.habilidad && splitAbility(c.habilidad).keywords.length > 0) {
      porEdicion.set(c.edicion, (porEdicion.get(c.edicion) ?? 0) + 1);
    }
  }
  for (const edicion of new Set(CATALOGO.map((c) => c.edicion))) {
    assert.ok(
      (porEdicion.get(edicion) ?? 0) > 0,
      `${edicion} no muestra ninguna keyword declarada`,
    );
  }
});
