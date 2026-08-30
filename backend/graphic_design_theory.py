"""
graphic_design_theory.py
=========================
Implements the graphic-design color rules derived from Sean Adams'
"The Designer's Dictionary of Color" (rules supplied directly by the
project owner, who owns the book — this is an original implementation of
those rules, not a reproduction of the book's text).

RULE 1 — The 5-Palette Archetype Framework
Every focal color gets one of 5 archetype treatments, each with a distinct
aesthetic purpose:
  1. analogous_monochromatic  — cohesive, warm, comforting (adjacent hues +
     same-family tint/shade)
  2. high_contrast_polychromatic — vibrant, high-energy (complementary /
     split-complementary spread, kept saturated)
  3. focus_grayscale          — sophisticated/editorial (vibrant focal +
     muted neutrals: gray, charcoal, near-black, off-white)
  4. soft_pastel_tint         — nostalgic, gentle (light desaturated tints,
     analogous spread)
  5. jewel_unexpected         — dramatic, sophisticated (deep saturated
     jewel/earth tones, wider dissonant hue jumps)

Archetype choice is deterministic per base color (hash of the hex) so the
same picked color always gets the same archetype — reproducible, but varies
naturally across different picked colors.

RULE 2 — Mnemonic "in-between" colors
Adams: avoid landing on textbook primary/secondary wheel positions; prefer
memorable "in-between" hues (butter, mint, peach, fuchsia, turquoise,
coral, ochre, olive) because a color that takes a moment to categorize is
more memorable. Computed hues are snapped to a nearby named anchor when one
is close enough.

RULE 3 — Cultural/psychological rationale
Every result includes a short rationale grounded in documented color
psychology (not a bare "nice"/"bright" label) — required per Adams: "your
design is 90% persuasion."

RULE 4 — Classify by creative category, not the academic wheel
Every color is tagged warm / cool / neutral (specialty fluorescent/metallic
is approximated as a flag, not a distinct render — flat hex can't truly
represent metallics/fluorescents).

RULE 5 — Value contrast / tonal depth
After generating an archetype's 4 companions, the full 5-color set (base +
4) is checked for lightness spread; if too clustered, the lightest and
darkest are pushed further apart so text/hierarchy stay legible — this is
enforced explicitly, not left to chance.
"""

import colorsys
import hashlib

# Named "in-between" hue anchors (degrees) Adams calls out as memorable
MNEMONIC_ANCHORS = {
    "butter": 50, "peach": 27, "coral": 12, "ochre": 42, "olive": 65,
    "mint": 155, "turquoise": 178, "fuchsia": 312,
}
SNAP_THRESHOLD_DEG = 15

ARCHETYPES = [
    "analogous_monochromatic",
    "high_contrast_polychromatic",
    "focus_grayscale",
    "soft_pastel_tint",
    "jewel_unexpected",
]

RATIONALE = {
    "warm": "Warm hues (reds, oranges, yellows) read as energizing and "
            "optimistic — associations built over thousands of years of "
            "human use, from fire and harvest to appetite and urgency.",
    "cool": "Cool hues (blues, greens, purples) read as calm, trustworthy, "
            "or reflective — commonly used where a design needs to feel "
            "composed rather than urgent.",
    "neutral": "Neutrals (grays, near-blacks, off-whites) carry little "
               "emotional charge on their own, which is exactly their "
               "value: they let a single accent color do the persuading "
               "without competing for attention.",
}


def _snap_hue(h_deg: float) -> float:
    h_deg = h_deg % 360
    for anchor_deg in MNEMONIC_ANCHORS.values():
        diff = min(abs(h_deg - anchor_deg), 360 - abs(h_deg - anchor_deg))
        if diff <= SNAP_THRESHOLD_DEG:
            return anchor_deg
    return h_deg


def _hls_to_hex(h_deg, l, s):
    h = (h_deg % 360) / 360
    l, s = max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def classify_warmth(h_deg: float, s: float) -> str:
    """Rule 4: warm / cool / neutral, by creative convention not physics."""
    if s < 0.12:
        return "neutral"
    return "warm" if (h_deg < 75 or h_deg >= 345) else "cool"


def _pick_archetype(hex_color: str) -> str:
    digest = hashlib.sha256(hex_color.encode()).hexdigest()
    return ARCHETYPES[int(digest, 16) % len(ARCHETYPES)]


def _archetype_colors(archetype: str, h: float, l: float, s: float) -> list:
    """Returns 4 (hue_deg, l, s, label) tuples for the given archetype."""
    if archetype == "analogous_monochromatic":
        return [
            (h + 28, l, s * 0.9, "Analogous +"),
            (h - 28, l, s * 0.9, "Analogous -"),
            (h + 8, max(0.15, l - 0.28), s * 0.75, "Earthy shade"),
            (h - 5, min(0.85, l + 0.25), s * 0.5, "Light tint"),
        ]

    if archetype == "high_contrast_polychromatic":
        return [
            (h + 150, 0.58, max(0.75, s), "Contrast 1"),
            (h + 180, 0.55, max(0.8, s), "Complement"),
            (h + 210, 0.6, max(0.75, s), "Contrast 2"),
            (h + 60, 0.62, max(0.8, s), "Bright accent"),
        ]

    if archetype == "focus_grayscale":
        return [
            (h, l, s * 0.08, "Cool gray"),
            (h, 0.22, s * 0.05, "Charcoal"),
            (h, 0.09, s * 0.03, "Near-black"),
            (h, 0.95, s * 0.04, "Off-white"),
        ]

    if archetype == "soft_pastel_tint":
        return [
            (h, 0.82, s * 0.35, "Pastel tint"),
            (h + 25, 0.85, s * 0.3, "Pastel warm"),
            (h - 25, 0.85, s * 0.3, "Pastel cool"),
            (h + 50, 0.88, s * 0.28, "Pastel light"),
        ]

    if archetype == "jewel_unexpected":
        return [
            (h + 90, 0.3, max(0.75, s * 0.9), "Jewel tone 1"),
            (h + 180, 0.28, max(0.75, s * 0.85), "Jewel tone 2"),
            (h + 250, 0.32, max(0.7, s * 0.8), "Jewel tone 3"),
            (h + 40, 0.22, max(0.65, s * 0.7), "Deep accent"),
        ]

    raise ValueError(archetype)


def _enforce_value_spread(lightness_values: list, min_spread=0.55) -> list:
    """Rule 5: if the full palette's lightness values are too clustered,
    push the lightest and darkest further apart."""
    lo, hi = min(lightness_values), max(lightness_values)
    if hi - lo >= min_spread:
        return lightness_values
    lo_idx = lightness_values.index(lo)
    hi_idx = lightness_values.index(hi)
    adjusted = list(lightness_values)
    adjusted[lo_idx] = max(0.06, lo - (min_spread - (hi - lo)) / 2)
    adjusted[hi_idx] = min(0.96, hi + (min_spread - (hi - lo)) / 2)
    return adjusted


def generate_graphic_design_palette(base_hex: str, h: float, l: float, s: float) -> dict:
    """
    h, l, s are the base color's hue/lightness/saturation as fractions
    (0-1), matching Python's colorsys convention.
    Returns: { archetype, warmth, rationale, companions: [{hex, label}, x4] }
    """
    h_deg = h * 360
    archetype = _pick_archetype(base_hex)
    raw = _archetype_colors(archetype, h_deg, l, s)

    # Rule 2: snap each companion hue toward a nearby mnemonic anchor
    snapped = [(_snap_hue(hh), ll, ss, label) for hh, ll, ss, label in raw]

    # Rule 5: enforce value spread across base + 4 companions
    all_lightness = [l] + [ll for _, ll, _, _ in snapped]
    adjusted_lightness = _enforce_value_spread(all_lightness)
    companions = [
        {"hex": _hls_to_hex(hh, adjusted_lightness[i + 1], ss), "label": label}
        for i, (hh, ll, ss, label) in enumerate(snapped)
    ]

    warmth = classify_warmth(h_deg, s)
    return {
        "archetype": archetype,
        "warmth": warmth,
        "rationale": RATIONALE[warmth],
        "companions": companions,
    }
