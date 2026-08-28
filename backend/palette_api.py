"""
palette_api.py
===============
FastAPI backend for the real website. Wraps the trained MLP
(palette_model.joblib) behind two endpoints:

  POST /extract-colors
    form fields: image (file)
    returns: candidate colors found in the image, to fill the "colors
    extracted from the image" swatch row in the UI.
    returns: { "colors": ["#RRGGBB", ...] }

  POST /generate-palette
    form fields: category (required), base_color (required, hex string —
    whichever swatch the user picked from /extract-colors)
    returns: { "base_color": "#RRGGBB", "palette": ["#RRGGBB", ... x6] }

Frontend flow:
  1. User uploads an image -> call /extract-colors -> fill the swatch row.
  2. User clicks one swatch -> call /generate-palette with that hex as
     base_color + the chosen category.

Run locally:
    pip install -r requirements.txt
    uvicorn palette_api:app --reload
"""

import colorsys
import io

import joblib
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from sklearn.cluster import KMeans

MODEL_PATH = "palette_model.joblib"
CATEGORIES = ["uiux", "graphic_design", "home_interior", "fashion"]

# A 6th, deterministic "utility" color per category — the trained model predicts
# 4 companions from real data; this anchor color rounds the set out to 6 and
# covers a practical need (dark/light anchor) every one of these categories has.
# See utility_color() below.

app = FastAPI(title="Palette AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your actual website domain before going live
    allow_methods=["*"],
    allow_headers=["*"],
)

bundle = joblib.load(MODEL_PATH)
model = bundle["model"]


# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

def hls_to_hex(h, l, s):
    h, l, s = h % 1.0, max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def rgb_to_hls(rgb):
    r, g, b = [c / 255 for c in rgb]
    return colorsys.rgb_to_hls(r, g, b)


def hex_to_rgb(hex_color: str) -> tuple:
    hex_color = hex_color.strip().lstrip("#")
    if len(hex_color) != 6:
        raise ValueError("invalid hex color")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def utility_color(base_h, category):
    """Deterministic 6th anchor color, tailored per category."""
    if category == "uiux":
        return hls_to_hex(base_h, 0.55, 0.05)       # neutral gray
    if category == "graphic_design":
        return hls_to_hex(base_h, 0.12, 0.3)        # near-black ink
    if category == "home_interior":
        return hls_to_hex(base_h, 0.92, 0.1)        # off-white neutral
    if category == "fashion":
        return hls_to_hex(base_h, 0.08, 0.05)       # black
    raise ValueError(category)


# ---------------------------------------------------------------------------
# Dominant color extraction (K-Means)
# ---------------------------------------------------------------------------

def extract_candidate_colors(image_bytes: bytes, k: int = 5, sample_size: int = 150) -> list:
    """All k cluster centers, sorted by how much of the image they cover —
    fills the 'colors extracted from the image' swatch row in the frontend."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((sample_size, sample_size))
    pixels = np.array(img).reshape(-1, 3).astype(float)

    brightness = pixels.mean(axis=1)
    mask = (brightness > 15) & (brightness < 240)
    filtered = pixels[mask] if mask.sum() > k * 10 else pixels

    kmeans = KMeans(n_clusters=k, n_init=4, random_state=42)
    labels = kmeans.fit_predict(filtered)
    counts = np.bincount(labels)
    order = np.argsort(-counts)  # largest cluster first
    return [tuple(int(v) for v in kmeans.cluster_centers_[i]) for i in order]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract-colors")
async def extract_colors(image: UploadFile = File(...)):
    """Returns candidate colors from the image for a swatch picker."""
    image_bytes = await image.read()
    try:
        candidates = extract_candidate_colors(image_bytes)
    except Exception:
        raise HTTPException(400, "Could not read image file")

    hexes = [hls_to_hex(*rgb_to_hls(rgb)) for rgb in candidates]
    return {"colors": hexes}


@app.post("/generate-palette")
async def generate_palette(
    category: str = Form(...),
    base_color: str = Form(...),
):
    if category not in CATEGORIES:
        raise HTTPException(400, f"category must be one of {CATEGORIES}")

    try:
        base_rgb = hex_to_rgb(base_color)
    except ValueError:
        raise HTTPException(400, "base_color must be a hex string like #3E8E7E")

    h, l, s = rgb_to_hls(base_rgb)
    onehot = [1.0 if c == category else 0.0 for c in CATEGORIES]
    pred = model.predict([[h, l, s] + onehot])[0]

    companions = [hls_to_hex(pred[i], pred[i + 1], pred[i + 2]) for i in range(0, 12, 3)]
    base_hex = hls_to_hex(h, l, s)
    sixth = utility_color(h, category)

    return {
        "base_color": base_hex,
        "category": category,
        "palette": [base_hex] + companions + [sixth],
    }
