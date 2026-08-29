"""Agrega UNA carta suelta a data-src/extras.json.

El formato Escuelas Elementales incorpora, por balance, unas pocas cartas de
ediciones que no son del formato — Wotan y sus variantes de diseno, por
ejemplo. Bajar la edicion entera para rescatar tres cartas no tiene sentido, y
escribir el JSON a mano invita a equivocarse.

A diferencia del modo edicion, este script **agrega** y nunca pisa: si la carta
ya esta en extras.json, avisa y no la toca. Las correcciones a mano (tildes,
sobre todo) se conservan.

Uso:
    npm run data:card <edicion-slug> <numero>     # ej: helenica 042
    npm run data:card <edicion-slug> <numero> --no-images

Despues: npm run data:images && npm run data:cards
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fetch_edition import (  # noqa: E402
    API,
    DATA_SRC,
    EDITION_CODES,
    IMAGES_SRC,
    PAUSE,
    build_card,
    download,
    get_json,
)
from schema import Frecuencia, Raza, Tipo  # noqa: E402

EXTRAS = DATA_SRC / "extras.json"


def cargar_extras() -> list[dict]:
    if not EXTRAS.exists():
        return []
    return json.loads(EXTRAS.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("edicion", help="slug de la edicion real de la carta")
    ap.add_argument("numero", help="numero de la carta en su edicion, ej: 042")
    ap.add_argument("--no-images", action="store_true", help="no bajar el PNG")
    args = ap.parse_args()

    slug = args.edicion
    code = EDITION_CODES.get(slug)
    if not code:
        print(f"[ERROR] No conozco el prefijo de codigo de '{slug}'.")
        print("        Agregalo a EDITION_CODES en scripts/fetch_edition.py.")
        return 1

    # El numero se normaliza a tres digitos, que es como lo entrega la API.
    edid = args.numero.zfill(3)
    card_id = f"{code.lower()}-{edid}"

    extras = cargar_extras()
    if any(c["id"] == card_id for c in extras):
        print(f"[ERROR] {card_id} ya esta en {EXTRAS.name}. No la piso.")
        print("        Si quieres rehacerla, borrala del JSON primero.")
        return 1

    print(f"Bajando listado de '{slug}' para ubicar la carta...")
    payload = get_json(f"{API}/cards/edition/{slug}")
    edition = payload["edition"]

    raw = next((c for c in payload["cards"] if str(c["edid"]) == edid), None)
    if raw is None:
        print(f"[ERROR] '{slug}' no trae ninguna carta con el numero {edid}.")
        return 1

    profile = None
    try:
        profile = get_json(f"{API}/cards/profile/{slug}/{raw['slug']}")
        time.sleep(PAUSE)
    except Exception as e:  # noqa: BLE001 - sin perfil igual sirve, con peor nombre
        print(f"  [WARN] no pude leer el perfil: {e}")

    card = build_card(
        raw,
        code=code,
        edition_slug=slug,
        edition_id=edition["id"],
        races={r["id"]: r["name"] for r in payload["races"]},
        types={t["id"]: t["name"] for t in payload["types"]},
        rarities={r["id"]: r["name"] for r in payload["rarities"]},
        keywords=payload["keywords"],
        profile=profile,
    )
    src_url = card.pop("_source_image")

    # Una carta de fuera del formato puede traer una raza, un tipo o una
    # frecuencia que el formato no usa (Olimpico, Monumento...). El validador la
    # rechazaria despues, al construir; mas vale decirlo ahora, cuando todavia
    # se tiene el contexto de que carta es.
    problemas = []
    if card["raza"] is not None and card["raza"] not in {r.value for r in Raza}:
        problemas.append(f"raza '{card['raza']}' no es del formato")
    if card["tipo"] not in {t.value for t in Tipo}:
        problemas.append(f"tipo '{card['tipo']}' no es del formato")
    if card["frecuencia"] not in {f.value for f in Frecuencia}:
        problemas.append(f"frecuencia '{card['frecuencia']}' no es del formato")

    if problemas:
        print()
        for problema in problemas:
            print(f"  [OJO] {problema}")
        print("        `npm run data:cards` la va a rechazar tal cual esta.")
        print("        Decide a mano que poner en ese campo antes de construir.")

    if not args.no_images:
        if download(src_url, IMAGES_SRC / f"{card['id']}.png"):
            print(f"    arte -> images-src/{card['id']}.png")
        else:
            print(f"    arte ya estaba en images-src/{card['id']}.png")

    extras.append(card)
    DATA_SRC.mkdir(parents=True, exist_ok=True)
    EXTRAS.write_text(
        json.dumps(extras, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"\nOK: {card['codigo']} {card['nombre']} -> {EXTRAS.name}")
    print(f"    {len(extras)} carta(s) sueltas en total.")
    print("\nRevisa el nombre y la habilidad a mano, y despues:")
    print("    npm run data:images && npm run data:cards")
    return 0


if __name__ == "__main__":
    sys.exit(main())
