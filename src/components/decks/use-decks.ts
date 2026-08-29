"use client";

import { useSyncExternalStore } from "react";

import {
  getDecksSnapshot,
  getServerDecksSnapshot,
  subscribeDecks,
} from "@/lib/deck-storage";
import type { Deck } from "@/lib/types";

/**
 * Los mazos guardados, leidos como sistema externo.
 *
 * `useSyncExternalStore` es el primitivo hecho para esto: leer localStorage en
 * un efecto y llamar a setState dispara renders en cascada, y el compilador de
 * React lo bloquea con razon.
 */
export function useDecks(): Deck[] {
  return useSyncExternalStore(subscribeDecks, getDecksSnapshot, getServerDecksSnapshot);
}

/** Nunca se suscribe a nada: no hay a que. */
const sinSuscripcion = () => () => {};

/**
 * Si el navegador ya tomo el control.
 *
 * Sirve para distinguir "todavia no lei localStorage" de "no hay mazos", que
 * en pantalla son cosas muy distintas: un esqueleto o un estado vacio.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}
