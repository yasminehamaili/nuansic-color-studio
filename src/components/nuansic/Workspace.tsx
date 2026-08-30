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
  const [count, setCount] = useState(6);
  const [category, setCategory] = useState<Category | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveColor, setSaveColor] = useState("#E87323");
  const [output, setOutput] = useState<PaletteColor[] | null>(null);
  const [summary, setSummary] = useState<Record<string, string> | null>(null);
  const [loadingPalette, setLoadingPalette] = useState(false);

  // Hovering/focusing the Save button rerolls its color, same pool and
  // sticky behavior as the hero cards — it doesn't revert on mouse-leave.
  const rerollSaveColor = () => setSaveColor((c) => nextHoverColor(c));

  useEffect(() => {
    registerOpenPicker(() => setModalOpen(true));
  }, [registerOpenPicker]);

  // Draw the uploaded image onto the picker canvas, cropped to fill the box
  // (same visual result as the old object-cover <img>, but as pixel data we
  // can read from on click).
  useEffect(() => {
    if (!preview || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      const canvasRatio = cw / ch;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (imgRatio > canvasRatio) {
        sw = img.naturalHeight * canvasRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / canvasRatio;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    };
    img.src = preview;
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
    setPicked(rgbToHex(r, g, b));
  };

  const handleFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setPicked(null);
    setOutput(null);
    try {
      const colors = await extractDominantColors(file, 6);
      setExtracted(colors);
    } catch {
      setExtracted([]);
    }
  };

  // Generate the palette whenever a color + category are both picked.
  useEffect(() => {
    if (!picked || !category) {
      setOutput(null);
      return;
    }
    let cancelled = false;
    setLoadingPalette(true);
    generatePalette(picked, category)
      .then((result) => {
        if (!cancelled) {
          setOutput(result.palette);
          setSummary(result.summary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOutput(null);
          setSummary(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPalette(false);
      });
    return () => {
      cancelled = true;
    };
  }, [picked, category]);

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
      <div className="mx-auto grid w-full max-w-[1250px] items-center gap-16 px-6 lg:grid-cols-[minmax(0,600px)_minmax(0,460px)]">
        {/* LEFT */}
        <div className="mx-auto w-full max-w-[600px]">
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
            className="relative flex h-[320px] w-full items-center justify-center overflow-hidden rounded-[16px] border-2 border-dashed transition-colors duration-200 lg:h-[480px]"
            style={{
              borderColor: dragging ? "#E87323" : "#6B6863",
              backgroundColor: "#D9D9D9",
            }}
          >
            {preview ? (
              <>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={480}
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
                onClick={() => hex && setPicked(hex)}
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
            className="flex h-[56px] w-full items-center justify-center rounded-[14px] font-display text-[15px] font-bold transition-colors duration-300"
            style={
              picked
                ? { backgroundColor: picked, color: readableTextOn(picked) }
                : { backgroundColor: "#D9D9D9", color: "#6B6863" }
            }
          >
            {picked ? picked.toUpperCase() : "Color Picked"}
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
          {summary && (
            <p className="mt-1 font-display text-[13px]" style={{ color: "#6B6863" }}>
              {Object.values(summary)[0]}
              {summary.rationale ? ` — ${summary.rationale}` : ""}
            </p>
          )}
          <div
            className="mt-3 flex h-[220px] w-full max-w-[460px] items-center justify-center gap-2 rounded-[10px] p-4"
            style={{ backgroundColor: "#D9D9D9" }}
          >
            {loadingPalette ? (
              <span className="font-display text-[14px]" style={{ color: "#6B6863" }}>
                generating...
              </span>
            ) : output ? (
              output.map((c, i) => (
                <button
                  key={`${c.hex}-${i}`}
                  type="button"
                  onClick={() => copy(c.hex)}
                  title={`${c.label}${c.note ? " — " + c.note : ""}\nclick to copy ${c.hex}`}
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

          <div className="mt-5 flex justify-center">
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