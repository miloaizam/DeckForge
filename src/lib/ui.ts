import { cn } from "./utils";

/**
 * Clases compartidas entre componentes, para lo que tiene que verse igual en
 * toda la app y se escribia suelto en cada archivo.
 *
 * Sin "use client" a proposito: es un string, y una constante exportada desde
 * un modulo de cliente le llega a un Server Component como referencia, no como
 * valor (mismo motivo por el que THEME_KEY vive en theme.ts).
 */

/**
 * Campo de texto de una linea: el buscador del catalogo y el nombre del mazo.
 *
 * Van juntos porque en /builder se ven uno al lado del otro: el nombre del
 * mazo llevaba `bg-surface` y quedaba hundido contra el panel, mientras el
 * buscador iba en `bg-panel`. Para el icono del buscador basta sobrescribir el
 * padding con cn(), que resuelve el conflicto con twMerge.
 */
export const TEXT_FIELD =
  "border-line bg-panel text-ink placeholder:text-muted focus-visible:outline-brand-500 rounded-chip h-11 w-full border px-3 text-sm";

/**
 * El nombre del mazo en /builder: la misma caja del buscador, mas cuadrada y
 * mas alta, que es lo primero del panel y conviene que pese.
 *
 * El fondo lo pone quien lo usa: en el panel de escritorio va `bg-surface`
 * sobre el panel, y en la hoja del movil se queda con el `bg-panel` de aqui
 * sobre la hoja. En los dos casos el campo contrasta con lo que tiene detras.
 *
 * `shrink-0` no es decorativo: en el panel es un hijo de un flex en columna, y
 * en cuanto el mazo tiene cartas suficientes para desbordar, el navegador
 * aplasta los items que pueden encogerse. El campo pasaba de 48px a 20 en
 * cuanto se empezaba a armar el mazo, que es justo cuando se usa.
 */
export const DECK_NAME_FIELD = cn(TEXT_FIELD, "h-12 shrink-0 rounded-md");

/**
 * La descripcion del mazo: la misma caja del nombre, pero de dos lineas y con
 * la tipografia de un pie, que es una nota y no un titulo.
 *
 * `resize-none` porque el alto lo fija `rows`: un textarea estirable dentro de
 * un panel que ya scrollea confunde mas que ayuda.
 */
export const DECK_NOTE_FIELD = cn(
  TEXT_FIELD,
  "h-auto shrink-0 resize-none rounded-md py-2 text-[13px] leading-snug",
);
