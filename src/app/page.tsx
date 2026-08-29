import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";

export default function Home() {
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

          <div className="mt-10 flex justify-center">
            <Link
              href="/catalogo"
              className="bg-brand-600 hover:bg-brand-500 shadow-glow focus-visible:outline-brand-300 rounded-card ease-out-soft inline-flex h-14 items-center gap-2.5 px-8 text-[17px] font-medium text-white transition duration-200 hover:-translate-y-0.5"
            >
              <Flame size={19} aria-hidden="true" />
              Entrar a la forja
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
