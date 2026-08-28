import { useState } from "react";
import { Instagram, Facebook, Linkedin, Music2 } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "color picker", color: "#1E997D" },
      { label: "ai palettes", color: "#7B37FE" },
      { label: "saved palettes", color: "#FC71CE" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "ui/ux", color: "#1D5EDE" },
      { label: "graphic design", color: "#FA925B" },
      { label: "fashion", color: "#FCD402" },
      { label: "interior", color: "#A2E07D" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "about us", color: "#FE564B" },
      { label: "contact", color: "#7B37FD" },
    ],
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer className="w-full border-t border-foreground/10 pb-8 pt-14">
      <div className="mx-auto w-full max-w-[1500px] px-6">
        <div className="grid gap-10 lg:grid-cols-[300px_1fr_auto]">
          <div>
            <span className="font-display text-[20px] font-extrabold tracking-tight text-foreground">
              logo
            </span>
            <h2 className="mt-2 font-display text-[25px] font-semibold leading-tight text-foreground md:text-[26px]">
              pick a color. we&apos;ll build{" "}
              <span className="font-script text-[28px] font-bold text-accent md:text-[36px]">
                your world
              </span>
            </h2>
            <form
              className="relative mt-6 w-full max-w-[280px]"
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSent(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-[48px] w-full rounded-[12px] border-2 bg-background px-4 font-display text-[13px] text-foreground outline-none placeholder:text-[#FCD402]"
                style={{ borderColor: "#1D5EDE" }}
              />
              <button
                type="submit"
                className="absolute right-[7px] top-[7px] h-[34px] rounded-[10px] px-3 font-display text-[13px] font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
                style={{ backgroundColor: "#1D5EDE", color: "#FCD402" }}
              >
                subscribe
              </button>
            </form>
            <p className="mt-3 text-[12px] text-foreground">
              {sent
                ? "thanks — you're on the list."
                : "get color inspiration delivered to your inbox"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-[20px] font-bold text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.label} style={{ lineHeight: "26px" }}>
                      <a
                        href="#top"
                        className="whitespace-nowrap font-display text-[17px] transition-opacity duration-200 hover:opacity-70"
                        style={{ color: l.color }}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-display text-[20px] font-bold text-foreground">
              Follow the colors
            </h3>
            <div className="mt-4 flex gap-3">
              {[Instagram, Facebook, Linkedin, Music2].map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  className="transition-transform duration-200 hover:scale-125"
                  aria-label="social link"
                >
                  <Icon size={22} className="text-foreground" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-1 text-center text-[12px] text-foreground/50">
          <p>© 2026 nuansic.</p>
          <p>made with love and lots of color.</p>
          <p>privacy · terms · cookies</p>
        </div>
      </div>
    </footer>
  );
}
