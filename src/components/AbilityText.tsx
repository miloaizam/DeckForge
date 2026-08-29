import { KEYWORDS_IMPRESAS } from "@/lib/types";

/**
 * Las keywords se declaran seguidas de punto ("Única." / "Furia."), a veces en
 * su propia linea y a veces encadenadas al inicio del parrafo. Exigir el punto
 * evita resaltar la palabra cuando aparece en medio de la prosa.
 *
 * El lookbehind sobre \p{L} hace de frontera izquierda para que "Deshonor." no
 * cuente como "Honor". No se usa \b: JavaScript lo define sobre [A-Za-z0-9_],
 * asi que fallaria justo con "Única", que empieza con una letra acentuada.
 */
const KEYWORD_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${KEYWORDS_IMPRESAS.map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})(?=\\.)`,
  "gu",
);

interface AbilityTextProps {
  text: string;
}

/**
 * Renderiza la habilidad resaltando las keywords del juego.
 *
 * Construye nodos de React a partir del texto: nunca HTML crudo, porque el
 * texto viene de una fuente externa (ver la seccion de seguridad de CLAUDE.md).
 */
export function AbilityText({ text }: AbilityTextProps) {
  return (
    <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line">
      {text.split(KEYWORD_PATTERN).map((chunk, i) =>
        // split() con grupo de captura intercala los match en indices impares.
        i % 2 === 1 ? (
          <strong key={i} className="text-brand-300 font-semibold">
            {chunk}
          </strong>
        ) : (
          chunk
        ),
      )}
    </p>
  );
}
