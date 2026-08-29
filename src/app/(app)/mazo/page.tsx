import { Suspense } from "react";
import type { Metadata } from "next";

import { DeckDetailView } from "@/components/decks/DeckDetailView";
import { getCards } from "@/lib/cards";

export const metadata: Metadata = {
  title: "Mazo",
  description: "Detalle de un mazo del formato Escuelas Elementales.",
  // Un mazo compartido es contenido de un usuario, no del sitio.
  robots: { index: false, follow: true },
};

/**
 * Detalle de un mazo: `?m=` uno guardado, `?d=` uno compartido por enlace.
 *
 * Va en singular y con query string porque `output: "export"` no admite una
 * ruta dinamica `/mazos/[id]` para datos del usuario: generateStaticParams no
 * puede conocer ids que se inventan en el navegador.
 *
 * El titulo lo pone la isla, no la pagina: es el nombre del mazo, y ese solo se
 * conoce en el navegador.
 */
export default async function MazoPage() {
  const cards = await getCards();

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-10 sm:px-6">
      {/* Toda la pagina depende del parametro, asi que el limite va afuera. */}
      <Suspense
        fallback={
          <div aria-hidden="true" className="flex flex-col gap-4">
            <div className="border-line rounded-panel h-24 animate-pulse border" />
            <div className="border-line rounded-panel h-72 animate-pulse border" />
          </div>
        }
      >
        <DeckDetailView cards={cards} />
      </Suspense>
    </main>
  );
}
