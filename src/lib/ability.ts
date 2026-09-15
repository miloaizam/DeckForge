import { KEYWORDS_IMPRESAS } from "./types";

/**
 * Separa las keywords declaradas al inicio del texto de habilidad del resto de
 * la prosa.
 *
 * El juego imprime las keywords como declaraciones sueltas antes del efecto
 * ("Única. Furia. Cuando este Aliado entra en juego..."), a veces cada una en
 * su linea y a veces encadenadas en el mismo parrafo. La UI las quiere en una
 * fila propia, separadas del cuerpo, asi que hay que reconocerlas.
 */

const ALTERNATIVA = KEYWORDS_IMPRESAS.map((k) =>
  k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
).join("|");

/**
 * El recordatorio de reglas que algunas ediciones imprimen tras la keyword.
 *
 * Bushido y Sol Naciente declaran la keyword a secas ("Unica. Furia."), pero
 * Dominio y ContraAtaque le pegan la explicacion entre parentesis ("Unica
 * (Solo puedes tener una copia de esta carta en tu Mazo Castillo)."). Es el
 * mismo texto de reglas repetido carta a carta, asi que no entra en la fila de
 * keywords: solo hay que saltarlo para llegar al punto que cierra.
 */
const RECORDATORIO = "(?:\\s*\\([^)]*\\))?";

/**
 * Lo que cierra una declaracion: el punto, o el final de la linea.
 *
 * En ContraAtaque hay cartas donde el punto no llega y la declaracion termina
 * en el parentesis ("Furia (...)\nCuando este Aliado..."). Dentro del bloque
 * inicial eso no es ambiguo, porque cada vuelta tiene que empezar por una
 * keyword; en la prosa si lo seria, y por eso alli se sigue exigiendo el punto.
 */
const FIN_DECLARACION = `${RECORDATORIO}(?:\\.|(?=\\n|$))`;

/**
 * El coste que algunas keywords llevan pegado, con Hijos del Sol: "Traición -
 * Destierra la primera carta de tu Mazo Castillo".
 *
 * Eso NO es una declaracion suelta y por eso no entra en `FIN_DECLARACION`: el
 * coste es texto de reglas que hay que seguir leyendo, y meterlo en la fila de
 * keywords lo perderia. La linea se queda en el cuerpo y solo se resalta la
 * palabra, que es justo lo que hace la carta —negrita la keyword, redonda el
 * coste—.
 */
const COSTE_DE_KEYWORD = "\\s-\\s";

/** Una o mas declaraciones seguidas, ancladas al comienzo del texto. */
const DECLARACION_INICIAL = new RegExp(
  `^(?:(?:${ALTERNATIVA})${FIN_DECLARACION}\\s*)+`,
  "u",
);

/** Cada keyword dentro de ese bloque inicial. */
const CADA_KEYWORD = new RegExp(`(${ALTERNATIVA})${FIN_DECLARACION}`, "gu");

/**
 * Las keywords que aparecen dentro de la prosa (no declaradas) se resaltan en
 * su lugar. Exigir el punto evita marcar la palabra cuando es parte de la
 * frase; el lookbehind sobre \p{L} hace de frontera izquierda para que
 * "Deshonor." no cuente como "Honor". No se usa \b porque JavaScript lo define
 * sobre [A-Za-z0-9_] y fallaria con "Única", que empieza con letra acentuada.
 *
 * La segunda alternativa es la keyword con coste: ahi el ancla es el guion, no
 * el punto, y tampoco es ambigua —ninguna frase del juego escribe una keyword
 * seguida de " - "—.
 */
export const KEYWORD_EN_PROSA = new RegExp(
  `(?<![\\p{L}\\p{N}])(${ALTERNATIVA})(?=${RECORDATORIO}\\.|${COSTE_DE_KEYWORD})`,
  "gu",
);

/**
 * Una keyword con coste abriendo el texto ("Traición - Descartar una carta").
 *
 * No va a la fila de keywords, asi que el test del catalogo la tiene que
 * distinguir de una declaracion que la UI se este comiendo.
 */
export const ABRE_CON_KEYWORD_CON_COSTE = new RegExp(
  `^(${ALTERNATIVA})${COSTE_DE_KEYWORD}`,
  "u",
);

export interface Habilidad {
  /** Keywords declaradas al inicio, en el orden impreso. */
  keywords: string[];
  /** El resto del texto, ya sin esas declaraciones. */
  cuerpo: string;
}

export function splitAbility(text: string): Habilidad {
  const inicio = DECLARACION_INICIAL.exec(text);
  if (!inicio) return { keywords: [], cuerpo: text };

  return {
    keywords: [...inicio[0].matchAll(CADA_KEYWORD)].map((m) => m[1]),
    cuerpo: text.slice(inicio[0].length).trimStart(),
  };
}
