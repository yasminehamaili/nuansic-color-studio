import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase-client";

export interface UserProfile {
  id: string;
  email: string;
  ai_credits: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  notify_product_updates: boolean;
  notify_color_of_day: boolean;
  notify_saved_palette_tips: boolean;
}

const EDITABLE_FIELDS = [
  "username",
  "display_name",
  "avatar_url",
  "notify_product_updates",
  "notify_color_of_day",
  "notify_saved_palette_tips",
] as const;

type EditableFields = Pick<UserProfile, (typeof EDITABLE_FIELDS)[number]>;

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, email, ai_credits, username, display_name, avatar_url, notify_product_updates, notify_color_of_day, notify_saved_palette_tips"
      )
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data as UserProfile);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Only ever sends columns from EDITABLE_FIELDS. This list matches
  // exactly what migration_profile_billing.sql + migration_notifications.sql
  // grant UPDATE on for the authenticated role — ai_credits and email
  // aren't in it, and sending them here would be rejected by Postgres
  // itself, not just hidden by this function.
  async function updateProfile(fields: Partial<EditableFields>) {
    if (!userId) return { error: "Not logged in" };
    const { error } = await supabase.from("users").update(fields).eq("id", userId);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }

  async function uploadAvatar(file: File) {
    if (!userId) return { error: "Not logged in" };

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: false });
    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    return updateProfile({ avatar_url: urlData.publicUrl });
  }

  return { profile, loading, refresh, updateProfile, uploadAvatar };
}
