# Scripts de datos e imagenes

Herramientas de desarrollo. No forman parte del sitio publicado: solo generan
los archivos que viven en `public/`.

## Entorno

Este sistema no trae `pip` (PEP 668), asi que el venv se arma en dos pasos:

```bash
python3 -m venv --without-pip .venv
curl -sSL https://bootstrap.pypa.io/get-pip.py | .venv/bin/python -
.venv/bin/pip install -r requirements.txt
```

No hace falta `sudo`.

## La cadena

```bash
npm run data:fetch bushido   # api.myl.cl  -> data-src/bushido.json + images-src/*.png
npm run data:images          # images-src/ -> public/cards/ (webp 420px + thumb 200px)
npm run data:cards           # data-src/   -> public/data/cards.json (validado)
```

## `fetch_edition.py`

Consume la **API oficial de MyL** (publica, sin autenticacion):

| Endpoint | Que trae |
|---|---|
| `GET /cards/edition/<slug>` | la edicion completa en una peticion |
| `GET /cards/profile/<slug>/<carta>` | nombre con mayusculas + ilustrador |
| `GET /static/cards/<ed>/<n>.png` | el arte, PNG 512x732 |

Opciones utiles:

```bash
npm run data:fetch bushido -- --limit 20     # piloto
npm run data:fetch bushido -- --no-images    # solo metadata
npm run data:fetch bushido -- --force        # regenerar (pisa correcciones)
```

Hace una pausa de 0,4 s entre peticiones y se salta las imagenes ya bajadas.

**Importante:** sin `--force` no sobrescribe un `data-src/*.json` existente. Los
datos de la API traen tildes inconsistentes (`Evocacion` por `Evocación`), asi
que las correcciones a mano en `data-src/` son valiosas y no se deben perder.

Para agregar una edicion nueva hay que registrar su prefijo de codigo en
`EDITION_CODES`, dentro del script. Solo `bushido -> BU` esta confirmado.

## `build_cards.py`

Valida cada carta contra `schema.py` (Pydantic) y aborta sin escribir nada si
encuentra un error o un `id` duplicado. Ese esquema es el espejo de
`src/lib/types.ts`: si cambias uno, cambia el otro.

## `convert_images.py`

PNG -> WebP en dos tamanos: 420px de ancho (calidad 80) para el detalle y 200px
(calidad 75) para la grilla. Referencia medida sobre 20 cartas de Bushido:
188 KB de PNG original -> 61 KB + 15 KB de WebP.
