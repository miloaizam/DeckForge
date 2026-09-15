import Image from "next/image";
import { Coins, Star } from "lucide-react";

import { CARD_RATIO } from "../CardTile";
import type { ResolvedDeck, ResolvedEntry } from "@/lib/deck-rules";
import { SECCIONES_DEL_MAZO, type Tipo } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Las pilas se reparten en el mismo orden en que se lee la lista. */
const ORDEN_EN_MESA: Tipo[] = SECCIONES_DEL_MAZO.map((s) => s.tipo);

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

/**
 * Elige esta carta como portada del mazo, o la quita si ya lo es.
 *
 * Solo aparece en un mazo propio: uno compartido por enlace no se guarda en
 * este navegador y no habria donde escribir la eleccion. Fuera de la carta que
 * ya es portada, se muestra al apuntar o al enfocar con el teclado: cincuenta
 * estrellas encendidas a la vez serian ruido.
 */
function BotonPortada({
  activa,
  nombre,
  onClick,
  className,
}: {
  activa: boolean;
  nombre: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      aria-label={
        activa ? `Quitar a ${nombre} de la portada` : `Usar ${nombre} de portada`
      }
      title={activa ? "Quitar de la portada" : "Usar de portada"}
      className={cn(
        "focus-visible:outline-brand-500 rounded-chip inline-flex size-7 shrink-0 items-center justify-center transition",
        activa
          ? "text-accent"
          : "text-muted hover:text-ink opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <Star size={14} aria-hidden="true" fill={activa ? "currentColor" : "none"} />
    </button>
  );
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
 *
 * No lleva pie: el arte ya trae el nombre y el monton ya dice las copias. Lo
 * que el pie decia se conserva donde importa —en el `aria-label` del boton,
 * para quien no ve la imagen— y el oro inicial va marcado sobre la carta.
 */
function Pila({
  fila,
  oroInicial,
  esPortada,
  onPortada,
  onVer,
}: {
  fila: ResolvedEntry;
  oroInicial: boolean;
  esPortada: boolean;
  onPortada?: (cardId: string | null) => void;
  onVer: (cardId: string) => void;
}) {
  const copias = fila.n === 1 ? "1 copia" : `${fila.n} copias`;

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onVer(fila.card.id)}
        aria-label={`Ver ${fila.card.nombre} · ${copias}${oroInicial ? " · oro inicial" : ""}`}
        title={fila.card.nombre}
        className="focus-visible:outline-brand-500 block w-full"
      >
        {/* El alto sale del ancho de la celda: la carta mide ALTO veces su ancho
            y cada copia extra suma su franja. En padding los % van contra el
            ancho, y en translate contra el alto propio: de ahi los dos factores. */}
        <div
          className="ease-out-soft relative w-full transition-transform duration-200 group-hover:-translate-y-1"
          style={{ paddingBottom: `${ALTO * (1 + (fila.n - 1) * ASOMO) * 100}%` }}
        >
          {Array.from({ length: fila.n }, (_, i) => (
            // La primera es la del fondo y la ultima la de adelante: el orden del
            // DOM ya las apila bien, sin z-index. Van con alt vacio a proposito,
            // que el nombre lo pone el boton una sola vez.
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
      </button>

      {oroInicial && (
        <span
          aria-hidden="true"
          title="Oro inicial"
          className="bg-surface/85 text-accent rounded-chip absolute top-1 right-1 flex size-7 items-center justify-center backdrop-blur"
        >
          <Coins size={14} />
        </span>
      )}

      {onPortada && (
        <BotonPortada
          activa={esPortada}
          nombre={fila.card.nombre}
          onClick={() => onPortada(esPortada ? null : fila.card.id)}
          className="bg-surface/85 absolute top-1 left-1 backdrop-blur"
        />
      )}
    </li>
  );
}

/**
 * Una mesa de pilas: una sola grilla, sin cortes por tipo.
 *
 * items-start hace que todas cuelguen de la misma linea y cada una crezca
 * hacia abajo segun sus copias.
 *
 * Diez por fila en escritorio, que es el ancho en que un mazo de 50 se lee de
 * una. Abajo bajan por tramos: a 10 columnas un telefono daria cartas de 30px.
 */
function Mesa({
  items,
  portada,
  onPortada,
  onVer,
}: {
  items: PilaItem[];
  portada: string | null;
  onPortada?: (cardId: string | null) => void;
  onVer: (cardId: string) => void;
}) {
  return (
    <ul className="grid grid-cols-4 items-start gap-x-3 gap-y-6 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {items.map((it) => (
        <Pila
          key={it.key}
          fila={it.fila}
          oroInicial={it.esOroInicial}
          esPortada={it.fila.card.id === portada}
          onPortada={onPortada}
          onVer={onVer}
        />
      ))}
    </ul>
  );
}

/**
 * El contenido de un mazo, con el side al final.
 *
 * Se reparte como sobre una mesa: una sola grilla ordenada por tipo, con las
 * copias de cada carta superpuestas.
 */
export function DeckSections({
  res,
  oroInicial,
  portada,
  onPortada,
  onVer,
}: {
  res: ResolvedDeck;
  oroInicial: string | null;
  /** Que carta hace de portada en /mazos. */
  portada: string | null;
  /** Si falta, el mazo no es de este navegador y la portada no se puede tocar. */
  onPortada?: (cardId: string | null) => void;
  /** Abre el detalle de una carta. */
  onVer: (cardId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-9">
      <Mesa
        items={ordenarPilas(res.principal, oroInicial)}
        portada={portada}
        onPortada={onPortada}
        onVer={onVer}
      />

      {/* El side si se separa: no son 10 cartas del mazo, son las 10 que no
          estan en el. Mezclarlas en la misma mesa mentiria sobre el mazo. */}
      {res.side.length > 0 && (
        <section>
          <Encabezado titulo="Side deck" total={res.side.reduce((s, f) => s + f.n, 0)} />
          <Mesa
            items={ordenarPilas(res.side, null)}
            portada={portada}
            onPortada={onPortada}
            onVer={onVer}
          />
        </section>
      )}
    </div>
  );
}
