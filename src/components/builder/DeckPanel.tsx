"use client";

import Image from "next/image";
import { Check, Coins, Trash2, TriangleAlert } from "lucide-react";

import { QuantityStepper } from "./QuantityStepper";
import { CARD_RATIO } from "../CardTile";
import type { DeckZone } from "@/lib/deck";
import {
  canAdd,
  isLegal,
  type CardIndex,
  type DeckIssue,
  type DeckStats,
  type ResolvedDeck,
  type ResolvedEntry,
  DECK_TOTAL,
} from "@/lib/deck-rules";
import { SECCIONES_DEL_MAZO, type Deck, type Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DeckPanelProps {
  deck: Deck;
  res: ResolvedDeck;
  stats: DeckStats;
  issues: DeckIssue[];
  index: CardIndex;
  onSetQuantity: (cardId: string, zone: DeckZone, n: number) => void;
  onSetStartingGold: (cardId: string | null) => void;
  onBlocked: (mensaje: string) => void;
}

function Fila({
  entry,
  zone,
  deck,
  index,
  esOroInicial,
  onSetQuantity,
  onBlocked,
}: {
  entry: ResolvedEntry;
  zone: DeckZone;
  deck: Deck;
  index: CardIndex;
  esOroInicial: boolean;
  onSetQuantity: (cardId: string, zone: DeckZone, n: number) => void;
  onBlocked: (mensaje: string) => void;
}) {
  const check = canAdd(deck, entry.card, zone, index);

  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <Image
        src={entry.card.thumb}
        alt=""
        width={28}
        height={40}
        loading="lazy"
        className="border-line shrink-0 rounded border"
        style={{ aspectRatio: CARD_RATIO }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-[13px] leading-tight">{entry.card.nombre}</p>
        <p className="text-muted truncate text-[11px]">
          {esOroInicial ? "Oro inicial" : (entry.card.raza ?? entry.card.tipo)}
          {entry.card.unica && " · Única"}
        </p>
      </div>
      <QuantityStepper
        nombre={entry.card.nombre}
        value={entry.n}
        onChange={(n) => onSetQuantity(entry.card.id, zone, n)}
        addBlocked={check.ok ? undefined : check.mensaje}
        onBlocked={onBlocked}
      />
    </li>
  );
}

function Seccion({
  titulo,
  filas,
  ...resto
}: {
  titulo: string;
  filas: ResolvedEntry[];
  zone: DeckZone;
  deck: Deck;
  index: CardIndex;
  oroInicial: string | null;
  onSetQuantity: (cardId: string, zone: DeckZone, n: number) => void;
  onBlocked: (mensaje: string) => void;
}) {
  if (filas.length === 0) return null;
  const total = filas.reduce((s, f) => s + f.n, 0);

  return (
    <section className="border-line border-t pt-3">
      <h4 className="text-muted mb-1 flex items-baseline justify-between text-[11px] tracking-[0.18em] uppercase">
        {titulo}
        <span className="tabular-nums">{total}</span>
      </h4>
      <ul className="divide-line divide-y">
        {filas.map((f) => (
          <Fila
            key={f.card.id}
            entry={f}
            esOroInicial={resto.oroInicial === f.card.id}
            zone={resto.zone}
            deck={resto.deck}
            index={resto.index}
            onSetQuantity={resto.onSetQuantity}
            onBlocked={resto.onBlocked}
          />
        ))}
      </ul>
    </section>
  );
}

export function DeckPanel({
  deck,
  res,
  stats,
  issues,
  index,
  onSetQuantity,
  onSetStartingGold,
  onBlocked,
}: DeckPanelProps) {
  const legal = isLegal(issues);
  const errores = issues.filter((i) => i.gravedad === "error");
  const avisos = issues.filter((i) => i.gravedad === "aviso");

  /** Los Oros sin habilidad que ya estan en el mazo pueden ser el oro inicial. */
  const candidatosOro = res.principal.map((e) => e.card).filter((c) => c.oroSinHabilidad);

  const porTipo = (t: Tipo) => res.principal.filter((e) => e.card.tipo === t);
  const comun = {
    deck,
    index,
    oroInicial: deck.oroInicial,
    onSetQuantity,
    onBlocked,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Estado siempre a la vista: cuantas cartas lleva y si es legal. */}
      <p className="text-ink text-2xl font-bold tabular-nums">
        {stats.totalPrincipal}
        <span className="text-muted text-base font-normal">/{DECK_TOTAL}</span>
      </p>

      {/* El color nunca es el unico indicador: siempre icono y texto. */}
      <p
        className={cn(
          "flex items-center gap-2 text-[13px]",
          legal ? "text-accent" : "text-muted",
        )}
      >
        {legal ? (
          <Check size={15} aria-hidden="true" className="shrink-0" />
        ) : (
          <TriangleAlert size={15} aria-hidden="true" className="shrink-0" />
        )}
        {legal
          ? "El mazo cumple las reglas del formato"
          : `${errores.length} cosas por corregir`}
      </p>

      {(errores.length > 0 || avisos.length > 0) && (
        <ul className="text-muted flex flex-col gap-1.5 text-[13px] leading-snug">
          {[...errores, ...avisos].map((i, n) => (
            <li key={`${i.code}-${n}`} className="flex gap-2">
              <span aria-hidden="true" className="text-muted/60">
                ·
              </span>
              {i.mensaje}
            </li>
          ))}
        </ul>
      )}

      {/* El oro inicial tiene lugar propio: es obligatorio y se elige aparte. */}
      <section className="border-line rounded-card border border-dashed p-3">
        <h4 className="text-muted mb-2 flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase">
          <Coins size={13} aria-hidden="true" />
          Oro inicial
        </h4>
        {candidatosOro.length === 0 ? (
          <p className="text-muted text-[13px] leading-snug">
            Agrega un Oro sin habilidad al mazo y luego elígelo aquí.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {candidatosOro.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSetStartingGold(deck.oroInicial === c.id ? null : c.id)}
                aria-pressed={deck.oroInicial === c.id}
                className={cn(
                  "rounded-chip focus-visible:outline-brand-500 border px-2.5 py-1.5 text-[13px] transition-colors",
                  deck.oroInicial === c.id
                    ? "border-brand-600 bg-accent-soft text-accent"
                    : "border-line text-muted hover:border-brand-500 hover:text-ink",
                )}
              >
                {deck.oroInicial === c.id && (
                  <Check size={12} aria-hidden="true" className="mr-1 inline" />
                )}
                {c.nombre}
              </button>
            ))}
          </div>
        )}
      </section>

      {res.principal.length === 0 && res.side.length === 0 ? (
        <p className="text-muted border-line rounded-card border border-dashed px-4 py-10 text-center text-[13px] leading-relaxed">
          El mazo está vacío. Agrega cartas desde el catálogo con el botón
          <span className="text-accent"> + </span>
          de cada una.
        </p>
      ) : (
        <>
          {SECCIONES_DEL_MAZO.map(({ tipo, titulo }) => (
            <Seccion
              key={tipo}
              titulo={titulo}
              filas={porTipo(tipo)}
              zone="principal"
              {...comun}
            />
          ))}

          <Seccion titulo="Side deck" filas={res.side} zone="side" {...comun} />
        </>
      )}
    </div>
  );
}

/** Boton para vaciar, aparte del panel porque no se usa casi nunca. */
export function DeckClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="text-muted hover:text-ink hover:border-brand-500 border-line focus-visible:outline-brand-500 rounded-chip inline-flex h-11 items-center gap-1.5 border px-4 text-[13px] transition-colors"
    >
      <Trash2 size={14} aria-hidden="true" />
      Vaciar el mazo
    </button>
  );
}
