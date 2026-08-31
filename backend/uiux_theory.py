"""
uiux_theory.py
===============
Implements the UI/UX color rules supplied by the project owner (derived
from UXPin's "Color Theory in Web UI Design", which I read in full — it's
freely published by UXPin — plus additional UX-application rules the
owner supplied directly). Original implementation, not a reproduction of
the source text.

RULE 1 — Background strategy drives emotional persona
The base color's warmth decides the background approach: warm+vivid needs
a caution flag (risks being too stimulating unless the product genuinely
wants playful/high-energy), cool colors can safely serve as the primary
background/brand tone (trust), and low-saturation colors default to a
minimalist grayscale-led background.

RULE 2 — The CTA "sting" rule (mandatory, scheme-independent)
Every result includes one dedicated high-saturation contrast color roughly
90° from the base — used for the call-to-action, following the "colors ~3
steps apart on the wheel clash usefully" rule. This exists regardless of
which of the 6 schemes below is chosen.

RULE 3 — 6 schemes, each with an explicit functional role assignment
(not just hue geometry) — dominant/secondary/background/text roles are
assigned per the UX guidance supplied, e.g. triadic's "make the calm hue
dominant, reserve the warm hue to signal clickability."

RULE 4 — Gray as the UI utility player
A short guidance note on shifting the neutral gray's shade for different
UI micro-states (disabled, secondary text, hover, dividers).

RULE 5 — Standardized technical values
Every output color includes hex, rgb, and hsl — not just a bare hex —
since "umbrella color terms fail in production."
"""

import colorsys
import hashlib

SCHEMES = [
    "monochromatic", "analogous", "complementary",
    "triadic", "split_complementary", "rectangular_tetradic",
]

GRAY_UTILITY_NOTE = (
    "Shift this gray lighter for disabled states and dividers, or darker "
    "for secondary text and hover states — one hue, several UI micro-states."
)


def _hls_to_hex(h_deg, l, s):
    h = (h_deg % 360) / 360
    l, s = max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def _technical(h_deg, l, s):
    hexc = _hls_to_hex(h_deg, l, s)
    r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    return {
        "hex": hexc,
        "rgb": f"rgb({r}, {g}, {b})",
        "hsl": f"hsl({round(h_deg % 360)}, {round(max(0,min(1,s)) * 100)}%, {round(max(0,min(1,l)) * 100)}%)",
    }


def classify_warmth(h_deg: float, s: float) -> str:
    if s < 0.12:
        return "neutral"
    return "warm" if (h_deg < 75 or h_deg >= 345) else "cool"


def background_strategy(h_deg: float, l: float, s: float) -> dict:
    """Rule 1: background approach + caution, based on base color warmth."""
    warmth = classify_warmth(h_deg, s)
    if warmth == "warm" and s >= 0.5 and 0.3 <= l <= 0.75:
        return {
            "strategy": "warm_vivid_caution",
            "note": "This color is stimulating — great for a playful or "
                    "youth-oriented product, but risky as a full background "
                    "if the interface needs to feel calm. Consider using it "
                    "as an accent instead of the literal page background.",
        }
    if warmth == "cool":
        return {
            "strategy": "cool_trust",
            "note": "Cool tones read as safe and professional — this color "
                    "can serve directly as the primary background/brand tone.",
        }
    return {
        "strategy": "minimalist_grayscale",
        "note": "Low saturation suggests a minimalist, content-forward "
                "interface — lean on the generated neutrals for background "
                "and let this color carry brand accents instead.",
    }


def _pick_scheme(hex_color: str, variation: int = 0) -> str:
    digest = hashlib.sha256(f"{hex_color}:{variation}".encode()).hexdigest()
    return SCHEMES[int(digest, 16) % len(SCHEMES)]


def _scheme_companions(scheme: str, h: float, l: float, s: float) -> list:
    """Returns 4 (hue_deg, l, s, role) tuples."""
    if scheme == "monochromatic":
        return [
            (h, min(0.85, l + 0.3), s * 0.5, "background_tint"),
            (h, max(0.15, l - 0.3), s * 0.6, "nav_shade"),
            (h, min(0.8, l + 0.15), s * 0.35, "button_shade"),
            (h, 0.95, 0.03, "surface_neutral"),
        ]

    if scheme == "analogous":
        return [
            (h + 25, l, s * 0.85, "secondary_structure"),
            (h - 25, l, s * 0.6, "tertiary_accent"),
            (h, min(0.88, l + 0.3), s * 0.2, "background"),
            (h, 0.1, 0.05, "text_dark"),
        ]

    if scheme == "complementary":
        return [
            (h + 180, l, s, "secondary"),               # kept saturated, per rule
            (h, min(0.88, l + 0.35), s * 0.15, "background"),
            (h, 0.08, 0.05, "text_dark"),
            (h + 180, max(0.15, l - 0.2), s * 0.7, "secondary_shade"),
        ]

    if scheme == "triadic":
        hue_a, hue_b = h + 120, h + 240
        # closer to red (0deg/360deg) = the "signals clickability" hue
        dist_a = min(abs(hue_a % 360), 360 - abs(hue_a % 360))
        dist_b = min(abs(hue_b % 360), 360 - abs(hue_b % 360))
        calm_hue, click_hue = (hue_a, hue_b) if dist_a > dist_b else (hue_b, hue_a)
        return [
            (calm_hue, l, s * 0.5, "dominant_calm"),
            (click_hue, l, s * 0.85, "signals_clickability"),
            (h, min(0.88, l + 0.3), s * 0.2, "background"),
            (h, 0.9, 0.05, "surface_neutral"),
        ]

    if scheme == "split_complementary":
        # "Splash Technique": dominant near-black/near-white + one sparing accent
        return [
            (h, 0.05, 0.02, "text_near_black"),
            (h, 0.95, 0.03, "background_near_white"),
            (h + 150, l, s * 0.9, "splash_accent"),
            (h + 210, l, s * 0.35, "secondary_muted"),
        ]

    if scheme == "rectangular_tetradic":
        # base stays the one fully-saturated "powerful" color; companions
        # tempered down so they don't compete for dominance
        return [
            (h + 90, l, s * 0.5, "secondary_a"),
            (h + 180, l, s * 0.55, "secondary_b"),
            (h + 270, l, s * 0.5, "secondary_c"),
            (h, min(0.88, l + 0.3), s * 0.2, "background"),
        ]

    raise ValueError(scheme)


def _cta_color(h_deg: float, existing_hues: list) -> tuple:
    """Rule 2: mandatory ~90deg contrast color for CTAs, nudged to +90 or
    -90 (whichever sits further from every color already in the palette)."""
    def min_dist(candidate):
        return min(min(abs(candidate - e), 360 - abs(candidate - e)) for e in existing_hues) if existing_hues else 999

    plus = (h_deg + 90) % 360
    minus = (h_deg - 90) % 360
    chosen = plus if min_dist(plus) >= min_dist(minus) else minus
    return chosen, 0.55, 0.8  # bright, high-saturation for visibility


def generate_uiux_palette(base_hex: str, h: float, l: float, s: float, variation: int = 0) -> dict:
    """
    h, l, s are the base color's hue/lightness/saturation as fractions (0-1).
    `variation` (0, 1, 2...) picks a different valid scheme for the same
    color — used by the "generate another" button.
    Returns: { scheme, warmth, background, gray_utility_note,
               companions: [{hex, rgb, hsl, role}, x4],
               cta: {hex, rgb, hsl, role} }
    """
    h_deg = h * 360
    scheme = _pick_scheme(base_hex, variation)
    raw = _scheme_companions(scheme, h_deg, l, s)

    companions = []
    for hh, ll, ss, role in raw:
        tech = _technical(hh, ll, ss)
        tech["role"] = role
        companions.append(tech)

    existing_hues = [h_deg] + [hh for hh, _, _, _ in raw]
    cta_h, cta_l, cta_s = _cta_color(h_deg, existing_hues)
    cta = _technical(cta_h, cta_l, cta_s)
    cta["role"] = "cta_contrast"

    warmth = classify_warmth(h_deg, s)
    return {
        "scheme": scheme,
        "warmth": warmth,
        "background": background_strategy(h_deg, l, s),
        "gray_utility_note": GRAY_UTILITY_NOTE,
        "companions": companions,
        "cta": cta,
    }