"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Check,
  Download,
  Hammer,
  Layers,
  Link2,
  Save,
  TriangleAlert,
} from "lucide-react";

import { CARD_RATIO } from "../CardTile";
import { useDecks, useHydrated } from "./use-decks";
import { decodeDeck, exportFile, shareUrl } from "@/lib/deck-code";
import {
  buildCardIndex,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
  type ResolvedEntry,
  DECK_TOTAL,
} from "@/lib/deck-rules";
import { saveDeck } from "@/lib/deck-storage";
import type { Card, Deck, Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeckDetailViewProps {
  cards: Card[];
}

const SECCIONES: { tipo: Tipo; titulo: string }[] = [
  { tipo: "Aliado", titulo: "Aliados" },
  { tipo: "Tótem", titulo: "Tótems" },
  { tipo: "Arma", titulo: "Armas" },
  { tipo: "Talismán", titulo: "Talismanes" },
  { tipo: "Oro", titulo: "Oros" },
];

const BOTON =
  "inline-flex h-11 items-center gap-1.5 rounded-chip border border-line px-4 text-[13px] text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

function Seccion({
  titulo,
  filas,
  oroInicial,
}: {
  titulo: string;
  filas: ResolvedEntry[];
  oroInicial: string | null;
}) {
  if (filas.length === 0) return null;
  const total = filas.reduce((s, f) => s + f.n, 0);

  return (
    <section>
      <h3 className="text-muted border-line mb-2 flex items-baseline justify-between border-b pb-1.5 text-[11px] tracking-[0.18em] uppercase">
        {titulo}
        <span className="tabular-nums">{total}</span>
      </h3>
      <ul className="divide-line divide-y">
        {filas.map((f) => (
          <li key={f.card.id} className="flex items-center gap-2.5 py-1.5">
            <span className="text-accent w-6 shrink-0 text-[13px] font-medium tabular-nums">
              {f.n}×
            </span>
            <Image
              src={f.card.thumb}
              alt=""
              width={28}
              height={40}
              loading="lazy"
              className="border-line shrink-0 rounded border"
              style={{ aspectRatio: CARD_RATIO }}
            />
            <span className="text-ink min-w-0 flex-1 truncate text-[13px]">
              {f.card.nombre}
            </span>
            {oroInicial === f.card.id && (
              <span className="text-accent shrink-0 text-[11px] tracking-[0.14em] uppercase">
                oro inicial
              </span>
            )}
            {f.card.unica && (
              <span className="text-muted shrink-0 text-[11px]">Única</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Muestra un mazo, sea tuyo (`?m=`) o de un enlace compartido (`?d=`).
 *
 * Es la unica forma de tener un detalle por mazo con `output: "export"`: una
 * ruta dinamica `/mazos/[id]` no puede existir, porque generateStaticParams no
 * conoce ids que se inventan en el navegador.
 */
export function DeckDetailView({ cards }: DeckDetailViewProps) {
  const params = useSearchParams();
  const m = params.get("m");
  const d = params.get("d");

  const [mensaje, setMensaje] = useState("");

  const decks = useDecks();
  const cargado = useHydrated();
  const index = useMemo(() => buildCardIndex(cards), [cards]);

  // El mazo se DERIVA de la URL y del store, sin estado propio ni efectos: asi
  // cambiar de ?m=a a ?m=b no deja pegado el anterior y no hay renders en
  // cascada. El codigo compartido manda si vienen los dos parametros.
  const { deck, error } = useMemo((): { deck: Deck | null; error: string } => {
    if (d) {
      const r = decodeDeck(d);
      return r.ok ? { deck: r.deck, error: "" } : { deck: null, error: r.mensaje };
    }
    if (m) {
      const guardado = decks.find((x) => x.id === m);
      return guardado
        ? { deck: guardado, error: "" }
        : { deck: null, error: "No encontré ese mazo en este navegador." };
    }
    return { deck: null, error: "Este enlace no trae ningún mazo." };
  }, [m, d, decks]);

  const avisar = useCallback((texto: string) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 4000);
  }, []);

  const guardar = () => {
    if (!deck) return;
    if (saveDeck(deck)) avisar(`Guardé "${deck.nombre}" en este navegador.`);
    else avisar("No pude guardarlo: el almacenamiento del navegador está lleno.");
  };

  const copiarEnlace = async () => {
    if (!deck) return;
    try {
      await navigator.clipboard.writeText(shareUrl(deck, window.location.origin));
      avisar("Enlace copiado.");
    } catch {
      avisar("No pude copiar el enlace.");
    }
  };

  const descargar = () => {
    if (!deck) return;
    const blob = new Blob([exportFile([deck])], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mazo-${deck.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!cargado) {
    // Esqueleto, no spinner: el mazo sale de la URL o de localStorage al montar.
    return (
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="border-line rounded-panel h-24 animate-pulse border" />
        <div className="border-line rounded-panel h-72 animate-pulse border" />
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="border-line rounded-panel border border-dashed px-6 py-20 text-center">
        <Layers
          size={28}
          aria-hidden="true"
          className="text-muted mx-auto mb-4 opacity-60"
        />
        <p className="text-ink text-lg">{error || "No hay ningún mazo aquí."}</p>
        <Link
          href="/mazos"
          className="text-accent focus-visible:outline-brand-500 mt-4 inline-block rounded text-[15px] underline underline-offset-4 transition-opacity hover:opacity-75"
        >
          Ver mis mazos
        </Link>
      </div>
    );
  }

  const res = resolveDeck(deck, index);
  const stats = deckStats(res);
  const issues = validateDeck(deck, index);
  const legal = isLegal(issues);
  const compartido = Boolean(d);

  return (
    <div className="flex flex-col gap-8">
      <div className="border-line bg-panel rounded-panel flex flex-col gap-4 border p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-ink text-xl font-bold">{deck.nombre}</h2>
          <p className="text-muted text-[13px] tabular-nums">
            {stats.totalPrincipal}/{DECK_TOTAL} cartas
            {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
          </p>
        </div>

        <p
          className={cn(
            "flex items-center gap-2 text-[13px]",
            legal ? "text-accent" : "text-muted",
          )}
        >
          {legal ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <TriangleAlert size={15} aria-hidden="true" />
          )}
          {legal
            ? "El mazo cumple las reglas del formato"
            : "El mazo todavía no cumple las reglas"}
        </p>

        {!legal && (
          <ul className="text-muted flex flex-col gap-1 text-[13px]">
            {issues.map((i, n) => (
              <li key={`${i.code}-${n}`}>· {i.mensaje}</li>
            ))}
          </ul>
        )}

        <div className="border-line flex flex-wrap gap-2 border-t pt-4">
          {compartido ? (
            <button type="button" onClick={guardar} className={BOTON}>
              <Save size={14} aria-hidden="true" />
              Guardar en mis mazos
            </button>
          ) : (
            <Link href={`/builder/?m=${deck.id}`} className={BOTON}>
              <Hammer size={14} aria-hidden="true" />
              Editar
            </Link>
          )}
          <button type="button" onClick={copiarEnlace} className={BOTON}>
            <Link2 size={14} aria-hidden="true" />
            Copiar enlace
          </button>
          <button type="button" onClick={descargar} className={BOTON}>
            <Download size={14} aria-hidden="true" />
            Descargar
          </button>
        </div>

        <p role="status" aria-live="polite" className="text-muted min-h-5 text-[13px]">
          {mensaje}
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {SECCIONES.map(({ tipo, titulo }) => (
          <Seccion
            key={tipo}
            titulo={titulo}
            filas={res.principal.filter((e) => e.card.tipo === tipo)}
            oroInicial={deck.oroInicial}
          />
        ))}
        <Seccion titulo="Side deck" filas={res.side} oroInicial={null} />
      </div>
    </div>
  );
}
