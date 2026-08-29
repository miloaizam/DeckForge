"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { exportFile, importFile } from "@/lib/deck-code";
import type { Deck } from "@/lib/types";

interface DeckTransferProps {
  decks: Deck[];
  onImport: (mazos: Deck[]) => void;
  onMessage: (mensaje: string) => void;
}

const BOTON =
  "inline-flex h-11 items-center gap-1.5 rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

/** Mas de esto no es un respaldo de mazos, es otra cosa. */
const MAX_ARCHIVO = 1024 * 1024;

/**
 * Llevarse los mazos a otro navegador y traerlos de vuelta.
 *
 * Todo pasa en el navegador: el archivo se arma con un Blob y se baja con un
 * <a download>, sin que nada salga del origen. No se usa un data: URI porque
 * varios navegadores los bloquean para descargas.
 */
export function DeckTransfer({ decks, onImport, onMessage }: DeckTransferProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);

  const exportar = () => {
    const blob = new Blob([exportFile(decks)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deckforge-mazos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async (file: File) => {
    setOcupado(true);
    try {
      if (file.size > MAX_ARCHIVO) {
        onMessage("Ese archivo es demasiado grande para ser un respaldo de mazos.");
        return;
      }

      const resultado = importFile(await file.text());
      if (!resultado) {
        onMessage("Ese archivo no es un respaldo de DeckForge.");
        return;
      }
      if (resultado.mazos.length === 0) {
        onMessage("No pude leer ningún mazo de ese archivo.");
        return;
      }

      onImport(resultado.mazos);
      // Se dice la verdad completa: cuantos entraron y cuantos se cayeron.
      onMessage(
        resultado.descartados === 0
          ? `Importaste ${resultado.mazos.length} ${resultado.mazos.length === 1 ? "mazo" : "mazos"}.`
          : `Importaste ${resultado.mazos.length} y descarté ${resultado.descartados} por estar dañados.`,
      );
    } catch {
      onMessage("No pude leer ese archivo.");
    } finally {
      setOcupado(false);
      // Se limpia el input para poder volver a elegir el mismo archivo.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={exportar}
        disabled={decks.length === 0}
        className={`${BOTON} disabled:pointer-events-none disabled:opacity-40`}
      >
        <Download size={14} aria-hidden="true" />
        Exportar todo
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={ocupado}
        className={`${BOTON} disabled:pointer-events-none disabled:opacity-40`}
      >
        <Upload size={14} aria-hidden="true" />
        Importar
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importar(file);
        }}
        className="sr-only"
        aria-label="Elegir un archivo de mazos para importar"
      />
    </div>
  );
}
