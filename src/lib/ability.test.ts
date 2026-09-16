import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { splitAbility, ABRE_CON_KEYWORD_CON_COSTE, KEYWORD_EN_PROSA } from "./ability";
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

/** Los nombres de la fila, que es lo que se compara casi siempre. */
const fila = (texto: string) => splitAbility(texto).keywords.map((k) => k.keyword);

test("reconoce la keyword declarada a secas, como la imprimen Bushido y Sol Naciente", () => {
  const { keywords, cuerpo } = splitAbility(
    "Única. Furia. Cuando este Aliado entra en juego, Roba una carta.",
  );
  assert.deepEqual(
    keywords.map((k) => k.texto),
    ["Única.", "Furia."],
  );
  assert.equal(cuerpo, "Cuando este Aliado entra en juego, Roba una carta.");
});

test("reconoce la keyword con el recordatorio entre parentesis de Dominio y ContraAtaque", () => {
  const { keywords, cuerpo } = splitAbility(
    "Única (Sólo puedes tener una copia de esta carta en tu Mazo Castillo).\n" +
      "Furia (Este Aliado no necesita pasar por una Fase de Agrupación para ser declarado atacante).\n" +
      "Cuando este Aliado entra en juego, Roba una carta.",
  );
  assert.deepEqual(
    keywords.map((k) => k.texto),
    ["Única.", "Furia."],
  );
  assert.equal(cuerpo, "Cuando este Aliado entra en juego, Roba una carta.");
});

test("la declaracion sube a la fila aunque no abra el texto", () => {
  // Pulcinela antepone una condicion de juego y declara en la segunda linea.
  const { keywords, cuerpo } = splitAbility(
    "Puedes jugar este Aliado en Guerra de Talismanes.\n" +
      "Guardián (Este Aliado no puede ser declarado atacante).\n" +
      "Cuando este Aliado entra en juego, Roba una carta.",
  );
  assert.deepEqual(
    keywords.map((k) => k.texto),
    ["Guardián."],
  );
  assert.equal(
    cuerpo,
    "Puedes jugar este Aliado en Guerra de Talismanes.\n" +
      "Cuando este Aliado entra en juego, Roba una carta.",
  );
});

test("una linea puede encadenar varias declaraciones, con parametro incluido", () => {
  // Cain las escribe todas en la primera linea, y la Inmunidad no cierra en
  // punto sino en guion: un analizador que mire solo el comienzo la pierde.
  const { keywords, cuerpo } = splitAbility(
    "Errante. Oscuridad. Inmunidad - Cartas Luz.\nDestruye el Aliado objetivo.",
  );
  assert.deepEqual(
    keywords.map((k) => k.texto),
    ["Errante.", "Oscuridad.", "Inmunidad (Cartas Luz)."],
  );
  assert.equal(cuerpo, "Destruye el Aliado objetivo.");
});

test("la keyword con coste sube a la fila y conserva el coste", () => {
  // Lo que cuesta activar `Traición` es de la carta, no del formato, asi que
  // es lo unico del parentesis que no se tira.
  const { keywords, cuerpo } = splitAbility(
    "Traición - Descartar una carta de tu mano (En su Fase de Vigilia, tu " +
      "oponente puede pagar el coste de Traición de este Aliado para ganar su " +
      "control).\nAl comienzo de tu Fase de Vigilia, puedes Robar dos cartas.",
  );
  assert.deepEqual(
    keywords.map((k) => k.texto),
    ["Traición - Descartar una carta de tu mano."],
  );
  assert.equal(cuerpo, "Al comienzo de tu Fase de Vigilia, puedes Robar dos cartas.");
});

test("el recordatorio no se cuela en el cuerpo ni en la fila de keywords", () => {
  const { keywords, cuerpo } = splitAbility(
    "Guardián (Este Aliado no puede ser declarado atacante).\nRoba una carta.",
  );
  assert.deepEqual(
    keywords.map((k) => k.texto),
    ["Guardián."],
    "el recordatorio no entra en la fila",
  );
  assert.ok(!cuerpo.includes("("), `el cuerpo arrastro el recordatorio: ${cuerpo}`);
});

test("el recordatorio se va aunque la keyword no este pegada al parentesis", () => {
  // "gana Furia hasta la Fase Final (No necesita...)": el ancla es la frase.
  const { cuerpo } = splitAbility(
    "Ese Aliado gana Furia hasta la Fase Final (Ese Aliado no necesita pasar " +
      "por una Fase de Agrupación para ser declarado atacante).",
  );
  assert.equal(cuerpo, "Ese Aliado gana Furia hasta la Fase Final.");
});

test("un parentesis que es regla de verdad se queda", () => {
  // No explica una keyword: es lo que hace ESTA carta y no se puede tirar.
  for (const texto of [
    "Redirige el efecto de un Talismán que afecte a una de tus cartas (El nuevo objetivo debe ser válido).",
    "Baraja tu Cementerio con tu Mazo Castillo (Si tienes cero cartas pierdes el juego).",
  ]) {
    assert.equal(splitAbility(texto).cuerpo, texto);
  }
});

test("una keyword dentro de la prosa se resalta con y sin recordatorio", () => {
  for (const texto of [
    "Ese Aliado gana Furia. Luego, Roba una carta.",
    "Ese Aliado gana Furia (No necesita pasar por una Fase de Agrupación). Luego, Roba una carta.",
  ]) {
    const { cuerpo } = splitAbility(texto);
    assert.ok(
      cuerpo.split(KEYWORD_EN_PROSA).includes("Furia"),
      `no resalto la keyword en: ${texto}`,
    );
  }
});

test("no confunde una palabra que solo empieza igual", () => {
  assert.deepEqual(fila("Deshonor. Roba una carta."), []);
});

test("toda carta del catalogo que abre con keyword la muestra en su fila", () => {
  const mudas = CATALOGO.filter(
    (c) =>
      c.habilidad && ABRE_CON_KEYWORD.test(c.habilidad) && fila(c.habilidad).length === 0,
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
    if (c.habilidad && fila(c.habilidad).length > 0) {
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

test("el catalogo no deja ninguna keyword con coste sin su parametro", () => {
  // No es solo Traición: "Inmunidad - Cartas Luz" es la misma forma y sale en
  // catorce cartas de Legado Gótico. Se comprueba la keyword que abre cada
  // carta, sea cual sea, y no una fijada a mano.
  const conCoste = CATALOGO.map((c) => ({
    codigo: c.codigo,
    keyword: ABRE_CON_KEYWORD_CON_COSTE.exec(c.habilidad)?.[1],
    habilidad: c.habilidad,
  })).filter((c) => c.keyword !== undefined);

  assert.ok(conCoste.length > 0, "el catalogo deberia traer keywords con coste");

  const mudas = conCoste.filter((c) => {
    const entrada = splitAbility(c.habilidad).keywords.find(
      (k) => k.keyword === c.keyword,
    );
    // Sube a la fila y llega con su parametro, no como "Traición." a secas.
    return !entrada || entrada.texto === `${c.keyword}.`;
  });
  assert.deepEqual(
    mudas.map((c) => c.codigo),
    [],
    "estas cartas pierden el coste de su keyword al subirla a la fila",
  );
});

test("el catalogo no arrastra recordatorios al cuerpo", () => {
  // Los parentesis que quedan son reglas de la carta, no explicaciones del
  // formato. Si aparece uno nuevo pegado a una keyword, esta prueba lo dice.
  const conRecordatorio = CATALOGO.filter((c) => {
    const { cuerpo } = splitAbility(c.habilidad);
    return /(?:Única|Furia|Guardián|Exhumar|Imbloqueable|Indestructible|Errante|Retador|Ilusión|Espectral|Indesterrable|Mercenario|Inmunidad|Traición)[^.\n]*\(/u.test(
      cuerpo,
    );
  });
  assert.deepEqual(
    conRecordatorio.map((c) => c.codigo),
    [],
    "estas cartas siguen explicando una keyword en el cuerpo",
  );
});
