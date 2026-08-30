import { useEffect, useState } from "react";
import { readableTextOn } from "@/lib/color-ai";

const API_URL = "http://localhost:8000";

const LABELS: Record<string, string> = {
  graphic_design: "Graphic Design",
  uiux: "UI/UX",
  home_interior: "Interior Home Design",
  fashion: "Fashion",
};

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

  const textColor = readableTextOn(data.color);

  return (
    <section className="w-full height-[200px]">
      <div className="mx-auto max-w-[2000px]">
        <div
          className="mt-4 flex flex-col gap-8 p-8 md:flex-row md:items-start height-[2000px] "
          style={{ backgroundColor: data.color, color: textColor }}
        >
          <div className="flex flex-col items-start md:w-[180px] md:shrink-0">
            <span className="font-display text-[28px] font-bold">{data.color.toUpperCase()}</span>
            <span className="mt-1 font-display text-[13px] opacity-80">{data.date}</span>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
            {Object.entries(data.entries).map(([category, entry]) => (
              <div key={category}>
                <p className="font-display text-[13px] font-semibold uppercase tracking-wide opacity-70">
                  {LABELS[category] ?? category}
                </p>
                <p className="mt-1 font-display text-[15px] font-bold">{entry.headline}</p>
                <p className="mt-1 font-display text-[13px] leading-snug opacity-90">
                  {entry.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
