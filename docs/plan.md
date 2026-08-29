# DeckForge — Plan completo de construcción

Deckbuilder web para el formato **Escuelas Elementales** de Mitos y Leyendas.
Objetivo: lanzar **gratis, sin servidor y sin base de datos**, con margen para crecer.

---

## 0. Respuestas rápidas a tus preguntas

| Pregunta | Decisión | Por qué |
|---|---|---|
| ¿Tendrá login? | **No** (en el MVP) | No necesitas cuentas para consultar cartas y armar mazos. Se resuelve con guardado local + compartir por URL. |
| ¿GitHub Pages o Cloudflare Pages? | **Cloudflare Pages** | Ancho de banda ilimitado, mejor para imágenes, y te deja crecer a R2/dominio propio sin migrar. El código igual vive en GitHub. |
| ¿Un repo de GitHub para todo? | **Sí, uno solo** | Código + datos + imágenes + scripts en el mismo repo. Cloudflare se conecta a ese repo y despliega solo. |
| ¿Un JSON o varios? | **Editas varios (uno por edición) → se combinan en uno solo** | Editar por edición es cómodo; la app carga un único `cards.json` (~1–3 MB) y filtra en memoria. |
| ¿Qué herramientas? | Git + GitHub, Node.js + Vite + React + Tailwind, Python (Pillow + Pydantic) para datos/imágenes, Cloudflare Pages para publicar | Ver sección 2. |

---

## 1. Arquitectura general

Todo corre en el navegador. No hay backend que mantener.

```
   Navegador del usuario
   ┌─────────────────────────────────────────────┐
   │  App React (HTML/JS/CSS estáticos)           │
   │   • carga cards.json (catálogo completo)     │
   │   • busca / filtra en memoria                │
   │   • arma el mazo (estado local)              │
   │   • guarda en localStorage                   │
   │   • comparte el mazo codificado en la URL    │
   │   • pide imágenes .webp por URL              │
   └─────────────────────────────────────────────┘
              │                         │
              ▼                         ▼
      cards.json (datos)        /cards/*.webp (imágenes)
              └────────── Cloudflare Pages ──────────┘
                   (sirve archivos estáticos)
```

Regla mental: **el catálogo es data fija** (solo cambia cuando tú agregas cartas), así que va en archivos estáticos. **El mazo es del usuario**, así que vive en su navegador. Nada de esto necesita servidor ni BD.

---

## 2. Stack y herramientas

| Capa | Herramienta | Rol |
|---|---|---|
| Control de versiones | **Git + GitHub** | Guardar el proyecto, historial, y fuente para Cloudflare |
| Empaquetador | **Vite** | Servidor de desarrollo + build a estáticos (`dist/`) |
| UI | **React** | Grilla de cartas, filtros, panel de mazo (mucho material de ayuda) |
| Estilos | **Tailwind CSS** | Rápido, y mapea directo a tu paleta de marca (violeta/blanco) |
| Búsqueda | **MiniSearch** o **Fuse.js** | Buscar por nombre/habilidad al instante, en el cliente |
| Compartir mazo | **lz-string** | Comprimir el mazo para meterlo en la URL |
| Datos (dev) | **Python + Pydantic** | Validar el JSON de cartas antes de publicar |
| Imágenes (dev) | **Python + Pillow** | Convertir a WebP + generar miniaturas |
| Hosting | **Cloudflare Pages** | Publicar el sitio gratis, se actualiza con cada push |

> Alternativa más liviana a React: **Svelte** (menos código repetido). Si te sientes cómodo, cámbialo; el resto del plan es igual. Recomiendo React solo porque hay más tutoriales cuando te trabes.

Instalaciones previas (una sola vez):
- **Node.js** (versión LTS) → trae `npm`.
- **Python 3** (ya lo tienes) → `pip install pillow pydantic`.
- **Git** → configurado con tu cuenta de GitHub.
- Cuenta gratis en **github.com** y en **cloudflare.com**.

---

## 3. Login: no, y cómo se resuelve sin él

Sin cuentas pierdes solo una cosa: **mazos guardados en la nube y sincronizados entre dispositivos**. Lo compensas con tres mecanismos que cubren el 95% del uso real:

1. **Guardado local** (`localStorage`): los mazos del usuario quedan en su navegador. Al volver, siguen ahí.
2. **Compartir por URL**: el mazo se codifica en un enlace (`deckforge.pages.dev/mazo?d=XXXX`). Cualquiera abre ese link y ve el mazo. Ideal para pasarlo por WhatsApp/Discord.
3. **Exportar / importar**: botón para bajar el mazo como `.json` (o texto) y volver a cargarlo.

Cuándo agregarías login (fase futura, opcional): perfiles públicos, guardar mazos en la nube, "me gusta", comentarios. Eso se hace después con **Supabase** (tier gratis con auth + Postgres) sin reescribir el frontend. No lo necesitas para lanzar.

---

## 4. GitHub Pages vs Cloudflare Pages → Cloudflare

Ambos publican sitios estáticos gratis desde un repo de GitHub. Elijo **Cloudflare Pages** por:

- **Ancho de banda ilimitado** (GitHub Pages tiene límites "blandos" de ~100 GB/mes y ~1 GB de repo).
- **Camino de crecimiento**: si algún día las imágenes crecen, mueves solo las imágenes a **R2** (10 GB gratis, sin costo de egress) sin cambiar nada más.
- **Dominio propio gratis** y HTTPS automático.
- Se conecta a tu repo de GitHub y **despliega solo con cada `git push`**.

O sea: el código sigue en **GitHub** (tú trabajas ahí), y **Cloudflare** lo publica. No es "uno u otro" a nivel de trabajo diario; GitHub es tu repo, Cloudflare es el que sirve la web.

---

## 5. Repo único: sí. Estructura de carpetas

Un solo repositorio con todo. Los scripts de Python son herramientas de desarrollo (no se publican); Cloudflare solo publica lo que Vite genera.

```
deckforge/
├─ public/                     # archivos que se sirven tal cual
│  ├─ data/
│  │  └─ cards.json            # catálogo COMBINADO (generado, se commitea)
│  └─ cards/                   # imágenes finales (generadas)
│     ├─ esc-001.webp          # imagen "grande" (~420px)
│     ├─ ...
│     └─ thumb/
│        ├─ esc-001.webp       # miniatura (~200px)
│        └─ ...
├─ data-src/                   # FUENTE editable, 1 archivo por edición
│  ├─ bushido.json
│  ├─ sol-naciente.json
│  ├─ dominio.json
│  ├─ contraataque.json
│  ├─ aguila-imperial.json
│  ├─ steampunk.json
│  ├─ axis-mundi.json
│  ├─ hijos-del-sol.json
│  ├─ legado-gotico.json
│  └─ escuelas-elementales.json
├─ images-src/                 # imágenes ORIGINALES sin procesar (no se publican)
│  └─ ...
├─ scripts/
│  ├─ schema.py                # modelo Pydantic de una carta
│  ├─ build_cards.py           # valida + combina data-src → public/data/cards.json
│  └─ convert_images.py        # images-src → public/cards (webp + thumbs)
├─ src/                        # app React
│  ├─ main.jsx
│  ├─ App.jsx
│  ├─ components/
│  │  ├─ CardGrid.jsx
│  │  ├─ CardTile.jsx
│  │  ├─ Filters.jsx
│  │  └─ DeckPanel.jsx
│  ├─ lib/
│  │  ├─ deckCode.js           # codificar/decodificar mazo ↔ URL
│  │  └─ search.js             # índice de búsqueda
│  └─ index.css                # Tailwind + tokens de marca
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ .gitignore                  # ignora node_modules, dist, images-src si prefieres
└─ README.md
```

Nota sobre `images-src/`: son los originales pesados. Puedes **no** subirlos al repo (agrégalos al `.gitignore`) y guardarlos aparte; al repo solo suben las WebP ya optimizadas en `public/cards/`.

---

## 6. Datos: el modelo de carta y el formato JSON

### 6.1. Estrategia: editas varios, publicas uno

- **Editas** `data-src/<edicion>.json` (uno por edición) → cómodo, ordenado, menos conflictos.
- Un script **combina y valida** todo en un único **`public/data/cards.json`**.
- La app **carga ese único archivo** una vez y filtra/busca en memoria. Con ~2.000 cartas pesa ~1–3 MB: perfectamente manejable.

### 6.2. Esquema de una carta (pensado para Escuelas Elementales)

```json
{
  "id": "esc-001",
  "codigo": "ESC-001",
  "nombre": "Nombre de la carta",
  "edicion": "escuelas-elementales",
  "tipo": "Aliado",
  "raza": "Caballero",
  "escuela": "Gremio de Paladines",
  "atributo": "Luz",
  "coste": 3,
  "fuerza": 4,
  "frecuencia": "Real",
  "habilidad": "Texto de la habilidad de la carta.",
  "ilustrador": "Nombre del ilustrador",
  "imagen": "/cards/esc-001.webp",
  "thumb": "/cards/thumb/esc-001.webp",
  "legalidad": "libre",
  "keywords": ["paladin", "luz", "caballero"]
}
```

Valores esperados (los defines tú en el esquema para que el validador te avise de errores de tipeo):

- **tipo**: `Aliado`, `Talismán`, `Arma`, `Tótem`, `Oro`.
- **raza** (solo Aliados): `Caballero`, `Sacerdote`, `Dragón`, `Guerrero`, `Sombra`, `Oni`, `Eterno`, `Faerie`, `Bestia`, … (según edición).
- **escuela** (sinergias raciales del formato): `Gremio de Paladines` (Caballero+Sacerdote), `Clan Desafiante` (Dragón+Guerrero), `Culto Tenebris` (Sombra+Oni), `Vigilantes Etéreos` (Eterno+Faerie), o `null` si no aplica.
- **atributo**: `Luz`, `Oscuridad`, o `null`.
- **frecuencia**: `Vasallo`, `Cortesano`, `Real`, `Mega Real`, `Ultra Real`, `Legendaria`, `Oro`.
- **legalidad**: `libre`, `restringida`, `prohibida` (para la banlist del formato).

Cada archivo `data-src/<edicion>.json` es simplemente una lista:

```json
[
  { "id": "esc-001", "nombre": "...", ... },
  { "id": "esc-002", "nombre": "...", ... }
]
```

---

## 7. Imágenes: formato, tamaños y conversión

### 7.1. Decisiones

- **Formato: WebP** (NO SVG — el SVG es solo para tu logo/íconos; el arte de la carta es una foto).
- **Dos tamaños por carta**:
  - "grande" para el modal / vista de detalle: **ancho ~420px**, calidad ~80.
  - "miniatura" para la grilla: **ancho ~200px**, calidad ~75.
- **Nombre = código de la carta** (`esc-001.webp`) para que casen con el JSON sin ambigüedad.
- **Dónde**: en el repo, dentro de `public/cards/`. A tu volumen (~125–150 MB) funciona bien. Si más adelante molesta el peso del repo, migramos las imágenes a **R2** (te ayudo cuando llegue el momento).
- En la grilla usa `loading="lazy"` en las `<img>` para que solo se descarguen las visibles.

### 7.2. Script de conversión (Python + Pillow)

`scripts/convert_images.py`:

```python
"""Convierte imágenes originales a WebP (grande + miniatura).
Uso: pon los originales en images-src/ con el nombre = código de la carta
(ej: esc-001.png) y ejecuta: python scripts/convert_images.py
"""
from pathlib import Path
from PIL import Image

SRC = Path("images-src")
OUT = Path("public/cards")
THUMB = OUT / "thumb"
BIG_W, THUMB_W = 420, 200
BIG_Q, THUMB_Q = 80, 75

def resize_to_width(img, width):
    if img.width <= width:
        return img.copy()
    h = round(img.height * width / img.width)
    return img.resize((width, h), Image.LANCZOS)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    THUMB.mkdir(parents=True, exist_ok=True)
    exts = {".png", ".jpg", ".jpeg", ".webp"}
    files = [p for p in SRC.iterdir() if p.suffix.lower() in exts]
    for p in sorted(files):
        stem = p.stem.lower()
        big_out = OUT / f"{stem}.webp"
        thumb_out = THUMB / f"{stem}.webp"
        if big_out.exists() and thumb_out.exists():
            continue  # ya procesada, la salta
        with Image.open(p) as im:
            im = im.convert("RGB")
            resize_to_width(im, BIG_W).save(big_out, "WEBP", quality=BIG_Q, method=6)
            resize_to_width(im, THUMB_W).save(thumb_out, "WEBP", quality=THUMB_Q, method=6)
        print("ok:", stem)
    print(f"Listo. {len(files)} imágenes procesadas.")

if __name__ == "__main__":
    main()
```

---

## 8. Conseguir y organizar las cartas (el trabajo real)

Esto —no el hosting— es lo que toma tiempo. La buena noticia: **no partes de cero**. Hay proyectos comunitarios de MyL que puedes usar como referencia o punto de partida (revisa su licencia y verifica los datos):

- Repos de deckbuilder MyL en GitHub (p. ej. `sariego/myldb`, `emilioboud/Deckbuilder-MyL`, `hernancasanova/Mitos-y-leyendas`) — te sirven para ver cómo estructuraron datos/imágenes.
- La **wiki (Fandom)** tiene listas de cartas por edición, con habilidades y frecuencias.
- El **sitio/blog oficial** y tiendas suelen tener spoilers e imágenes por edición.

Flujo recomendado:
1. Junta primero **una** edición (por ejemplo, la propia **Escuelas Elementales**, 300 cartas) como piloto.
2. Consigue sus imágenes → `images-src/` con nombre = código.
3. Llena su `data-src/escuelas-elementales.json`.
4. Corre los scripts, levanta la app, valida que se vea bien.
5. Recién ahí repite con las demás ediciones.

> **Derechos**: el arte de las cartas es propiedad del editor (Salo/Klu!). Mantén el proyecto **sin fines de lucro**, acredita a los ilustradores (el campo `ilustrador` ya está en el esquema), y si puedes, pide permiso o enlaza a fuentes oficiales. Esto te deja tranquilo antes de difundirlo.

---

## 9. Validar y combinar los datos (Python + Pydantic)

`scripts/schema.py`:

```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel, field_validator

class Tipo(str, Enum):
    aliado = "Aliado"; talisman = "Talismán"; arma = "Arma"
    totem = "Tótem"; oro = "Oro"

class Escuela(str, Enum):
    paladines = "Gremio de Paladines"
    desafiante = "Clan Desafiante"
    tenebris = "Culto Tenebris"
    etereos = "Vigilantes Etéreos"

class Frecuencia(str, Enum):
    vasallo = "Vasallo"; cortesano = "Cortesano"; real = "Real"
    mega = "Mega Real"; ultra = "Ultra Real"
    legendaria = "Legendaria"; oro = "Oro"

class Legalidad(str, Enum):
    libre = "libre"; restringida = "restringida"; prohibida = "prohibida"

class Card(BaseModel):
    id: str
    codigo: str
    nombre: str
    edicion: str
    tipo: Tipo
    raza: Optional[str] = None
    escuela: Optional[Escuela] = None
    atributo: Optional[str] = None       # "Luz" | "Oscuridad" | None
    coste: Optional[int] = None
    fuerza: Optional[int] = None
    frecuencia: Frecuencia
    habilidad: str = ""
    ilustrador: Optional[str] = None
    imagen: str
    thumb: str
    legalidad: Legalidad = Legalidad.libre
    keywords: list[str] = []

    @field_validator("id")
    @classmethod
    def id_lower(cls, v): return v.lower()
```

`scripts/build_cards.py`:

```python
"""Valida cada data-src/*.json y los combina en public/data/cards.json."""
import json, sys
from pathlib import Path
from pydantic import ValidationError
from schema import Card

SRC = Path("data-src")
OUT = Path("public/data/cards.json")

def main():
    cards, ids, errors = [], set(), 0
    for f in sorted(SRC.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        for i, raw in enumerate(data):
            try:
                c = Card(**raw)
            except ValidationError as e:
                errors += 1
                print(f"[ERROR] {f.name} #{i}: {e}")
                continue
            if c.id in ids:
                errors += 1
                print(f"[ERROR] id duplicado: {c.id} en {f.name}")
                continue
            ids.add(c.id)
            cards.append(c.model_dump(mode="json"))
    if errors:
        print(f"\n{errors} error(es). No se generó el archivo.")
        sys.exit(1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cards, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {len(cards)} cartas → {OUT}")

if __name__ == "__main__":
    main()
```

Correr (desde la carpeta del proyecto):
```bash
python scripts/convert_images.py
python scripts/build_cards.py
```

---

## 10. Puesta en marcha del proyecto (paso a paso)

Todo esto se hace **una vez**, en tu computador. Copia y pega los comandos.

```bash
# 1. Crear el proyecto con Vite + React
npm create vite@latest deckforge -- --template react
cd deckforge

# 2. Instalar dependencias base
npm install

# 3. Instalar librerías del proyecto
npm install minisearch lz-string
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 4. Probar que arranca
npm run dev        # abre http://localhost:5173
```

Configura Tailwind con tus tokens de marca (en `tailwind.config.js`, colores violeta `#7C3AED`/`#6D28D9`, fondo `#0D0B14`, etc.) para que la app combine con el logo que ya tienes.

Estructura de trabajo diaria:
- `npm run dev` → desarrollas viendo cambios en vivo.
- `npm run build` → genera `dist/` (lo que Cloudflare publica). No necesitas subir `dist/` a mano.

Crear el repo y subirlo a GitHub:
```bash
git init
git add .
git commit -m "Primer commit: base de DeckForge"
# crea el repo vacío en github.com, luego:
git remote add origin https://github.com/TU_USUARIO/deckforge.git
git branch -M main
git push -u origin main
```

---

## 11. Publicar en Cloudflare Pages (paso a paso, sin experiencia previa)

1. Entra a **cloudflare.com** y crea una cuenta gratis (o inicia sesión).
2. En el panel, ve a **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Autoriza a Cloudflare a acceder a tu **GitHub** y selecciona el repo **deckforge**.
4. En la configuración de build, pon:
   - **Framework preset**: `Vite` (si aparece) o `None`.
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Pulsa **Save and Deploy**. Espera 1–2 min.
6. Te da una URL tipo **`https://deckforge.pages.dev`**. ¡Ya está online!
7. De ahí en adelante, **cada `git push` a `main` re-despliega solo**. No tocas nada más.
8. (Opcional) **Custom domains** → agrega tu dominio propio cuando lo tengas.

Si algo falla en el build, casi siempre es (a) el *output directory* mal puesto (`dist`), o (b) una versión de Node distinta — puedes fijarla con una variable `NODE_VERSION` en la configuración de Pages.

---

## 12. Roadmap por fases

**Fase 0 — Esqueleto (1 edición piloto)**
- Proyecto Vite corriendo, Tailwind con tu marca, logo integrado.
- Cargar `cards.json` con solo la edición Escuelas Elementales.
- Grilla de cartas con miniaturas + modal de detalle.
- Publicado en Cloudflare Pages.

**Fase 1 — Catálogo completo del formato**
- Todas las ediciones (Bushido → Legado Gótico + Escuelas Elementales) cargadas.
- Filtros: edición, tipo, raza, escuela, atributo, coste, frecuencia, legalidad.
- Buscador por nombre/habilidad (MiniSearch).

**Fase 2 — Constructor de mazos**
- Panel de mazo con conteos (Aliados/Armas/Talismanes/Tótems/Oros), tope de 50.
- Reglas del formato (máximos por carta, banlist).
- Curva de coste + resumen por escuela.
- Guardado en `localStorage` + exportar/importar.

**Fase 3 — Compartir**
- Codificar el mazo en la URL (lz-string) y reconstruirlo al abrir el link.
- Imagen/exportación del mazo para redes.

**Fase futura (opcional) — Cuentas**
- Login + mazos en la nube con Supabase (tier gratis). Solo si lo quieres; el resto no cambia.

---

## 13. Cómo seguimos

Lo más eficiente es ir por la **Fase 0** ya mismo. Puedo ayudarte con lo que quieras primero:

- **Generar el scaffold real** del proyecto (React + Tailwind con tu paleta, componentes base de grilla/modal) listo para copiar.
- Escribir el **`tailwind.config.js`** con tus tokens de marca.
- Crear los **componentes** `CardGrid`, `CardTile`, `Filters`, `DeckPanel`.
- La lógica de **codificar/decodificar el mazo en la URL**.
- Un **`data-src/escuelas-elementales.json`** de ejemplo con varias cartas reales para que pruebes toda la cadena (imágenes → build → app).

Dime por cuál partimos y lo armamos.
