"""Baja una edicion completa desde la API oficial de MyL y la deja lista.

Escribe `data-src/<edicion>.json` en el esquema de DeckForge y, si se piden,
los PNG originales en `images-src/` con nombre = id de la carta.

    python3 scripts/fetch_edition.py bushido
    python3 scripts/fetch_edition.py bushido --limit 20
    python3 scripts/fetch_edition.py bushido --no-images

Endpoints usados (publicos, sin autenticacion):
    GET /cards/edition/<slug>          listado completo de la edicion
    GET /cards/profile/<slug>/<card>   nombre con mayusculas + ilustrador
    GET /static/cards/<edid>/<n>.png   imagen original (512x732)

`data-src/` es editable a mano: si corriges un nombre alli, este script NO lo
pisa salvo que uses --force. Los datos de la API traen tildes inconsistentes,
asi que esas correcciones hay que conservarlas.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_SRC = ROOT / "data-src"
IMAGES_SRC = ROOT / "images-src"

API = "https://api.myl.cl"
USER_AGENT = "DeckForge/0.1 (proyecto sin fines de lucro; contacto via GitHub)"
PAUSE = 0.4  # segundos entre peticiones: seamos buenos vecinos

# Prefijo de codigo por edicion. Solo "BU" esta confirmado (wiki oficial);
# el resto es una abreviatura nuestra. El codigo no se muestra en la interfaz,
# solo sirve de id estable y de campo buscable.
# Ojo: el slug de Escuelas Elementales lleva guion BAJO en la API.
EDITION_CODES = {
    "bushido": "BU",
    "sol-naciente": "SN",
    "dominio": "DO",
    "contraataque": "CA",
    "aguila-imperial": "AI",
    "steampunk": "SP",
    "axis-mundi": "AM",
    "hijos-del-sol": "HS",
    "legado-gotico": "LG",
    "escuelas_elementales": "EE",
}

# Las escuelas del formato son parejas de razas, no un campo de la carta.
ESCUELA_POR_RAZA = {
    "Caballero": "Gremio de Paladines",
    "Sacerdote": "Gremio de Paladines",
    "Dragón": "Clan Desafiante",
    "Guerrero": "Clan Desafiante",
    "Sombra": "Culto Tenebris",
    "Oni": "Culto Tenebris",
    "Eterno": "Vigilantes Etéreos",
    "Faerie": "Vigilantes Etéreos",
}

FLAG_LUZ, FLAG_OSCURIDAD = 16, 32


def get_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def download(url: str, dest: Path) -> bool:
    if dest.exists():
        return False
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        print(f"  [WARN] imagen {url} -> HTTP {e.code}")
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return True


def clean_text(value: str | None) -> str:
    """La API separa lineas con el caracter U+21B5, no con un salto real."""
    if not value:
        return ""
    return value.replace("\u21b5", "\n").replace("\r\n", "\n").strip()


def to_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def build_card(
    raw: dict[str, Any],
    *,
    code: str,
    edition_slug: str,
    edition_id: str,
    races: dict[str, str],
    types: dict[str, str],
    rarities: dict[str, str],
    keywords: list[dict[str, Any]],
    profile: dict[str, Any] | None,
) -> dict[str, Any]:
    edid = raw["edid"]
    card_id = f"{code.lower()}-{edid}"

    mask = to_int(raw.get("keywords")) or 0
    kw_titles = [k["title"] for k in keywords if mask & int(k["flag"])]

    atributo = None
    if mask & FLAG_LUZ:
        atributo = "Luz"
    elif mask & FLAG_OSCURIDAD:
        atributo = "Oscuridad"

    raza = races.get(raw["race"]) if raw.get("race") else None
    # "Sin Raza" es ruido: para nosotros es simplemente ausencia de raza.
    if raza == "Sin Raza":
        raza = None

    details = (profile or {}).get("details") or {}
    nombre = details.get("name") or raw["name"]
    ilustrador = ((profile or {}).get("illustrator") or {}).get("name")

    return {
        "id": card_id,
        "codigo": f"{code}-{edid}",
        "nombre": nombre,
        "edicion": edition_slug,
        "tipo": types.get(raw["type"], raw["type"]),
        "raza": raza,
        "escuela": ESCUELA_POR_RAZA.get(raza) if raza else None,
        "atributo": atributo,
        "coste": to_int(raw.get("cost")),
        "fuerza": to_int(raw.get("damage")),
        "frecuencia": rarities.get(raw["rarity"], raw["rarity"]),
        "habilidad": clean_text(raw.get("ability")),
        "ilustrador": ilustrador,
        "imagen": f"/cards/{card_id}.webp",
        "thumb": f"/cards/thumb/{card_id}.webp",
        "legalidad": "libre",
        "keywords": kw_titles,
        # Solo para el script: de donde bajar el PNG. Se quita antes de escribir.
        "_source_image": f"{API}/static/cards/{edition_id}/{edid}.png",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("edition", help="slug de la edicion, ej: bushido")
    ap.add_argument("--limit", type=int, help="solo las primeras N cartas (piloto)")
    ap.add_argument("--no-images", action="store_true", help="no bajar los PNG")
    ap.add_argument("--no-profiles", action="store_true", help="saltar nombre/ilustrador")
    ap.add_argument("--force", action="store_true", help="pisar data-src existente")
    args = ap.parse_args()

    slug = args.edition
    code = EDITION_CODES.get(slug)
    if not code:
        print(f"[ERROR] No conozco el prefijo de codigo de '{slug}'.")
        print(f"        Agregalo a EDITION_CODES en {Path(__file__).name}.")
        return 1

    out_json = DATA_SRC / f"{slug}.json"
    if out_json.exists() and not args.force:
        print(f"[ERROR] {out_json} ya existe. Usa --force para regenerarlo")
        print("        (perderas las correcciones hechas a mano).")
        return 1

    print(f"Bajando listado de '{slug}'...")
    payload = get_json(f"{API}/cards/edition/{slug}")
    edition = payload["edition"]
    cards_raw = payload["cards"]

    races = {r["id"]: r["name"] for r in payload["races"]}
    types = {t["id"]: t["name"] for t in payload["types"]}
    rarities = {r["id"]: r["name"] for r in payload["rarities"]}
    keywords = payload["keywords"]

    if args.limit:
        cards_raw = cards_raw[: args.limit]
    total = len(cards_raw)
    print(f"{edition['title']} ({edition['date_release']}): {total} carta(s) a procesar.\n")

    cards, images = [], 0
    for i, raw in enumerate(cards_raw, 1):
        profile = None
        if not args.no_profiles:
            try:
                profile = get_json(f"{API}/cards/profile/{slug}/{raw['slug']}")
            except Exception as e:  # noqa: BLE001 - una carta rota no aborta todo
                print(f"  [WARN] perfil de {raw['slug']}: {e}")
            time.sleep(PAUSE)

        card = build_card(
            raw,
            code=code,
            edition_slug=slug,
            edition_id=edition["id"],
            races=races,
            types=types,
            rarities=rarities,
            keywords=keywords,
            profile=profile,
        )
        src_url = card.pop("_source_image")

        if not args.no_images:
            if download(src_url, IMAGES_SRC / f"{card['id']}.png"):
                images += 1
                time.sleep(PAUSE)

        cards.append(card)
        print(f"[{i:>3}/{total}] {card['codigo']:<8} {card['nombre']}")

    DATA_SRC.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\nOK: {len(cards)} cartas -> {out_json}")
    if not args.no_images:
        print(f"    {images} imagen(es) nueva(s) -> {IMAGES_SRC}/")
    print("\nSiguiente paso: npm run data:images && npm run data:cards")
    return 0


if __name__ == "__main__":
    sys.exit(main())
