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
  - **Un Aliado sin raza es un dato malo, no un caso legítimo.** Todos los
    Aliados del juego llevan raza impresa; la única que nació sin ella, Nana,
    fue erratada a **Ancestral**. Si una edición nueva trae un Aliado con
    `raza: null`, hay que leer el arte y completarla. Los Tótems sí van sin
    raza —los 51 cargados— y entran en cualquier mazo, igual que Talismanes,
    Armas y Oros.
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
  - **El campo `keywords` marca la MENCIÓN, no la posesión**, y eso vale para
    todas las ediciones. Se vio primero en el atributo de Steampunk y resultó
    ser general: Kaidan (SN-139) llegaba `Indestructible` por convertir tus
    Oros en Aliados Indestructibles, Petasos por dárselo al portador, Trajano
    por nombrarlo. Eran **201 etiquetas falsas** en las nueve ediciones. Por eso
    `fetch_edition.py` ya **no lee esos flags**: deriva el campo de lo que la
    carta declara, con `keywords_propias()`. Al cargar una edición nueva no hay
    nada que revisar aquí, pero sí hay que buscar a mano las que tienen la
    keyword **por una condición de su propio texto** ("Mientras este Aliado
    porte un Arma es Imbloqueable"), que el script no puede deducir: son 13 en
    todo el catálogo y se agregan a `data-src/` con su línea en
    `keywords.test.ts`.
  - **Y ojo con dónde declara la carta.** El primer analizador miraba solo el
    comienzo del texto y perdió tres cosas: `Guardián` en DO-176 (Pulcinela),
    que antepone una condición de juego, e `Inmunidad` en LG-003, LG-233
    (Caín) y LG-005 (Serpiente Negra), que la encadenan en la misma línea que
    `Errante` y `Oscuridad` y no cierran en punto sino en guion. Ahora es un
    analizador por líneas que consume declaraciones mientras haya.
  - **El punto que se cuela antes del recordatorio.** AI-099, LG-173 y HS-044
    traían `Alimenta este Aliado. (Este Aliado gana 1 a la Fuerza…)` con un
    punto de más, que deja el paréntesis fuera de su frase. La carta lo imprime
    dentro. Corregido en `data-src/` como cualquier otra errata de puntuación.
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
- **Cómo se revisó Águila Imperial** (261 cartas, 26 corregidas). Es la
  edición con los datos **más limpios** hasta ahora en lo que suele fallar —el
  `rarity` viene en tramos contiguos y correctos, nada del barajado de
  ContraAtaque; el texto usa saltos de línea reales, sin `↵` ni `/n` ni puntos
  pegados; el `flavour` va en su propio campo y los 16 Oros traen `ability`
  vacío— y aun así trajo tres fallos nuevos que conviene buscar en las que
  faltan:
  - **El `edid` de la API va desfasado respecto del código impreso.** Las 9
    Legendarias ocupan los `edid` 001–009 pero llevan su **propia numeración**
    al pie (`LAI-01-09`…`LAI-09-09`) y **no cuentan** dentro del set base, que
    va `AI-001-227`…`AI-227-227` sobre los `edid` 010–236. O sea: el código
    impreso es `edid − 9`. Los 25 promos (`edid` 237–261) van aparte, entre
    preestrenos (`PE-09`, `PE-14`…) y la tanda de 2017 (`2017-042`…). En
    Dominio no pasaba: allí las Legendarias sí van dentro del 236 y la API
    simplemente no las entregaba. **Por decisión del proyecto el `codigo` se
    queda en `AI-<edid>`**, uniforme con el resto del repo, aunque en 227
    cartas no coincida con lo que el jugador lee al pie. Verificado en el arte
    de AI-010, AI-011, AI-012, AI-218, AI-221 y AI-236.
  - **El `ilustrador` llega de relleno en las 261 cartas.** La API devuelve
    `Mitos y Leyendas` para todas, que es el valor legítimo **solo** del oro
    inicial (BU-237, SN-129, DO-237, CA-145 y aquí AI-237, cuyo arte dice
    literalmente "ARTE: MYL"). La edición viene, en la práctica, **sin dato de
    ilustrador**. Se rellenó con la
    [lista del fandom](https://myl.fandom.com/es/wiki/Lista_de_cartas_de_%C3%81guila_Imperial)
    para las 227 del set base y leyendo el pie de la carta para las 34 que el
    fandom no lista (9 Legendarias + 25 promos). **Las 227 se cotejaron una a
    una contra el pie: cero discrepancias**, así que en esta edición la
    columna del fandom es de fiar. Ojo con la grafía: el pie va en VERSALES y
    no sirve para las tildes ni para el camelCase (`CristianAC`); esos salen
    del fandom o del catálogo ya cargado. Único ajuste: AI-133 y AI-253
    imprimen "RUÍZ", pero el ilustrador ya estaba como `Francisco Ruiz` desde
    otra edición y partirlo en dos nombres rompería el agrupado.
  - **22 nombres llegan con espacios al final** ("Aníbal ", "Falx "). Es la
    primera edición donde pasa. `clean_name()` se aplica ahora también al
    nombre de la carta, no solo al del ilustrador.
  - **Las Legendarias usan otra plantilla y declaran la keyword a secas**, una
    por línea y **sin** el recordatorio entre paréntesis: el arte de Nanna dice
    "Única" y punto, el de Loki "Furia" / "Exhumar". La API les pega el
    paréntesis igual que al set base, donde sí va impreso. Se quitó en las 9.
  - **Ocho promos son reimpresiones TEXTLESS**: la carta se imprimió sin cuadro
    de reglas y la API entrega la cadena literal `TEXTLESS` en `ability`
    (AI-254…AI-261). Por decisión del proyecto **se les copia el texto y las
    keywords de su impresión original**, para que la carta diga lo que hace.
    Siete originales ya estaban en el catálogo; Relámpago Faérico (AI-256) es
    de **Camelot**, que no es del formato, y se sacó de
    `/cards/edition/camelot`.
  - **Tres Oros venían marcados `Vasallo`**: Laura, Rudi y Rota Fortunae
    (AI-218/219/220) son Oros **con** habilidad, pero su código impreso
    (`AI-209/210/211-227`) los pone dentro del bloque de Oros y el fandom los
    lista ahí. Quedaron en `frecuencia: "Oro"`, que es donde el jugador los
    busca. No cambia nada de las reglas: `oroSinHabilidad` mira tipo y
    habilidad, no frecuencia.
  - **Y hay datos derechamente malos, como siempre.** AI-198 traía **la
    habilidad de otra carta entera** (y el nombre: la API la llamaba
    "Canibus"); AI-076 y AI-077 también venían con otro nombre ("Bipennis",
    "Panteón de Agripa"); AI-076 arrastra además una línea que la carta no
    imprime ("El Aliado portador gana 1 a la Fuerza."); **AI-118 dice "un Oro
    menos" donde el arte dice "dos Oros menos"** —el único caso funcional, el
    DO-053 de esta edición—; AI-244 "que no sean Oro" por "que no sea";
    AI-248 "del coste elegido" por "del tipo elegido"; y AI-051 traía Fuerza 1
    donde el arte marca 2. El fandom **también** se equivoca: daba "Musa de
    Patria" por Musa de Partia.
  - **Y una carta con `ability` vacío que sí tiene texto impreso**: AI-252
    (Asteria de Delos). Leída del arte, keyword `Purificar` incluida.
  - **AI-003 (Leonardo) imprime `Guardián`** y el campo `keywords` no la
    etiqueta, igual que en las cuatro ediciones anteriores. Sigue sin poder
    filtrarse por ella.
  - **AI-080 lleva `Áquila Imperialis` con tilde impresa en el arte.** En latín
    no la lleva y el fandom la escribe sin ella, pero aquí **mandó la carta**:
    es un nombre propio, no una palabra mal escrita dentro de una frase. Las
    erratas de *texto* sí se corrigen, como en Dominio: AI-089 y AI-120 sin
    punto final, AI-094 y AI-249 con "este en juego" sin tilde, y AI-162 con
    "(Este no puede ser bloqueado)" comiéndose "Aliado".
  - No hay intercambio `cost`/`damage`: verificados los 110 Aliados contra el
    arte. Tampoco hay Milenarias en esta edición —las sustituye el bloque de 9
    Legendarias—, ni ninguna carta escondida: el listado arranca en 001, no
    tiene huecos y `/static/cards/13/262.png` ya da 404.
- **Cómo se revisó Steampunk** (71 cartas, 26 corregidas). Es una edición
  **especial** y pequeña —30 cartas Luz, 30 Oscuridad y 11 promos— y la primera
  que imprime el **atributo**. Sus datos están entre los más limpios: el
  `rarity` viene en tramos contiguos, el texto usa saltos de línea reales, el
  `flavour` va en su campo y los 13 Oros sin habilidad traen `ability` vacío.
  Trajo, eso sí, el fallo más traicionero de todos:
  - **El atributo NO está en el campo `keywords`.** Los flags 16 y 32 marcan la
    **mención**, no la propiedad: Rayo (SP-015) trae el flag de Oscuridad
    porque su texto dice "Destruye una carta Oscuridad", Van Helsing trae los
    dos aunque solo es Luz, y Otto Lidenbrock trae Luz siendo neutro. Serían 25
    Luz y 21 Oscuridad; los de verdad son **18 y 17**. Lo que manda es la
    **declaración al inicio del texto** ("Luz." / "Oscuridad."), que es como el
    juego imprime cualquier keyword. `fetch_edition.py` lo deduce ahora con
    `keywords_declaradas()` de `schema.py`, espejo de `splitAbility()`, y
    reescribe el campo `keywords` para que no mienta el filtro de habilidad.
  - **En el arte el atributo está en un medallón** sobre el cuadro de
    habilidad: **sol = Luz, luna = Oscuridad, manómetro = ninguno**. Es el
    equivalente al escudo del dragón de ContraAtaque y verifica las 71 de una
    sentada montando planchas con el recorte `(212,455)-(302,528)`. Coincidió
    con la declaración carta por carta, cero excepciones. **Vale la pena mirar
    ese medallón en Hijos del Sol y Legado Gótico**, que son las otras dos
    ediciones con atributo.
  - El **engranaje** que va a la derecha del cuadro de habilidad codifica la
    frecuencia: negro Ultra Real, dorado Real, rojo Cortesano, azul Vasallo,
    morado Promocional. Sirvió para confirmar que aquí el `rarity` sí es de
    fiar.
  - **Dos razas mal**: Blavatsky (SP-002) y Carnacki (SP-005) son
    **Sacerdote**, no Faerie ni Caballero. El fandom acertaba en las dos.
  - **Dos Fuerzas mal**: Dorian Grey (SP-011) es Fuerza 3 y Drácula (SP-031)
    también, no 2 ni 4. **Un coste mal**: ¡Vive! (SP-046) cuesta 4, no 3. No
    hay intercambio `cost`/`damage`: verificados los 31 Aliados contra el arte.
  - **A Haures (SP-066) le falta la keyword entera**: el arte declara `Furia` y
    la API no la entrega ni en el texto ni en `keywords`.
  - **Un nombre derechamente cambiado**: SP-054 es **Contrabando de Seda**, no
    "Gusanos de Seda". El fandom acertaba.
  - **El caso funcional de la edición**, el DO-053 de esta: Ada Lovelace
    (SP-065) genera **un Oro**, no dos. Mandó el arte.
  - **El fandom también se equivoca**, y aquí en tres nombres: imprime "A la
    Luna", "Ratas en los Muros" y "Gabriel Ernest" donde la carta dice "A la
    luna", "Ratas en los muros" y "Gabriel-Ernest". Tampoco lista el
    ilustrador del oro inicial. La sexta columna sí es de fiar para el resto.
  - El resto es lo de siempre: seis nombres con espacio al final, `pgar` por
    "pagar" (SP-071), dos puntos finales que no llegan, y el recordatorio de
    `Exhumar` cambiado por el genérico en SP-039 y SP-068.
  - El **oro inicial** es SP-061, y la API ya lo llama "Oro Inicial Steampunk";
    solo hubo que pasarlo de `Promocional` a `frecuencia: "Oro"`, como los
    otros cuatro. Su arte dice "Edición Especial STEAMPUNK **2017**" aunque la
    API feche la edición en 2018.
  - El código impreso lleva **tres letras** (`SPK-01-71`), pero el `codigo` del
    repo se queda en `SP-<edid>`: uniforme con las otras cinco, mismo criterio
    que ya se tomó en Águila Imperial. El arte entra a **512×734**, dos píxeles
    más alto que el resto; `resize_to_width()` no se entera.
  - Ninguna carta escondida: el listado va de 001 a 071 sin huecos y
    `/static/cards/14/072.png` da 404.
- **Cómo se revisó Axis Mundi** (189 cartas, 57 corregidas). Es **la edición
  que introduce las escuelas elementales**, y lo primero que hubo que resolver
  fue si eso cambiaba el modelo. **No lo cambia**: la edición no nombra las
  escuelas ni las imprime como símbolo. El emblema hexagonal bajo el cuadro de
  habilidad es la **frecuencia** (negro Ultra Real, plata Mega Real, dorado
  Real, rojo Cortesano, azul Vasallo, verde Promocional) y la etiqueta bajo la
  Fuerza es la raza a secas, igual que siempre. Las escuelas viven en el texto
  de reglas, como **parejas de razas**: "si todos los Aliados que controlas son
  de Raza Oni y/o Sombra" (21 cartas), Faerie y/o Eterno (16), Sacerdote y/o
  Caballero (16), Dragón y/o Guerrero (12). Las cuatro exactas que ya teníamos
  y ninguna otra; los Tótems AM-150 a AM-153 son literalmente las cartas de
  escuela ("se consideran de ambas Razas"). `ESCUELA_POR_RAZA` sigue valiendo.
  - **Es la edición más limpia en lo estructural**: cero intercambios
    `cost`/`damage` (verificados los 83 Aliados), cero costes mal (verificados
    los 106 no-Aliados), cero razas mal, frecuencias en tramos contiguos que el
    fandom confirma, sin `↵`, sin `/n`, sin puntos pegados y `flavour` en su
    campo. Todo lo que falla está en el texto.
  - **El `edid` va desfasado en −4 respecto del código impreso**, por el mismo
    motivo que en Águila Imperial: las **4 Legendarias** ocupan los `edid`
    001–004 con numeración propia (`LAM-01-04`) y el set base de 160 corre
    `AM-001-160`…`AM-160-160` sobre los `edid` 005–164. Los 25 promos
    (`edid` 165–189) van aparte, entre `2017-059`…`073` y `PE-18`…`PE-25`. Por
    decisión del proyecto el `codigo` se queda en **`AM-<edid>`**, uniforme con
    el resto, igual que en Águila Imperial.
  - **El arte de las 4 Legendarias entra a 709×1016**, no a 512×734 como el
    resto. `resize_to_width()` ni se entera.
  - **Tres textos que la API entrega derechamente mal**: AM-184 (Akbar) trae
    una habilidad que no es la suya; AM-137 (Convocar Prisión) se come media
    frase del paréntesis; y AM-189 (Espejo Negro) **añade una condición que la
    carta no imprime** ("Si este Oro está en tu Reserva de Oros"). Más siete
    frases cambiadas (AM-018, AM-020, AM-022, AM-037, AM-094, AM-167, AM-172).
  - **Siete cartas sin el punto que cierra `Exhumar (…)`** —AM-043, 044, 085,
    086, 126, 127 y 132— mientras otras siete de la misma edición sí lo traen.
    El arte lo imprime en las catorce.
  - **Cuatro promos son reimpresiones TEXTLESS** (AM-175 Lemuralia, AM-177
    Trampa, AM-178 Depredar, AM-180 Necromancia). Se les copió el texto y las
    keywords de su impresión original, como en Águila Imperial. Necromancia
    tenía dos impresiones donde elegir y **se tomó la de Dominio (DO-021), no
    la Legendaria de Águila Imperial (AI-006)**: esta es una reimpresión
    normal, y la Legendaria declara las keywords a secas y ordena las frases al
    revés.
  - **Las 4 Legendarias llegan con el ilustrador de relleno** `Mitos y
    Leyendas`, igual que las 261 de Águila Imperial. Los de verdad están al pie
    de la carta: Trejoe, Alvaro Estrada, Felipe Gaona y Andrés Silva.
  - **Y aquí se resolvió de una vez la duda de las tildes en el pie.** El pie
    de estas cartas **sí las lleva** —imprime `ANDRÉS SILVA` y `NICOLÁS
    ESPINOZA`— y aun así imprime `ALVARO ESTRADA` sin ella. O sea que
    `Alvaro Estrada`, como está desde ContraAtaque, es lo correcto y el fandom
    es el que se equivoca. Ojo igual con `Francisco Ruíz`: dentro de esta misma
    edición el pie lo escribe sin tilde en AM-026 y AM-069 y **con** tilde en
    AM-178, así que se queda `Francisco Ruiz` para no partir el nombre en dos.
    También hubo que normalizar `Nicolas Espinoza` → `Nicolás` (6 cartas, el
    pie lo confirma) y `Argus Del Norte` → `del Norte` (3).
  - **El fandom se equivoca en dos nombres**: da "Al-Mashi Ad-Dajjal" por
    Al-Masih y "Veintiun Infiernos" sin tilde. Acierta, en cambio, en las seis
    mayúsculas que la API escribía en minúscula (Arena de **S**ueños,
    **Hermanos** de Armas, Ver lo **I**nvisible, Curar la **T**ierra, Espiral
    de **D**agas, Anillo **L**lave). No lista los 25 promos: da 164 de 189.
  - **Solo 9 de sus 20 Oros sirven de oro inicial.** Es la primera edición con
    tantos Oros CON habilidad (11), repartidos además por todas las
    frecuencias: uno Mega Real, dos Real, tres Cortesano, dos Vasallo y tres
    promocionales. En las anteriores los Oros con habilidad eran la excepción.
  - Ninguna carta escondida: el listado va de 001 a 189 sin huecos y
    `/static/cards/15/190.png` da 404.
- **Cómo se revisó Hijos del Sol** (261 cartas, 65 corregidas). Los números
  vienen impecables —verificados los 114 Aliados y los 147 no-Aliados contra el
  arte, cero errores de coste, Fuerza o raza, sin intercambio `cost`/`damage`—
  y las frecuencias van en tramos contiguos que el fandom confirma. Todo lo que
  falla está en el texto. Trajo, eso sí, **dos fallos que no se habían visto**:
  - **La API sirve la imagen equivocada en una carta.**
    `/static/cards/16/017.png` devuelve el arte de la 021, byte por byte. La
    URL **sin el cero a la izquierda** (`/16/17.png`) sí trae la correcta
    (Kawtcho, `SOL-013-232`). No se detecta leyendo los datos, solo comparando
    las imágenes entre sí, así que `fetch_edition.py` **avisa ahora cuando dos
    cartas bajan el mismo PNG**. Era el único par duplicado de las 261.
  - **`Traición`, la primera keyword que se imprime CON UN COSTE pegado**
    ("Traición - Destierra la primera carta de tu Mazo Castillo"). Como
    `Guardián`, la API no la etiqueta nunca. Por decisión del proyecto **no
    sube a la fila de keywords**: el coste es texto de reglas y allí se
    perdería. Se queda en el cuerpo con la palabra resaltada, que es justo lo
    que hace la carta (negrita la keyword, redonda el coste). `ability.ts`
    reconoce ahora esa forma anclando en el guion en vez del punto, y
    `ability.test.ts` la cubre con dos pruebas. En las 9 cartas se agregó
    `Traición` al campo `keywords` a mano, para que el filtro no mienta —lo
    mismo que se hizo con la Furia que le faltaba a Haures en Steampunk—.
    **`Guardián` sigue sin estar en `keywords` en sus 24 cartas**, así que se
    resalta pero no se puede filtrar: queda pendiente y es el mismo arreglo.
  - **Las cartas doradas son reimpresiones premium, no cartas nuevas.** La API
    las marca `Legendaria` y son cuatro Oros **con** habilidad, pintados
    enteros en oro, que repiten nombre y texto de cuatro Oros del set base:
    Cuerno de Camahueto (`HS-001` / `HS-020`), Quetzal (`HS-002` / `HS-039`),
    Huitzilin (`HS-003` / `HS-040`) y Camino del Inca (`HS-004` / `HS-076`).
    Por decisión del proyecto **comparten `identidad` con su versión normal**,
    igual que Kirin normal y Kirin Milenaria: son la misma carta y el tope de
    copias las cuenta juntas. Cuerno de Camahueto es además Única, así que
    entre las dos impresiones solo cabe una.
  - **Las doradas se numeran distinto que las Legendarias de las dos ediciones
    anteriores**: aquí no llevan prefijo propio, siguen la serie y ocupan
    `SOL-233`…`SOL-236`, o sea DESPUÉS de las 232 del set base. En Águila
    Imperial eran `LAI-`, en Axis Mundi `LAM-`. El desfase del set base sigue
    siendo **`edid` − 4** (`SOL-001-232`…`SOL-232-232` sobre los `edid`
    005–236); los 25 promos van aparte, `2018-001`…`2018-025`.
  - **El atributo tiene aquí su propio dibujo**: un disco en el borde superior
    del cuadro de habilidad, sol para Luz y luna para Oscuridad. Son 10 cartas
    (5 y 5) y —al revés que en Steampunk— la declaración del texto y los flags
    de la API **coinciden**. La excepción es **Yasy Yateré (`HS-154`), que
    declara Oscuridad y no imprime el disco**: mandó el texto, que es lo que
    mira la regla.
  - **Los promos declaran las keywords a secas y el set base con el
    recordatorio entre paréntesis.** La API le pega el paréntesis a los promos
    igual; se quitó en seis (`HS-242`, `243`, `244`, `245`, `254`, `260`). Lo
    mismo pasaba con las Legendarias de Águila Imperial.
  - **Dos promos vienen marcadas `TEXTLESS` y sí tienen texto impreso**
    (`HS-257`, `HS-258`). Al revés que en Águila Imperial y Axis Mundi, donde
    el TEXTLESS era real.
  - **Y el resto es lo de siempre**: `HS-077` trae otro texto; a `HS-018` y
    `HS-172` les falta la primera línea entera; `HS-146` se corta a media
    declaración sin cerrar el paréntesis; falta "objetivo" en `HS-190`,
    `HS-199` y `HS-201`; y el nombre de `HS-035` llega como **"Trempulcahue
    Hijos del Sol"**, con el nombre de la edición pegado.
  - El recordatorio de Traición no es igual en todas: `HS-093`, `094` y `095`
    **no** imprimen "En su Fase de Vigilia," y `HS-153`, `154` y `155` sí.
  - **El fandom acierta más que la API en los nombres, pero no en todo**: se
    equivoca en "Garras de Xibalba" (el arte lleva tilde en la í) y en el
    ilustrador de `HS-007`, donde el pie dice `MAURICIO CERECERA` y el fandom
    pone "Mauricio Herrera". No lista los 25 promos: da 232 de 261.
  - Ninguna carta escondida: el listado va de 001 a 261 sin huecos y
    `/static/cards/16/262.png` da 404.
- **Cómo se revisó Legado Gótico** (258 cartas, 57 corregidas). Es la primera
  edición cuyo **código impreso no lleva desfase**: `edid` == número impreso.
  Base `LGO-001-230`…`LGO-230-230`, Legendarias `LGO-231`…`LGO-236` (siguen la
  serie, sin sufijo) y 22 promos `2018-0XX`. O sea que `LG-<edid>` coincide con
  lo que el jugador lee al pie en 236 de 258. El arte llega a **419×600** en
  las 236 primeras —el único set por debajo de los 420 que asume la interfaz— y
  a 512×734 en los promos.
  - **El fandom de esta edición trae columna de atributo**, y con ella se pudo
    cruzar a tres bandas: la derivación por **declaración del texto** coincide
    con el fandom en **230 de 230**, mientras que los **flags de la API fallan
    en 29**. Es la confirmación independiente de lo que se decidió en
    Steampunk. Son 103 cartas con atributo (52 Luz, 51 Oscuridad), tres veces
    más que Steampunk: la vía Luz/Oscuridad por fin da para armar mazo.
  - **Las 6 Legendarias son reimpresiones premium** de las 6 primeras Ultra
    Real, mismo nombre y mismo texto: Lilith (`LG-234`/`LG-001`), Solomon
    (`231`/`002`), Caín (`233`/`003`), Shoki el Cazador (`232`/`008`), Crear
    Obsesión (`236`/`011`) y Ritual de Sombras (`235`/`012`). Comparten
    identidad, como las doradas de Hijos del Sol. Ojo: la API llama "Solomón"
    con tilde a la Legendaria y "Solomon" a la base; el arte no la lleva.
  - **`Inmunidad - Cartas Luz` es otra keyword con coste**, como `Traición`, y
    sale en **14 cartas**. La regla del guion que se metió en Hijos del Sol la
    cubre sin tocar nada… pero el test que la acompañaba daba por hecho que la
    única keyword con coste era Traición y **falló aquí**. Ahora comprueba la
    keyword que abre cada carta, sea cual sea. Es justo el tipo de fallo que
    justifica que los tests corran contra el catálogo real.
  - **Cinco Aliados llegan sin raza y son Oni**: `LG-039`, `040`, `127`, `183`
    y `184`. La API solo etiquetaba Oni al promo `LG-242`. Es otra vez el caso
    de CLAUDE.md: un Aliado sin raza es un dato malo, no un caso legítimo.
  - **`LG-034` dice "Único." donde la carta dice "Única."** y además la API no
    le pone el flag. Sin las dos correcciones el validador no la trataría como
    Única. Es el único sitio donde el texto se sale de `KEYWORDS_IMPRESAS`.
  - **Textos que la API entrega mal**: `LG-044` invierte una frase y se come
    "en juego"; `LG-125` cambia la condición entera ("por ese daño" donde la
    carta dice "por el último daño que recibiste"); `LG-055` se come un verbo;
    `LG-058` invierte el orden de las keywords. Más "objetivo" que falta en
    `LG-201` y `LG-203` y sobra en `LG-156`, y "a la mano de su dueño" donde la
    carta dice "a tu mano" (`LG-071`, `LG-179`).
  - **El fandom se equivoca más que de costumbre**: "Thevetal", "Arconte de
    Fuego", "Ayuda Féerica", "Peter Blagojevich", "Jak Zizka", "Knockmashee",
    "Furtivo" y el ilustrador "Chamán" en tres cartas, donde el pie dice
    `CHAMAKOSO`. Acierta, en cambio, en "Solomon" sin tilde, en "Hija de
    Chacal" (la API decía Hijo), en las cinco razas Oni y en el ilustrador de
    `LG-146`, donde el pie dice `CRISTIÁN HUERTA` y la API pone "JP Aguirre".
  - Ninguna carta escondida: el listado va de 001 a 258 sin huecos,
    `/static/cards/17/259.png` da 404 y no hay imágenes duplicadas.
- **Cómo se revisó Escuelas Elementales** (315 cartas). Es la que da nombre al
  formato y la última en salir (2021; la API la fecha en 1990, que es relleno).
  Y es **recopilatoria como ninguna**: de sus 315, **309 ya estaban en el
  catálogo** con otra impresión y solo **6 son cartas nuevas**. Eso da una
  palanca que ninguna otra edición tuvo —cotejar sus datos contra 309
  impresiones ya verificadas a mano— y de paso destapó fallos viejos nuestros.
  - **No cambia el modelo.** Da nombre al formato pero no imprime símbolo de
    escuela: las escuelas siguen siendo parejas de razas dentro del texto ("de
    Raza Dragón y/o Guerrero"). `ESCUELA_POR_RAZA` sigue valiendo. Eso sí,
    **Pa Kua (EE-314) es la primera carta del catálogo que nombra la *Escuela
    Elemental* explícitamente**, en cursiva y como término de reglas.
  - **Los números vienen impecables**: `edid` == código impreso (`ESC-040-300`)
    en las 300 del set base, **Legendarias incluidas** —no hay el desfase de
    Águila Imperial ni Axis Mundi, verificado en el arte de ESC-001—; cero
    intercambios `cost`/`damage`, cero razas mal, cero tipos mal. El `codigo`
    del repo se queda en **`EE-<edid>`**, de dos letras como el resto, aunque
    la carta imprima tres.
  - **Los 15 promos sí van desfasados** (`edid − 2` desde el 303) y **tres
    códigos se repiten en el propio arte**: `ESC-307`, `308` y `309` salen dos
    veces cada uno. Los `edid` 301 y 302 no llevan código ESC sino `2021-065`,
    el mismo en las dos: son las dos versiones de *Dominio, La Novela*, una de
    ellas con la banda "Edición Coleccionista".
  - **`keywords` llega `null` en las 315.** No aporta nada: el campo se deriva
    del texto, que es lo que se hace desde el arreglo de Kaidan.
  - **El separador de línea viene con espacio a los DOS lados** (`" \n "`) en
    193 cartas. `clean_text()` hacía `rstrip()` por línea y solo limpiaba uno;
    ahora hace `strip()`.
  - **Una imagen solo existe como `.jpg`**: la 050 (Akiko Yamamoto) da 404 en
    `.png`. Era la única de 315 y sin eso se quedaba sin arte. `download()`
    reintenta ahora con `.jpg` y guarda PNG.
  - **El `ilustrador` llega de relleno `Mitos y Leyendas` en las 315**, como en
    Águila Imperial, y aquí **no se puede copiar de la impresión previa**:
    Tezcatlipoca es de **Peña** aquí y de **Feig** en Hijos del Sol, porque
    parte de las reimpresiones llevan ilustración nueva. Se leyeron las 315 del
    arte. Ojo con dónde mirar: **el ilustrador no va al pie sino en vertical
    junto al nombre**, y en las 8 Legendarias en horizontal bajo él. Recortando
    esa banda y girándola se leen doce por plancha. Salieron **51
    ilustradores**, cuatro nuevos para el catálogo (Lucius, Luis Salas, Nitrox y
    Tati Lange); `Marco Gonzáles` con S sale una sola vez frente a cinco con Z
    y se unificó, como ya se hizo con Francisco Ruiz.
  - **Dos perfiles que la API rechaza con 400, no con el 502 de siempre**:
    `belial,_el_bestial` y `henri_d'aramitz`. El slug lleva coma y apóstrofo y
    la API no los acepta ni escapados. Sus nombres se leyeron del arte.
  - **Los nombres llegan en minúscula y cinco rotos**: `guila y serpiente`,
    `telaraa`, `ferydun i`, `belial el bestial` y `trempulcahue escuelas
    elementales`, con el nombre de la edición pegado como ya pasó en HS-035. El
    `profile` arregla la capitalización; el resto, el arte. Ojo: **el nombre va
    en VERSALES en la carta**, así que de ahí no se sacan ni tildes ni
    mayúsculas internas —para eso manda el catálogo ya verificado—. La
    excepción fue `Alas de Murciélago`, que EE sí imprime con tilde: ahí el
    equivocado era **nuestro** HS-251.
  - **Una sola frecuencia mal, EE-148 (Hwarang)**: la API dice Real, el fandom
    dice Milenaria y el escudo del arte es púrpura. El resto viene en tramos
    contiguos correctos, con un bloque Cortesano raro en 34-38 que el escudo
    rojo confirma. El escudo va a la derecha del cuadro de habilidad y codifica
    la frecuencia igual que en ContraAtaque; las Legendarias usan otra
    plantilla y no lo llevan.
  - **El texto se come tildes en 88 cartas** ("esta" por "está", "mas" por
    "más", "demas", "Talismánes"). Como 309 son reimpresiones, se repusieron
    palabra a palabra contra el catálogo ya verificado, sin tocar el arte. Otras
    18 son erratas ortográficas impresas y se corrigieron como siempre.
  - **La edición declara las keywords A SECAS**, sin el recordatorio entre
    paréntesis: son 78 cartas donde esa es la única diferencia con su impresión
    previa. No es una errata, es su estilo de impresión.
  - **Y aquí está lo gordo: no reimprime, REBALANCEA.** 66 cartas traen texto
    distinto del que ya teníamos verificado. Tezcatlipoca gana `Única`;
    Dimachaerus, Azi Dahaka, Yaoguai, Nostradamus y Akiko Yamamoto ganan
    `Errante` y una condición de escuela; Astra cambia "Destruir" por
    "Desterrar"; Carmina Burana cambia cuándo se puede usar. La edición además
    abrevia: escribe "tu Castillo" por "tu Mazo Castillo" y "Cuando entra en
    juego" por "Cuando este Aliado entra en juego". Las 66 se leyeron del arte
    una a una.
- Ojo con los slugs de la API: `escuelas_elementales` va con **guion bajo** y
  el resto con guion (`legado-gotico`, `aguila-imperial`…). Ese guion bajo vive
  solo en `API_SLUGS` de `fetch_edition.py`: nuestro slug es
  `escuelas-elementales`, y es el que va en el campo `edicion` y en la URL.

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
ocho facetas: edición (solo en `/catalogo`, porque en la página de una edición
no tendría nada que elegir), habilidad, tipo, raza, escuela, frecuencia, coste
y fuerza.

**Los selectores con muchas opciones abren con buscador** (`Select.tsx`, a
partir de ocho opciones: habilidad, raza, edición, frecuencia y los rangos de
coste y fuerza). Con cinco opciones a la vista —tipo, escuela elemental— el
campo estorba más de lo que ayuda, así que ahí no sale. Al aparecer el campo,
el control pasa de listbox a **combobox**: el foco va al buscador, las flechas
siguen recorriendo la lista y la opción activa se anuncia con
`aria-activedescendant`. Dos detalles que no son obvios: la búsqueda compara
contra el texto que se **ve** (`format`, o sea el título de la edición y no su
slug) y **sin tildes**, para que "samurai" encuentre Samurái; y mientras se
busca desaparece la opción vacía "Todos", que entre resultados no pinta nada
—para limpiar está la X del propio selector—.

**El atributo no tiene faceta propia, a propósito.** Luz y Oscuridad son
keywords impresas como cualquier otra, así que se filtran desde *habilidad*,
que sale del campo `keywords`. Hubo un `Select` de atributo —vacío mientras no
hubo cartas que lo llevaran— y se quitó al llegar Steampunk: un selector que
dijera lo mismo que otro solo parte la búsqueda en dos sitios. El campo
`atributo` de la carta **sigue existiendo** y es el que usan las reglas de
mazo; lo que se fue es el filtro.

`src/lib/ability.ts` separa lo que la carta **declara** del resto del texto: el
modal pone las keywords arriba, en una fila propia, y debajo solo el efecto.
Es un analizador por líneas que va consumiendo declaraciones mientras haya, no
un regex anclado al comienzo, porque una carta puede encadenarlas ("Errante.
Oscuridad. Inmunidad - Cartas Luz.") y puede anteponer una condición de juego
antes de declarar ("Puedes jugar este Aliado en Guerra de Talismanes. /
Guardián. / Cuando…"). Las que caen dentro de la prosa se resaltan donde están.
El filtro de habilidad **no** usa ese texto sino el campo `keywords` de la
carta.

**Lo que hace cada keyword no se explica.** La carta imprime el recordatorio de
reglas entre paréntesis —"Guardián (Este Aliado no puede ser declarado
atacante)"— y es el mismo trozo repetido carta a carta: son conocimiento común
del formato y ahogan el efecto, que es lo único que cambia de una a otra. Se
quitan **365 de los 381 paréntesis** del catálogo. Con dos excepciones, que son
de la carta y no del formato: el **coste de `Traición`** (`Traición - Botar dos
cartas`) y **a qué se es inmune** (`Inmunidad (Cartas Luz)`; el guion impreso
se cambia por paréntesis porque ahí no hay coste que pagar, sino una salvedad).

El recordatorio se reconoce por **su frase**, no por ir pegado a la palabra:
"Esos Aliados ganan Furia hasta la Fase Final (No necesitan pasar por una Fase
de Agrupación…)" mete texto en medio. El ancla es que no se cruce un punto, y
eso es justo lo que deja en pie los **16 paréntesis que son reglas de verdad**
—"(El nuevo objetivo debe ser válido)", "(Si tienes cero cartas pierdes el
juego)", "(Ese Aliado entra en juego bajo tu control)"—. `ability.test.ts`
comprueba las dos cosas contra el catálogo real: que no quede ningún
recordatorio en el cuerpo y que ninguna keyword con coste lo pierda al subir.

`MECANICAS` es la lista aparte de términos que **no** son keywords filtrables
pero llevan el mismo recordatorio: `Alimentar`, `Purificar` y `Honor`, los tres
que salieron de `KEYWORDS_IMPRESAS`, más `Alimento` por el contador. Tampoco
hay que explicarlos.

**Ese campo NO se toma de la API: se deriva de lo que la carta declara.** Los
flags de la API marcan la **mención**, no la posesión — el mismo fallo que ya se
había visto en el atributo de Steampunk, que resultó valer para todas las
keywords—. Kaidan (SN-139) llegaba etiquetado `Indestructible` porque convierte
tus Oros en *Aliados Indestructibles*, y el Talismán no es indestructible; la
Arma Petasos llegaba `Imbloqueable` porque se lo da al portador; Trajano, porque
menciona a los Aliados Indestructibles que controles. Eran **201 etiquetas
falsas** repartidas por las nueve ediciones. `keywords_propias()` en
`scripts/schema.py` y `keywordsPropias()` en `src/lib/ability.ts` —espejo, y
comprobado carta por carta en las 1833— leen el comienzo de **cualquier** línea,
no solo la primera: una carta puede anteponer una condición de juego y declarar
después, y así fue como **DO-176 (Pulcinela) se escapó de la revisión a mano de
`Guardián`**, que miraba la primera línea.

Se quedan fuera, a propósito, las auras: "los Aliados de Raza Héroe que
controles son Indestructibles" **reparte** la keyword, aunque alcance a la
propia carta, y a esas cartas el jugador llega por el filtro de raza. La línea
es que el texto **se nombre a sí mismo**. Las **13** que sí la tienen sin
declararla —"Mientras este Aliado porte un Arma es Imbloqueable"— no hay forma
de leerlas sin entender la frase: van a mano en `data-src/` y la lista vive en
`keywords.test.ts`, que corre contra el catálogo real y falla si vuelve a
colarse una mención.

**Tres etiquetas de la API salieron de `KEYWORDS_IMPRESAS`** porque no las
declara **ninguna** de las 1833 cartas: `Alimentar` y `Purificar` son verbos de
acción ("Alimenta un Aliado", "Purifica dos cartas del Cementerio"), no
propiedades, y `Honor` ni siquiera es keyword sino un contador ("pon un contador
de Honor") —que además salía resaltado en violeta dentro de esa frase—. Como
faceta respondían a otra pregunta, qué **hace** la carta y no qué **es**, y un
filtro donde unas opciones significan una cosa y otras la contraria no se puede
leer. Quedan donde ya estaban `Destruir` y `que controles`. Si algún día se
quieren de vuelta, que sea como faceta aparte de *mecánica*, no mezcladas con
las keywords.

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
no se podía filtrar por ella, porque el campo `keywords` no la traía. **Se
arregló al cargar Legado Gótico**: se agregó a mano en `data-src` a las **25
cartas que la DECLARAN**, repartidas por cinco ediciones (eran 24 hasta que el
barrido de menciones destapó a Pulcinela). Las que solo la
mencionan ("por cada Aliado Guardián que controles") quedan fuera a propósito:
hablan de otras cartas, no de sí mismas. Es el mismo arreglo que se hizo con la
Furia que le faltaba a Haures y con `Traición`.

**`Traición` fue la primera keyword que se imprime con algo pegado tras un
guion** ("Traición - Descartar una carta"), y llega con Hijos del Sol;
`Inmunidad - Cartas Luz` es la misma forma y sale en catorce cartas de Legado
Gótico. Por eso `ability.ts` tiene dos anclas: el punto para la declaración de
siempre y el guion para estas. **Sí suben a la fila, con su parámetro**: se
intentó dejarlas en el cuerpo para no perder el coste, y el resultado era peor
—la keyword quedaba enterrada en el párrafo y la fila mentía por omisión—.

Tema claro/oscuro conmutable desde la navbar (ver DESIGN.md). Cuidado al
importar constantes desde un módulo `"use client"` hacia un Server Component:
Next entrega una referencia de cliente, no el valor. Por eso `THEME_KEY` vive
en `src/lib/theme.ts` y no en el componente.

Cargadas: **las diez ediciones, 2148 cartas** — Bushido (246), Sol Naciente
(141), Dominio (256), ContraAtaque (150), Águila Imperial (261), Steampunk (71),
Axis Mundi (189), Hijos del Sol (261), Legado Gótico (258) y Escuelas
Elementales (315).

Steampunk es la primera edición que imprime Luz y Oscuridad, así que el filtro
de **habilidad** las ofrece desde ahora.

### Constructor de mazos (Fase 2)

Rutas: `/builder` arma y edita · `/mazos` la lista · `/mazo` el detalle.

`/mazo` va en **singular y con query string** (`?m=` uno tuyo, `?d=` uno
compartido) porque `output: "export"` no admite una ruta dinámica `/mazos/[id]`
para datos del usuario: `generateStaticParams` no puede conocer ids que se
inventan en el navegador.

Reglas del formato, en `src/lib/deck-rules.ts`: 50 cartas, un oro inicial (un
Oro sin habilidad, señalado con un puntero a una carta de `principal` porque
cuenta dentro de las 50), mínimo 15 Aliados **o** 15 Tótems, máximo 3 copias por
carta (1 si es Única), una sola afinidad y side de hasta 10 cartas.

**El side deck es una extensión del mazo, no un mazo aparte**: lleva las cartas
que quiera entre 0 y 10 —no hay mínimo ni tamaño exacto—, pero comparte con el
principal el máximo de copias, las Únicas y la afinidad. Por eso
`deckStats` deduce la afinidad sobre las 60 cartas, mientras que los contadores
por tipo y la curva siguen siendo del principal, que es lo que se juega de
salida.

**Un mazo se arma de una de tres formas, y son alternativas**: por raza, por
escuela elemental (sus dos razas exactas) o **por atributo** —todos sus Aliados
Luz, o todos Oscuridad—. Basta con cumplir **una**. La tercera llega con
Steampunk y es la que obligó a reescribir la afinidad: un mazo de Aliados Luz
de cuatro razas distintas es legal, y ninguna vía de raza lo explica.

Por eso `Afinidad` ya no es un veredicto único sino una **lista de vías
abiertas**. Mientras el mazo se arma cumple varias a la vez —el primer Aliado
las abre todas las que le correspondan— y se van cerrando a medida que entran
cartas. La clave que hace esto simple: **cada vía es una condición sobre TODOS
los Aliados**, así que una vía abierta sigue abierta al agregar un Aliado si y
solo si ese Aliado la cumple. De ahí sale `admite()`, de una línea, y de ahí
que el catálogo del constructor pueda filtrarse sin recalcular el mazo entero.

**El atributo restringe solo a los Aliados**, exactamente igual que la raza.
Es una decisión del proyecto y no es obvia: en Steampunk el atributo lo
imprimen también Talismanes, Armas, Tótems y Oros, así que Quiebra Mentes
(Talismán Oscuridad) **cabe en un mazo Luz**. Como la raza solo la llevan los
Aliados, el conteo de razas nunca necesitó mirar el tipo; el del atributo sí, y
por eso `deckStats` ahora filtra por `tipo === "Aliado"` antes de contar.

**Un Aliado sin atributo cierra la vía del atributo.** No es "de los dos": no
hay mazo Luz que lo admita, igual que un Aliado de otra raza cierra la vía de
la raza. En Steampunk eso deja a nueve Aliados neutros (Dorian Grey, Dupin,
Otto, Jack, Peter Pan, Ada Lovelace, Haures, Cthulhu y Fu Manchú) fuera del
arquetipo de atributo, aunque sigan entrando en cualquier mazo de su raza.

`deckAffinitySchema` ganó la variante `{ modo: "atributo" }` **sin subir
`DECK_VERSION`**: el cambio es aditivo y ningún mazo ya guardado deja de leerse.

**El mínimo de 15 lo cumple un tipo solo, no la suma de los dos**: 14 Aliados y
14 Tótems son 28 cartas y el mazo sigue sin cumplir. Por eso `deckStats` lleva
`aliadosOTotems` con el **mayor** de los dos contadores y no con su suma.

**Los Oros sin habilidad no tienen tope de copias**: son el recurso con que se
paga todo y el mazo lleva los que necesite. Los 25 que sí traen habilidad son
cartas como cualquier otra y van al tope de 3; solo seis de ellos (Regalía
Imperial, Pantano Sagrado, Mon, Chozuya, Biblioteca Eterna y Mochuelo) son
además Únicos. Ojo: esto **decía "los cuatro Oros con habilidad son todos
Únicos"** y dejó de ser cierto en Dominio, mucho antes de que nadie lo notara.
Por eso el esquema de Zod acota las
entradas a 50 y no a 3: describe lo que se puede **representar**, no lo que es
legal — si recortara a 3, un mazo importado con 4 copias se volvería legal en
silencio al leerlo.

**Cuando dos impresiones dicen cosas distintas, manda la última.** Es la que se
juega: una reimpresión con otro texto errata a la anterior. Escuelas Elementales
(2021) es la última de las diez, así que su texto es el vigente y **se propagó
hacia atrás a las 66 impresiones viejas** que decían otra cosa. Lo que NO se
propaga es el estilo de declaración: que Escuelas Elementales escriba `Única.` a
secas donde Dominio escribe `Única (Sólo puedes tener…)` no es una errata, es
cómo imprime cada edición, y cada carta conserva el recordatorio que la suya
lleva impreso.

Efecto secundario que conviene tener presente: **28 cartas ganaron `Única` o
`Errante` al heredar el texto vigente**, así que un mazo guardado con tres
Tezcatlipoca de Hijos del Sol dejó de ser legal. Es correcto —hoy la carta es
Única— pero no es obvio mirando solo el catálogo viejo.

Y ojo con la regla al revés: **no es "la edición más nueva" sino "el ARTE de la
más nueva"**. La API miente igual en todas. Leonardo lo demuestra: Dominio
(DO-010) traía el texto bien y Águila Imperial, que es más nueva, lo traía mal
(`Única Guardián Cuando…`, sin los puntos). Aplicar "manda la última" leyendo la
API habría propagado el error.

**`Shuri` no es una carta reimpresa: son dos Tótems distintos que se llaman
igual.** BU-218 da Fuerza a los Dragones de tu Línea de Ataque y DO-213 te
devuelve un Oro del Cementerio; distinto arte, distinto ilustrador y distinto
coste. Compartían `identidad` y el constructor los contaba juntos. DO-213 lleva
ahora `identidad: "shuri-dominio"` escrita a mano en `data-src/`. Si aparece
otro homónimo, el mismo apaño.

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

**Todavía no hay** banlist ni página de erratas. Esta última tiene ahora
material de sobra: al cargar Escuelas Elementales quedaron **66 cartas cuyo
texto cambió entre impresiones**, y el catálogo muestra el vigente sin decir en
ninguna parte que la impresión vieja decía otra cosa.
