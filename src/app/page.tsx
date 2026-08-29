import Image from "next/image";
import Link from "next/link";
import { Flame } from "lucide-react";

export default function Home() {
  return (
    // El degradado cubre toda el area disponible y el contenido va centrado en
    // los dos ejes: `flex-1` recibe del body toda la altura menos el footer.
    <main className="bg-forge relative flex flex-1 items-center justify-center overflow-hidden px-6 py-20">
      {/* Resplandor decorado. Su color viene del tema para no quedar como una
          mancha lavada sobre fondo claro. */}
      <div
        aria-hidden="true"
        className="bg-halo pointer-events-none absolute top-[-16rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-[130px]"
      />

      <div className="relative w-full max-w-[1040px] text-center">
        <div className="border-line bg-accent-soft shadow-glow rounded-app mx-auto mb-10 flex size-24 items-center justify-center border">
          {/* El isotipo blanco desaparece sobre el marco claro, asi que cada
              tema usa su version. Lo conmuta el CSS, igual que el resto. */}
          <Image
            src="/brand/icon-white.svg"
            alt=""
            width={60}
            height={60}
            priority
            className="solo-oscuro"
          />
          <Image
            src="/brand/icon-violet.svg"
            alt=""
            width={60}
            height={60}
            priority
            className="solo-claro"
          />
        </div>

        <p className="eyebrow mb-5">Mitos y Leyendas · Escuelas Elementales</p>

        <h1 className="text-wordmark text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.02] font-bold tracking-[-0.02em]">
          Donde se forjan los mazos
        </h1>

        <p className="text-muted mx-auto mt-6 max-w-[54ch] text-[17px] leading-relaxed">
          Consulta el catálogo completo del formato, encuentra la carta exacta que buscas
          y arma tu mazo. Gratis, sin cuentas y sin instalar nada.
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
    </main>
  );
}
