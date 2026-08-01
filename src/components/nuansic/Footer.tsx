import { useState } from "react";
import { Instagram, Facebook, Linkedin, Music2 } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "color picker", color: "#1E997D" },
      { label: "ai palettes", color: "#7B37FE" },
      { label: "image extract", color: "#FE564B" },
      { label: "saved palettes", color: "#FC71CE" },
    ],
  },
  {
    title: "Fields",
    links: [
      { label: "ui/ux design", color: "#1D5EDE" },
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
    <footer className="w-full border-t border-foreground/10 pb-10 pt-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-[82px]">
        <div className="grid gap-12 lg:grid-cols-[420px_1fr_auto]">
          <div>
            <h2 className="font-display text-[30px] font-semibold leading-tight text-foreground md:text-[40px]">
              pick a color. we&apos;ll build{" "}
              <span className="font-script text-[42px] font-bold text-accent md:text-[56px]">
                your world
              </span>
            </h2>
            <form
              className="relative mt-8 w-full max-w-[389px]"
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
                className="h-[75px] w-full rounded-[20px] border-2 bg-background px-6 font-display text-[18px] text-foreground outline-none placeholder:text-[#FCD402]"
                style={{ borderColor: "#1D5EDE" }}
              />
              <button
                type="submit"
                className="absolute right-[10px] top-[13px] h-[49px] rounded-[15px] px-5 font-display text-[18px] font-semibold transition-transform duration-200 hover:scale-105 active:scale-95"
                style={{ backgroundColor: "#1D5EDE", color: "#FCD402" }}
              >
                subscribe
              </button>
            </form>
            <p className="mt-3 text-[17px] text-foreground">
              {sent
                ? "thanks — you're on the list."
                : "get color drops and palette tips. no spam, promise."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-[25px] font-bold text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.label} style={{ lineHeight: "40px" }}>
                      <a
                        href="#top"
                        className="font-display text-[23px] transition-opacity duration-200 hover:opacity-70"
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
            <h3 className="font-display text-[25px] font-bold text-foreground">
              Follow the colors
            </h3>
            <div className="mt-6 flex gap-4">
              {[Instagram, Facebook, Linkedin, Music2].map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  className="transition-transform duration-200 hover:scale-125"
                  aria-label="social link"
                >
                  <Icon size={35} className="text-foreground" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 space-y-1 text-center text-[14px] text-foreground/50">
          <p>© 2026 nuansic — made with love and lots of color.</p>
          <p>privacy / terms / cookies</p>
        </div>
      </div>
    </footer>
  );
}
