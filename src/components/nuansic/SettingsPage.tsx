import { useState } from "react";
import { supabase } from "../../lib/supabase-client";
import { useRequireAuth } from "../../lib/useRequireAuth";
import { useUserProfile } from "../../lib/useUserProfile";
import { BillingSummary } from "./BillingSummary";
import { PageShell } from "./PageShell";

type Tab = "account" | "notifications" | "billing";

export function SettingsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { profile, loading, updateProfile } = useUserProfile(user?.id);
  const [tab, setTab] = useState<Tab>("account");

  // --- Username ---
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [usernameError, setUsernameError] = useState("");

  // --- Password ---
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState("");

  // --- Email ---
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  // --- Notifications ---
  const [notifSaving, setNotifSaving] = useState<string | null>(null);

  async function saveUsername() {
    const trimmed = usernameInput.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameStatus("error");
      setUsernameError("Username must be 3-20 characters: letters, numbers, underscore only.");
      return;
    }
    setUsernameStatus("saving");
    const { error } = await updateProfile({ username: trimmed });
    if (error) {
      setUsernameStatus("error");
      setUsernameError(error.includes("duplicate") ? "That username is already taken." : error);
      return;
    }
    setUsernameStatus("saved");
    setEditingUsername(false);
    setTimeout(() => setUsernameStatus("idle"), 1500);
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setPwStatus("error");
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwStatus("saving");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwStatus("error");
      setPwError(error.message);
      return;
    }
    setPwStatus("saved");
    setNewPassword("");
    setTimeout(() => setPwStatus("idle"), 2000);
  }

  async function changeEmail() {
    if (!newEmail.includes("@")) {
      setEmailStatus("error");
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailStatus("saving");
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setEmailStatus("error");
      setEmailError(error.message);
      return;
    }
    setEmailStatus("saved");
    setNewEmail("");
    setTimeout(() => setEmailStatus("idle"), 2000);
  }

  async function toggleNotif(
    field: "notify_product_updates" | "notify_color_of_day" | "notify_saved_palette_tips",
    current: boolean
  ) {
    setNotifSaving(field);
    await updateProfile({ [field]: !current });
    setNotifSaving(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (authLoading || loading || !profile) {
    return (
      <PageShell>
        <div className="p-10 text-center text-neutral-500">Loading settings…</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="flex gap-6 border-b border-neutral-200 mb-8">
        {(["account", "notifications", "billing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm capitalize ${
              tab === t ? "border-b-2 border-black font-medium" : "text-neutral-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div>
          {/* Username lives here, not on the public Profile page */}
          <div className="mb-8">
            <label className="text-xs uppercase tracking-wide text-neutral-500">Username</label>
            {editingUsername ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm"
                  autoFocus
                />
                <button onClick={saveUsername} className="rounded-full bg-black px-4 py-2 text-sm text-white">
                  Save
                </button>
                <button
                  onClick={() => setEditingUsername(false)}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between">
                <span>{profile.username || <span className="text-neutral-400">Not set</span>}</span>
                <button
                  onClick={() => {
                    setUsernameInput(profile.username || "");
                    setEditingUsername(true);
                  }}
                  className="text-sm underline underline-offset-2 hover:opacity-70"
                >
                  Edit
                </button>
              </div>
            )}
            {usernameStatus === "error" && <p className="mt-2 text-sm text-red-600">{usernameError}</p>}
            {usernameStatus === "saved" && <p className="mt-2 text-sm text-green-600">Username updated.</p>}
          </div>

          <div className="mb-8">
            <label className="text-xs uppercase tracking-wide text-neutral-500">Change password</label>
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm"
              />
              <button onClick={changePassword} className="rounded-full bg-black px-4 py-2 text-sm text-white">
                Update
              </button>
            </div>
            {pwStatus === "error" && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
            {pwStatus === "saved" && <p className="mt-2 text-sm text-green-600">Password updated.</p>}
          </div>

          <div className="mb-8">
            <label className="text-xs uppercase tracking-wide text-neutral-500">Change email</label>
            <p className="text-xs text-neutral-400 mt-1">Current: {profile.email}</p>
            <div className="mt-2 flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm"
              />
              <button onClick={changeEmail} className="rounded-full bg-black px-4 py-2 text-sm text-white">
                Update
              </button>
            </div>
            {emailStatus === "error" && <p className="mt-2 text-sm text-red-600">{emailError}</p>}
            {emailStatus === "saved" && (
              <p className="mt-2 text-sm text-green-600">Check both inboxes to confirm the change.</p>
            )}
          </div>

          <button onClick={handleSignOut} className="text-sm underline underline-offset-2 hover:opacity-70">
            Log out
          </button>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-5">
          <NotifRow
            label="Product updates"
            description="Occasional emails about new features and changes to Nuansic."
            checked={profile.notify_product_updates}
            saving={notifSaving === "notify_product_updates"}
            onToggle={() => toggleNotif("notify_product_updates", profile.notify_product_updates)}
          />
          <NotifRow
            label="Color of the Day"
            description="A daily email with that day's featured color and its role across all four domains."
            checked={profile.notify_color_of_day}
            saving={notifSaving === "notify_color_of_day"}
            onToggle={() => toggleNotif("notify_color_of_day", profile.notify_color_of_day)}
          />
          <NotifRow
            label="Tips for your saved palettes"
            description="Occasional suggestions related to palettes you've saved."
            checked={profile.notify_saved_palette_tips}
            saving={notifSaving === "notify_saved_palette_tips"}
            onToggle={() => toggleNotif("notify_saved_palette_tips", profile.notify_saved_palette_tips)}
          />
        </div>
      )}

      {tab === "billing" && <BillingSummary profile={profile} />}
    </div>
    </PageShell>
  );
}

function NotifRow({
  label,
  description,
  checked,
  saving,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        disabled={saving}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-black" : "bg-neutral-300"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
