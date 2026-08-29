import type { Metadata } from "next";

import { DeckListView } from "@/components/decks/DeckListView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Mis mazos",
  description: "Los mazos que guardaste en este navegador.",
};

export default async function MazosPage() {
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Mazos</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mis mazos</h1>
      <p className="text-muted mt-3 leading-relaxed">
        Viven solo en este navegador. Para llevártelos a otro equipo, expórtalos a un
        archivo o comparte cada uno por enlace.
      </p>

      <div className="mt-10">
        <DeckListView cards={cards} />
      </div>
    </main>
  );
}
