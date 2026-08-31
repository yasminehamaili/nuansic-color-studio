const CHIPS = [
  { label: "#Graphic", bg: "#FA9359", fg: "#1E997D", rotate: -9, left: 50, top: -70 },
  { label: "#Design", bg: "#FCD402", fg: "#FC5649", rotate: 8, left: 168, top: -20 },
  { label: "#Interior", bg: "#FC71CE", fg: "#FFFFFF", rotate: -8, left: 24, top: 15 },
  { label: "#Fashion", bg: "#1D5EDE", fg: "#FCD401", rotate: 6, left: 140, top: 50 },
  { label: "#Colors", bg: "#A2E07D ", fg: "#1E997D", rotate: -6, left: 50, top: 100 },
  { label: "#UIUX", bg: "#FE564B", fg: "#F3E7DB", rotate: 11, left: 180, top: 125 },
];

export function Creatives() {
  return (
    <section className="relative w-full overflow-hidden py-10">
      <div className="relative mx-auto w-full max-w-[1235px] px-8 lg:h-[500px]">
        {/* ---------- desktop composed canvas ---------- */}
        <div className="relative mx-auto hidden h-[817px] w-[1064px] lg:block">
          {/* green blob with logo + paragraph directly on it */}
          <div
            className="absolute left-0 top-[32px] h-[400px] w-[452px]"
            style={{ backgroundColor: "#AADCE3", borderRadius: "226px 226px 0 0"}}
          />
          <div className="absolute left-0 top-[155px] w-[452px] px-7 text-center">
            <img src="/nuansic-logo2.png" alt="Nuansic Logo" width={180} height={50} className="mx-auto" />
            <p className="mt-8 font-display text-[27px] leading-[1.3]" style={{ color: "#1D5ED6" }}>
              A color playground for creative minds.
            </p>
          </div>

          {/* purple blob — bottom flush with the green blob's bottom (32 + 728 = 760) */}
          <div
            className="absolute left-[583px] top-[260px] h-[175px] w-[475px]"
            style={{ backgroundColor: "#7C37FA", borderRadius: "114px 114px 0 0" }}
          />
          <h2
            className="absolute left-[618px] top-[325px] w-[475px] font-display text-[40px] font-bold leading-tight"
            style={{ color: "#FAD1E1" }}
          >
            built for every creative
          </h2>

          {/* chip cluster */}
          <div className="absolute left-[650px] top-[122px] h-[400px] w-[320px]">
            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="absolute rounded-[14px] px-4 py-1.5 font-display text-[22px] font-bold transition-transform duration-200 hover:scale-110"
                style={{
                  left: c.left,
                  top: c.top,
                  backgroundColor: c.bg,
                  color: c.fg,
                  transform: `rotate(${c.rotate}deg)`,
                  filter: "drop-shadow(0px 4px 8px rgba(30,30,30,0.22))",
                }}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* ---------- mobile / tablet stack ---------- */}
        <div className="lg:hidden">
          <div
            className="relative mx-auto w-full max-w-150 px-6 py-8 text-center"
            style={{ backgroundColor: "#A2E07D", borderRadius: "170px 170px 0 0" }}
          >
            <span className="font-display text-[24px] font-extrabold text-foreground">logo</span>
            <p className="mt-4 font-display text-[16px] leading-snug" style={{ color: "#1E997D" }}>
              A color playground for creative minds.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="rounded-[10px] px-3 py-1 font-display text-[14px] font-bold"
                style={{
                  backgroundColor: c.bg,
                  color: c.fg,
                  transform: `rotate(${c.rotate}deg)`,
                  filter: "drop-shadow(0px 4px 8px rgba(30,30,30,0.22))",
                }}
              >
                {c.label}
              </span>
            ))}
          </div>

          <div className="relative mt-8">
            <div
              className="absolute inset-x-0 top-0 mx-auto h-[120px] w-full max-w-[380px]"
              style={{ backgroundColor: "#7C37FA", borderRadius: "65px 65px 0 0" }}
            />
            <h2
              className="relative px-7 pt-7 font-display text-[26px] font-bold leading-tight"
              style={{ color: "#FAD1E1" }}
            >
              built for every creative
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
