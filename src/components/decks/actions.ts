import { deckTitle } from "@/lib/deck";
import { exportFile, shareUrl } from "@/lib/deck-code";
import type { Deck } from "@/lib/types";

/**
 * Compartir y descargar un mazo.
 *
 * Viven aparte porque las usan la lista y el detalle, y duplicarlas era la via
 * segura a que una copiara un enlace con otro formato que la otra.
 */

/** Copia el enlace del mazo. Devuelve el mensaje que hay que mostrar. */
export async function copyShareLink(deck: Deck): Promise<string> {
  try {
    await navigator.clipboard.writeText(shareUrl(deck, window.location.origin));
    return "Enlace copiado.";
  } catch {
    // Sin permiso de portapapeles (o sin HTTPS) no hay a que recurrir salvo
    // decirlo: el enlace es demasiado largo para pedir que lo copien a mano.
    return "No pude copiar el enlace. Revisa los permisos del navegador.";
  }
}

/** Baja el mazo como archivo. Todo pasa en el navegador: nada sale del origen. */
export function downloadDeck(deck: Deck): void {
  const blob = new Blob([exportFile([deck])], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mazo-${slugNombre(deck)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function slugNombre(deck: Deck): string {
  const base = deckTitle(deck)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "sin-nombre";
}
