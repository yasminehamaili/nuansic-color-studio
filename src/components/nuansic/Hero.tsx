import { useState } from "react";
import { nextHoverColor } from "@/lib/color-ai";

const BLOCKS = [
  { color: "#7783F1", left: 169, top: 445, rotate: -12.13 },
  { color: "#F4D88E", left: 390, top: 429, rotate: -1.17 },
  { color: "#D8B3DF", left: 594, top: 431, rotate: -6.36 },
  { color: "#E1165F", left: 805, top: 446, rotate: 4.6 },
  { color: "#B8D8EA", left: 995, top: 434, rotate: 10.64 },
];

function ArrowDoodle({ className, rotate }: { className?: string; rotate: number }) {
  return (
    <svg
      viewBox="0 0 90 60"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      fill="none"
      stroke="#0B0B0B"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 46C18 12 52 2 84 18" />
      <path d="M84 18l-16 1M84 18l-5-15" />
    </svg>
  );
}

export function Hero({ onUploadClick }: { onUploadClick: () => void }) {
  const [colors, setColors] = useState(BLOCKS.map((b) => b.color));

  const reroll = (i: number) =>
    setColors((prev) =>
      prev.map((c, idx) => (idx === i ? nextHoverColor(c) : c)),
    );

  return (
    <section id="top" className="relative w-full overflow-hidden pb-20">
      <div className="relative mx-auto w-full max-w-[1440px] px-6">
        {/* Headline */}
        <div className="relative pt-6 text-center md:pt-[45px]">
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] text-foreground sm:text-[56px] md:text-[75px]">
            pick a color, we&apos;ll build
          </h1>
          <div className="relative mt-1 flex flex-wrap items-baseline justify-center gap-x-4 md:mt-2">
            <span className="font-display text-[40px] font-semibold text-foreground sm:text-[56px] md:text-[75px]">
              your
            </span>
            <span className="font-script text-[56px] font-bold text-accent sm:text-[76px] md:text-[100px]">
              world
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-[820px] font-display text-[18px] leading-snug text-foreground/80 md:text-[30px]">
            AI-powered color palette for designers who knows what they want
          </p>
        </div>

        {/* Color blocks: absolute canvas on desktop, wrapped flex on mobile */}
        <div className="relative mt-10 hidden h-[420px] lg:block">
          <div className="absolute left-1/2 top-0 h-[420px] w-[1440px] -translate-x-1/2">
            {BLOCKS.map((b, i) => (
              <button
                key={i}
                type="button"
                aria-label={`color block ${i + 1}`}
                onMouseEnter={() => reroll(i)}
                onMouseLeave={() => reset(i)}
                onFocus={() => reroll(i)}
                onBlur={() => reset(i)}
                className="absolute h-[236px] w-[236px] rounded-[20px] outline-none"
                style={{
                  left: b.left,
                  top: b.top - 400,
                  transform: `rotate(${b.rotate}deg)`,
                  backgroundColor: colors[i],
                  boxShadow: "0px 0px 7px rgba(30,30,30,0.19)",
                  transition: "background-color 350ms ease",
                }}
              />
            ))}
            <ArrowDoodle className="absolute left-[110px] top-[10px] h-[60px] w-[90px]" rotate={-126} />
            <ArrowDoodle className="absolute left-[1245px] top-[30px] h-[60px] w-[90px]" rotate={58.65} />

            {/* tag pills stuck to their matching blocks */}
            <div
              className="pointer-events-none absolute rounded-full px-6 py-2 font-display text-[20px] font-semibold"
              style={{ left: 1140, top: 240, backgroundColor: "#5162AA", color: "#F5F5F5" }}
            >
              #B8D8EA
            </div>
            <div
              className="pointer-events-none absolute rounded-full px-6 py-2 font-display text-[20px] font-semibold"
              style={{ left: 352, top: 8, backgroundColor: "#E87323", color: "#F5F5F5" }}
            >
              #F4D88E
            </div>

          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:hidden">
          {BLOCKS.map((b, i) => (
            <button
              key={i}
              type="button"
              aria-label={`color block ${i + 1}`}
              onMouseEnter={() => reroll(i)}
              onClick={() => reroll(i)}
              className="h-[110px] w-[110px] rounded-[20px] sm:h-[150px] sm:w-[150px]"
              style={{
                transform: `rotate(${b.rotate}deg)`,
                backgroundColor: colors[i],
                boxShadow: "0px 0px 7px rgba(30,30,30,0.19)",
                transition: "background-color 350ms ease",
              }}
            />
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <button
            type="button"
            onClick={onUploadClick}
            className="h-[62px] w-[260px] rounded-[20px] bg-foreground font-display text-[22px] font-medium text-background transition-all duration-200 hover:scale-105 active:scale-95 md:h-[72px] md:w-[306px] md:text-[30px]"
          >
            upload an image
          </button>
        </div>
      </div>
    </section>
  );
}
