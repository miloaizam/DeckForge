/**
 * Clave del tema en localStorage.
 *
 * Vive en su propio modulo y no en ThemeToggle.tsx a proposito: ese archivo
 * es `"use client"`, y al importar una constante suya desde un Server
 * Component, Next entrega una referencia de cliente en vez del valor. El
 * script inline del layout terminaba leyendo `localStorage.getItem(undefined)`.
 */
export const THEME_KEY = "deckforge-theme";
