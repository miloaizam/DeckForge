import { KEYWORD_EN_PROSA, splitAbility } from "@/lib/ability";

interface AbilityTextProps {
  text: string;
}

/**
 * Renderiza la habilidad de una carta.
 *
 * Las keywords declaradas al inicio ("Única. Furia.") van en una fila propia,
 * separadas del efecto; las que caen dentro de la prosa se resaltan donde
 * estan. Todo se construye como nodos de React a partir del texto: nunca HTML
 * crudo, porque el texto viene de una fuente externa (ver la seccion de
 * seguridad de CLAUDE.md).
 */
export function AbilityText({ text }: AbilityTextProps) {
  const { keywords, cuerpo } = splitAbility(text);

  return (
    <div className="flex flex-col gap-3">
      {keywords.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {keywords.map((k) => (
            <strong key={k} className="text-accent text-[15px] font-semibold">
              {k}.
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
