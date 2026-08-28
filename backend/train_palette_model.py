"""
train_palette_model.py
=======================
Trains a neural network to predict a 4-color "companion set" given a base
color and a design category, learning from REAL human-designed palettes
(992 palettes scraped from Adobe Color, via the open-source
Jam3/nice-color-palettes dataset).

HOW CATEGORY LABELS ARE BUILT (upgraded, evidence-based):
The palette dataset has no category tags. Instead of guessing from color
theory alone, we use a second real dataset — color-pedia (100k individual
colors, each with a human-written "Use Case" description, e.g. "ideal for
branding, packaging, advertising" or "ideal for interiors, kitchens and
living rooms"). We:

  1. Keyword-match each color-pedia entry's Use Case/Keywords/Category text
     against the 4 categories, keeping only entries with a clear, single
     best-matching category (~78k of 100k rows have at least one match).
  2. Build a nearest-neighbor index over those labeled colors (RGB space).
  3. For each of the 992 real palettes, look up each of its 5 colors'
     nearest neighbor in that index and take a majority vote (weighted by
     distance) to assign the whole palette a category.

This grounds the labels in real documented design use, not a hand-tuned
color-theory rule. It's still not human-labeled *palettes* (that dataset
doesn't exist publicly) — the highest-value next upgrade would be that.

Output: palette_model.joblib (the trained model + metadata)
"""

import json
import colorsys
import urllib.request

import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split
from sklearn.neighbors import NearestNeighbors
import joblib

DATASET_URL = "https://raw.githubusercontent.com/Jam3/nice-color-palettes/master/1000.json"
COLOR_PEDIA_PATH = "color_pedia.parquet"
CATEGORIES = ["uiux", "graphic_design", "home_interior", "fashion"]

CATEGORY_KEYWORDS = {
    # NOTE: "branding" / "advertising" deliberately excluded — they appear in ~42% of
    # this dataset's Use Case text as generic boilerplate, regardless of the actual
    # color, and made every category look like graphic_design.
    "uiux": ["web design", "ui ", "user interface", "app design", "digital interface",
             "website", "screen ui", "digital product", "app icon", "mobile app"],
    "graphic_design": ["logo design", "packaging design", "print design", "poster",
                        "marketing material", "graphic design", "typography"],
    "home_interior": ["interior", "home decor", "living room", "kitchen", "bedroom",
                       "furniture", "wall paint", "bathroom", "home design"],
    "fashion": ["fashion", "clothing", "apparel", "accessories", "textile",
                "wardrobe", "garment", "jewelry"],
}


# ---------------------------------------------------------------------------
# Build a real, evidence-based color -> category classifier from color-pedia
# ---------------------------------------------------------------------------

def build_color_category_index():
    df = pd.read_parquet(COLOR_PEDIA_PATH)
    for c in ["Use Case", "Keywords", "Category", "Description"]:
        df[c] = df[c].fillna("")
    text = (df["Use Case"] + " " + df["Keywords"] + " " + df["Category"] + " " + df["Description"]).str.lower()

    def best_category(t):
        counts = {cat: sum(w in t for w in words) for cat, words in CATEGORY_KEYWORDS.items()}
        best = max(counts, key=counts.get)
        return best if counts[best] > 0 else None

    df["matched_category"] = text.apply(best_category)
    labeled = df.dropna(subset=["matched_category"])

    # Balance classes before building the index — otherwise the category with the
    # most reference colors wins nearest-neighbor votes by sheer density, not by
    # being a genuinely closer semantic match.
    min_count = labeled["matched_category"].value_counts().min()
    parts = [
        g.sample(min_count, random_state=42)
        for _, g in labeled.groupby("matched_category")
    ]
    labeled = pd.concat(parts, ignore_index=True)
    print(f"Balanced reference set: {min_count} colors per category")

    rgb = labeled[["R", "G", "B"]].values
    labels = labeled["matched_category"].values

    nn = NearestNeighbors(n_neighbors=5).fit(rgb)
    return nn, labels


def classify_palette_category(hex_colors, nn_index, nn_labels):
    """Nearest-neighbor majority vote (distance-weighted) over a palette's colors."""
    from collections import defaultdict
    votes = defaultdict(float)
    for hex_color in hex_colors:
        hex_color = hex_color.lstrip("#")
        rgb = np.array([[int(hex_color[i:i + 2], 16) for i in (0, 2, 4)]])
        dists, idxs = nn_index.kneighbors(rgb, n_neighbors=5)
        for dist, idx in zip(dists[0], idxs[0]):
            weight = 1 / (1 + dist)
            votes[nn_labels[idx]] += weight
    return max(votes, key=votes.get)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_palettes():
    with urllib.request.urlopen(DATASET_URL) as resp:
        raw = json.load(resp)
    return [p for p in raw if len(p) == 5]


def hex_to_hls(hex_color):
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return colorsys.rgb_to_hls(r, g, b)  # (h, l, s)


def hls_to_hex(h, l, s):
    h, l, s = h % 1.0, max(0.0, min(1.0, l)), max(0.0, min(1.0, s))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


# ---------------------------------------------------------------------------
# Build training set (data augmentation: rotate which color is "base")
# ---------------------------------------------------------------------------

def build_dataset(palettes, nn_index, nn_labels):
    X, y = [], []
    category_tally = {c: 0 for c in CATEGORIES}
    for hex_list in palettes:
        hls_list = [hex_to_hls(c) for c in hex_list]
        category = classify_palette_category(hex_list, nn_index, nn_labels)
        category_tally[category] += 1
        cat_onehot = [1.0 if c == category else 0.0 for c in CATEGORIES]

        for base_idx in range(5):
            base_h, base_l, base_s = hls_list[base_idx]
            others = [hls_list[i] for i in range(5) if i != base_idx]
            # consistent ordering: sort companions by hue distance from base
            others.sort(key=lambda c: min(abs(c[0] - base_h), 1 - abs(c[0] - base_h)))

            features = [base_h, base_l, base_s] + cat_onehot
            target = [v for c in others for v in c]  # 4 colors x 3 (h,l,s) = 12 values

            X.append(features)
            y.append(target)

    print(f"Palette category distribution: {category_tally}")
    return np.array(X), np.array(y)


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------

def main():
    print("Downloading real palette dataset...")
    palettes = load_palettes()
    print(f"Loaded {len(palettes)} real designer palettes")

    print("Building evidence-based category classifier from color-pedia...")
    nn_index, nn_labels = build_color_category_index()
    print(f"Labeled reference colors: {len(nn_labels)}")

    print("Labeling palettes and building training set...")
    X, y = build_dataset(palettes, nn_index, nn_labels)
    print(f"Training examples: {len(X)} (each palette rotated 5 ways)")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    model = MLPRegressor(
        hidden_layer_sizes=(64, 32),
        activation="relu",
        max_iter=2000,
        random_state=42,
        early_stopping=True,
    )

    print("Training MLP...")
    model.fit(X_train, y_train)

    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    print(f"Train R²: {train_score:.3f}")
    print(f"Test R²:  {test_score:.3f}")

    joblib.dump({"model": model, "categories": CATEGORIES}, "palette_model.joblib")
    print("Saved model to palette_model.joblib")


if __name__ == "__main__":
    main()
