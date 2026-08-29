"""Modelo de una carta (espejo de src/lib/types.ts).

Si agregas o cambias un valor permitido aqui, replicalo en TypeScript.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator


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
