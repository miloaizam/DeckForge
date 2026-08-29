/**
 * Las diez ediciones del formato Escuelas Elementales.
 *
 * `slug` es el mismo que usa la API de MyL y el que guardamos en el campo
 * `edicion` de cada carta. Ojo: Escuelas Elementales lleva guion BAJO.
 *
 * `cargada` marca si su JSON ya existe en `data-src/`. Las que faltan se
 * muestran en el menu pero deshabilitadas: es mas honesto que esconderlas,
 * porque comunica que el catalogo esta creciendo.
 */
export interface Edition {
  slug: string;
  titulo: string;
  cargada: boolean;
}

export const EDITIONS: Edition[] = [
  { slug: "bushido", titulo: "Bushido", cargada: true },
  { slug: "sol-naciente", titulo: "Sol Naciente", cargada: true },
  { slug: "dominio", titulo: "Dominio", cargada: false },
  { slug: "contraataque", titulo: "ContraAtaque", cargada: false },
  { slug: "aguila-imperial", titulo: "Águila Imperial", cargada: false },
  { slug: "steampunk", titulo: "Steampunk", cargada: false },
  { slug: "axis-mundi", titulo: "Axis Mundi", cargada: false },
  { slug: "hijos-del-sol", titulo: "Hijos del Sol", cargada: false },
  { slug: "legado-gotico", titulo: "Legado Gótico", cargada: false },
  { slug: "escuelas_elementales", titulo: "Escuelas Elementales", cargada: false },
];

export const LOADED_EDITIONS = EDITIONS.filter((e) => e.cargada);

export function findEdition(slug: string): Edition | undefined {
  return EDITIONS.find((e) => e.slug === slug);
}

/** Titulo legible a partir del slug guardado en la carta. */
export function editionTitle(slug: string): string {
  return findEdition(slug)?.titulo ?? slug;
}
