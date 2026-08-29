# DESIGN.md — cómo se ve DeckForge

Convenciones de diseño. Los valores salen de la guía de marca
([`docs/brand.html`](docs/brand.html), ábrela en el navegador) y están
implementados como tokens en [`src/app/globals.css`](src/app/globals.css).
Para lo técnico, ver [CLAUDE.md](CLAUDE.md).

---

## 1. Los tres principios

**Intuitivo.** El usuario llega a hacer una cosa: encontrar cartas y armar un
mazo. Esa acción está siempre a la vista.

- La búsqueda y los filtros nunca se esconden detrás de un menú.
- Cero navegación anidada: como máximo un nivel.
- Estado siempre visible: cuántas cartas lleva el mazo, qué filtro está activo,
  cuántos resultados hay. Nada de que el usuario adivine.
- Toda acción da respuesta inmediata (<100 ms percibidos). Si algo tarda, se
  muestra un esqueleto de carga, no un spinner sobre pantalla vacía.
- Vacío ≠ error: "no hay cartas con esos filtros" viene con un botón para
  limpiarlos.

**Moderno.** Dark-first, limpio, con aire.

- Fondo oscuro profundo, superficies apenas más claras, bordes de 1 px.
- Radios generosos (14–22 px) y espaciado holgado.
- Micro-transiciones de 150–250 ms; nada rebota ni gira.
- Tipografía geométrica con tracking negativo en los títulos.

**Llamativo.** El violeta es acento, no relleno.

- Un solo punto de color por vista: el elemento más importante de la pantalla.
- El brillo violeta (`shadow-glow`) se reserva para lo destacado —el logo, el
  botón principal, la carta seleccionada—. Si todo brilla, nada destaca.
- El gradiente de wordmark es para el nombre de marca y títulos de portada.
  No para texto corrido.

---

## 2. Tokens

Todos disponibles como utilidades de Tailwind. **Nunca escribas un hex en un
componente.**

### Violeta de marca

| Token | Hex | Uso |
|---|---|---|
| `brand-200` | `#C4B5FD` | detalles muy claros sobre violeta |
| `brand-300` | `#A78BFA` | acentos de texto, eyebrows, iconos activos |
| `brand-500` | `#8B5CF6` | anillo de foco, hover, bordes activos |
| **`brand-600`** | **`#7C3AED`** | **primario**: botón principal, estado activo |
| `brand-700` | `#6D28D9` | pressed, selección de texto |
| `brand-800` | `#5B21B6` | fondos violeta profundos |

### Superficies (modo oscuro, el modo por defecto)

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#0D0B14` | fondo de página |
| `surface` | `#15121F` | bloques y barras sobre el fondo |
| `panel` | `#1B1730` | tarjetas, modales, panel de mazo |
| `line` | `#2A2342` | bordes y separadores |

Jerarquía de profundidad: `bg → surface → panel`. Tres niveles bastan; no
inventes un cuarto.

### Texto

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#EDE9F7` | texto principal |
| `muted` | `#9A93B5` | secundario, metadatos, placeholders |

### Superficies claras

`light-bg #F5F3FB` · `light-line #E3DEF2` · `light-muted #8A82A6`.
Uso puntual (hojas de marca, vistas de impresión). **La app es oscura**; no se
construye un theme switcher salvo que se decida explícitamente.

### Radios

`rounded-chip` 11px · `rounded-card` 14px · `rounded-panel` 18px ·
`rounded-tile` 22px · `rounded-app` 28px.

Regla: a mayor superficie, mayor radio. Un chip y un modal no comparten radio.

### Elevación

- `shadow-glow` — `0 18px 40px -18px rgb(124 58 237 / .6)`. Violeta que se
  filtra por debajo. Solo para lo destacado.
- `shadow-panel` — sombra neutra suave para modales y menús flotantes.

Nada de sombras negras duras: la profundidad viene del contraste entre
superficies, no de la sombra.

### Gradientes

- `bg-forge` → `radial-gradient(120% 120% at 30% 20%, #1d1633, #0c0a13)`.
  El fondo de "forja". Para tiles, portadas de carta y el marco del isotipo.
- `text-wordmark` → `linear-gradient(92deg, #A78BFA, #7C3AED)` recortado al
  texto. Solo para el nombre de marca y títulos de portada.

---

## 3. Tipografía

**Space Grotesk** (SIL OFL), pesos 400 / 500 / 600 / 700. Auto-hospedada por
`next/font` — no se carga nada desde Google en producción.

| Rol | Tamaño | Peso | Detalle |
|---|---|---|---|
| Display | `clamp(34px, 6vw, 58px)` | 700 | `tracking-[-0.02em]`, `leading-none` |
| Título de sección | 24–28 px | 600 | `tracking-[-0.01em]` |
| Eyebrow | 13 px | 500 | mayúsculas, `tracking-[0.28em]`, `brand-300` |
| Label | 12 px | 500 | mayúsculas, `tracking-[0.22em]`, `muted` |
| Cuerpo | 15–17 px | 400 | `leading-relaxed`, máx. **54 caracteres** por línea |
| Metadato | 13 px | 400 | `muted`, cifras con `tabular-nums` |

- Cifras en tablas y contadores: siempre `tabular-nums`, para que no bailen.
- Una sola familia en todo el sitio. No se agrega una segunda tipografía.

---

## 4. Layout

- Contenedor de contenido: `max-w-[1040px]` (el de la guía de marca).
  La grilla del catálogo puede ir hasta `max-w-[1280px]`.
- Espaciado en múltiplos de 4; los saltos entre secciones son grandes (48–64 px).
- Mobile-first: la grilla arranca en 2 columnas y crece; el panel de mazo pasa
  a hoja inferior en pantallas chicas.
- Breakpoints los de Tailwind por defecto. El punto crítico de la marca es
  **720 px** (donde las rejillas de dos columnas colapsan a una).

---

## 5. Movimiento

- Duraciones 150–250 ms; easing `--ease-out-soft`.
- Hover en carta: elevación sutil + borde que pasa a `brand-500`. Sin escalar
  más de 1.02.
- Cambios de filtro: transición de opacidad, no reordenamientos animados.
- **Se respeta `prefers-reduced-motion`** — ya está implementado en
  `globals.css`; no lo anules.

---

## 6. Uso del logo

Archivos en `public/brand/`: `logo-white.svg`, `logo-violet.svg`,
`icon-white.svg`, `icon-violet.svg`.

**Sí**

- Versión blanca sobre fondos oscuros (el caso normal en la app).
- Versión violeta sobre fondos claros o neutros.
- Margen mínimo alrededor ≈ la altura del ícono.
- El isotipo para favicon, avatar y app icon: funciona desde 16 px.

**No**

- Deformarlo ni cambiar la proporción entre ícono y texto.
- Violeta sobre negro puro (contraste insuficiente).
- Reemplazar la tipografía ni recolorear la llama.

---

## 7. Accesibilidad

No es opcional. Un mazo mal etiquetado es un mazo que alguien no puede armar.

- **Contraste** AA mínimo: 4.5:1 en texto normal, 3:1 en texto grande y en
  bordes de controles. `muted` sobre `bg` cumple; no lo uses más apagado.
- **El color nunca es el único indicador.** Legalidad, escuela y atributo
  llevan además texto o ícono.
- **Foco visible** en todo elemento interactivo: anillo `brand-500` de 2 px con
  2 px de offset (ya global en `globals.css`). Nunca `outline: none` sin
  reemplazo.
- **Objetivos táctiles** ≥ 44×44 px. Los botones de +/− cantidad son el punto
  donde esto más se rompe: cuídalos.
- **Teclado**: todo se puede usar sin mouse. Los modales atrapan el foco, se
  cierran con `Esc` y devuelven el foco al elemento que los abrió.
- **Imágenes**: `alt` con el nombre de la carta (`alt="Carta: {nombre}"`), no
  "imagen" ni vacío. Las decorativas van con `alt=""`.
- **HTML semántico**: `<button>` para acciones, `<a>` para navegar, encabezados
  en orden. Nada de `<div onClick>`.
- **Controles propios = patrón ARIA completo.** El `<select>` nativo no se puede
  estilizar (el navegador dibuja la lista con colores del sistema), así que
  `Select` es un listbox propio. Reemplazarlo obliga a devolver lo que el nativo
  daba gratis: rol anunciado, flechas, Inicio/Fin, Enter, Escape, cierre al
  hacer clic fuera y foco visible. Si no puedes sostener eso, usa el nativo.
- **Zoom** hasta 200% sin romper el layout ni perder contenido.

---

## 8. Escribir en la interfaz

- Español de Chile, tuteo, directo y breve. "Agregar al mazo", no
  "Proceder a añadir la carta seleccionada".
- Los términos del juego se respetan tal cual: *Aliado*, *Talismán*, *Tótem*,
  *Frecuencia*, *Mega Real*. No los traduzcas ni los simplifiques.
- Las keywords impresas (*Única*, *Furia*, *Imbloqueable*…) se resaltan en
  `brand-300` dentro del texto de habilidad: son reglas, no prosa, y el jugador
  las busca con la vista. La lista vive en `KEYWORDS_IMPRESAS`
  (`src/lib/types.ts`) y excluye las etiquetas internas de la API.
- Los errores dicen qué pasó y qué hacer: "Ese mazo ya tiene 3 copias de esta
  carta (el máximo)".
- Sin signos de exclamación ni emojis en la UI.
