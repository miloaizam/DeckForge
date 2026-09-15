"""Modelo de una carta (espejo de src/lib/types.ts).

Si agregas o cambias un valor permitido aqui, replicalo en TypeScript.
"""

import re
import unicodedata
from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator


def slug_identidad(nombre: str) -> str:
    """Slug del nombre de la carta, para agrupar sus impresiones.

    Los limites de copias del formato se cuentan por CARTA, no por impresion:
    dos Kirin normales mas dos Kirin Milenaria son cuatro Kirin. El `id` no
    sirve de clave porque lleva la edicion y el numero. El nombre si, una vez
    normalizado (hay impresiones que difieren en tildes o mayusculas).
    """
    base = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")


class Tipo(str, Enum):
    """El formato Escuelas Elementales no incluye Monumentos."""

    aliado = "Aliado"
    talisman = "Talismán"
    arma = "Arma"
    totem = "Tótem"
    oro = "Oro"


class Raza(str, Enum):
    """Las 13 razas del formato. Espejo de RAZAS en src/lib/types.ts."""

    eterno = "Eterno"
    faerie = "Faerie"
    barbaro = "Bárbaro"
    samurai = "Samurái"
    sacerdote = "Sacerdote"
    caballero = "Caballero"
    heroe = "Héroe"
    dragon = "Dragón"
    guerrero = "Guerrero"
    bestia = "Bestia"
    ancestral = "Ancestral"
    oni = "Oni"
    sombra = "Sombra"


class Escuela(str, Enum):
    paladines = "Gremio de Paladines"      # Caballero + Sacerdote
    desafiante = "Clan Desafiante"         # Dragón + Guerrero
    tenebris = "Culto Tenebris"            # Sombra + Oni
    etereos = "Vigilantes Etéreos"         # Eterno + Faerie


class Atributo(str, Enum):
    """Llega como keyword (flags 16 y 32), no como campo propio de la carta."""

    luz = "Luz"
    oscuridad = "Oscuridad"


class Frecuencia(str, Enum):
    """Espejo de la tabla `rarities` de api.myl.cl."""

    promocional = "Promocional"
    milenaria = "Milenaria"
    legendaria = "Legendaria"
    ultra = "Ultra Real"
    mega = "Mega Real"
    real = "Real"
    vasallo = "Vasallo"
    cortesano = "Cortesano"
    oro = "Oro"


class Legalidad(str, Enum):
    libre = "libre"
    restringida = "restringida"
    prohibida = "prohibida"


class Card(BaseModel):
    id: str
    codigo: str
    nombre: str
    # Se calcula del nombre si el JSON fuente no la trae. Se pone a mano cuando
    # dos impresiones de la misma carta llevan nombres distintos, como las
    # variantes de diseno de Wotan.
    identidad: str = ""
    edicion: str
    tipo: Tipo
    raza: Optional[Raza] = None
    escuela: Optional[Escuela] = None
    atributo: Optional[Atributo] = None
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
    def id_lower(cls, v: str) -> str:
        return v.lower()

    @model_validator(mode="after")
    def completar_identidad(self) -> "Card":
        if not self.identidad:
            self.identidad = slug_identidad(self.nombre)
        return self


# Keywords que el juego imprime como declaracion al inicio del texto de
# habilidad ("Unica.", "Furia.", "Luz."). Espejo de KEYWORDS_IMPRESAS en
# src/lib/types.ts: si agregas una alli, agregala aqui.
#
# Vive en este modulo y no en fetch_edition.py porque describe el modelo, no la
# descarga: `atributo` se deduce de esta lista.
KEYWORDS_IMPRESAS = [
    "Única",
    "Imbloqueable",
    "Indesterrable",
    "Indestructible",
    "Luz",
    "Oscuridad",
    "Furia",
    "Guardián",
    "Inmunidad",
    "Alimentar",
    "Purificar",
    "Retador",
    "Ilusión",
    "Espectral",
    "Honor",
    "Errante",
    "Exhumar",
    "Mercenario",
    "Traición",
]

_ALTERNATIVA = "|".join(re.escape(k) for k in KEYWORDS_IMPRESAS)
# El recordatorio de reglas entre parentesis que algunas ediciones pegan tras
# la keyword, y el punto (o el fin de linea) que cierra la declaracion.
_FIN_DECLARACION = r"(?:\s*\([^)]*\))?(?:\.|(?=\n|$))"
_DECLARACION_INICIAL = re.compile(rf"^(?:(?:{_ALTERNATIVA}){_FIN_DECLARACION}\s*)+")
_CADA_KEYWORD = re.compile(rf"({_ALTERNATIVA}){_FIN_DECLARACION}")


def keywords_declaradas(habilidad: str) -> list[str]:
    """Las keywords declaradas al INICIO del texto, en el orden impreso.

    Espejo de `splitAbility()` en src/lib/ability.ts. Una keyword mencionada
    dentro de la prosa ("Destruye una carta Oscuridad") no cuenta: solo cuenta
    la declaracion, que es lo que la carta imprime como propiedad suya.
    """
    m = _DECLARACION_INICIAL.match(habilidad or "")
    return [x.group(1) for x in _CADA_KEYWORD.finditer(m.group(0))] if m else []
