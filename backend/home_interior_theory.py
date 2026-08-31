"""
home_interior_theory.py
========================
Implements the home-interior color rules supplied by the project owner
(derived from "The Color Scheme Bible" and related interior-design
color-theory sources). Original implementation of the supplied rules,
not a reproduction of any book's text.

RULE 1 — Room vibe (psychological goal)
The base color's own saturation/lightness determines whether the palette
leans "subdued" (relaxation — bedrooms, reading nooks) or "energizing"
(active/social — kitchens, family rooms). The app has no room-type input,
so this is inferred from the picked color itself: a muted or very
light/dark color implies a calmer intent; a vivid mid-tone implies an
energizing intent.

RULE 2 — Spatial illusion (approximated)
Cool + light palettes read as space-expanding; warm palettes read as
warming a dim room. This is folded into the warmth classification below
rather than a separate room-size input (no such input exists yet).

RULE 3 — Real-world inspiration anchor
Every result is tagged with one of 4 inspiration lenses (nature, art,
travel, a favorite possession) — deterministic per base color — with a
short flavor line, so results feel grounded rather than abstract.

RULE 4 — Material pairing
Every output color gets a suggested real-world material (wood, stone,
metal, fabric, plaster) based on its hue/lightness/saturation, since
interior colors are always read alongside physical materials.

RULE 5 — Temperature classification + rationale
Warm / cool / neutral tag with a short interior-specific rationale.

RULE 6 — The 6 classic schemes
monochromatic, analogous, complementary, triadic, split_complementary,
rectangular_tetradic. Selected based on Rule 1's energy classification:
subdued -> monochromatic/analogous; energizing -> complementary/triadic/
split_complementary/rectangular_tetradic.
"""

import colorsys
import hashlib

SCHEMES_SUBDUED = ["monochromatic", "analogous"]
SCHEMES_ENERGIZING = ["complementary", "triadic", "split_complementary", "rectangular_tetradic"]

RATIONALE = {
    "warm": "Warm tones read as stimulating and inviting — ideal for social "
            "spaces like kitchens and living rooms, but can feel too intense "
            "for a room meant purely for rest.",
    "cool": "Cool tones read as calming and grounding — well suited to "
            "bedrooms and reading nooks, and can make a small room feel "
            "more open.",
    "neutral": "Neutral tones stay flexible and quiet, letting architectural "
               "materials and furniture carry the room's visual interest.",
}

INSPIRATIONS = {
    "nature": "Inspired by natural landscapes — tones pulled straight from foliage and light.",
    "art": "Inspired by painting — colors translated from canvas to wall.",
    "travel": "Inspired by a regional atmosphere — coastal, Nordic, or sun-warmed tones.",
    "possession": "Inspired by a single anchor piece — a rug, vase, or artwork the room is built around.",
}


def _hls_to_hex(h_deg, l, s):
    h = (h_deg % 360) / 360
    l, s = max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def classify_warmth(h_deg: float, s: float) -> str:
    if s < 0.12:
        return "neutral"
    return "warm" if (h_deg < 75 or h_deg >= 345) else "cool"


def classify_energy(l: float, s: float) -> str:
    """Rule 1: infer the room's intended psychological goal from the color itself."""
    return "energizing" if (s >= 0.45 and 0.3 <= l <= 0.75) else "subdued"


def suggest_material(h_deg: float, l: float, s: float) -> str:
    """Rule 4: pair the color with a plausible real-world material."""
    warm = h_deg < 75 or h_deg >= 345
    if s < 0.15 and l > 0.85:
        return "linen or matte plaster"
    if s < 0.15 and l < 0.25:
        return "raw stone or slate"
    if s < 0.15:
        return "brushed concrete or greige fabric"
    if warm and l < 0.4:
        return "natural oak or walnut wood grain"
    if warm:
        return "brass or warm metallic fixtures"
    if l < 0.4:
        return "dark iron or matte black metal fixtures"
    return "cool-toned textile or ceramic tile"


def _pick(hex_color: str, options: list, salt: str) -> str:
    digest = hashlib.sha256((hex_color + salt).encode()).hexdigest()
    return options[int(digest, 16) % len(options)]


def _scheme_colors(scheme: str, h: float, l: float, s: float) -> list:
    """Returns 4 companion (hue_deg, l, s) tuples for the given scheme.
    Kept within paint-plausible saturation ranges (interiors rarely use
    neon-level saturation the way graphic design or fashion might)."""
    if scheme == "monochromatic":
        return [
            (h, min(0.88, l + 0.3), s * 0.6),
            (h, max(0.12, l - 0.3), s * 0.7),
            (h, min(0.8, l + 0.15), s * 0.4),
            (h, max(0.18, l - 0.15), s * 0.55),
        ]

    if scheme == "analogous":
        return [
            (h + 22, l, s * 0.85),
            (h - 22, l, s * 0.85),
            (h + 10, min(0.85, l + 0.2), s * 0.5),
            (h - 10, max(0.15, l - 0.2), s * 0.6),
        ]

    if scheme == "complementary":
        return [
            (h + 180, l, s * 0.9),                    # accent wall color
            (h, min(0.85, l + 0.3), s * 0.3),          # tint of base
            (h, 0.92, 0.05),                           # near-white neutral
            (h + 180, max(0.15, l - 0.25), s * 0.6),   # deeper complement shade
        ]

    if scheme == "triadic":
        return [
            (h + 120, l, s * 0.7),
            (h + 240, l, s * 0.7),
            (h, min(0.85, l + 0.25), s * 0.4),
            (h, 0.9, 0.08),
        ]

    if scheme == "split_complementary":
        return [
            (h + 150, l, s * 0.75),
            (h + 210, l, s * 0.75),
            (h, min(0.85, l + 0.3), s * 0.3),
            (h, 0.1, 0.05),
        ]

    if scheme == "rectangular_tetradic":
        return [
            (h + 90, l, s * 0.65),
            (h + 180, l, s * 0.75),
            (h + 270, l, s * 0.65),
            (h, min(0.85, l + 0.3), s * 0.3),
        ]

    raise ValueError(scheme)


def _enforce_value_spread(lightness_values: list, min_spread=0.35) -> list:
    """Lighter-touch than graphic design's — interiors often intentionally
    stay close in value for a subdued feel, so we only prevent total
    flatness rather than forcing high contrast."""
    lo, hi = min(lightness_values), max(lightness_values)
    if hi - lo >= min_spread:
        return lightness_values
    lo_idx = lightness_values.index(lo)
    hi_idx = lightness_values.index(hi)
    adjusted = list(lightness_values)
    adjusted[lo_idx] = max(0.08, lo - (min_spread - (hi - lo)) / 2)
    adjusted[hi_idx] = min(0.95, hi + (min_spread - (hi - lo)) / 2)
    return adjusted


def generate_home_interior_palette(base_hex: str, h: float, l: float, s: float, variation: int = 0) -> dict:
    """
    h, l, s are the base color's hue/lightness/saturation as fractions (0-1).
    `variation` (0, 1, 2...) picks a different valid scheme/inspiration for
    the same color — used by the "generate another" button.
    Returns: { scheme, energy, warmth, rationale, inspiration, companions:
               [{hex, material}, x4] }
    """
    h_deg = h * 360
    energy = classify_energy(l, s)
    if s < 0.08:
        # Near-neutral base: hue is effectively undefined, so hue-shifting
        # schemes (analogous, triadic, etc.) would just duplicate the base.
        # A monochromatic (lightness-only) ramp is the only scheme that
        # still produces genuinely distinct companions.
        scheme = "monochromatic"
    else:
        options = SCHEMES_SUBDUED if energy == "subdued" else SCHEMES_ENERGIZING
        scheme = _pick(base_hex, options, salt=f"scheme:{variation}")
    inspiration = _pick(base_hex, list(INSPIRATIONS.keys()), salt=f"inspiration:{variation}")

    raw = _scheme_colors(scheme, h_deg, l, s)
    all_lightness = [l] + [ll for _, ll, _ in raw]
    adjusted_lightness = _enforce_value_spread(all_lightness)

    companions = []
    for i, (hh, ll, ss) in enumerate(raw):
        final_l = adjusted_lightness[i + 1]
        hexc = _hls_to_hex(hh, final_l, ss)
        companions.append({"hex": hexc, "material": suggest_material(hh % 360, final_l, ss)})

    warmth = classify_warmth(h_deg, s)
    return {
        "scheme": scheme,
        "energy": energy,
        "warmth": warmth,
        "rationale": RATIONALE[warmth],
        "inspiration": {"lens": inspiration, "note": INSPIRATIONS[inspiration]},
        "companions": companions,
    }