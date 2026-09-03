import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

/**
 * For pages that require a logged-in user (Profile, Saved Palettes,
 * Settings). Redirects to /login if there's no session once the initial
 * check resolves. `loading` stays true until that check completes, so
 * pages can avoid a flash of empty/redirect state.
 */
export function useRequireAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate({ to: "/login" });
        return;
      }
      setUser(session.user);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return { user, loading };
}
