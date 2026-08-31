import { useEffect, useState } from "react";

const API_URL = "http://localhost:8000";

const LABELS: Record<string, string> = {
  uiux: "UI/UX",
  graphic_design: "Graphic Design",
  home_interior: "Interior Home Design",
  fashion: "Fashion",
};

const ORDER = ["uiux", "graphic_design", "home_interior", "fashion"];

type Entry = { headline: string; detail: string };
type ColorOfTheDayResponse = {
  date: string;
  color: string;
  entries: Record<string, Entry>;
};

export function ColorOfTheDay() {
  const [data, setData] = useState<ColorOfTheDayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/color-of-the-day`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) return null;

  return (
    <section className="w-full py-3">
      <div className="mx-auto max-w-[1000px] rounded-[16px] px-6 py-12">
        <div className="flex flex-col items-center text-center">
          <span className="font-display text-[32px] font-bold text-black">
            {data.color.toUpperCase()}
          </span>
          <div
            className="mt-4 h-[96px] w-[96px] rounded-[16px]"
            style={{ backgroundColor: data.color }}
          />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          {ORDER.map((category) => {
            const entry = data.entries[category];
            if (!entry) return null;
            return (
              <div key={category} className="text-center">
                <p
                  className="font-display text-[13px] font-bold uppercase tracking-wide"
                  style={{ color: data.color }}
                >
                  {LABELS[category] ?? category}
                </p>
                <p className="mt-1 font-display text-[14px] font-bold text-#0B0B0B">
                  {entry.headline}
                </p>
                <p className="mt-1 font-display text-[12px] leading-snug text-#0B0B0B/70">
                  {entry.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
