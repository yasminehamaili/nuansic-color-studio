import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useRequireAuth } from "@/lib/useRequireAuth";

type SavedColor = { hex: string; label: string };
type SavedPalette = {
  id: string;
  colors: SavedColor[];
  created_at: string;
};

export function SavedPalettesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [palettes, setPalettes] = useState<SavedPalette[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from("palettes")
      .select("id, colors, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setPalettes((data as SavedPalette[] | null) ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const copy = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1200);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("palettes").delete().eq("id", id);
    setDeletingId(null);
    if (!error) {
      setPalettes((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="font-display text-[14px]" style={{ color: "#6B6863" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] px-6 py-16">
      <div className="mx-auto max-w-[700px]">
        <p className="font-display text-[24px] font-bold" style={{ color: "#0B0B0B" }}>
          Saved Palettes
        </p>

        {palettes === null ? (
          <p className="mt-6 font-display text-[14px]" style={{ color: "#6B6863" }}>
            Loading...
          </p>
        ) : palettes.length === 0 ? (
          <p className="mt-6 font-display text-[14px]" style={{ color: "#6B6863" }}>
            No saved palettes yet — generate one in the Workspace and hit "Save palette."
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {palettes.map((palette) => (
              <div
                key={palette.id}
                className="rounded-[16px] bg-white p-4"
                style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-[12px]" style={{ color: "#6B6863" }}>
                    {new Date(palette.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(palette.id)}
                    disabled={deletingId === palette.id}
                    className="font-display text-[12px] font-semibold disabled:opacity-50"
                    style={{ color: "#B3261E" }}
                  >
                    {deletingId === palette.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
                <div className="mt-2 flex h-[70px] gap-1.5 overflow-hidden rounded-[10px]">
                  {palette.colors.map((c, i) => (
                    <button
                      key={`${c.hex}-${i}`}
                      type="button"
                      onClick={() => copy(c.hex)}
                      title={`${c.label} — click to copy ${c.hex}`}
                      className="flex-1 transition-transform duration-150 hover:-translate-y-0.5"
                      style={{ backgroundColor: c.hex }}
                    >
                      <span className="sr-only">{copied === c.hex ? "copied!" : c.hex}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
