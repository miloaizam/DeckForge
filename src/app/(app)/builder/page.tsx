import type { Metadata } from "next";

import { BuilderView } from "@/components/builder/BuilderView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Builder",
  description:
    "Arma mazos del formato Escuelas Elementales validando las reglas de construcción.",
};

export default async function BuilderPage() {
  // Corre en tiempo de build: el catalogo queda en el HTML y el constructor
  // trabaja en memoria, sin pedirle nada a ningun servidor.
  const cards = await getCards();

  return (
    // pb-24 bajo lg para que la barra fija del mazo no tape la ultima fila.
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-10 pb-24 sm:px-6 lg:pb-10">
      <p className="eyebrow mb-3">Mazos</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Builder</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Arma tu mazo del formato escuelas elementales. Presiona &apos;Guardar mazo&apos;
        para verlo en la pestaña de Mazos.
      </p>

      <div className="mt-10">
        <BuilderView cards={cards} />
      </div>
    </main>
  );
}
