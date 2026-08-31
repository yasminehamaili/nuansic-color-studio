import { useEffect, useRef, useState } from "react";
import {
  extractDominantColors,
  generatePalette,
  generateTintRamp,
  nextHoverColor,
  readableTextOn,
  rgbToHex,
  type Category,
  type PaletteColor,
} from "@/lib/color-ai";
import { SelectImageModal } from "./SelectImageModal";

const CATEGORIES: { label: Category; w: string }[] = [
  { label: "Graphic Design", w: "220px" },
  { label: "UI/UX", w: "92px" },
  { label: "fashion", w: "112px" },
  { label: "Interior home design", w: "244px" },
];

export type WorkspaceHandle = { openPicker: () => void };

export function Workspace({
  registerOpenPicker,
}: {
  registerOpenPicker: (fn: () => void) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [extracted, setExtracted] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [variation, setVariation] = useState(0);

  // Picking a genuinely new color always starts fresh at variation 0 —
  // only the "Generate another" button advances it from there.
  const pickColor = (hex: string) => {
    setVariation(0);
    setPicked(hex);
  };
  const [count, setCount] = useState(6);
  const [category, setCategory] = useState<Category | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveColor, setSaveColor] = useState("#E87323");
  const [output, setOutput] = useState<PaletteColor[] | null>(null);
  const [loadingPalette, setLoadingPalette] = useState(false);

  // Hovering/focusing the Save button rerolls its color, same pool and
  // sticky behavior as the hero cards — it doesn't revert on mouse-leave.
  const rerollSaveColor = () => setSaveColor((c) => nextHoverColor(c));

  useEffect(() => {
    registerOpenPicker(() => setModalOpen(true));
  }, [registerOpenPicker]);

  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const drawToCanvas = () => {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Match the backing pixel buffer to the canvas's actual rendered CSS
    // size — otherwise the browser stretches whatever we draw to fill the
    // element, distorting the image and undoing the letterbox math below.
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw === 0 || ch === 0) return;
    canvas.width = cw;
    canvas.height = ch;

    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = (cw - drawW) / 2;
    const dy = (ch - drawH) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#D9D9D9"; // letterbox fill, matches the dropzone background
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, drawW, drawH);
  };

  // Draw the uploaded image onto the picker canvas, scaled to fit entirely
  // inside the box (letterboxed if the aspect ratio doesn't match) — so a
  // tall or wide image is always shown in full, never cropped. Redraws on
  // window resize too, since the box's height is flexible (matches the
  // right column) and can change.
  useEffect(() => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      loadedImageRef.current = img;
      drawToCanvas();
    };
    img.src = preview;

    window.addEventListener("resize", drawToCanvas);
    return () => window.removeEventListener("resize", drawToCanvas);
  }, [preview]);

  const handlePickFromCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    pickColor(rgbToHex(r, g, b));
  };

  const handleFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setPicked(null);
    setVariation(0);
    setOutput(null);
    try {
      const colors = await extractDominantColors(file, 6);
      setExtracted(colors);
    } catch {
      setExtracted([]);
    }
  };

  // Generate the palette whenever a color + category are both picked, or
  // when "Generate another" bumps the variation.
  useEffect(() => {
    if (!picked || !category) {
      setOutput(null);
      return;
    }
    let cancelled = false;
    setLoadingPalette(true);
    generatePalette(picked, category, variation)
      .then((result) => {
        if (!cancelled) {
          setOutput(result.palette);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOutput(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPalette(false);
      });
    return () => {
      cancelled = true;
    };
  }, [picked, category, variation]);

  const ramp = picked ? generateTintRamp(picked, count) : [];

  const copy = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1200);
  };

  const savePalette = () => {
    const hexes = (output ? output.map((c) => c.hex) : ramp).join(", ");
    if (hexes) navigator.clipboard?.writeText(hexes);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section id="workspace" className="flex w-full min-h-screen items-center justify-center py-12">
      <div className="mx-auto grid w-full max-w-[1250px] items-stretch gap-16 px-6 lg:grid-cols-[minmax(0,600px)_minmax(0,460px)]">
        {/* LEFT */}
        <div className="mx-auto flex w-full max-w-[600px] flex-col">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className="relative flex w-full flex-1 min-h-[320px] items-center justify-center overflow-hidden rounded-[16px] border-2 border-dashed transition-colors duration-200"
            style={{
              borderColor: dragging ? "#E87323" : "#6B6863",
              backgroundColor: "#D9D9D9",
            }}
          >
            {preview ? (
              <>
                <canvas
                  ref={canvasRef}
                  onClick={handlePickFromCanvas}
                  className="h-full w-full cursor-crosshair"
                  title="click anywhere on the image to pick that color"
                />
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="absolute right-3 top-3 rounded-[8px] px-3 py-1.5 font-display text-[13px] font-semibold"
                  style={{ backgroundColor: "#0B0B0B", color: "#F5F5F5" }}
                >
                  change image
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex h-full w-full items-center justify-center"
              >
                <span
                  className="font-display text-[18px] leading-relaxed md:text-[22px]"
                  style={{ color: "#6B6863" }}
                >
                  Upload an image
                  <br />
                  or
                  <br />
                  drag and drop
                </span>
              </button>
            )}
          </div>

          <p className="mt-5 font-display text-[14px] text-foreground md:text-[16px]">
            click anywhere on the image, or pick a swatch below
          </p>
          <div className="mt-3 grid grid-cols-6 gap-[14px]">
            {Array.from({ length: 6 }, (_, i) => extracted[i]).map((hex, i) => (
              <button
                key={i}
                type="button"
                disabled={!hex}
                onClick={() => hex && pickColor(hex)}
                aria-label={hex ? `pick ${hex}` : "no extracted color yet"}
                className="h-[56px] rounded-[10px] transition-transform duration-200 hover:scale-105 active:scale-95 lg:h-[84px]"
                style={{
                  backgroundColor: hex ?? "#D9D9D9",
                  outline:
                    hex && picked?.toLowerCase() === hex.toLowerCase()
                      ? "3px solid #0B0B0B"
                      : "none",
                  outlineOffset: "3px",
                }}
              />
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="mx-auto w-full max-w-[460px]">
          <div
            className="flex h-[56px] w-full items-center justify-between rounded-[14px] px-4 font-display text-[15px] font-bold transition-colors duration-300"
            style={
              picked
                ? { backgroundColor: picked, color: readableTextOn(picked) }
                : { backgroundColor: "#D9D9D9", color: "#6B6863" }
            }
          >
            <span className="flex-1 text-center">
              {picked ? (copied === picked ? "copied!" : picked.toUpperCase()) : "Color Picked"}
            </span>
            {picked && (
              <button
                type="button"
                onClick={() => copy(picked)}
                aria-label="copy hex code"
                title="copy hex code"
                className="shrink-0 opacity-80 transition-opacity hover:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M3 10.5V3.5C3 2.67157 3.67157 2 4.5 2H10.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            )}
          </div>

          <p className="mt-6 font-display text-[20px] text-foreground">Palette</p>

          <div className="mt-4 flex items-start gap-5">
            <div
              className="flex h-[56px] w-full max-w-[380px] overflow-hidden rounded-[14px]"
              style={{ backgroundColor: "#D9D9D9" }}
            >
              {ramp.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => copy(hex)}
                  title={hex}
                  className="h-full flex-1 transition-transform duration-200 hover:scale-y-110"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(10, c + 1))}
                className="h-[26px] w-[28px] rounded-[7px] text-[16px] leading-none text-foreground transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ backgroundColor: "#D9D9D9" }}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(3, c - 1))}
                className="h-[26px] w-[28px] rounded-[7px] text-[16px] leading-none text-foreground transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ backgroundColor: "#D9D9D9" }}
              >
                −
              </button>
            </div>
          </div>

          <p className="mt-7 font-display text-[20px] font-bold text-foreground">
            What are you designing?
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {CATEGORIES.map((c) => {
              const active = category === c.label;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCategory(active ? null : c.label)}
                  className="h-[44px] rounded-[10px] px-4 font-display text-[15px] transition-all duration-200 hover:scale-105 active:scale-95 md:text-[17px]"
                  style={{
                    width: c.w,
                    maxWidth: "100%",
                    backgroundColor: active ? "#E87323" : "#0B0B0B",
                    color: "#F5F5F5",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <p className="mt-7 font-display text-[20px] font-bold text-foreground">
            Generated color palette
          </p>
          <div
            className="mt-3 flex h-[220px] w-full max-w-[460px] items-center justify-center gap-2 rounded-[10px] p-4">
            {loadingPalette ? (
              <span className="font-display text-[14px]" style={{ color: "#6B6863" }}>
                generating...
              </span>
            ) : output ? (
              output.map((c, i) => (
                <button
                  key={`${c.hex}-${i}`}
                  type="button"
                  onClick={() => {
                    copy(c.hex);
                    pickColor(c.hex);
                  }}
                  title={`${c.label}${c.note ? " — " + c.note : ""}\nclick to pick this color`}
                  className="flex h-full flex-1 items-center justify-center rounded-[12px] transition-transform duration-200 hover:-translate-y-1 active:scale-95"
                  style={{ backgroundColor: c.hex, color: readableTextOn(c.hex) }}
                >
                  <span className="font-display text-[13px] font-bold" style={{ writingMode: "vertical-rl" }}>
                    {copied === c.hex ? "copied!" : c.hex.toUpperCase()}
                  </span>
                </button>
              ))
            ) : (
              Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-full flex-1 rounded-2xl"
                  style={{ backgroundColor: "#C9C9C9" }}
                />
              ))
            )}
          </div>

          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setVariation((v) => v + 1)}
              disabled={!picked || !category || loadingPalette}
              className="h-[44px] rounded-[10px] px-5 font-display text-[15px] font-semibold transition-transform duration-150 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              style={{ backgroundColor: "#0B0B0B", color: "#F5F5F5" }}
            >
              Generate another
            </button>
            <button
              type="button"
              onClick={savePalette}
              onMouseEnter={rerollSaveColor}
              onFocus={rerollSaveColor}
              className="h-[44px] w-[170px] rounded-[10px] font-display text-[15px] font-semibold transition-colors duration-200 active:scale-95"
              style={{ backgroundColor: saveColor, color: readableTextOn(saveColor) }}
            >
              {saved ? "saved!" : "Save palette"}
            </button>
          </div>
        </div>
      </div>

      <SelectImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onImageSelected={handleFile}
      />
    </section>
  );
}
