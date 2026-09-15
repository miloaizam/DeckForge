"""Convierte las imagenes originales a WebP (grande + miniatura).

Pon los originales en images-src/ con el nombre = codigo de la carta
(ej: esc-001.png) y ejecuta: python3 scripts/convert_images.py

Las ya procesadas se saltan, asi que es barato volver a correrlo.
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images-src"
OUT = ROOT / "public" / "cards"
THUMB = OUT / "thumb"

BIG_W, THUMB_W = 420, 200
BIG_Q, THUMB_Q = 80, 75
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def resize_to_width(img: Image.Image, width: int) -> Image.Image:
    """Lleva la imagen al ancho pedido, venga mas grande o mas chica.

    Casi todo el catalogo entra a 512x732 desde la API y solo hay que reducir.
    Las seis Legendarias de Dominio, que la API no tiene, entran a 354x508: si
    no se amplian salen a 354 de ancho y la grilla las pinta mas blandas que a
    sus vecinas. Ampliar no inventa detalle, pero deja todas las WebP del mismo
    tamano, que es lo que la interfaz da por hecho.
    """
    height = round(img.height * width / img.width)
    return img.resize((width, height), Image.LANCZOS)


def main() -> int:
    if not SRC.exists():
        print(f"No existe {SRC}/. Nada que convertir.")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    THUMB.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in EXTS)
    done = skipped = 0

    for path in files:
        stem = path.stem.lower()
        big_out = OUT / f"{stem}.webp"
        thumb_out = THUMB / f"{stem}.webp"
        if big_out.exists() and thumb_out.exists():
            skipped += 1
            continue
        with Image.open(path) as im:
            im = im.convert("RGB")
            resize_to_width(im, BIG_W).save(big_out, "WEBP", quality=BIG_Q, method=6)
            resize_to_width(im, THUMB_W).save(
                thumb_out, "WEBP", quality=THUMB_Q, method=6
            )
        done += 1
        print("ok:", stem)

    print(f"Listo. {done} convertida(s), {skipped} ya existian.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
