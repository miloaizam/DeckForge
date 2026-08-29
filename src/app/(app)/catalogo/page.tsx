import type { Metadata } from "next";

import { CatalogView } from "@/components/CatalogView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Todas las cartas del formato Escuelas Elementales de Mitos y Leyendas, con búsqueda y filtros.",
};

export default async function CatalogoPage() {
  // Corre en tiempo de build: el catalogo queda prerenderizado en el HTML.
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Todo</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Catálogo completo</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Catálogo completo con {cards.length} cartas. Busca por nombre o texto de
        habilidad, o utiliza los filtros para una mejor búsqueda.
      </p>

      <div className="mt-10">
        <CatalogView cards={cards} />
      </div>
    </main>
  );
}
