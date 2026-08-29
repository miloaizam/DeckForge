"""Valida cada data-src/*.json y los combina en public/data/cards.json.

Aborta sin escribir nada si hay un error de validacion, un id duplicado o dos
impresiones de la misma carta que se contradicen: mas vale no publicar que
publicar un catalogo corrupto.

Uso: python3 scripts/build_cards.py
"""

import collections

import json
import sys
from pathlib import Path

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent))
from schema import Card  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
OUT = ROOT / "public" / "data" / "cards.json"


def revisar_identidades(cards: list[dict]) -> tuple[list[str], list[str]]:
    """Comprueba que las impresiones de una misma carta no se contradigan.

    `identidad` es la clave con la que el constructor de mazos cuenta copias,
    asi que dos cartas que la comparten tienen que ser de verdad la misma. Un
    choque en `tipo` o `raza` significa que el slug fusiono cartas distintas y
    romperia las reglas del formato: eso es un error.

    Que difieran en `coste` o `fuerza` es un dato malo de la API (pasa en tres
    pares), pero no rompe el conteo de copias: solo se avisa.
    """
    errores: list[str] = []
    avisos: list[str] = []
    por_identidad: dict[str, list[dict]] = collections.defaultdict(list)
    for c in cards:
        por_identidad[c["identidad"]].append(c)

    for identidad, grupo in sorted(por_identidad.items()):
        if len(grupo) == 1:
            continue
        ids = ", ".join(c["id"] for c in grupo)
        for campo in ("tipo", "raza"):
            valores = {c[campo] for c in grupo}
            if len(valores) > 1:
                errores.append(
                    f"'{identidad}' agrupa cartas con {campo} distinto "
                    f"({sorted(map(str, valores))}): {ids}"
                )
        for campo in ("coste", "fuerza"):
            valores = {c[campo] for c in grupo}
            if len(valores) > 1:
                avisos.append(
                    f"'{identidad}' tiene {campo} distinto entre impresiones "
                    f"({sorted(map(str, valores))}): {ids}"
                )
    return errores, avisos


def main() -> int:
    cards: list[dict] = []
    ids: set[str] = set()
    errors = 0

    files = sorted(SRC.glob("*.json"))
    if not files:
        print(f"No hay archivos en {SRC}/. Nada que construir.")
        return 0

    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        for i, raw in enumerate(data):
            try:
                card = Card(**raw)
            except ValidationError as e:
                errors += 1
                print(f"[ERROR] {f.name} #{i}: {e}")
                continue
            if card.id in ids:
                errors += 1
                print(f"[ERROR] id duplicado: {card.id} en {f.name}")
                continue
            ids.add(card.id)
            cards.append(card.model_dump(mode="json"))

    choques, avisos = revisar_identidades(cards)
    for a in avisos:
        print(f"[aviso] {a}")
    for e in choques:
        print(f"[ERROR] {e}")
    errors += len(choques)

    if errors:
        print(f"\n{errors} error(es). No se genero el archivo.")
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cards, ensure_ascii=False), encoding="utf-8")
    kb = OUT.stat().st_size / 1024
    print(f"OK: {len(cards)} cartas de {len(files)} edicion(es) -> {OUT} ({kb:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
