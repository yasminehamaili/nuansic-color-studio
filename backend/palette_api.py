"""
palette_api.py
===============
FastAPI backend for the website — no color dataset, no retrieval, no
trained regression model. Every palette comes from the four rule-based
color-theory modules (graphic_design_theory, uiux_theory,
home_interior_theory, fashion_theory), each derived from the source
material you supplied.

Endpoints:
  POST /extract-colors   (image)                -> { colors: [hex, ...] }
  POST /generate-palette (base_color, category)  -> { base_color, category,
                                                        summary: {...},
                                                        palette: [
                                                          { hex, label, note? }, ...
                                                        ] }

`summary` carries the domain-specific reasoning (archetype/scheme/season,
warmth, rationale, etc.) for a "why this palette" tooltip. `palette`
always starts with the base color itself (label: "Base — your pick"),
followed by however many rule-driven companions that category's rules
produce (5 for graphic_design/home_interior/fashion, 6 for uiux since its
CTA-contrast rule adds one more).

Run locally:
    pip install -r requirements.txt
    uvicorn palette_api:app --reload
"""

import colorsys
import hashlib
import io
from datetime import date

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from sklearn.cluster import KMeans

from graphic_design_theory import generate_graphic_design_palette
from home_interior_theory import generate_home_interior_palette
from uiux_theory import generate_uiux_palette
from fashion_theory import generate_fashion_palette

CATEGORIES = ["uiux", "graphic_design", "home_interior", "fashion"]

app = FastAPI(title="Palette AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your actual website domain before going live
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

def hex_to_rgb(hex_color: str) -> tuple:
    hex_color = hex_color.strip().lstrip("#")
    if len(hex_color) != 6:
        raise ValueError("invalid hex color")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def hls_to_hex(h, l, s):
    h, l, s = h % 1.0, max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def rgb_to_hls(rgb):
    r, g, b = [c / 255 for c in rgb]
    return colorsys.rgb_to_hls(r, g, b)


# ---------------------------------------------------------------------------
# Normalize each domain module's distinct shape into a common
# { summary, palette: [{hex, label, note?}, ...] } contract
# ---------------------------------------------------------------------------

def _title(s: str) -> str:
    return s.replace("_", " ").title()


def build_response(base_hex: str, category: str, h: float, l: float, s: float, variation: int = 0) -> dict:
    palette = [{"hex": base_hex, "label": "Base — your pick"}]

    if category == "graphic_design":
        result = generate_graphic_design_palette(base_hex, h, l, s, variation)
        for c in result["companions"]:
            palette.append({"hex": c["hex"], "label": c["label"]})
        summary = {
            "archetype": _title(result["archetype"]),
            "warmth": result["warmth"],
            "rationale": result["rationale"],
        }

    elif category == "home_interior":
        result = generate_home_interior_palette(base_hex, h, l, s, variation)
        for c in result["companions"]:
            palette.append({"hex": c["hex"], "label": _title(c["material"])})
        summary = {
            "scheme": _title(result["scheme"]),
            "energy": result["energy"],
            "warmth": result["warmth"],
            "rationale": result["rationale"],
            "inspiration": result["inspiration"]["note"],
        }

    elif category == "uiux":
        result = generate_uiux_palette(base_hex, h, l, s, variation)
        for c in result["companions"]:
            palette.append({"hex": c["hex"], "label": _title(c["role"])})
        palette.append({"hex": result["cta"]["hex"], "label": "CTA / Call-to-action"})
        summary = {
            "scheme": _title(result["scheme"]),
            "warmth": result["warmth"],
            "background_strategy": _title(result["background"]["strategy"]),
            "rationale": result["background"]["note"],
            "gray_utility_note": result["gray_utility_note"],
        }

    elif category == "fashion":
        result = generate_fashion_palette(base_hex, h, l, s, variation)
        for c in result["companions"]:
            entry = {"hex": c["hex"], "label": _title(c["role"])}
            if "note" in c:
                entry["note"] = c["note"]
            palette.append(entry)
        palette.append({"hex": result["wardrobe_neutral"], "label": "Wardrobe neutral"})
        summary = {
            "season": result["season"],
            "undertone": result["undertone"],
            "value": result["value"],
            "chroma": result["chroma"],
        }

    else:
        raise HTTPException(400, f"category must be one of {CATEGORIES}")

    # De-duplicate labels within a palette (e.g. home_interior's material
    # buckets can coincide) so the UI never shows the same caption twice.
    seen = {}
    for entry in palette:
        label = entry["label"]
        seen[label] = seen.get(label, 0) + 1
        if seen[label] > 1:
            entry["label"] = f"{label} ({seen[label]})"

    return {"base_color": base_hex, "category": category, "summary": summary, "palette": palette}


# ---------------------------------------------------------------------------
# Dominant color extraction (K-Means) — for filling the "colors extracted
# from the image" swatch row
# ---------------------------------------------------------------------------

def extract_candidate_colors(image_bytes: bytes, k: int = 6, sample_size: int = 150) -> list:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((sample_size, sample_size))
    pixels = np.array(img).reshape(-1, 3).astype(float)

    brightness = pixels.mean(axis=1)
    mask = (brightness > 15) & (brightness < 240)
    filtered = pixels[mask] if mask.sum() > k * 10 else pixels

    kmeans = KMeans(n_clusters=k, n_init=4, random_state=42)
    labels = kmeans.fit_predict(filtered)
    counts = np.bincount(labels)
    order = np.argsort(-counts)
    return [tuple(int(v) for v in kmeans.cluster_centers_[i]) for i in order]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def _color_for_date(date_str: str) -> str:
    """Deterministic per-day color: same all day, changes at midnight."""
    digest = hashlib.sha256(date_str.encode()).hexdigest()
    hue = int(digest[:8], 16) % 360
    s = 0.5 + (int(digest[8:10], 16) % 30) / 100    # 0.50-0.79
    l = 0.42 + (int(digest[10:12], 16) % 24) / 100  # 0.42-0.65
    return hls_to_hex(hue / 360, l, s)


def _headline_for(category: str, h: float, l: float, s: float) -> dict:
    """One-line 'what this color does in this domain' summary. Kept as a
    single dash-free sentence for the Color of the Day card (the fuller,
    dash-containing rationale is still used elsewhere in /generate-palette)."""
    if category == "graphic_design":
        r = generate_graphic_design_palette("#000000", h, l, s)
        detail = {
            "warm": "Reads as energizing and optimistic, drawing on associations built over thousands of years of human use.",
            "cool": "Reads as calm and trustworthy, suited to a design that needs to feel composed rather than urgent.",
            "neutral": "Carries little emotional charge on its own, leaving room for a single accent to do the persuading.",
        }[r["warmth"]]
        return {"headline": _title(r["archetype"]), "detail": detail}

    if category == "uiux":
        r = generate_uiux_palette("#000000", h, l, s)
        detail = {
            "warm_vivid_caution": "Stimulating enough to suit a playful product, though risky as a full background if the interface needs to feel calm.",
            "cool_trust": "Reads as safe and professional, so it can serve directly as the primary background or brand tone.",
            "minimalist_grayscale": "Low saturation suggests a minimalist, content forward interface built around neutrals.",
        }[r["background"]["strategy"]]
        return {"headline": f"{_title(r['scheme'])} scheme", "detail": detail}

    if category == "home_interior":
        r = generate_home_interior_palette("#000000", h, l, s)
        article = "an" if r["energy"].startswith(("a", "e", "i", "o", "u")) else "a"
        detail = {
            "warm": "Stimulating and inviting, best suited to a social space rather than a room meant purely for rest.",
            "cool": "Calming and grounding, well suited to a bedroom or reading nook.",
            "neutral": "Flexible and quiet, letting materials and furniture carry the room's visual interest.",
        }[r["warmth"]]
        return {"headline": f"{_title(r['scheme'])}, for {article} {r['energy']} room", "detail": detail}

    if category == "fashion":
        r = generate_fashion_palette("#000000", h, l, s)
        detail = f"A {r['undertone']} toned, {r['value']} value, {r['chroma']} chroma color family."
        return {"headline": r["season"], "detail": detail}

    raise ValueError(category)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/color-of-the-day")
def color_of_the_day():
    today = date.today().isoformat()
    base_hex = _color_for_date(today)
    h, l, s = rgb_to_hls(hex_to_rgb(base_hex))

    entries = {cat: _headline_for(cat, h, l, s) for cat in CATEGORIES}
    return {"date": today, "color": base_hex, "entries": entries}


@app.post("/extract-colors")
async def extract_colors(image: UploadFile = File(...)):
    image_bytes = await image.read()
    try:
        candidates = extract_candidate_colors(image_bytes, k=6)
    except Exception:
        raise HTTPException(400, "Could not read image file")

    hexes = [hls_to_hex(*rgb_to_hls(rgb)) for rgb in candidates]
    return {"colors": hexes}


@app.post("/generate-palette")
async def generate_palette(
    category: str = Form(...),
    base_color: str = Form(...),
    variation: int = Form(0),
):
    if category not in CATEGORIES:
        raise HTTPException(400, f"category must be one of {CATEGORIES}")

    try:
        base_rgb = hex_to_rgb(base_color)
    except ValueError:
        raise HTTPException(400, "base_color must be a hex string like #3E8E7E")

    h, l, s = rgb_to_hls(base_rgb)
    base_hex = hls_to_hex(h, l, s)

    return build_response(base_hex, category, h, l, s, variation)