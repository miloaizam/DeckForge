"""Audita el sitio ya construido antes de publicarlo.

Corre sobre `out/` y falla con codigo 1 si encuentra algo que no deberia salir
a produccion. La idea es que sea imposible publicar una regresion de seguridad
sin enterarse.

    npm run build && npm run audit

Que revisa:
  1. No hay source maps publicados (revelan el codigo fuente).
  2. No se filtraron rutas absolutas de la maquina de build.
  3. Nada apunta a un host externo: ni scripts, ni imagenes, ni fuentes.
  4. `_headers` existe y trae las cabeceras de seguridad obligatorias.
  5. La CSP no contiene 'unsafe-eval' ni comodines.
  6. Toda imagen referenciada en el HTML existe realmente en el build.
  7. Los dos esquemas (TypeScript y Pydantic) declaran los mismos valores.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"

CABECERAS_OBLIGATORIAS = [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
]

# Hosts que sí pueden aparecer: son texto de mensajes de error de librerias,
# no recursos que el navegador vaya a pedir.
HOSTS_PERMITIDOS = ("nextjs.org", "react.dev", "github.com/zloirock", "www.w3.org")

fallos: list[str] = []
avisos: list[str] = []


def fallo(msg: str) -> None:
    fallos.append(msg)


def revisar_source_maps() -> None:
    mapas = list(OUT.rglob("*.map"))
    if mapas:
        fallo(f"{len(mapas)} source map(s) publicados, ej: {mapas[0].name}")


def revisar_rutas_absolutas() -> None:
    for f in list(OUT.rglob("*.html")) + list(OUT.rglob("*.js")):
        texto = f.read_text(encoding="utf-8", errors="ignore")
        if "/home/" in texto or "C:\\Users" in texto:
            fallo(f"ruta absoluta de la maquina de build filtrada en {f.relative_to(OUT)}")
            return


def revisar_hosts_externos() -> None:
    patron = re.compile(r'(?:src|href)="(https?://[^"]+)"')
    encontrados = set()
    for f in OUT.rglob("*.html"):
        for url in patron.findall(f.read_text(encoding="utf-8", errors="ignore")):
            if not any(h in url for h in HOSTS_PERMITIDOS):
                encontrados.add(url)
    for url in sorted(encontrados):
        fallo(f"recurso externo referenciado en el HTML: {url}")


def revisar_headers() -> None:
    headers = OUT / "_headers"
    if not headers.exists():
        fallo("falta out/_headers: el sitio saldria sin cabeceras de seguridad")
        return

    texto = headers.read_text(encoding="utf-8")
    for cabecera in CABECERAS_OBLIGATORIAS:
        if cabecera not in texto:
            fallo(f"_headers no declara {cabecera}")

    csp = next((l for l in texto.splitlines() if "Content-Security-Policy" in l), "")
    if "unsafe-eval" in csp:
        fallo("la CSP permite 'unsafe-eval'")
    if re.search(r"(default|script|img|font|connect)-src[^;]*\*", csp):
        fallo("la CSP usa un comodin * en alguna directiva")
    for directiva in ("object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'"):
        if directiva not in csp:
            fallo(f"la CSP no cierra {directiva}")
    if "'unsafe-inline'" in csp:
        avisos.append(
            "la CSP mantiene 'unsafe-inline' (limitacion conocida del App Router "
            "sin servidor; ver la seccion de seguridad de CLAUDE.md)"
        )


def revisar_imagenes() -> None:
    patron = re.compile(r'src="(/[^"]+\.(?:webp|svg|png|jpg))"')
    faltantes = set()
    for f in OUT.rglob("*.html"):
        for ruta in patron.findall(f.read_text(encoding="utf-8", errors="ignore")):
            if not (OUT / ruta.lstrip("/")).exists():
                faltantes.add(ruta)
    for ruta in sorted(faltantes):
        fallo(f"imagen referenciada que no existe en el build: {ruta}")


def revisar_esquemas() -> None:
    """Los enums de TypeScript y Pydantic tienen que coincidir."""
    ts = (ROOT / "src" / "lib" / "types.ts").read_text(encoding="utf-8")
    py = (ROOT / "scripts" / "schema.py").read_text(encoding="utf-8")

    for const, clase in (("TIPOS", "Tipo"), ("FRECUENCIAS", "Frecuencia")):
        m = re.search(rf"export const {const} = \[(.*?)\] as const", ts, re.S)
        if not m:
            fallo(f"no pude leer {const} en types.ts")
            continue
        valores_ts = set(re.findall(r'"([^"]+)"', m.group(1)))

        m = re.search(rf"class {clase}\(str, Enum\):(.*?)(?:\n\n\nclass|\Z)", py, re.S)
        if not m:
            fallo(f"no pude leer la clase {clase} en schema.py")
            continue
        valores_py = set(re.findall(r'=\s*"([^"]+)"', m.group(1)))

        if valores_ts != valores_py:
            solo_ts = valores_ts - valores_py
            solo_py = valores_py - valores_ts
            fallo(
                f"{const}/{clase} desincronizados"
                + (f" | solo en TS: {sorted(solo_ts)}" if solo_ts else "")
                + (f" | solo en Python: {sorted(solo_py)}" if solo_py else "")
            )


def main() -> int:
    if not OUT.exists():
        print("No existe out/. Corre `npm run build` primero.")
        return 1

    for revision in (
        revisar_source_maps,
        revisar_rutas_absolutas,
        revisar_hosts_externos,
        revisar_headers,
        revisar_imagenes,
        revisar_esquemas,
    ):
        revision()

    for aviso in avisos:
        print(f"[aviso] {aviso}")

    if fallos:
        print(f"\n{len(fallos)} problema(s):")
        for f in fallos:
            print(f"  [FALLO] {f}")
        return 1

    print("\nAuditoria OK: sin problemas de seguridad en el build.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
