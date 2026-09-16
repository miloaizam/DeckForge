import { KEYWORD_EN_PROSA, splitAbility } from "@/lib/ability";

interface AbilityTextProps {
  text: string;
}

/**
 * Renderiza la habilidad de una carta: las keywords arriba y el efecto abajo.
 *
 * Arriba va todo lo que la carta declara, aunque en el impreso caiga despues de
 * una condicion de juego; abajo, solo lo que cambia de una carta a otra. Lo que
 * hace cada keyword no se explica —es conocimiento comun del formato y la carta
 * lo repite en un parentesis que ahoga el efecto—, salvo las dos cosas que si
 * son de la carta y no de la regla: el coste de `Traición` y a que se es
 * inmune.
 *
 * Todo se construye como nodos de React a partir del texto: nunca HTML crudo,
 * porque el texto viene de una fuente externa (ver la seccion de seguridad de
 * CLAUDE.md).
 */
export function AbilityText({ text }: AbilityTextProps) {
  const { keywords, cuerpo } = splitAbility(text);

  return (
    <div className="flex flex-col gap-3">
      {keywords.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {keywords.map(({ keyword, texto }, i) => (
            <strong
              key={`${keyword}-${i}`}
              className="text-accent text-[15px] font-semibold"
            >
              {texto}
            </strong>
          ))}
        </p>
      )}

      {cuerpo && (
        <p className="text-ink text-[15px] leading-relaxed whitespace-pre-line">
          {cuerpo.split(KEYWORD_EN_PROSA).map((chunk, i) =>
            // split() con grupo de captura intercala los match en indices impares.
            i % 2 === 1 ? (
              <strong key={i} className="text-accent font-semibold">
                {chunk}
              </strong>
            ) : (
              chunk
            ),
          )}
        </p>
      )}
    </div>
  );
}
