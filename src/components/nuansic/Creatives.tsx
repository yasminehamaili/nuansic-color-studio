const CHIPS = [
  { label: "#Colors", bg: "#AADCE3", fg: "#1D5ED6", rotate: -15, left: 168, top: 0 },
  { label: "#Design", bg: "#FCD402", fg: "#FC5649", rotate: 8, left: 316, top: 62 },
  { label: "#Interior", bg: "#FC71CE", fg: "#FFFFFF", rotate: -10, left: 108, top: 118 },
  { label: "#Fashion", bg: "#1D5EDE", fg: "#FCD401", rotate: 5, left: 268, top: 182 },
  { label: "#Graphic", bg: "#FA9359", fg: "#1E997D", rotate: -8, left: 62, top: 244 },
  { label: "#UIUX", bg: "#FE564B", fg: "#F3E7DB", rotate: 12, left: 232, top: 300 },
];

export function Creatives() {
  return (
    <section className="relative w-full overflow-hidden py-16">
      <div className="relative mx-auto w-full max-w-[1100px] px-6 lg:h-[560px]">
        {/* ---------- desktop composed canvas ---------- */}
        <div className="relative mx-auto hidden h-[560px] w-[1000px] lg:block">
          {/* green blob with logo + paragraph directly on it */}
          <div
            className="absolute left-0 top-0 h-[500px] w-[314px]"
            style={{ backgroundColor: "#A2E07D", borderRadius: "157px 157px 0 0" }}
          />
          <div className="absolute left-0 top-[56px] w-[314px] px-5 text-center">
            <span className="font-display text-[27px] font-extrabold tracking-tight text-foreground">
              nuansic
            </span>
            <p
              className="mt-6 font-display text-[19px] leading-[1.35]"
              style={{ color: "#1E997D" }}
            >
              is a color playground for creatives. Pick any shade you love, tell us your field,
              and our AI builds palettes that actually make sense, no more guessing, no more
              endless scrolling. Just colors that feel right.
            </p>
          </div>

          {/* purple blob, behind the heading and grazing the last chip */}
          <div
            className="absolute left-[430px] top-[380px] h-[180px] w-[440px]"
            style={{ backgroundColor: "#7C37FA", borderRadius: "80px 80px 0 0" }}
          />
          <h2
            className="absolute left-[470px] top-[410px] w-[400px] font-display text-[38px] font-bold leading-tight"
            style={{ color: "#FAD1E1" }}
          >
            built for every creative
          </h2>

          {/* chip cluster */}
          <div className="absolute left-[390px] top-[40px] h-[380px] w-[560px]">
            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="absolute rounded-[14px] px-4 py-1 font-display text-[24px] font-bold transition-transform duration-200 hover:scale-110"
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
            className="relative mx-auto w-full max-w-[420px] px-6 py-10 text-center"
            style={{ backgroundColor: "#A2E07D", borderRadius: "180px 180px 0 0" }}
          >
            <span className="font-display text-[24px] font-extrabold text-foreground">nuansic</span>
            <p className="mt-4 font-display text-[16px] leading-snug" style={{ color: "#1E997D" }}>
              is a color playground for creatives. Pick any shade you love, tell us your field,
              and our AI builds palettes that actually make sense, no more guessing, no more
              endless scrolling. Just colors that feel right.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {CHIPS.map((c) => (
              <span
                key={c.label}
                className="rounded-[14px] px-4 py-1 font-display text-[20px] font-bold"
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
              className="absolute inset-x-0 top-0 mx-auto h-[130px] w-full max-w-[400px]"
              style={{ backgroundColor: "#7C37FA", borderRadius: "70px 70px 0 0" }}
            />
            <h2
              className="relative px-8 pt-8 font-display text-[30px] font-bold leading-tight"
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
