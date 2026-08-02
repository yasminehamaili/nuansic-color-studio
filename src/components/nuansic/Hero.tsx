import { useState } from "react";
import { nextHoverColor } from "@/lib/color-ai";

/** Desktop canvas is the original 1440px design scaled to 60%. */
const BLOCKS = [
  { color: "#7783F1", left: 101, top: 27, rotate: -12.13 },
  { color: "#F4D88E", left: 234, top: 17, rotate: -1.17 },
  { color: "#D8B3DF", left: 356, top: 19, rotate: -6.36 },
  { color: "#E1165F", left: 483, top: 28, rotate: 4.6 },
  { color: "#B8D8EA", left: 597, top: 20, rotate: 10.64 },
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

  const reset = (i: number) =>
    setColors((prev) => prev.map((c, idx) => (idx === i ? BLOCKS[i]!.color : c)));

  return (
    <section
      id="top"
      className="relative flex w-full flex-col justify-center overflow-hidden pb-12 lg:min-h-[calc(100svh-64px)]"
    >
      <div className="relative mx-auto w-full max-w-[1100px] px-6">
        {/* Headline */}
        <div className="relative text-center">
          <h1 className="font-display text-[28px] font-semibold leading-[1.1] text-foreground sm:text-[36px] md:text-[45px]">
            pick a color, we&apos;ll build
          </h1>
          <div className="relative mt-1 flex flex-wrap items-baseline justify-center gap-x-3">
            <span className="font-display text-[28px] font-semibold text-foreground sm:text-[36px] md:text-[45px]">
              your
            </span>
            <span className="font-script text-[38px] font-bold text-accent sm:text-[48px] md:text-[60px]">
              world
            </span>
          </div>
          <p className="mx-auto mt-4 max-w-[560px] font-display text-[14px] leading-snug text-foreground/80 md:text-[18px]">
            AI-powered color palette for designers who knows what they want
          </p>
        </div>

        {/* Color blocks: absolute canvas on desktop, wrapped flex on mobile */}
        <div className="relative mt-8 hidden h-[250px] lg:block">
          <div className="absolute left-1/2 top-0 h-[250px] w-[864px] -translate-x-1/2">
            {BLOCKS.map((b, i) => (
              <button
                key={i}
                type="button"
                aria-label={`color block ${i + 1}`}
                onMouseEnter={() => reroll(i)}
                onMouseLeave={() => reset(i)}
                onFocus={() => reroll(i)}
                onBlur={() => reset(i)}
                className="absolute h-[142px] w-[142px] rounded-[12px] outline-none"
                style={{
                  left: b.left,
                  top: b.top,
                  transform: `rotate(${b.rotate}deg)`,
                  backgroundColor: colors[i],
                  boxShadow: "0px 0px 7px rgba(30,30,30,0.19)",
                  transition: "background-color 350ms ease",
                }}
              />
            ))}
            <ArrowDoodle className="absolute left-[40px] top-[6px] h-[36px] w-[54px]" rotate={-126} />
            <ArrowDoodle className="absolute left-[770px] top-[18px] h-[36px] w-[54px]" rotate={58.65} />

            {/* tag pills stuck to their matching blocks */}
            <div
              className="pointer-events-none absolute rounded-full px-4 py-1 font-display text-[13px] font-semibold"
              style={{ left: 684, top: 144, backgroundColor: "#5162AA", color: "#F5F5F5" }}
            >
              #B8D8EA
            </div>
            <div
              className="pointer-events-none absolute rounded-full px-4 py-1 font-display text-[13px] font-semibold"
              style={{ left: 211, top: 0, backgroundColor: "#E87323", color: "#F5F5F5" }}
            >
              #F4D88E
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:hidden">
          {BLOCKS.map((b, i) => (
            <button
              key={i}
              type="button"
              aria-label={`color block ${i + 1}`}
              onMouseEnter={() => reroll(i)}
              onClick={() => reroll(i)}
              className="h-[72px] w-[72px] rounded-[12px] sm:h-[100px] sm:w-[100px]"
              style={{
                transform: `rotate(${b.rotate}deg)`,
                backgroundColor: colors[i],
                boxShadow: "0px 0px 7px rgba(30,30,30,0.19)",
                transition: "background-color 350ms ease",
              }}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={onUploadClick}
            className="h-[44px] w-[170px] rounded-[12px] bg-foreground font-display text-[15px] font-medium text-background transition-all duration-200 hover:scale-105 active:scale-95 md:h-[46px] md:w-[186px] md:text-[18px]"
          >
            upload an image
          </button>
        </div>
      </div>
    </section>
  );
}
