import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CatalogView } from "@/components/CatalogView";
import { getCardsByEdition } from "@/lib/cards";
import { findEdition, LOADED_EDITIONS } from "@/lib/editions";

/** Una pagina estatica por edicion ya cargada. */
export function generateStaticParams() {
  return LOADED_EDITIONS.map((e) => ({ edicion: e.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/catalogo/[edicion]">): Promise<Metadata> {
  const { edicion } = await params;
  const ed = findEdition(edicion);
  return {
    title: ed?.titulo ?? "Catálogo",
    description: `Cartas de la edición ${ed?.titulo ?? edicion} de Mitos y Leyendas.`,
  };
}

export default async function EdicionPage({ params }: PageProps<"/catalogo/[edicion]">) {
  const { edicion } = await params;
  const ed = findEdition(edicion);
  if (!ed?.cargada) notFound();

  const cards = await getCardsByEdition(edicion);

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Edición</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">{ed.titulo}</h1>
      <p className="text-muted mt-3 leading-relaxed">
        {ed.titulo} tiene {cards.length} cartas. Busca por nombre o texto de habilidad, o
        utiliza los filtros para una mejor búsqueda.
      </p>

      <div className="mt-10">
        <CatalogView cards={cards} />
      </div>
    </main>
  );
}
