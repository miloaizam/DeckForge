"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  /** Nombre de la carta, para las etiquetas del lector de pantalla. */
  nombre: string;
  value: number;
  onChange: (value: number) => void;
  /** Por que no se puede sumar una copia mas, si es que no se puede. */
  addBlocked?: string;
  /** Se avisa al usuario cuando pulsa un boton que no puede hacer nada. */
  onBlocked?: (mensaje: string) => void;
}

const BOTON =
  "flex size-11 shrink-0 items-center justify-center rounded-chip border border-line transition-colors focus-visible:outline-brand-500";

/**
 * Los botones de mas y menos de una fila del mazo.
 *
 * DESIGN.md marca este componente como el punto donde mas se rompe el tamano
 * minimo tactil, asi que los dos botones son de 44x44 (`size-11`) y no se
 * encogen.
 */
export function QuantityStepper({
  nombre,
  value,
  onChange,
  addBlocked,
  onBlocked,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={`Quitar una copia de ${nombre}`}
        className={cn(BOTON, "text-muted hover:text-ink hover:border-brand-500")}
      >
        <Minus size={15} aria-hidden="true" />
      </button>

      <span
        aria-hidden="true"
        className="text-ink min-w-6 text-center text-sm font-medium tabular-nums"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => (addBlocked ? onBlocked?.(addBlocked) : onChange(value + 1))}
        // aria-disabled y no disabled: asi sigue enfocable y al pulsarlo puede
        // decir por que no se puede, en vez de quedarse mudo.
        aria-disabled={addBlocked ? true : undefined}
        title={addBlocked}
        aria-label={addBlocked ?? `Agregar una copia de ${nombre}`}
        className={cn(
          BOTON,
          addBlocked
            ? "text-muted/40 cursor-not-allowed"
            : "text-accent hover:border-brand-500 hover:bg-brand-600 hover:text-white",
        )}
      >
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
