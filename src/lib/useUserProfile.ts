import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type UserProfile = {
  id: string;
  email: string;
  ai_credits: number;
  created_at: string;
};

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    supabase
      .from("users")
      .select("id, email, ai_credits, created_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data as UserProfile | null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { profile, loading };
}
