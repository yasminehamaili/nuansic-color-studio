import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "../../lib/supabase-client";
import type { UserProfile } from "../../lib/useUserProfile";

interface BillingRow {
  id: string;
  amount_cents: number;
  credits_granted: number;
  status: string;
  created_at: string;
}

export function BillingSummary({ profile }: { profile: UserProfile }) {
  const [history, setHistory] = useState<BillingRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("billing_history")
      .select("id, amount_cents, credits_granted, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setHistory((data as BillingRow[]) || []);
          setHistoryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Billing</h2>
      <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 mb-8">
        <div>
          <p className="text-sm text-neutral-500">Current balance</p>
          <p className="text-xl font-semibold">{profile.ai_credits} credits</p>
        </div>
        <Link
          to="/upgrade"
          className="rounded-full bg-black text-white text-sm px-5 py-2.5"
        >
          Buy more credits
        </Link>
      </div>

      <h3 className="text-sm font-medium mb-3">Purchase history</h3>
      {historyLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-neutral-400">No purchases yet.</p>
      ) : (
        <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
          {history.map((row) => (
            <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>{new Date(row.created_at).toLocaleDateString()}</span>
              <span>{row.credits_granted} credits</span>
              <span>${(row.amount_cents / 100).toFixed(2)}</span>
              <span className="capitalize text-neutral-500">{row.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}