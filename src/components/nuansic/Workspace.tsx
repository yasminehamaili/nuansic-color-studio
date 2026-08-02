import { useEffect, useRef, useState } from "react";
import {
  extractDominantColors,
  generateFieldPalette,
  generateTintRamp,
  readableTextOn,
  type Category,
  type PaletteRole,
} from "@/lib/color-ai";

const CATEGORIES: { label: Category; w: string }[] = [
  { label: "Graphic Design", w: "182px" },
  { label: "UI/UX", w: "76px" },
  { label: "fashion", w: "92px" },
  { label: "Interior home design", w: "201px" },
];


export type WorkspaceHandle = { openPicker: () => void };

export function Workspace({
  registerOpenPicker,
}: {
  registerOpenPicker: (fn: () => void) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<string[]>([]);
  const [picked, setPicked] = useState("#E87323");
  const [count, setCount] = useState(6);
  const [category, setCategory] = useState<Category | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    registerOpenPicker(() => inputRef.current?.click());
  }, [registerOpenPicker]);

  const handleFile = async (file?: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    const colors = await extractDominantColors(file, 6);
    setExtracted(colors);
    if (colors[0]) setPicked(colors[0]);
  };

  const ramp = generateTintRamp(picked, count);
  const output: PaletteRole[] | null =
    category ? generateFieldPalette(picked, category, 5) : null;

  const copy = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <section id="workspace" className="w-full py-12">
      <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-6 lg:grid-cols-[445px_1fr]">

        {/* LEFT */}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
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
            className="flex h-[240px] w-full items-center justify-center overflow-hidden rounded-[12px] border-2 border-dashed transition-colors duration-200 lg:h-[358px] lg:w-[445px]"
            style={{
              borderColor: dragging ? "#E87323" : "#6B6863",
              backgroundColor: "#D9D9D9",
            }}
          >
            {preview ? (
              <img src={preview} alt="uploaded preview" className="h-full w-full object-cover" />
            ) : (
              <span
                className="font-display text-[14px] leading-relaxed md:text-[16px]"
                style={{ color: "#6B6863" }}
              >
                Upload an image
                <br />
                or
                <br />
                drag and drop
              </span>
            )}
          </button>

          {extracted.length > 0 && (
            <div className="mt-4 grid grid-cols-6 gap-[11px]">
              {extracted.map((hex, i) => (
                <button
                  key={`${hex}-${i}`}
                  type="button"
                  onClick={() => setPicked(hex)}
                  aria-label={`pick ${hex}`}
                  className="h-[42px] rounded-[8px] transition-transform duration-200 hover:scale-105 active:scale-95 lg:h-[63px]"
                  style={{
                    backgroundColor: hex,
                    outline:
                      picked.toLowerCase() === hex.toLowerCase()
                        ? "3px solid #0B0B0B"
                        : "none",
                    outlineOffset: "3px",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="max-w-[318px] lg:max-w-[340px]">
          <div
            className="flex h-[42px] w-full items-center justify-center rounded-[12px] font-display text-[12px] font-bold transition-colors duration-300"
            style={{ backgroundColor: picked, color: readableTextOn(picked) }}
          >
            {picked.toUpperCase()}
          </div>

          <p className="mt-5 font-display text-[16px] text-foreground">Palette:</p>

          <div className="mt-3 flex items-start gap-4">
            <div
              className="flex h-[42px] w-full max-w-[282px] overflow-hidden rounded-[12px]"
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
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(10, c + 1))}
                className="h-[20px] w-[22px] rounded-[6px] text-[13px] leading-none text-foreground transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ backgroundColor: "#D9D9D9" }}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(3, c - 1))}
                className="h-[20px] w-[22px] rounded-[6px] text-[13px] leading-none text-foreground transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ backgroundColor: "#D9D9D9" }}
              >
                −
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.label;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCategory(active ? null : c.label)}
                  className="h-[34px] rounded-[8px] px-3 font-display text-[13px] transition-all duration-200 hover:scale-105 active:scale-95 md:text-[15px]"
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

          <div
            className="mt-6 flex h-[174px] w-full max-w-[340px] items-center justify-center gap-2 rounded-[8px] p-3"
            style={{ backgroundColor: "#D9D9D9" }}
          >
            {output ? (
              output.map((s) => (
                <button
                  key={s.role}
                  type="button"
                  onClick={() => copy(s.hex)}
                  title={`${s.role} — click to copy`}
                  className="flex h-full flex-1 flex-col items-center justify-between rounded-[10px] py-3 transition-transform duration-200 hover:-translate-y-1 active:scale-95"
                  style={{ backgroundColor: s.hex, color: readableTextOn(s.hex) }}
                >
                  <span className="font-display text-[10px] font-semibold">{s.role}</span>
                  <span
                    className="font-display text-[12px] font-bold"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    {copied === s.hex ? "copied!" : s.hex.toUpperCase()}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 text-center font-display text-[13px]" style={{ color: "#6B6863" }}>
                pick a color and choose a field to generate your palette
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
