import Image from "next/image";

import { CARD_RATIO } from "../CardTile";
import type { ResolvedDeck, ResolvedEntry } from "@/lib/deck-rules";
import type { Tipo } from "@/lib/types";

/** Como se dibuja el contenido del mazo. */
export type DeckLayout = "pilas" | "lista";

const SECCIONES: { tipo: Tipo; titulo: string }[] = [
  { tipo: "Aliado", titulo: "Aliados" },
  { tipo: "Tótem", titulo: "Tótems" },
  { tipo: "Arma", titulo: "Armas" },
  { tipo: "Talismán", titulo: "Talismanes" },
  { tipo: "Oro", titulo: "Oros" },
];

/**
 * Orden en que las pilas se reparten sobre la mesa. No es el de SECCIONES: ahi
 * manda la lectura de una lista, aca la de una mesa repartida.
 */
const ORDEN_EN_MESA: Tipo[] = ["Aliado", "Talismán", "Tótem", "Arma", "Oro"];

/** Alto de la carta en proporcion a su ancho (arte de 512 x 732). */
const ALTO = 732 / 512;

/**
 * Cuanto asoma cada copia por encima de la siguiente, en proporcion al alto de
 * la carta. 0.13 deja ver la franja del nombre y el coste, que es lo que
 * permite reconocerla sin verla entera.
 */
const ASOMO = 0.13;

interface PilaItem {
  key: string;
  fila: ResolvedEntry;
  esOroInicial: boolean;
}

/**
 * Reparte las cartas sobre la mesa: por tipo, y dentro de cada tipo las pilas
 * mas altas primero.
 *
 * El oro inicial sale de su pila y va aparte al final. Cuenta dentro de las 50
 * y es una copia mas de un Oro cualquiera, pero en la mesa no se mezcla con las
 * demas: es la carta con la que se empieza y se mira sola.
 */
function ordenarPilas(filas: ResolvedEntry[], oroInicial: string | null): PilaItem[] {
  const mesa: PilaItem[] = [];
  let inicial: PilaItem | null = null;

  for (const f of filas) {
    if (f.card.id === oroInicial) {
      inicial = {
        key: `${f.card.id}#inicial`,
        fila: { card: f.card, n: 1 },
        esOroInicial: true,
      };
      // Si solo habia esa copia, no queda pila que dibujar.
      if (f.n > 1) {
        mesa.push({
          key: f.card.id,
          fila: { card: f.card, n: f.n - 1 },
          esOroInicial: false,
        });
      }
      continue;
    }
    mesa.push({ key: f.card.id, fila: f, esOroInicial: false });
  }

  mesa.sort(
    (a, b) =>
      ORDEN_EN_MESA.indexOf(a.fila.card.tipo) - ORDEN_EN_MESA.indexOf(b.fila.card.tipo) ||
      b.fila.n - a.fila.n ||
      a.fila.card.nombre.localeCompare(b.fila.card.nombre, "es"),
  );

  return inicial ? [...mesa, inicial] : mesa;
}

function Encabezado({ titulo, total }: { titulo: string; total: number }) {
  return (
    <h3 className="text-muted border-line mb-3 flex items-baseline justify-between border-b pb-1.5 text-[11px] tracking-[0.18em] uppercase">
      {titulo}
      <span className="tabular-nums">{total}</span>
    </h3>
  );
}

/**
 * Una carta con todas sus copias apiladas, como quedarian sobre la mesa.
 *
 * Se dibujan las N copias de verdad, cada una corrida hacia abajo: la de
 * adelante tapa a las de atras y de ellas solo asoma la franja de arriba. Asi
 * el monton mismo dice cuantas son, sin tener que leer un rotulo.
 */
function Pila({ fila, oroInicial }: { fila: ResolvedEntry; oroInicial: boolean }) {
  return (
    <li className="group flex flex-col gap-2">
      {/* El alto sale del ancho de la celda: la carta mide ALTO veces su ancho
          y cada copia extra suma su franja. En padding los % van contra el
          ancho, y en translate contra el alto propio: de ahi los dos factores. */}
      <div
        className="ease-out-soft relative w-full transition-transform duration-200 group-hover:-translate-y-1"
        style={{ paddingBottom: `${ALTO * (1 + (fila.n - 1) * ASOMO) * 100}%` }}
      >
        {Array.from({ length: fila.n }, (_, i) => (
          // La primera es la del fondo y la ultima la de adelante: el orden del
          // DOM ya las apila bien, sin z-index. Y van con alt vacio a proposito,
          // que el nombre lo pone el pie una sola vez.
          <Image
            key={i}
            src={fila.card.thumb}
            alt=""
            width={200}
            height={286}
            loading="lazy"
            className="border-line rounded-card shadow-panel absolute inset-x-0 top-0 w-full border"
            style={{
              aspectRatio: CARD_RATIO,
              transform: `translateY(${i * ASOMO * 100}%)`,
            }}
          />
        ))}
      </div>

      <div className="min-w-0">
        <p
          className="text-ink truncate text-[13px] leading-tight"
          title={fila.card.nombre}
        >
          {fila.card.nombre}
        </p>
        <p className="text-muted mt-0.5 text-[11px] tabular-nums">
          {fila.n === 1 ? "1 copia" : `${fila.n} copias`}
        </p>
        {oroInicial && (
          <p className="text-accent mt-0.5 text-[11px] tracking-[0.14em] uppercase">
            oro inicial
          </p>
        )}
        {fila.card.unica && <p className="text-muted mt-0.5 text-[11px]">Única</p>}
      </div>
    </li>
  );
}

/**
 * Una mesa de pilas: una sola grilla, sin cortes por tipo.
 *
 * items-start hace que todas cuelguen de la misma linea y cada una crezca
 * hacia abajo segun sus copias.
 */
function Mesa({ items }: { items: PilaItem[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] items-start gap-x-4 gap-y-6">
      {items.map((it) => (
        <Pila key={it.key} fila={it.fila} oroInicial={it.esOroInicial} />
      ))}
    </ul>
  );
}

function SeccionLista({
  titulo,
  filas,
  oroInicial,
}: {
  titulo: string;
  filas: ResolvedEntry[];
  oroInicial: string | null;
}) {
  if (filas.length === 0) return null;

  return (
    <section>
      <Encabezado titulo={titulo} total={filas.reduce((s, f) => s + f.n, 0)} />
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
 * El contenido de un mazo, con el side al final.
 *
 * `pilas` lo reparte como sobre una mesa: una sola grilla, ordenada por tipo,
 * con las copias de cada carta superpuestas. `lista` es el recuento compacto,
 * partido por tipo con un encabezado y un total en cada seccion.
 */
export function DeckSections({
  res,
  oroInicial,
  layout,
}: {
  res: ResolvedDeck;
  oroInicial: string | null;
  layout: DeckLayout;
}) {
  if (layout === "lista") {
    return (
      <div className="grid gap-8 sm:grid-cols-2">
        {SECCIONES.map(({ tipo, titulo }) => (
          <SeccionLista
            key={tipo}
            titulo={titulo}
            filas={res.principal.filter((e) => e.card.tipo === tipo)}
            oroInicial={oroInicial}
          />
        ))}
        <SeccionLista titulo="Side deck" filas={res.side} oroInicial={null} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-9">
      <Mesa items={ordenarPilas(res.principal, oroInicial)} />

      {/* El side si se separa: no son 10 cartas del mazo, son las 10 que no
          estan en el. Mezclarlas en la misma mesa mentiria sobre el mazo. */}
      {res.side.length > 0 && (
        <section>
          <Encabezado titulo="Side deck" total={res.side.reduce((s, f) => s + f.n, 0)} />
          <Mesa items={ordenarPilas(res.side, null)} />
        </section>
      )}
    </div>
  );
}
