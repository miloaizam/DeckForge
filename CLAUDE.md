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
- **La API no es consistente entre ediciones.** Los casos ya vistos, y conviene
  revisar cada edición nueva antes de darla por buena:
  - El salto de línea del texto de habilidad: Bushido y Sol Naciente usan el
    carácter `U+21B5`, Dominio un `/n` **literal** (barra y ene). `clean_text()`
    normaliza los dos.
  - En Bushido, además, muchas veces el separador **no llega**: el punto queda
    pegado a la mayúscula siguiente ("…que controles.Juega cualquier número…").
    Eran 26 cartas; corregidas a mano contra el arte, donde el salto sí existe.
  - Campos vacíos que no deberían estarlo: ContraAtaque trae `type: null` en
    CA-111 (Acobardar), que en el arte dice Talismán. Corregido a mano en
    `data-src/`, que es exactamente para lo que existe ese directorio.
  - **Y hay datos derechamente malos**: nombres mal escritos, ilustradores
    intercambiados o vacíos, palabras comidas ("una **ez** por turno") y frases
    truncadas. En Bushido salieron 60 correcciones y en Sol Naciente 20, todas
    verificadas contra el arte de la carta. La
    [lista de cartas del fandom](https://myl.fandom.com/es/wiki/Listas_de_Cartas)
    sirve para **detectar** las diferencias (se baja por `api.php?action=parse`,
    la página directa la bloquea Cloudflare), pero no para resolverlas: también
    se equivoca. Manda el arte, que ya está en `public/cards/`.
  - **`cost` y `damage` vienen cambiados de orden en 24 Aliados de Sol
    Naciente** (ninguno en Bushido). No es un fallo del script: la API entrega
    los dos campos al revés carta por carta. Se ve en el arte, donde el yelmo de
    la izquierda es la **Fuerza** y la moneda de la derecha el **coste**. Al
    revisar una edición nueva hay que comparar los dos números de cada Aliado
    con su arte; el aviso de `build_cards.py` solo lo destapa cuando una carta
    tiene dos impresiones y solo una salió mal.
  - **`damage: null` en Aliados**: seis en Bushido (Tomoe, Watatsumi, Nure
    Onna, Jion, Kiyo Hime). Un Aliado siempre tiene Fuerza impresa; completada
    a mano.
  - **El listado puede traer menos cartas que el directorio de imágenes.** En
    Sol Naciente el listado da 140 cartas (`edid` 001–142, sin 132 ni 140),
    pero `/static/cards/10/<n>.png` responde hasta la 143. Las tres de más son
    la tanda promocional de 2017 (`2017-001`…`2017-015` al pie de cada carta):
    la 132 es **Ordalía**, una *carta de juez*, y la 140 es la promo dorada de
    **Sarras**, que ya está como CA-126 — las dos quedan fuera a propósito. La
    143 sí es del bloque japonés (**Takemikazuchi**) y se agregó a mano a
    `data-src/sol-naciente.json` con los datos leídos del arte. En Bushido el
    directorio corta justo en 246, igual que el listado: no esconde nada.
    **Al revisar una edición nueva, tantear `/static/cards/<ed>/<n>.png` unos
    números más allá del último del listado.**
  - **Y también puede traer menos cartas por abajo.** En Dominio el listado
    empieza en la 007: las seis **Legendarias** (DO-001 Adapa, DO-002 Caída del
    Sol, DO-003 Devorar, DO-004 Nammu, DO-005 Xolotl, DO-006 Carpa Dragón)
    **no existen en la API** — ni en el listado, ni por `profile`, ni como
    imagen (`/static/cards/11/001.png` … `006` dan 404). Están cargadas con
    datos leídos de su arte, que hubo que conseguir aparte. **Al revisar una
    edición nueva, mirar también si el listado arranca en 001.**
    Dos cosas de esas seis que conviene saber: llevan **otra plantilla** (el
    nombre en banda horizontal y no en vertical por el costado, así que los
    recortes que sirven para el resto no valen aquí), y su arte entra a
    **354×508**, por debajo de los 512×732 del resto. Por eso
    `resize_to_width()` **amplía además de reducir**: no inventa detalle, pero
    deja las 793 WebP a 420 de ancho, que es lo que la interfaz da por hecho.
    Si algún día aparece el arte a tamaño completo, basta borrar
    `public/cards/do-00X.webp` y su `thumb/` antes de volver a correr
    `data:images`, que si no se las salta.
  - **Un `profile` que no responde deja la carta a medias.** Tres cartas de
    Dominio (DO-064, DO-108, DO-122) quedaron con el nombre en minúscula y
    `ilustrador: null` porque ese endpoint falló durante el fetch. No es un
    dato malo de la API: reintentado, responde bien. **Un nombre en minúscula
    es la señal** — el listado los entrega así y el `profile` es quien los
    capitaliza.
  - **El texto puede venir de relleno.** DO-239 traía la habilidad literal
    `xxxxxxxxxxxxxxxxxxxxxxxxxx`.
  - **El oro inicial de cada edición llega mal frecuentado y a veces mal
    nombrado.** Es esa carta a arte completo, sin habilidad y sin cuadro de
    texto, con el nombre de la edición y el año al pie ("Bushido 2016"). La API
    la entrega como `Promocional` —lo es de origen, pero en el catálogo su
    frecuencia útil es **Oro**, que es lo que el jugador busca en el filtro— y
    en Dominio además la llamaba "Dominio 2017". Las cuatro quedan como
    `frecuencia: "Oro"` y con el nombre unificado **Oro Inicial <edición>**
    (BU-237, SN-129, DO-237, CA-145). Al cargar una edición nueva, buscar la
    suya y dejarla igual. Ojo de no arrastrar a los Oros promocionales de
    verdad, que sí traen habilidad: DO-256 (Carmina Burana) se queda
    `Promocional`.
- **Cómo se revisó Dominio** (250 cartas, 26 corregidas), por si sirve de
  receta. La [lista del fandom](https://myl.fandom.com/es/wiki/Lista_de_cartas_de_Dominio)
  se baja por `api.php?action=parse` y sirve para cotejar nombre, tipo, raza,
  frecuencia e ilustrador de golpe; ojo que **no lista los promos** y que se
  equivoca (decía "Zititron" por Zitiron, "Códex" por Codex). Lo que no cubre
  el fandom se saca del arte, y para no abrir 250 imágenes conviene recortar
  con Pillow y montar planchas: las dos esquinas superiores en una grilla
  verifican coste y Fuerza de muchas cartas por imagen, y el cuadro de
  habilidad recortado a 1.6× se lee bien con diez cartas por plancha. Las
  **Mega Real, Milenarias y promos llevan los números en relieve metálico** y
  no se leen sin `autocontrast` o `equalize` encima del recorte.
  - Dominio **no** tiene el intercambio `cost`/`damage` de Sol Naciente:
    verificados los 119 Aliados contra el arte, solo DO-180 estaba mal (un
    coste, no un intercambio).
  - El aviso de `build_cards.py` sobre `shuri` (coste 2 en DO-213, 3 en
    BU-218) es **correcto y no hay que arreglarlo**: la carta se reimprimió
    más barata. Comprobado en las dos ilustraciones.
  - Hay erratas **impresas en la carta**, que la API reproduce fielmente:
    DO-007 "entre en jugo", DO-182 "Mientas", DO-045 y DO-088 "regresa la
    demás", DO-078 "Cementerio, Los Aliados", DO-140 "que no sean Oro". Por
    decisión del proyecto **se corrigen en `data-src/`**, al contrario de lo
    que se hizo en Bushido: el dato se busca y se lee, y la carta real queda
    para la página de erratas. DO-053 es el único caso funcional —el arte dice
    "un Oro" donde la API dice "hasta dos Oros"— y ahí mandó el arte.
- **Cómo se revisó ContraAtaque** (150 cartas, 71 corregidas). Es una edición
  **recopilatoria**: casi todas sus cartas son reimpresiones de ediciones
  anteriores, así que su
  [lista del fandom](https://myl.fandom.com/es/wiki/Lista_de_cartas_de_ContraAtaque)
  usa la sexta columna para el **origen**, no para el ilustrador (salvo en las
  Milenarias, que sí son nuevas). Tampoco lista los Oros ni los promos: da 128
  de 150. Los tres fallos que trajo esta edición no se habían visto antes:
  - **La frecuencia venía barajada en 48 de las 128.** No es un error de una
    carta suelta: la API tiene el `rarity` permutado. Se detecta porque MyL
    numera por frecuencia y el fandom da tramos limpios, mientras que la API
    daba 45 trozos sueltos. Se resolvió con el **color del escudo del dragón**
    que va bajo el cuadro de habilidad, que codifica la frecuencia: negro
    Ultra Real, plata Mega Real, púrpura Milenaria, dorado Real, rojo
    Cortesano, azul Vasallo (verde en los promos). Verificadas las 128 una a
    una; los tramos son 1-6, 7-19, 20-29, 30-62, 63-95 y 96-128. **Vale la
    pena mirar ese escudo en cada edición nueva antes de fiarse del `rarity`.**
  - **Los 16 Oros traían el texto de ambientación en el campo `ability`**
    (CA-129…CA-144). No es cosmético: `deck-rules.ts` decide `oroSinHabilidad`
    con `tipo === "Oro" && habilidad === ""`, así que esos Oros quedaban
    topados a 3 copias y no podían hacer de oro inicial. Se vaciaron contra el
    arte, donde no hay cuadro de habilidad. Esos Oros llevan además su propia
    numeración al pie (`CAO-001-016`…`CAO-016-016`).
  - **El campo `ilustrador` arrastra un CRLF** en 15 cartas de ContraAtaque y
    4 de Bushido. `clean_name()` lo limpia ahora en el fetch.
  - El resto es lo de siempre: saltos de línea comidos, "de su mano" añadido
    donde la carta no lo imprime, `Unicá` por `Única` (CA-020), y erratas
    impresas del tipo "este Aliado este en juego".
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

**Cada edición declara la keyword a su manera, y eso rompió el resaltado.**
Bushido y Sol Naciente la imprimen a secas ("Única. Furia."), pero Dominio y
ContraAtaque le pegan el recordatorio de reglas entre paréntesis ("Única (Sólo
puedes tener una copia de esta carta en tu Mazo Castillo)."), y en cinco cartas
de ContraAtaque ni siquiera llega el punto de cierre. El regex exigía el punto
pegado a la keyword, así que de 44 cartas de Dominio reconocía 4 y de 37 de
ContraAtaque, ninguna: salían sin violeta. Ahora salta el paréntesis y acepta
que la declaración cierre con el fin de línea. En la prosa se **sigue**
exigiendo el punto, que ahí sin ancla sería ambiguo. `ability.test.ts` corre
contra el catálogo real y falla si alguna carta abre con una keyword que la UI
no pinta, que es como aparecieron las cinco de ContraAtaque.

Ojo también con `KEYWORDS_IMPRESAS`: **`Guardián` faltaba**. El campo
`keywords` de la API no la etiqueta nunca —ni una sola carta de las cuatro
ediciones—, aunque esté impresa en negrita como cualquier otra. Se agregó a la
lista para que se resalte; como las facetas del filtro salen de lo que las
cartas declaran (`catalog.ts`), agregarla no inventa una faceta vacía, pero
**tampoco se puede filtrar por ella** hasta que el campo `keywords` la traiga.

Tema claro/oscuro conmutable desde la navbar (ver DESIGN.md). Cuidado al
importar constantes desde un módulo `"use client"` hacia un Server Component:
Next entrega una referencia de cliente, no el valor. Por eso `THEME_KEY` vive
en `src/lib/theme.ts` y no en el componente.

Cargadas: **793 cartas** — Bushido (246), Sol Naciente (141), Dominio (256) y
ContraAtaque (150).

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

**Todavía no hay** las otras 6 ediciones, ni la banlist, ni las erratas.
