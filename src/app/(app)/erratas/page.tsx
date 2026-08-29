import { FileWarning } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Erratas",
  description: "Correcciones oficiales al texto de las cartas de Mitos y Leyendas.",
};

export default function ErratasPage() {
  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6">
      <p className="eyebrow mb-3">Reglas</p>
      <h1 className="text-3xl font-bold tracking-[-0.02em]">Erratas</h1>

      <div className="border-line rounded-panel mt-10 border border-dashed px-6 py-20 text-center">
        <FileWarning
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">Todavía no está lista.</p>
        <p className="text-muted mx-auto mt-3 max-w-[46ch] leading-relaxed">
          Aquí van a vivir las correcciones oficiales al texto de las cartas. La API de
          MyL ya entrega ese dato por carta, así que es cosa de traerlo y darle una vista
          propia.
        </p>
      </div>
    </main>
  );
}
