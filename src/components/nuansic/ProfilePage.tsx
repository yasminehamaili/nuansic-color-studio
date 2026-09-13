import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useRequireAuth } from "../../lib/useRequireAuth";
import { useUserProfile } from "../../lib/useUserProfile";
import { usernameFromId } from "../../lib/username";
import { PageShell } from "./PageShell";

export function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useUserProfile(user?.id);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (authLoading || loading || !profile) {
    return (
      <PageShell>
        <div className="p-10 text-center text-neutral-500">Loading profile…</div>
      </PageShell>
    );
  }

  const fallbackName = usernameFromId(profile.id);
  const displayName = profile.display_name || fallbackName;
  const avatarSrc =
    profile.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.id}`;

  async function saveDisplayName() {
    const trimmed = nameInput.trim();
    setStatus("saving");
    const { error } = await updateProfile({ display_name: trimmed || null });
    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }
    setStatus("saved");
    setEditingName(false);
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setErrorMsg("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus("error");
      setErrorMsg("Image must be under 5MB.");
      return;
    }
    setAvatarUploading(true);
    const { error } = await uploadAvatar(file);
    setAvatarUploading(false);
    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <PageShell>
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold mb-8">User profile</h1>

      <div className="flex items-center gap-4 mb-10">
        <div className="relative">
          <img
            src={avatarSrc}
            alt="Profile"
            className="h-20 w-20 rounded-full object-cover border border-neutral-200"
          />
          {avatarUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white text-xs">
              …
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm underline underline-offset-2 hover:opacity-70"
          >
            Change photo
          </button>
          <p className="text-xs text-neutral-500 mt-1">JPG or PNG, up to 5MB.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            style={{ display: "none" }}
            onChange={handleAvatarPick}
          />
        </div>
      </div>

      <div className="mb-6 border-b border-neutral-200 pb-6">
        <label className="text-xs uppercase tracking-wide text-neutral-500">Name</label>
        {editingName ? (
          <div className="mt-2 flex gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm"
              autoFocus
            />
            <button onClick={saveDisplayName} className="rounded-full bg-black px-4 py-2 text-sm text-white">
              Save
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <span>{displayName}</span>
            <button
              onClick={() => {
                setNameInput(profile.display_name || "");
                setEditingName(true);
              }}
              className="text-sm underline underline-offset-2 hover:opacity-70"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="mb-6 border-b border-neutral-200 pb-6">
        <label className="text-xs uppercase tracking-wide text-neutral-500">Username</label>
        <div className="mt-1 flex items-center justify-between">
          <span>{profile.username ? `@${profile.username}` : <span className="text-neutral-400">Not set</span>}</span>
          <Link to="/settings" className="text-sm underline underline-offset-2 hover:opacity-70">
            Change in Settings
          </Link>
        </div>
      </div>

      <div className="mb-6 border-b border-neutral-200 pb-6">
        <label className="text-xs uppercase tracking-wide text-neutral-500">Email</label>
        <p className="mt-1">{profile.email}</p>
      </div>

      <div className="mb-6">
        <label className="text-xs uppercase tracking-wide text-neutral-500">AI credits</label>
        <div className="mt-1 flex items-center justify-between">
          <span>{profile.ai_credits}</span>
          <Link to="/upgrade" className="text-sm underline underline-offset-2 hover:opacity-70">
            Upgrade
          </Link>
        </div>
      </div>

      {status === "error" && <p className="mt-4 text-sm text-red-600">{errorMsg}</p>}
      {status === "saved" && <p className="mt-4 text-sm text-green-600">Saved.</p>}
    </div>
    </PageShell>
  );
}
