import { Hammer } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Builder",
  description:
    "Arma mazos del formato Escuelas Elementales validando las reglas de construcción.",
};

export default function BuilderPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Mazos</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Builder</h1>

      <div className="border-line rounded-panel mt-10 border border-dashed px-6 py-20 text-center">
        <Hammer
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">Todavía no está listo.</p>
        <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
          Aquí va a vivir el constructor de mazos: elegir escuela, sumar cartas desde el
          catálogo y ver en vivo si el mazo cumple las reglas del formato.
        </p>
      </div>
    </main>
  );
}
