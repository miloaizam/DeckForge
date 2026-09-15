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
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from schema import keywords_declaradas  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_SRC = ROOT / "data-src"
IMAGES_SRC = ROOT / "images-src"

API = "https://api.myl.cl"
USER_AGENT = "DeckForge/0.1 (proyecto sin fines de lucro; contacto via GitHub)"
PAUSE = 0.4  # segundos entre peticiones: seamos buenos vecinos
PROFILE_REINTENTOS = 3

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
    # Ediciones de FUERA del formato. Estan aqui porque el formato incorpora
    # unas pocas de sus cartas por balance, y `scripts/fetch_card.py` las baja
    # de a una a data-src/extras.json. Verificadas contra la API.
    "helenica": "HE",
    "imperio": "IM",
    "espada-sagrada": "ES",
    "dominios-de-ra": "DR",
    "cruzadas": "CR",
    "furia": "FU",
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

ATRIBUTOS = ("Luz", "Oscuridad")


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
    """Normaliza los saltos de linea del texto de habilidad.

    La API no es consistente entre ediciones: Bushido y Sol Naciente separan
    con el caracter U+21B5, y Dominio con un "/n" literal (barra y ene, no un
    escape). Verificado: en Dominio las 180 barras del texto son ese separador,
    ninguna es prosa.
    """
    if not value:
        return ""
    texto = (
        value.replace("\u21b5", "\n")
        .replace("/n", "\n")
        .replace("\r\n", "\n")
        .strip()
    )
    # La API mete espacios dobles y espacios al final de linea. Ninguno esta en
    # el arte y los dos ensucian la comparacion con la carta.
    return "\n".join(re.sub(r" {2,}", " ", linea).rstrip() for linea in texto.split("\n"))


def clean_name(value: str | None) -> str | None:
    """Limpia un nombre suelto (el de la carta o el del ilustrador).

    El campo `illustrator` llega con un CRLF pegado en unas cuantas cartas de
    Bushido y ContraAtaque. Sin esto se cuela en el JSON y rompe el agrupado
    por ilustrador.

    El de la carta llega con espacios al final en 22 cartas de Aguila Imperial
    ("Anibal ", "Falx "). Un espacio invisible desordena el catalogo y estorba
    al buscador, asi que el nombre pasa por aqui tambien.
    """
    if not value:
        return None
    return re.sub(r"\s+", " ", value).strip() or None


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

    habilidad = clean_text(raw.get("ability"))

    mask = to_int(raw.get("keywords")) or 0
    kw_titles = [k["title"] for k in keywords if mask & int(k["flag"])]

    # Luz y Oscuridad NO salen de los flags 16 y 32: esos marcan la MENCION, no
    # el atributo. Rayo (SPK-015) trae el flag de Oscuridad porque su texto dice
    # "Destruye una carta Oscuridad", y Van Helsing trae los dos aunque solo es
    # Luz. Lo que manda es la declaracion al inicio del texto, que es lo que la
    # carta imprime como propiedad suya. Verificado en las 71 de Steampunk
    # contra el medallon del arte (sol = Luz, luna = Oscuridad, manometro =
    # ninguno): coincide carta por carta.
    declaradas = keywords_declaradas(habilidad)
    atributo = next((a for a in ATRIBUTOS if a in declaradas), None)
    kw_titles = [k for k in kw_titles if k not in ATRIBUTOS]
    if atributo:
        kw_titles.append(atributo)

    raza = races.get(raw["race"]) if raw.get("race") else None
    # "Sin Raza" es ruido: para nosotros es simplemente ausencia de raza.
    if raza == "Sin Raza":
        raza = None

    details = (profile or {}).get("details") or {}
    nombre = clean_name(details.get("name") or raw["name"]) or raw["name"]
    ilustrador = clean_name(((profile or {}).get("illustrator") or {}).get("name"))

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
        "habilidad": habilidad,
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
    sin_perfil: list[str] = []
    # Huella de cada PNG, para cazar el caso de Hijos del Sol: la API servia en
    # /static/cards/16/017.png el arte de OTRA carta, byte por byte. No hay
    # forma de detectarlo leyendo los datos, solo comparando las imagenes entre
    # si. (Alli la URL sin el cero a la izquierda, /16/17.png, si traia la
    # correcta.)
    huellas: dict[str, str] = {}
    for i, raw in enumerate(cards_raw, 1):
        profile = None
        if not args.no_profiles:
            # El endpoint falla de vez en cuando y reintentado responde bien: en
            # Dominio dejo tres cartas sin ilustrador y en Steampunk dos. Y el
            # fallo es SILENCIOSO —devuelve CARD_NOT_FOUND, no un error—, asi
            # que hay que mirar el `status` y no solo cazar la excepcion. La
            # senal en los datos es el nombre en minuscula: el listado los
            # entrega asi y es el `profile` quien los capitaliza.
            for intento in range(PROFILE_REINTENTOS):
                try:
                    p = get_json(f"{API}/cards/profile/{slug}/{raw['slug']}")
                    if p.get("status") == "OK":
                        profile = p
                        break
                    motivo = p.get("status")
                except Exception as e:  # noqa: BLE001 - una carta rota no aborta todo
                    motivo = e
                time.sleep(PAUSE * (intento + 1))
            if profile is None:
                print(f"  [WARN] perfil de {raw['slug']}: {motivo}")
                sin_perfil.append(raw["slug"])
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
            destino = IMAGES_SRC / f"{card['id']}.png"
            if download(src_url, destino):
                images += 1
                time.sleep(PAUSE)
            if destino.exists():
                huella = hashlib.sha256(destino.read_bytes()).hexdigest()
                if huella in huellas:
                    print(f"  [WARN] {card['id']} tiene el MISMO arte que {huellas[huella]}")
                else:
                    huellas[huella] = card["id"]

        cards.append(card)
        print(f"[{i:>3}/{total}] {card['codigo']:<8} {card['nombre']}")

    DATA_SRC.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    repetidas = len(cards) - len(huellas) if huellas else 0
    if repetidas > 0:
        print(f"\n[WARN] {repetidas} carta(s) bajaron un arte que ya tenia otra.")
        print("       La API sirve a veces la imagen equivocada. Busca el PNG bueno")
        print("       (prueba la URL sin el cero a la izquierda) antes de seguir.")

    if sin_perfil:
        print(f"\n[WARN] {len(sin_perfil)} carta(s) sin perfil tras {PROFILE_REINTENTOS}")
        print(f"       intentos: {', '.join(sin_perfil)}")
        print("       Quedan con el nombre en minuscula y sin ilustrador.")
        print("       Reintenta el endpoint a mano y completa data-src/ antes de seguir.")

    print(f"\nOK: {len(cards)} cartas -> {out_json}")
    if not args.no_images:
        print(f"    {images} imagen(es) nueva(s) -> {IMAGES_SRC}/")
    print("\nSiguiente paso: npm run data:images && npm run data:cards")
    return 0


if __name__ == "__main__":
    sys.exit(main())
