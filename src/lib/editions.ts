/**
 * Las diez ediciones del formato Escuelas Elementales.
 *
 * `slug` es el mismo que usa la API de MyL y el que guardamos en el campo
 * `edicion` de cada carta. Ojo: Escuelas Elementales lleva guion BAJO.
 *
 * `cargada` marca si su JSON ya existe en `data-src/`.
 *
 * La lista lleva ademas las ediciones de FUERA del formato que aportan cartas
 * sueltas, marcadas con `parcial`. Estan aqui para que `editionTitle()` sepa
 * como se llaman: sin eso, el filtro del catalogo mostraria el slug pelado.
 */
export interface Edition {
  slug: string;
  titulo: string;
  cargada: boolean;
  /**
   * La edicion no es del formato, pero aporta unas pocas cartas sueltas que si
   * lo son (agregadas por balance: Wotan y sus variantes, por ejemplo). Vive en
   * `data-src/extras.json`.
   *
   * Aparece en el filtro de edicion del catalogo, para que su nombre se lea
   * bien, pero NO tiene pagina propia: no vale la pena una ruta para tres
   * cartas.
   */
  parcial?: boolean;
}

export const EDITIONS: Edition[] = [
  { slug: "bushido", titulo: "Bushido", cargada: true },
  { slug: "sol-naciente", titulo: "Sol Naciente", cargada: true },
  { slug: "dominio", titulo: "Dominio", cargada: true },
  { slug: "contraataque", titulo: "ContraAtaque", cargada: true },
  { slug: "aguila-imperial", titulo: "Águila Imperial", cargada: true },
  { slug: "steampunk", titulo: "Steampunk", cargada: true },
  { slug: "axis-mundi", titulo: "Axis Mundi", cargada: true },
  { slug: "hijos-del-sol", titulo: "Hijos del Sol", cargada: false },
  { slug: "legado-gotico", titulo: "Legado Gótico", cargada: false },
  { slug: "escuelas_elementales", titulo: "Escuelas Elementales", cargada: false },

  // De fuera del formato: solo aportan las cartas sueltas que se agregaron por
  // balance. Estan aqui para que su nombre se lea bien en el filtro.
  { slug: "helenica", titulo: "Helénica", cargada: true, parcial: true },
  { slug: "imperio", titulo: "Imperio", cargada: true, parcial: true },
  { slug: "espada-sagrada", titulo: "Espada Sagrada", cargada: true, parcial: true },
  { slug: "dominios-de-ra", titulo: "Dominios de Ra", cargada: true, parcial: true },
  { slug: "cruzadas", titulo: "Cruzadas", cargada: true, parcial: true },
  { slug: "furia", titulo: "Furia", cargada: true, parcial: true },
];

/**
 * Las que tienen pagina propia de catalogo.
 *
 * Una edicion `parcial` queda fuera aunque aporte cartas: no vale la pena una
 * ruta entera para las tres o cuatro que entraron por balance. Se llega a ellas
 * por el filtro de edicion.
 */
export const LOADED_EDITIONS = EDITIONS.filter((e) => e.cargada && !e.parcial);

export function findEdition(slug: string): Edition | undefined {
  return EDITIONS.find((e) => e.slug === slug);
}

/** Titulo legible a partir del slug guardado en la carta. */
export function editionTitle(slug: string): string {
  return findEdition(slug)?.titulo ?? slug;
}
