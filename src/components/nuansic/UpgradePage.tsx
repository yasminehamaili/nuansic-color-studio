import { useState } from "react";
import { supabase } from "../../lib/supabase-client";
import { useRequireAuth } from "../../lib/useRequireAuth";
import { useUserProfile } from "../../lib/useUserProfile";
import { PageShell } from "./PageShell";

const PACKS = [
  { id: "pack_20", label: "20 credits", price: "$4.99", blurb: "Try it out" },
  { id: "pack_50", label: "50 credits", price: "$9.99", blurb: "Most popular" },
  { id: "pack_150", label: "150 credits", price: "$19.99", blurb: "Best value" },
];

export function UpgradePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { profile, loading } = useUserProfile(user?.id);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function buyPack(packId: string) {
    setBuying(packId);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Please log in again.");
      setBuying(null);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ pack: packId }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout.");
        setBuying(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error starting checkout.");
      setBuying(null);
    }
  }

  if (authLoading || loading || !profile) {
    return (
      <PageShell>
        <div className="p-10 text-center text-neutral-500">Loading…</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold mb-2">Get more AI credits</h1>
      <p className="text-neutral-500 mb-1">
        You currently have <span className="font-medium text-black">{profile.ai_credits}</span> credits.
      </p>
      <p className="text-sm text-neutral-400 mb-10">
        Each palette generation uses 1 credit. Buy a pack below to keep creating.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className="rounded-2xl border border-neutral-200 p-6 flex flex-col items-center"
          >
            <span className="text-xs uppercase tracking-wide text-neutral-400">{pack.blurb}</span>
            <span className="text-2xl font-semibold mt-2">{pack.price}</span>
            <span className="text-sm text-neutral-500 mt-1">{pack.label}</span>
            <button
              onClick={() => buyPack(pack.id)}
              disabled={buying !== null}
              className="mt-6 w-full rounded-full bg-black text-white text-sm py-2.5 disabled:opacity-50"
            >
              {buying === pack.id ? "Redirecting…" : "Buy now"}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <p className="mt-10 text-xs text-neutral-400">
        Payments are processed securely by Stripe. Credits are added to your account
        automatically once payment is confirmed.
      </p>
    </div>
    </PageShell>
  );
}