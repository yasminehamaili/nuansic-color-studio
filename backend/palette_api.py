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
                                                        ],
                                                        credits: { remaining, max } }

`summary` carries the domain-specific reasoning (archetype/scheme/season,
warmth, rationale, etc.) for a "why this palette" tooltip. `palette`
always starts with the base color itself (label: "Base — your pick"),
followed by however many rule-driven companions that category's rules
produce (5 for graphic_design/home_interior/fashion, 6 for uiux since its
CTA-contrast rule adds one more).

`credits` reflects the daily generation quota (separate from the
ai_credits pool spent on saving palettes) -- see generation_quota in
Supabase and consume_generation_credit().

Run locally:
    pip install -r requirements.txt
    uvicorn palette_api:app --reload
"""

import colorsys
import hashlib
import io
import os
from datetime import date

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from sklearn.cluster import KMeans
from supabase import create_client, Client

from graphic_design_theory import generate_graphic_design_palette
from home_interior_theory import generate_home_interior_palette
from uiux_theory import generate_uiux_palette
from fashion_theory import generate_fashion_palette

CATEGORIES = ["uiux", "graphic_design", "home_interior", "fashion"]

# Comma-separated list of allowed origins, e.g.
#   ALLOWED_ORIGINS=https://nuansic.com,https://www.nuansic.com
# Defaults to common local dev ports so nothing breaks locally, but this
# MUST be set to the real deployed frontend domain(s) in production --
# "*" (allow everything) means any website on the internet can call this
# API from a visitor's browser, not just yours.
_allowed = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _allowed.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://localhost:5173",
]

app = FastAPI(title="Palette AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    # Baseline hardening headers -- cheap to add, and cover the "add
    # security headers" / "force HTTPS" items from a standard pre-launch
    # checklist. HSTS only makes sense once you're actually served over
    # HTTPS (which Railway/Render/Fly.io give you by default) -- it tells
    # browsers to never fall back to plain HTTP for this host again.
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


# ---------------------------------------------------------------------------
# Minimal in-process rate limiting.
# ---------------------------------------------------------------------------
# This is a real but modest defense: it stops one client from hammering
# /extract-colors (the CPU-heavy K-Means endpoint) or /generate-palette in a
# tight loop, without adding an external dependency (Redis, slowapi, etc).
# It is NOT a substitute for edge/CDN-level protection (Cloudflare and most
# hosts offer this) if the app gets real abuse traffic or DDoS attempts --
# that operates before requests even reach this process, and also isn't
# reset by a server restart the way this in-memory counter is. Consider it
# a floor, not a ceiling.
import time
from collections import defaultdict

_RATE_LIMIT = 30          # requests
_RATE_WINDOW_SECONDS = 60
_request_log: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit(request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    window_start = now - _RATE_WINDOW_SECONDS

    log = _request_log[client_ip]
    while log and log[0] < window_start:
        log.pop(0)

    if len(log) >= _RATE_LIMIT:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            {"detail": "Too many requests, slow down."},
            status_code=429,
        )

    log.append(now)
    return await call_next(request)

# Hard cap on uploaded image size (bytes) -- without this, nothing stops
# someone from posting a huge file to /extract-colors over and over and
# tying up server memory/CPU. 10 MB is generous for a photo used for color
# sampling.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


# ---------------------------------------------------------------------------
# Daily generation quota (Supabase-backed)
# ---------------------------------------------------------------------------
# Separate from ai_credits (spent on SAVING a palette, see create_palette()
# in the frontend). This gates GENERATION itself: 3/day for anonymous
# visitors, 10/day for signed-in users, resetting once per calendar day.
#
# Uses the service-role key -- never expose this to the browser. It's the
# same trust level as any other admin-only backend credential.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

_supabase_admin: Client | None = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    _supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

ANON_DEVICE_MAX_CREDITS = 3
USER_MAX_CREDITS = 10
# Generous ceiling on total generations per IP per day, regardless of how
# many device ids show up behind it -- a backstop against someone
# scripting "clear storage, generate, repeat," not a per-person limit.
ANON_IP_MAX_CREDITS = 30


def _client_ip(request: Request) -> str:
    # Most hosts (Railway/Render/Fly.io) sit behind a proxy that sets this;
    # fall back to the direct connection if it's absent.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _consume(owner_type: str, owner_key: str, max_credits: int) -> tuple[bool, int]:
    if _supabase_admin is None:
        # Quota system not configured (e.g. local dev without Supabase
        # env vars) -- fail open rather than breaking generation entirely.
        return True, max_credits
    result = _supabase_admin.rpc(
        "consume_generation_credit",
        {"p_owner_type": owner_type, "p_owner_key": owner_key, "p_max_credits": max_credits},
    ).execute()
    row = result.data[0]
    return row["allowed"], row["credits_remaining"]


async def check_generation_quota(request: Request, authorization: str | None, x_device_id: str | None) -> dict:
    """Raises HTTPException(429) if the caller is out of credits for today.
    Returns {"remaining": int, "max": int} for the identity that was
    actually checked, so the response can show a live badge."""

    user_id = None
    if authorization and authorization.lower().startswith("bearer ") and _supabase_admin is not None:
        token = authorization.split(" ", 1)[1]
        try:
            user_id = _supabase_admin.auth.get_user(token).user.id
        except Exception:
            user_id = None  # invalid/expired token -- treat as anonymous

    if user_id:
        allowed, remaining = _consume("user", user_id, USER_MAX_CREDITS)
        if not allowed:
            raise HTTPException(429, "Daily generation limit reached. More credits in 24h.")
        return {"remaining": remaining, "max": USER_MAX_CREDITS}

    # Anonymous: IP backstop first (cheap reject for scripted abuse),
    # then the per-device quota that actually drives the UI badge.
    ip = _client_ip(request)
    ip_allowed, _ = _consume("ip", ip, ANON_IP_MAX_CREDITS)
    if not ip_allowed:
        raise HTTPException(429, "Too many generations from this network today.")

    device_key = x_device_id or ip  # no device id header -> fall back to IP-keyed quota
    allowed, remaining = _consume("device", device_key, ANON_DEVICE_MAX_CREDITS)
    if not allowed:
        raise HTTPException(429, "Daily generation limit reached. Sign in for more credits, or wait 24h.")
    return {"remaining": remaining, "max": ANON_DEVICE_MAX_CREDITS}


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
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(400, "Only JPEG, PNG, or WEBP images are accepted")

    image_bytes = await image.read()
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image too large (10MB max)")

    try:
        candidates = extract_candidate_colors(image_bytes, k=6)
    except Exception:
        raise HTTPException(400, "Could not read image file")

    hexes = [hls_to_hex(*rgb_to_hls(rgb)) for rgb in candidates]
    return {"colors": hexes}


@app.post("/generate-palette")
async def generate_palette(
    request: Request,
    category: str = Form(...),
    base_color: str = Form(...),
    variation: int = Form(0),
    authorization: str | None = Header(default=None),
    x_device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    if category not in CATEGORIES:
        raise HTTPException(400, f"category must be one of {CATEGORIES}")

    # Real enforcement lives here -- this is the actual gate, not the
    # frontend button state, so it can't be skipped by calling this
    # endpoint directly.
    credits = await check_generation_quota(request, authorization, x_device_id)

    try:
        base_rgb = hex_to_rgb(base_color)
    except ValueError:
        raise HTTPException(400, "base_color must be a hex string like #3E8E7E")

    h, l, s = rgb_to_hls(base_rgb)
    base_hex = hls_to_hex(h, l, s)

    response = build_response(base_hex, category, h, l, s, variation)
    response["credits"] = credits
    return response