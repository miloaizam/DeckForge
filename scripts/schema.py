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
    "Retador",
    "Ilusión",
    "Espectral",
    "Errante",
    "Exhumar",
    "Mercenario",
    "Traición",
]

_ALTERNATIVA = "|".join(re.escape(k) for k in KEYWORDS_IMPRESAS)
# El recordatorio de reglas entre parentesis que algunas ediciones pegan tras
# la keyword, y el punto (o el fin de linea) que cierra la declaracion.
_FIN_DECLARACION = r"(?:\s*\([^)]*\))?(?:\.|$)"
# Una declaracion suelta al comienzo de lo que queda de linea, y una con su
# parametro tras el guion ("Traicion - Botar dos cartas", "Inmunidad - Cartas
# Luz"). El parametro llega hasta el recordatorio o hasta el punto.
_DECLARACION = re.compile(rf"^({_ALTERNATIVA}){_FIN_DECLARACION}\s*")
_DECLARACION_CON_PARAMETRO = re.compile(
    rf"^({_ALTERNATIVA})\s-\s[^.(\n]+?\s*{_FIN_DECLARACION}\s*"
)
_DECLARACION_INICIAL = re.compile(rf"^(?:(?:{_ALTERNATIVA}){_FIN_DECLARACION}\s*)+")
_CADA_KEYWORD = re.compile(rf"({_ALTERNATIVA}){_FIN_DECLARACION}")


def keywords_declaradas(habilidad: str) -> list[str]:
    """Las keywords declaradas al INICIO del texto, en el orden impreso.

    Solo mira el bloque de apertura. Para lo que la carta declara mire donde
    mire —que es lo que va al campo `keywords`— usa `keywords_propias()`.
    """
    m = _DECLARACION_INICIAL.match(habilidad or "")
    return [x.group(1) for x in _CADA_KEYWORD.finditer(m.group(0))] if m else []


def keywords_propias(habilidad: str) -> list[str]:
    """Las keywords que la carta se declara a SI MISMA, mire donde mire.

    Espejo de `splitAbility()` en src/lib/ability.ts, y la fuente del campo
    `keywords`, que es lo que filtra el catalogo.

    Va linea por linea consumiendo declaraciones mientras haya, porque una
    carta puede encadenarlas ("Errante. Oscuridad. Inmunidad - Cartas Luz.") y
    puede anteponer una condicion de juego antes de declarar ("Puedes jugar
    este Aliado en Guerra de Talismanes.\nGuardian (...).\nCuando este Aliado
    entra en juego..."). Asi se escapo DO-176 (Pulcinela) de la revision a mano
    de Guardian, que miraba solo la primera linea, y asi se perdio la Inmunidad
    de Cain y Serpiente Negra, que la declaran en la misma linea que Errante.

    Lo que NO cuenta es mencionar la keyword o repartirla: "los Oros que
    controlas se Convierten en Aliados de Fuerza 2 Indestructibles" no hace
    Indestructible al Talisman que lo dice.
    """
    propias: list[str] = []
    for linea in (habilidad or "").split("\n"):
        resto = linea
        while True:
            m = _DECLARACION.match(resto) or _DECLARACION_CON_PARAMETRO.match(resto)
            if not m:
                break
            propias.append(m.group(1))
            resto = resto[m.end() :]
    # Sin duplicados y en el orden impreso.
    return list(dict.fromkeys(propias))
