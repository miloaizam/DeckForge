import Image from "next/image";
import Link from "next/link";
import { Filter, Flame, Search, Share2 } from "lucide-react";

import { getCards } from "@/lib/cards";
import { LOADED_EDITIONS } from "@/lib/editions";

const CARACTERISTICAS = [
  {
    icon: Search,
    titulo: "Búsqueda instantánea",
    texto: "Por nombre, código o texto de habilidad. Responde mientras escribes.",
  },
  {
    icon: Filter,
    titulo: "Filtros del formato",
    texto: "Tipo, raza, escuela, frecuencia y coste. Solo se ofrece lo que existe.",
  },
  {
    icon: Share2,
    titulo: "Sin cuentas",
    texto:
      "Nada que registrar. Tus mazos van a vivir en tu navegador, no en un servidor.",
  },
];

export default async function Home() {
  const cards = await getCards();

  return (
    <main className="flex-1">
      <section className="bg-forge relative overflow-hidden">
        {/* Halo violeta detras del isotipo, puro decorado. */}
        <div
          aria-hidden="true"
          className="bg-brand-700/20 pointer-events-none absolute top-[-14rem] left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-[120px]"
        />

        <div className="relative mx-auto max-w-[1040px] px-6 py-24 text-center sm:py-32">
          <div className="border-line bg-forge shadow-glow rounded-app mx-auto mb-10 flex size-24 items-center justify-center border">
            <Image src="/brand/icon-white.svg" alt="" width={60} height={60} priority />
          </div>

          <p className="eyebrow mb-5">Mitos y Leyendas · Escuelas Elementales</p>

          <h1 className="text-wordmark text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.02] font-bold tracking-[-0.02em]">
            Donde se forjan los mazos
          </h1>

          <p className="text-muted mx-auto mt-6 max-w-[54ch] text-[17px] leading-relaxed">
            Consulta el catálogo completo del formato, encuentra la carta exacta que
            buscas y arma tu mazo. Gratis, sin cuentas y sin instalar nada.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/catalogo"
              className="bg-brand-600 hover:bg-brand-500 shadow-glow focus-visible:outline-brand-300 rounded-card ease-out-soft inline-flex h-14 items-center gap-2.5 px-8 text-[17px] font-medium text-white transition duration-200 hover:-translate-y-0.5"
            >
              <Flame size={19} aria-hidden="true" />
              Entrar a la forja
            </Link>

            <p className="text-muted text-[13px] tabular-nums">
              {cards.length} cartas · {LOADED_EDITIONS.length} ediciones cargadas
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1040px] px-6 py-20">
        <ul className="grid gap-4 sm:grid-cols-3">
          {CARACTERISTICAS.map(({ icon: Icon, titulo, texto }) => (
            <li key={titulo} className="border-line bg-panel rounded-panel border p-6">
              <Icon size={20} aria-hidden="true" className="text-brand-300 mb-4" />
              <h2 className="text-ink font-semibold">{titulo}</h2>
              <p className="text-muted mt-2 text-[14px] leading-relaxed">{texto}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
