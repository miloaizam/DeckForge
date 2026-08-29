import { Layers } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis mazos",
  description: "Los mazos que guardaste en este navegador.",
};

export default function MazosPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Mazos</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Mis mazos</h1>

      <div className="border-line rounded-panel mt-10 border border-dashed px-6 py-20 text-center">
        <Layers
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">Todavía no está listo.</p>
        <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
          Aquí vas a ver los mazos que guardes, que viven solo en este navegador. Cada uno
          se podrá compartir por enlace, sin cuentas ni servidor de por medio.
        </p>
      </div>
    </main>
  );
}
