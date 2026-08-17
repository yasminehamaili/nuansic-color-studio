/**
 * MOCK "AI" MODULE
 * -----------------------------------------------------------------------------
 * Every function here is a stand-in for a future real API call.
 * They are intentionally isolated & pure so each one can be swapped with a
 * network request (e.g. `await fetch('/api/extract')`) without touching the UI.
 */

export const BRAND_PALETTE = [
"#7783F1",
"#F4D88E",
  "#D8B3DF",
  "#E1165F",
  "#B8D8EA",
  "#A2E07D",
  "#7C37FA",
  "#1E997D",
  "#FE564B",
  "#FA9359",
  "#1D5EDE",
  "#FCD402",
  "#FC71CE",
  "#FF8FA3",
  "#4ECDC4",
  "#C77DFF",
  "#FFB703",
  "#06D6A0",
  "#EF476F",
  "#118AB2",
] as const;

export type Category =
  | "Graphic Design"
  | "UI/UX"
  | "fashion"
  | "Interior home design";

/* ------------------------------- color utils ------------------------------ */

export function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number) {
  const t = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${t(r)}${t(g)}${t(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number) {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = ln - c / 2;
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hexToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

/** Pick readable foreground text for a background color. */
export function readableTextOn(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0B0B0B" : "#F5F5F5";
}

/* --------------------------- MOCK #1: extraction -------------------------- */
/**
 * Client-side dominant-color extraction via canvas pixel sampling.
 * Replace later with: POST image -> /api/extract-colors
 */
export async function extractDominantColors(
  file: File,
  count = 6,
): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });

    const size = 120;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Bucket colors in a coarse 3D grid, then rank by frequency.
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]!;
      if (a < 125) continue;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      cur.n++;
      cur.r += r;
      cur.g += g;
      cur.b += b;
      buckets.set(key, cur);
    }

    const ranked = [...buckets.values()]
      .sort((a, b) => b.n - a.n)
      .map((b) => rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n));

    // De-duplicate perceptually-close colors.
    const out: string[] = [];
    for (const hex of ranked) {
      const { r, g, b } = hexToRgb(hex);
      const tooClose = out.some((o) => {
        const c = hexToRgb(o);
        return (
          Math.abs(c.r - r) + Math.abs(c.g - g) + Math.abs(c.b - b) < 60
        );
      });
      if (!tooClose) out.push(hex);
      if (out.length === count) break;
    }
    while (out.length < count && ranked.length)
      out.push(ranked[out.length % ranked.length]!);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* --------------------------- MOCK #2: tint ramp --------------------------- */
/** Lightness ramp of a single color, lightest -> darkest. */
export function generateTintRamp(hex: string, count = 6): string[] {
  const { h, s } = hexToHsl(hex);
  const top = 90;
  const bottom = 15;
  if (count <= 1) return [hslToHex(h, s, 50)];
  return Array.from({ length: count }, (_, i) =>
    hslToHex(h, s, top - ((top - bottom) * i) / (count - 1)),
  );
}

/* ------------------------ MOCK #3: field palette AI ----------------------- */

export type PaletteRole = {
  role: string;
  hex: string;
};

const ROLES = ["Primary", "Secondary", "Accent", "Neutral", "Background"];

/**
 * Derives a role-labeled palette from a picked color, flavored by field.
 * Replace later with: POST { color, category } -> /api/generate-palette
 */
export function generateFieldPalette(
  pickedColor: string,
  category: Category,
  count = 5,
): PaletteRole[] {
  const { h, s, l } = hexToHsl(pickedColor);

  const flavor: Record<
    Category,
    { s: number; l: number; spread: number; contrast: number }
  > = {
    "Graphic Design": { s: 1.15, l: 1, spread: 42, contrast: 1.1 },
    "UI/UX": { s: 0.95, l: 1, spread: 25, contrast: 1.5 },
    fashion: { s: 0.6, l: 1.02, spread: 30, contrast: 0.9 },
    "Interior home design": { s: 0.75, l: 1.05, spread: 22, contrast: 0.85 },
  };
  const f = flavor[category];
  const warmShift = category === "Interior home design" ? -12 : 0;

  const recipe = [
    { dh: 0, ds: 1, dl: 0 },
    { dh: f.spread, ds: 0.92, dl: 8 * f.contrast },
    { dh: -f.spread * 1.6, ds: 1.2, dl: -6 * f.contrast },
    { dh: 0, ds: 0.18, dl: 22 },
    { dh: 0, ds: 0.1, dl: 40 * f.contrast },
  ];

  const n = Math.max(3, Math.min(count, ROLES.length));
  return Array.from({ length: n }, (_, i) => {
    const r = recipe[i % recipe.length]!;
    const hex = hslToHex(
      h + r.dh + warmShift,
      s * f.s * r.ds,
      Math.max(10, Math.min(94, l * f.l + r.dl)),
    );
    return { role: ROLES[i]!, hex };
  });
}

/** Hover reroll: a brand color that is never the current one. */
export function nextHoverColor(current: string): string {
  const pool = BRAND_PALETTE.filter(
    (c) => c.toLowerCase() !== current.toLowerCase(),
  );
  return pool[Math.floor(Math.random() * pool.length)]!;
}
