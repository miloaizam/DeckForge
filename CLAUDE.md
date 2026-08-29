# CLAUDE.md — cómo se programa DeckForge

Convenciones de código para este repo. Si vas a escribir código aquí (persona o
agente), lee esto primero. Para lo visual, ver [DESIGN.md](DESIGN.md).

---

## 1. Qué es

Deckbuilder web para el formato **Escuelas Elementales** de Mitos y Leyendas.
Sitio **100% estático**: no hay backend, no hay base de datos, no hay cuentas.
Todo corre en el navegador del usuario.

- El **catálogo** es data fija → archivos estáticos generados en build.
- El **mazo** es del usuario → vive en su navegador (`localStorage` + URL).

Plan completo: [`docs/plan.md`](docs/plan.md). Marca: [`docs/brand.html`](docs/brand.html).

---

## 2. Stack

| Capa | Herramienta |
|---|---|
| Framework | Next.js 16 · App Router · `output: "export"` |
| UI | React 19 + TypeScript (`strict`) |
| Estilos | Tailwind CSS v4 (config CSS-first en `globals.css`, **no** hay `tailwind.config.js`) |
| Tipografía | Space Grotesk vía `next/font/google` (auto-hospedada en build) |
| Iconos | `lucide-react` |
| Búsqueda | `minisearch` *(instalado, aún sin usar)* |
| Compartir mazo | `lz-string` *(instalado, aún sin usar)* |
| Validación | `zod` |
| Datos e imágenes | Python 3 + Pydantic + Pillow (`scripts/`) |
| Fuente del catálogo | **API oficial `api.myl.cl`** (pública, sin auth) |
| Hosting | Cloudflare Workers (Static Assets) — `wrangler.jsonc` sirve `out/` |

---

## 3. Comandos

```bash
npm run dev          # desarrollo en http://localhost:3000
npm run build        # export estático a out/
npm run preview      # sirve out/ en http://localhost:4173
npm run check        # typecheck + lint + formato + tests (correr antes de commitear)
npm run test         # tests de las reglas de mazo (corredor de Node, sin dependencias)
npm run audit        # auditoría de seguridad sobre out/ (tras `npm run build`)
npm run data:fetch bushido   # api.myl.cl -> data-src/bushido.json + images-src/
npm run data:card helenica 042  # UNA carta suelta -> data-src/extras.json
npm run data:images          # images-src/*    -> public/cards/*.webp
npm run data:cards           # data-src/*.json -> public/data/cards.json
```

Los scripts de Python corren en el venv del repo (`.venv/`). Si no existe:

```bash
python3 -m venv --without-pip .venv
curl -sSL https://bootstrap.pypa.io/get-pip.py | .venv/bin/python -
.venv/bin/pip install -r requirements.txt
```

---

## 4. Estructura

```
docs/          plan y guía de marca (documentación, no se compila)
data-src/      FUENTE editable del catálogo: un JSON por edición, más
               extras.json con las cartas sueltas de fuera del formato
images-src/    originales pesados de las cartas (git-ignorado; su .gitkeep
               es el único que queda, para que la carpeta exista en el repo)
scripts/       herramientas Python: validan datos y convierten imágenes
public/        se sirve tal cual
  brand/       logos e isotipos SVG
  reglas/      PDFs descargables (se sirven tal cual, ver seguridad #12)
  data/        cards.json  (GENERADO — no editar a mano)
  cards/       WebP de las cartas + thumb/  (GENERADO — no editar a mano)
  _headers     cabeceras de seguridad de Cloudflare
src/app/       rutas (App Router), layout y globals.css
src/components/ componentes de React
src/lib/       lógica pura: tipos, esquemas, utilidades
out/           build estático (git-ignorado)
```

---

## 5. Convenciones de código

**Componentes**

- **Server Components por defecto.** `"use client"` solo cuando hay estado,
  efectos o eventos, y siempre **lo más abajo posible** en el árbol: una isla
  interactiva pequeña, no la página entera.
- Un componente por archivo, nombre en `PascalCase`, archivo con el mismo
  nombre (`CardTile.tsx`).
- Props tipadas con una `interface` exportada solo si otro archivo la usa.

**Nombres**

- Código en **inglés** (funciones, variables, props, archivos de `src/`).
- **Español** en todo lo que ve el usuario y en los campos del dominio, que
  vienen del juego: `tipo`, `raza`, `escuela`, `frecuencia`, `habilidad`.
- Sin acentos ni `ñ` en comentarios de código (evita líos de encoding); en
  textos de UI y en los datos, acentuación normal y correcta.

**TypeScript**

- `strict` activo. Prohibido `any` (ESLint lo bloquea) y `@ts-ignore`.
- `as` solo con un comentario que explique por qué es seguro.
- Alias de import `@/` para todo lo que esté bajo `src/`.

**Estilos**

- Tailwind con los tokens de marca. Nada de hex sueltos en los componentes:
  usa `bg-panel`, `text-muted`, `border-line`, `rounded-card`, etc.
- Clases condicionales con `cn()` de `@/lib/utils`.
- CSS suelto solo en `src/app/globals.css`. Nada de CSS Modules ni styled-components.

**Datos**

- El catálogo se baja de la **API oficial de MyL** con `scripts/fetch_edition.py`:
  `/cards/edition/<slug>` (listado), `/cards/profile/<slug>/<carta>` (nombre e
  ilustrador) y `/static/cards/<ed>/<n>.png` (arte, 512×732).
- La **fuente de verdad** son los JSON de `data-src/`. El script no los pisa sin
  `--force`: las correcciones a mano (tildes, sobre todo) se conservan.
- `public/data/cards.json` y `public/cards/*.webp` son **artefactos generados**.
  El frontend los lee; **nunca** los escribe ni los edita.
- `src/lib/types.ts` y `scripts/schema.py` describen el mismo modelo.
  **Si cambias uno, cambia el otro en el mismo commit.**
- El formato **no admite Monumentos**: ese tipo no entra al catálogo aunque la
  API lo liste globalmente. Verificado: 0 monumentos en las 10 ediciones.
- Ojo con los slugs de la API: `escuelas_elementales` va con **guion bajo**,
  el resto con guion (`legado-gotico`, `aguila-imperial`…).

---

## 6. Seguridad

La superficie de ataque es mínima por diseño —sin servidor, sin cuentas, sin
cookies, sin datos personales—, pero eso no se deja al azar:

1. **Cabeceras HTTP** en [`public/_headers`](public/_headers): CSP,
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
   `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
   Cloudflare Pages las aplica tal cual.

2. **CSP**: `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`,
   `form-action 'none'`, `frame-ancestors 'none'`, imágenes y fuentes solo del
   propio origen.
   *Limitación consciente:* `script-src` y `style-src` llevan `'unsafe-inline'`
   porque el App Router incrusta el payload de hidratación en `<script>` inline
   y, sin servidor, no hay forma de emitir un nonce. El impacto real es bajo
   —la app no renderiza HTML de terceros ni recibe input remoto— y el resto de
   la política sigue impidiendo cargar o exfiltrar hacia orígenes externos.

3. **Nada de HTML crudo.** `dangerouslySetInnerHTML` está prohibido y ESLint
   falla si aparece (`react/no-danger`). El texto de habilidad de las cartas se
   renderiza siempre como texto plano. Tampoco `eval` ni `new Function`.

4. **Todo lo que entra desde fuera del bundle se valida con Zod** antes de
   usarse: `cards.json`, `localStorage` y la query string. `localStorage` lo
   puede editar el usuario o cualquier extensión del navegador — nunca se
   asume su forma. Al decodificar un mazo desde la URL: parsear a la
   defensiva, acotar tamaños y descartar ids desconocidos sin reventar la app.

5. **Cero terceros.** Sin analytics, sin CDNs, sin fuentes remotas, sin
   hotlinking de imágenes, sin píxeles de seguimiento. Todo se sirve desde
   nuestro origen. La telemetría de Next.js está desactivada.

6. **Cadena de suministro.** `package-lock.json` commiteado; dependencias
   mínimas y justificadas; `npm audit` antes de publicar; revisar qué instala
   `postinstall` scripts antes de aprobarlos.

7. **Privacidad.** Los mazos no se guardan en ningún servidor: viven en el
   `localStorage` del usuario. No hay cuentas, ni datos personales, ni banner de
   consentimiento. Que siga así.

   *Matiz honesto:* un mazo compartido viaja en la query string
   (`/mazo/?d=…`), así que **sí pasa por el borde de Cloudflare** y puede
   quedar en sus logs, como cualquier URL. No es "nunca sale del navegador".
   Un fragmento (`#d=`) no saldría, pero cuesta la reactividad de
   `useSearchParams`; se deja documentado por si algún día importa.

8. **Sin secretos en el repo.** En un sitio estático no existe lugar seguro
   para una clave: todo `NEXT_PUBLIC_*` termina en el bundle público.

9. **Enlaces externos** siempre con `rel="noopener noreferrer"`.

10. **Las rutas de imagen se validan por regex** (`/cards/…​.webp`) y los slugs
    también. Un `cards.json` manipulado no puede inyectar un host externo, un
    `javascript:`, un `data:` ni un `../` en el `src` de una etiqueta. Falla el
    build antes de publicar.

11. **PDFs y otros descargables** viven en `public/reglas/` y se publican tal
    cual. Se enlazan con `<a href="/reglas/x.pdf" download>`: la CSP lleva
    `object-src 'none'`, asi que **no** se pueden incrustar con `<embed>`,
    `<object>` ni `<iframe>`. Que sean archivos propios, no hotlinkeados, y
    que no lleven metadatos con datos personales del autor.

12. **`npm run audit`** revisa el sitio ya construido y falla si aparece un
    source map, una ruta absoluta de la máquina de build, un recurso externo,
    una imagen rota, una cabecera de seguridad ausente o los dos esquemas
    desincronizados. Correr siempre antes de publicar.

### Por qué la CSP no usa hashes

Quitar `'unsafe-inline'` de `script-src` exigiría hashear los bloques inline
que el App Router incrusta en cada HTML. Es factible, pero **no hay navegador
en este entorno para comprobar que la página siga hidratando**, y un hash mal
calculado deja el sitio en blanco. Se deja documentado como pendiente: hacerlo
solo cuando se pueda verificar en un navegador real.

---

## 7. Qué NO hacer

- **No romper el export estático.** Nada de API routes, middleware, `cookies()`,
  `headers()`, `revalidate` ni Server Actions: `output: "export"` los rechaza.
- **No agregar dependencias** sin una razón concreta. Cada una es superficie de
  ataque y peso de descarga.
- **No editar a mano** `public/data/cards.json` ni `public/cards/`: se regeneran
  y perderías el cambio.
- **No subir originales** a `images-src/` al repo (está git-ignorado): solo se
  publican las WebP ya optimizadas.
- **No usar `next/image` con optimización**: no hay servidor. Las imágenes ya
  vienen dimensionadas desde Python (`unoptimized: true` es intencional).

---

## 8. Derechos

El arte de las cartas es propiedad de su editor. El proyecto es **sin fines de
lucro**, acredita a los ilustradores (campo `ilustrador` del esquema) y enlaza
a fuentes oficiales cuando corresponde.

---

## 9. Estado actual

**Fase 0 lista + buena parte de Fase 1.** Funcionando: portada, cadena de
datos completa (API → `data-src` → WebP → `cards.json`), catálogo con grilla,
modal de detalle con keywords resaltadas, buscador (MiniSearch), filtros por
faceta con selector propio y paginación.

Rutas: `/` portada (sin navbar) · `/catalogo` todo · `/catalogo/<edicion>` ·
`/builder` (placeholder) · `/mazos` (placeholder) · `/erratas` (placeholder).
Las páginas internas viven en el grupo `(app)`, cuyo layout aporta la navbar;
la portada queda fuera a propósito.

La navbar es una fila plana de cuatro enlaces (sin desplegable). Bajo `md` se
pliegan detrás de un botón de menú: no caben junto al logotipo en un teléfono.

Los filtros del catálogo van plegados detrás de un botón con embudo, que lleva
el número de filtros puestos; solo el buscador queda siempre a la vista. Hay
nueve facetas: edición (solo en `/catalogo`, porque en la página de una edición
no tendría nada que elegir), habilidad, tipo, raza, escuela, frecuencia, coste,
fuerza y atributo.

`src/lib/ability.ts` separa las keywords declaradas al inicio del texto de
habilidad ("Única. Furia. …") del resto de la prosa: el modal las muestra en
una fila propia y resalta aparte las que caen dentro del párrafo. El filtro de
habilidad **no** usa ese texto sino el campo `keywords` de la carta, que la API
entrega ya etiquetado y también marca los casos condicionales ("Mientras porte
un Arma es Imbloqueable"). Ojo: ese campo trae además etiquetas internas de
búsqueda de la API (`Destruir`, `que controles`) que no son keywords impresas;
se filtran contra `KEYWORDS_IMPRESAS`.

Tema claro/oscuro conmutable desde la navbar (ver DESIGN.md). Cuidado al
importar constantes desde un módulo `"use client"` hacia un Server Component:
Next entrega una referencia de cliente, no el valor. Por eso `THEME_KEY` vive
en `src/lib/theme.ts` y no en el componente.

Cargadas: **386 cartas** — Bushido (246) y Sol Naciente (140).

### Constructor de mazos (Fase 2)

Rutas: `/builder` arma y edita · `/mazos` la lista · `/mazo` el detalle.

`/mazo` va en **singular y con query string** (`?m=` uno tuyo, `?d=` uno
compartido) porque `output: "export"` no admite una ruta dinámica `/mazos/[id]`
para datos del usuario: `generateStaticParams` no puede conocer ids que se
inventan en el navegador.

Reglas del formato, en `src/lib/deck-rules.ts`: 50 cartas, un oro inicial (un
Oro sin habilidad, señalado con un puntero a una carta de `principal` porque
cuenta dentro de las 50), mínimo 15 Aliados o Tótems, máximo 3 copias por carta
(1 si es Única), razas de una sola escuela y side de 0 o 10 cartas.

**Los Oros sin habilidad no tienen tope de copias**: son el recurso con que se
paga todo y el mazo lleva los que necesite. Los cuatro Oros que sí traen
habilidad (Regalia Imperial, Pantano Sagrado, Mon y Chozuya) son todos Únicos,
así que siguen limitados a una copia. Por eso el esquema de Zod acota las
entradas a 50 y no a 3: describe lo que se puede **representar**, no lo que es
legal — si recortara a 3, un mazo importado con 4 copias se volvería legal en
silencio al leerlo.

**Las copias se cuentan por `identidad`, no por `id`**: dos Kirin normales más
dos Kirin Milenaria son cuatro Kirin. Y se suman principal y side.

`canAdd` comparte contadores y mensajes con `validateDeck` a propósito: si
divergieran, el botón "+" dejaría armar un mazo que el validador rechaza.

Los mazos viven en `localStorage` y se leen con `useSyncExternalStore`, no con
un efecto que llame a `setState` — el compilador de React bloquea eso y tiene
razón: es un sistema externo. Sale gratis la sincronización entre pestañas.

Ojo con `useSearchParams` en un export estático: **exige un `<Suspense>`**, y la
trampa es que en desarrollo funciona sin él y falla el build de producción. En
`/builder` el límite envuelve una hoja que no pinta nada (`DeckParamLoader`),
no la isla entera: envolverla entera tiraría a la basura el HTML prerenderizado
de la grilla, que es lo caro de esa página.

### Tests

`npm run test` corre el corredor de Node, que desde Node 24 ejecuta TypeScript
de fábrica: **cero dependencias nuevas**. Van contra el catálogo real y no
contra fixtures, porque los bordes que duelen salen de los datos.
`scripts/ts-imports.mjs` son quince líneas que le enseñan a Node a resolver los
imports sin extensión que espera el bundler de Next.

**Todavía no hay** las otras 8 ediciones, ni la banlist, ni las erratas.
