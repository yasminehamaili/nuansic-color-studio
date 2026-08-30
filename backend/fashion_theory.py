"""
fashion_theory.py
==================
Implements the fashion color rules supplied by the project owner (derived
from Anuschka Rees's "Personal Color"). Original implementation of the
supplied rules — and a deliberate adaptation, since the source book
classifies a PERSON's coloring (skin/hair/eyes), not a single color.

THE ADAPTATION: undertone, value, and chroma are properties of any single
color too, not just a person's overall coloring. So the picked color is
classified into the nearest of the 12 standard color-analysis seasons
using those same 3 dimensions, and the palette is built from that season's
signature — treating the picked color as the "key color" representative
of a season, the same way a swatch of fabric can be season-matched.

RULE 1 — Four core variables -> nearest of 12 seasons
Undertone (warm/cool, from hue), Value (light/deep, from lightness),
Chroma (soft/clear, from saturation) place the picked color into the
nearest of the 12 canonical seasons (Light/True/Clear Spring, Light/True/
Soft Summer, Soft/True/Deep Autumn, Deep/True/Clear Winter). "Contrast"
(the 4th variable, normally read from a B&W photo) has no analog for a
single color and is approximated from the season's own typical contrast
level instead.

RULE 2 — Golden Rule 1: guide, not a cage
One companion is deliberately pulled from a NEIGHBORING season (adjacent
on the 12-season wheel) rather than strictly the matched season — for
wardrobe variety, per Rees's explicit instruction not to restrict to the
exact palette.

RULE 3 — Golden Rule 2: self-expression trumps analysis
One companion is a deliberate "rule-breaker" (Rees's own example: black on
a Light Spring) — included with a styling tip on how to make it work
(small-dose accent, or paired with makeup/styling elsewhere) rather than
being excluded.

RULE 4 — Golden Rule 3: proximity to the face
Every companion is tagged "near_face" (strict season match — tops,
jackets, scarves, makeup) or "away_from_face" (looser — trousers, shoes,
bags: "any color of the rainbow" per Rees).
"""

import colorsys
import hashlib

# The 12 seasons arranged in wheel order (for "neighboring season" lookups),
# each with a signature: (undertone, value, chroma) and a characteristic
# hue range in degrees used to generate companions within that season.
SEASONS = [
    {"name": "Light Spring",   "undertone": "warm", "value": "light", "chroma": "clear", "hue_range": (30, 80)},
    {"name": "True Spring",    "undertone": "warm", "value": "medium", "chroma": "clear", "hue_range": (20, 70)},
    {"name": "Clear Spring",   "undertone": "warm", "value": "medium", "chroma": "very_clear", "hue_range": (0, 60)},
    {"name": "Clear Winter",   "undertone": "cool", "value": "medium", "chroma": "very_clear", "hue_range": (300, 340)},
    {"name": "True Winter",    "undertone": "cool", "value": "deep", "chroma": "very_clear", "hue_range": (210, 280)},
    {"name": "Deep Winter",    "undertone": "cool", "value": "deep", "chroma": "clear", "hue_range": (250, 320)},
    {"name": "Deep Autumn",    "undertone": "warm", "value": "deep", "chroma": "medium", "hue_range": (10, 50)},
    {"name": "True Autumn",    "undertone": "warm", "value": "medium", "chroma": "soft", "hue_range": (20, 60)},
    {"name": "Soft Autumn",    "undertone": "warm", "value": "medium", "chroma": "very_soft", "hue_range": (40, 90)},
    {"name": "Soft Summer",    "undertone": "cool", "value": "medium", "chroma": "very_soft", "hue_range": (200, 280)},
    {"name": "True Summer",    "undertone": "cool", "value": "medium", "chroma": "soft", "hue_range": (190, 260)},
    {"name": "Light Summer",   "undertone": "cool", "value": "light", "chroma": "soft", "hue_range": (180, 240)},
]

CHROMA_SATURATION = {
    "very_soft": 0.25, "soft": 0.4, "medium": 0.55, "clear": 0.7, "very_clear": 0.85,
}
VALUE_LIGHTNESS = {"light": 0.72, "medium": 0.5, "deep": 0.3}

WARDROBE_NEUTRAL = {
    "warm": "#F2E8D8",   # ivory/cream
    "cool": "#EDEFF2",   # cool white/gray
}


def classify_undertone(h_deg: float, s: float) -> str:
    if s < 0.1:
        return "neutral"
    return "warm" if (h_deg < 75 or h_deg >= 345) else "cool"


def classify_value(l: float) -> str:
    if l >= 0.62:
        return "light"
    if l <= 0.38:
        return "deep"
    return "medium"


def classify_chroma(s: float) -> str:
    if s >= 0.75:
        return "very_clear"
    if s >= 0.55:
        return "clear"
    if s >= 0.4:
        return "medium"
    if s >= 0.22:
        return "soft"
    return "very_soft"


def nearest_season(h_deg: float, l: float, s: float) -> int:
    """Rule 1: score every season by how well it matches the picked color's
    undertone/value/chroma, return the index of the closest match."""
    undertone = classify_undertone(h_deg, s)
    value = classify_value(l)
    chroma = classify_chroma(s)

    value_rank = {"light": 0, "medium": 1, "deep": 2}
    chroma_rank = {"very_soft": 0, "soft": 1, "medium": 2, "clear": 3, "very_clear": 4}

    best_idx, best_score = 0, float("inf")
    for i, season in enumerate(SEASONS):
        score = 0
        if undertone != "neutral" and season["undertone"] != undertone:
            score += 3
        score += abs(value_rank[value] - value_rank[season["value"]]) * 1.5
        score += abs(chroma_rank.get(chroma, 2) - chroma_rank.get(season["chroma"], 2)) * 0.5
        if score < best_score:
            best_score, best_idx = score, i
    return best_idx


def _hls_to_hex(h_deg, l, s):
    h = (h_deg % 360) / 360
    l, s = max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def _pick_in_range(hex_color: str, lo: float, hi: float, salt: str) -> float:
    digest = hashlib.sha256((hex_color + salt).encode()).hexdigest()
    frac = (int(digest, 16) % 1000) / 1000
    return lo + frac * (hi - lo)


def _season_color(season: dict, hex_color: str, salt: str) -> str:
    lo, hi = season["hue_range"]
    h_deg = _pick_in_range(hex_color, lo, hi, salt)
    l = VALUE_LIGHTNESS[season["value"]]
    s = CHROMA_SATURATION[season["chroma"]]
    return _hls_to_hex(h_deg, l, s)


def generate_fashion_palette(base_hex: str, h: float, l: float, s: float) -> dict:
    """
    h, l, s are the base color's hue/lightness/saturation as fractions (0-1).
    Returns: { season, undertone, value, chroma, companions: [{hex, role,
               note?}, x4] }
    """
    h_deg = h * 360
    season_idx = nearest_season(h_deg, l, s)
    season = SEASONS[season_idx]
    neighbor = SEASONS[(season_idx + 1) % len(SEASONS)]

    companions = [
        {"hex": _season_color(season, base_hex, "core1"), "role": "near_face_core"},
        {"hex": _season_color(season, base_hex, "core2"), "role": "near_face_core"},
        {
            "hex": _season_color(neighbor, base_hex, "neighbor"),
            "role": "away_from_face_flexible",
            "note": f"Pulled from {neighbor['name']}, a neighboring season — "
                    f"per Rees, the 12 palettes aren't fully exclusive, so "
                    f"borrowing from next door widens the wardrobe.",
        },
    ]

    # Rule 3: deliberate "rule-breaker" — Rees's own example is black on a
    # Light Spring. Generalized: always offer black/near-black as the
    # expressive outlier, since it sits outside every season's soft/light
    # signature the same way.
    companions.append({
        "hex": "#141414",
        "role": "expressive_accent",
        "note": "Outside this season's natural signature — Rees's own "
                "example is black on a Light Spring. Use it away from the "
                "face (bag, shoe, trouser) or in a small enough dose near "
                "the face (piping, a thin belt) that it reads as a styling "
                "choice rather than a full look.",
    })

    undertone = classify_undertone(h_deg, s)
    neutral = WARDROBE_NEUTRAL["warm" if undertone != "cool" else "cool"]

    return {
        "season": season["name"],
        "undertone": undertone,
        "value": classify_value(l),
        "chroma": classify_chroma(s),
        "companions": companions,
        "wardrobe_neutral": neutral,
    }
