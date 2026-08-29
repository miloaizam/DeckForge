"""Valida cada data-src/*.json y los combina en public/data/cards.json.

Aborta sin escribir nada si hay un error de validacion o un id duplicado:
mas vale no publicar que publicar un catalogo corrupto.

Uso: python3 scripts/build_cards.py
"""

import json
import sys
from pathlib import Path

from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).parent))
from schema import Card  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
OUT = ROOT / "public" / "data" / "cards.json"


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
