import { CatalogView } from "@/components/CatalogView";
import { getCards } from "@/lib/cards";
import { LOADED_EDITIONS } from "@/lib/editions";

export default async function Home() {
  // Corre en tiempo de build: el catalogo queda prerenderizado en el HTML.
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-10">
      <p className="eyebrow mb-3">Escuelas Elementales</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Catálogo</h1>
      <p className="text-muted mt-3 max-w-[54ch] leading-relaxed">
        {cards.length} cartas de {LOADED_EDITIONS.length}{" "}
        {LOADED_EDITIONS.length === 1 ? "edición" : "ediciones"}. Busca por nombre, código
        o texto de habilidad, o filtra por edición desde el menú.
      </p>

      <div className="mt-10">
        <CatalogView cards={cards} />
      </div>
    </main>
  );
}
