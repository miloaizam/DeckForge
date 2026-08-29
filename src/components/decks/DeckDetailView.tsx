"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Download,
  Hammer,
  Layers,
  Link2,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { CARD_RATIO } from "../CardTile";
import { copyShareLink, downloadDeck } from "./actions";
import { useDecks, useHydrated } from "./use-decks";
import { deckTitle, duplicateDeck } from "@/lib/deck";
import { decodeDeck } from "@/lib/deck-code";
import {
  buildCardIndex,
  deckStats,
  isLegal,
  resolveDeck,
  validateDeck,
  type ResolvedEntry,
  DECK_TOTAL,
} from "@/lib/deck-rules";
import { deleteDeck, saveDeck } from "@/lib/deck-storage";
import type { Card, Deck, Tipo } from "@/lib/types";

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
const ICONO =
  "inline-flex size-11 items-center justify-center rounded-chip border border-line text-muted transition-colors hover:border-brand-500 hover:text-ink focus-visible:outline-brand-500";

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
  /** Borrar no tiene vuelta: se confirma en el mismo boton. */
  const [porBorrar, setPorBorrar] = useState(false);

  const router = useRouter();
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
    if (saveDeck(deck)) avisar(`Guardé "${deckTitle(deck)}" en este navegador.`);
    else avisar("No pude guardarlo: el almacenamiento del navegador está lleno.");
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
      {/* El nombre del mazo ES el titulo de la pagina; a su lado, el conteo y
          las mismas acciones que trae su tarjeta en /mazos. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Mazo</p>
          <h1 className="text-3xl font-bold tracking-[-0.02em]">{deckTitle(deck)}</h1>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="text-muted text-[13px] tabular-nums">
            {stats.totalPrincipal}/{DECK_TOTAL} cartas
            {stats.totalSide > 0 && ` · side ${stats.totalSide}`}
          </p>

          <div className="flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={() => void copyShareLink(deck).then(avisar)}
              aria-label="Compartir el mazo"
              title="Copiar enlace"
              className={ICONO}
            >
              <Link2 size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => downloadDeck(deck)}
              aria-label="Exportar el mazo"
              title="Exportar a un archivo"
              className={ICONO}
            >
              <Download size={14} aria-hidden="true" />
            </button>

            {/* Duplicar y borrar solo tienen sentido sobre un mazo tuyo. */}
            {!compartido && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    saveDeck(duplicateDeck(deck));
                    avisar("Dupliqué el mazo.");
                  }}
                  aria-label="Duplicar el mazo"
                  title="Duplicar"
                  className={ICONO}
                >
                  <Copy size={14} aria-hidden="true" />
                </button>
                {porBorrar ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        deleteDeck(deck.id);
                        router.push("/mazos");
                      }}
                      className="border-brand-600 bg-accent-soft text-accent focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-3 text-[13px]"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPorBorrar(false)}
                      className={BOTON}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPorBorrar(true)}
                    aria-label="Borrar el mazo"
                    title="Borrar"
                    className={ICONO}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </>
            )}
          </div>

          <p role="status" aria-live="polite" className="text-muted min-h-5 text-[13px]">
            {mensaje}
          </p>
        </div>
      </header>

      {/* El panel de estado solo aparece cuando hay algo que corregir: decirle
          "todo bien" a quien ya ve el mazo completo es ruido. */}
      {!legal && (
        <div className="border-line bg-panel rounded-panel flex flex-col gap-2 border p-5">
          <p className="text-ink flex items-center gap-2 text-[13px]">
            <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
            El mazo todavía no cumple las reglas del formato
          </p>
          <ul className="text-muted flex flex-col gap-1 text-[13px]">
            {issues.map((i, n) => (
              <li key={`${i.code}-${n}`}>· {i.mensaje}</li>
            ))}
          </ul>
        </div>
      )}

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
