import { KEYWORDS_IMPRESAS } from "./types";

/**
 * Separa las keywords que la carta declara del resto de la prosa.
 *
 * El juego imprime las keywords como declaraciones sueltas antes del efecto
 * ("Única. Furia. Cuando este Aliado entra en juego..."), a veces cada una en
 * su linea, a veces encadenadas en el mismo parrafo y a veces despues de una
 * condicion de juego ("Puedes jugar este Aliado en Guerra de Talismanes.
 * Guardián. Cuando..."). La interfaz las quiere todas arriba, en una fila
 * propia, y debajo el texto: por eso esto es un analizador por lineas que va
 * consumiendo declaraciones mientras haya, en vez de mirar solo el comienzo.
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
 * mismo texto de reglas repetido carta a carta y **no se muestra**: lo que hace
 * cada keyword es conocimiento comun del formato, y repetirlo en cada carta
 * ahoga el efecto, que es lo unico que cambia de una a otra.
 */
const RECORDATORIO = "(?:\\s*\\([^)]*\\))?";

/**
 * Lo que cierra una declaracion: el punto, o el final de la linea.
 *
 * En ContraAtaque hay cartas donde el punto no llega y la declaracion termina
 * en el parentesis ("Furia (...)\nCuando este Aliado..."). Dentro de una
 * declaracion eso no es ambiguo, porque la linea tiene que empezar por una
 * keyword; en la prosa si lo seria, y por eso alli se sigue exigiendo el punto.
 */
const FIN_DECLARACION = `${RECORDATORIO}(?:\\.|(?=\\n|$))`;

/**
 * El guion que separa la keyword de su parametro: "Traición - Destierra la
 * primera carta de tu Mazo Castillo", "Inmunidad - Cartas Luz".
 */
const GUION_DE_PARAMETRO = "\\s-\\s";

/**
 * Las keywords cuyo parametro dice A QUE se aplican, no que cuesta activarlas.
 *
 * Es la unica diferencia de formato de la fila: `Inmunidad (Cartas Luz)` lee
 * como lo que es, una salvedad; con el guion de la carta pareceria un coste,
 * que es lo que si lleva `Traición - Botar dos cartas`.
 */
const KEYWORDS_CON_OBJETIVO: readonly string[] = ["Inmunidad"];

/** Una declaracion suelta al comienzo de lo que queda de linea. */
const DECLARACION = new RegExp(`^(${ALTERNATIVA})${FIN_DECLARACION}\\s*`, "u");

/**
 * Una declaracion con parametro. El parametro llega hasta el recordatorio o
 * hasta el punto, lo que venga antes: `[^.(\n]` corta en los dos.
 */
const DECLARACION_CON_PARAMETRO = new RegExp(
  `^(${ALTERNATIVA})${GUION_DE_PARAMETRO}([^.(\\n]+?)\\s*${FIN_DECLARACION}\\s*`,
  "u",
);

/**
 * Las keywords que aparecen dentro de la prosa (no declaradas) se resaltan en
 * su lugar. Exigir el punto evita marcar la palabra cuando es parte de la
 * frase; el lookbehind sobre \p{L} hace de frontera izquierda para que
 * "Deshonor." no cuente como "Honor". No se usa \b porque JavaScript lo define
 * sobre [A-Za-z0-9_] y fallaria con "Única", que empieza con letra acentuada.
 *
 * La segunda alternativa es la keyword con parametro: ahi el ancla es el guion,
 * no el punto, y tampoco es ambigua —ninguna frase del juego escribe una
 * keyword seguida de " - "—.
 */
export const KEYWORD_EN_PROSA = new RegExp(
  `(?<![\\p{L}\\p{N}])(${ALTERNATIVA})(?=${RECORDATORIO}\\.|${GUION_DE_PARAMETRO})`,
  "gu",
);

/**
 * Una keyword con parametro abriendo el texto ("Traición - Descartar una
 * carta"). El test del catalogo la usa para no confundirla con una declaracion
 * que la UI se este comiendo.
 */
export const ABRE_CON_KEYWORD_CON_COSTE = new RegExp(
  `^(${ALTERNATIVA})${GUION_DE_PARAMETRO}`,
  "u",
);

/**
 * Terminos del juego que NO son keywords filtrables pero llevan su mismo
 * recordatorio de reglas, y por lo tanto tampoco hay que explicarlos.
 *
 * Son mecanicas —cosas que la carta HACE— y por eso quedaron fuera de
 * `KEYWORDS_IMPRESAS` (ver la seccion de datos de CLAUDE.md). El recordatorio
 * es el mismo trozo repetido carta a carta: "(Cada carta elegida, puedes
 * Desterrarla o Barajarla en el Mazo Castillo de su dueño)" sale en trece.
 *
 * Van por raiz y no por palabra entera porque la carta las conjuga:
 * "Alimenta", "Alimentarlo", "Purificarlas", "Purifícala".
 */
const MECANICAS = ["Alimenta", "Alimento", "Purifica", "Purifíca", "Honor"]
  .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

/**
 * El recordatorio de reglas dentro del cuerpo: el parentesis cuya MISMA FRASE
 * nombra la habilidad que explica.
 *
 * El ancla es la frase y no la palabra pegada porque la carta mete texto en
 * medio: "Esos Aliados ganan Furia hasta la Fase Final (No necesitan pasar por
 * una Fase de Agrupación...)". `[^.\n]` es lo que la acota: no se cruza un
 * punto, asi que el parentesis solo se va si lo que explica esta en su propia
 * frase.
 *
 * Eso deja en pie los parentesis que son reglas de verdad y no explicaciones
 * —"(El nuevo objetivo debe ser válido)", "(Si tienes cero cartas pierdes el
 * juego)", "(Ese Aliado entra en juego bajo tu control)"—, que es justo lo que
 * hay que conservar: son de la carta, no del formato.
 */
const RECORDATORIO_EN_EL_CUERPO = new RegExp(
  `((?:${ALTERNATIVA}|${MECANICAS})[^.\\n]*?)\\s*\\([^)]*\\)`,
  "gu",
);

export interface KeywordDeclarada {
  /** La keyword impresa, tal cual, para el filtro y el resaltado. */
  keyword: string;
  /** Como se muestra: "Única.", "Inmunidad (Cartas Luz).", "Traición - Botar dos cartas." */
  texto: string;
}

export interface Habilidad {
  /** Lo que la carta declara, en el orden impreso. Va arriba del todo. */
  keywords: KeywordDeclarada[];
  /** El resto del texto, sin las declaraciones ni los recordatorios. */
  cuerpo: string;
}

function declaracion(keyword: string, parametro?: string): KeywordDeclarada {
  if (!parametro) return { keyword, texto: `${keyword}.` };
  const texto = KEYWORDS_CON_OBJETIVO.includes(keyword)
    ? `${keyword} (${parametro}).`
    : `${keyword} - ${parametro}.`;
  return { keyword, texto };
}

export function splitAbility(text: string): Habilidad {
  const keywords: KeywordDeclarada[] = [];
  const cuerpo: string[] = [];

  for (const linea of text.split("\n")) {
    let resto = linea;

    // Una linea puede encadenar varias ("Errante. Oscuridad. Inmunidad -
    // Cartas Luz."), asi que se consumen hasta que deje de haber.
    for (;;) {
      const suelta = DECLARACION.exec(resto);
      if (suelta) {
        keywords.push(declaracion(suelta[1]));
        resto = resto.slice(suelta[0].length);
        continue;
      }
      const conParametro = DECLARACION_CON_PARAMETRO.exec(resto);
      if (conParametro) {
        keywords.push(declaracion(conParametro[1], conParametro[2]));
        resto = resto.slice(conParametro[0].length);
        continue;
      }
      break;
    }

    // Una linea que era solo declaraciones desaparece: dejarla vacia abriria un
    // hueco, porque el cuerpo se pinta con `whitespace-pre-line`.
    const limpia = resto.replace(RECORDATORIO_EN_EL_CUERPO, "$1").trim();
    if (limpia) cuerpo.push(limpia);
  }

  return { keywords, cuerpo: cuerpo.join("\n") };
}

/**
 * Las keywords que la carta se declara a SI MISMA, mire donde mire.
 *
 * Espejo de `keywords_propias()` en scripts/schema.py, y la definicion de lo
 * que el campo `keywords` de la carta tiene que contener: es lo que filtra el
 * catalogo por habilidad.
 *
 * Lo que NO cuenta es mencionar la keyword ni repartirla a otras cartas: un
 * Talisman que dice "los Oros que controlas se Convierten en Aliados de Fuerza
 * 2 Indestructibles" no es Indestructible.
 */
export function keywordsPropias(text: string): string[] {
  return [...new Set(splitAbility(text).keywords.map((k) => k.keyword))];
}
