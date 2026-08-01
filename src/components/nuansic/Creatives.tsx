const CHIPS = [
  { label: "#UIUX", bg: "#FE564B", fg: "#F5F5F5", rotate: -15 },
  { label: "#Graphic", bg: "#FA9359", fg: "#1E997D", rotate: 8 },
  { label: "#Fashion", bg: "#1D5EDE", fg: "#FCD402", rotate: -6 },
  { label: "#Interior", bg: "#FC71CE", fg: "#FFFFFF", rotate: 12 },
  { label: "#Colors", bg: "#B8D8EA", fg: "#1D5EDE", rotate: -10 },
  { label: "#Design", bg: "#FCD402", fg: "#FE564B", rotate: 5 },
];

export function Creatives() {
  return (
    <section className="relative w-full overflow-hidden py-24">
      <div className="relative mx-auto w-full max-w-[1440px] px-6 lg:min-h-[760px]">

        {/* decorative green blob */}
        <div
          className="pointer-events-none absolute left-[40px] top-0 hidden h-[760px] w-[460px] lg:block"
          style={{ backgroundColor: "#A2E07D", borderRadius: "230px 230px 0 0" }}
        />

        <div className="relative z-10 mx-auto max-w-[720px] pt-6 lg:ml-[540px] lg:mr-0 lg:pt-[60px]">
          <p className="font-display text-[18px] leading-relaxed md:text-[22px]" style={{ color: "#1E997D" }}>
            is a color playground for creatives. Pick any shade you love, tell us your field,
            and our AI builds palettes that actually make sense, no more guessing, no more
            endless scrolling. Just colors that feel right.
          </p>
          <h2
            className="mt-6 font-display text-[38px] font-bold leading-tight md:text-[62px]"
            style={{ color: "#FC71CE" }}
          >
            built for every creative
          </h2>

          {/* chip cluster with purple blob directly behind it */}
          <div className="relative mt-8 max-w-[560px] pt-8">
            <div
              className="pointer-events-none absolute left-0 top-[40px] hidden h-[240px] w-[518px] lg:block"
              style={{ backgroundColor: "#7C37FA", borderRadius: "100px 100px 0 0" }}
            />
            <div className="relative z-10 flex flex-wrap gap-4">
              {CHIPS.map((c) => (
                <span
                  key={c.label}
                  className="rounded-[16px] px-5 py-2 font-display text-[26px] font-bold transition-transform duration-200 hover:scale-110 md:text-[40px]"
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
          </div>
        </div>
      </div>

    </section>
  );
}
