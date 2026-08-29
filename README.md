<p align="center">
  <img src="public/brand/logo-violet.svg" alt="DeckForge" width="300">
</p>

# DeckForge

Constructor de mazos para el formato **Escuelas Elementales** de Mitos y
Leyendas. Sitio estático: todo corre en el navegador, sin servidor, sin base de
datos y sin cuentas.

> **Estado: Fase 0 — en curso.** Catálogo con grilla y modal de detalle,
> funcionando con 20 cartas de Bushido (piloto). Faltan filtros, buscador y
> constructor de mazos.

---

## Requisitos

- **Node.js 20.9+** (probado con 24). El repo trae `.nvmrc`.
- **Python 3.10+** — solo para los scripts de datos e imágenes.

## Cómo correrlo

```bash
npm install
npm run dev        # http://localhost:3000
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Genera el sitio estático en `out/` |
| `npm run preview` | Sirve `out/` en http://localhost:4173 |
| `npm run check` | Typecheck + lint + formato |
| `npm run data:fetch <edicion>` | `api.myl.cl` → `data-src/` + `images-src/` |
| `npm run data:images` | `images-src/*` → `public/cards/*.webp` |
| `npm run data:cards` | `data-src/*.json` → `public/data/cards.json` |

### Datos de las cartas

```bash
python3 -m venv --without-pip .venv
curl -sSL https://bootstrap.pypa.io/get-pip.py | .venv/bin/python -
.venv/bin/pip install -r requirements.txt
```

Sin `sudo`. Detalles en [`scripts/README.md`](scripts/README.md).

El catálogo se baja de la API oficial de MyL:

```bash
npm run data:fetch bushido    # o -- --limit 20 para un piloto
npm run data:images
npm run data:cards
```

## Estructura

```
docs/            plan del proyecto y guía de marca
data-src/        fuente editable del catálogo (un JSON por edición)
images-src/      originales de las cartas (no se suben al repo)
scripts/         herramientas Python: validan datos, convierten imágenes
public/          se sirve tal cual (marca, catálogo generado, imágenes)
src/             la app: rutas, componentes y lógica
```

## Publicación

Cloudflare Pages, conectado a este repo:

- **Build command:** `npm run build`
- **Build output directory:** `out`

Cada `git push` a `main` re-despliega.

## Documentación

- [CLAUDE.md](CLAUDE.md) — convenciones de código y seguridad
- [DESIGN.md](DESIGN.md) — convenciones de diseño, tokens y accesibilidad
- [docs/plan.md](docs/plan.md) — plan completo por fases
- [docs/brand.html](docs/brand.html) — guía de marca (ábrela en el navegador)

## Créditos y derechos

Proyecto sin fines de lucro, hecho por fans. El arte y los nombres de las
cartas son propiedad de su editor. Se acredita a los ilustradores en cada
carta.
