import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";
import { useRequireAuth } from "@/lib/useRequireAuth";

export function SettingsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="font-display text-[14px]" style={{ color: "#6B6863" }}>
          Loading...
        </p>
      </div>
    );
  }

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match.");
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPasswordSaved(true);
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const handleChangeEmail = async () => {
    setEmailError(null);
    setEmailSent(false);
    if (!newEmail.includes("@")) {
      setEmailError("Enter a valid email.");
      return;
    }
    setEmailSaving(true);
    // Supabase sends confirmation emails to both the old and new address by
    // default — the change only takes effect once confirmed, so this is
    // safe even though it looks like an immediate update.
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);
    if (error) {
      setEmailError(error.message);
      return;
    }
    setEmailSent(true);
    setNewEmail("");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] px-6 py-16">
      <div className="mx-auto max-w-[480px]">
        <p className="font-display text-[24px] font-bold" style={{ color: "#0B0B0B" }}>
          Settings
        </p>

        <div className="mt-6 rounded-[16px] bg-white p-5" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <p className="font-display text-[15px] font-bold" style={{ color: "#0B0B0B" }}>
            Email
          </p>
          <p className="mt-1 font-display text-[13px]" style={{ color: "#6B6863" }}>
            Currently: {user.email}
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            <input
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-full bg-[#F5F5F5] px-5 py-2.5 font-display text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={emailSaving}
              className="mt-1 rounded-full py-2.5 font-display text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#0B0B0B" }}
            >
              {emailSaving ? "Sending..." : emailSent ? "Check both inboxes to confirm" : "Update email"}
            </button>
            {emailError && (
              <p className="font-display text-[13px]" style={{ color: "#B3261E" }}>
                {emailError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-[16px] bg-white p-5" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <p className="font-display text-[15px] font-bold" style={{ color: "#0B0B0B" }}>
            Password
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-full bg-[#F5F5F5] px-5 py-2.5 font-display text-[14px] outline-none"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-full bg-[#F5F5F5] px-5 py-2.5 font-display text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordSaving}
              className="mt-1 rounded-full py-2.5 font-display text-[14px] font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#0B0B0B" }}
            >
              {passwordSaving ? "Saving..." : passwordSaved ? "Password updated!" : "Update password"}
            </button>
            {passwordError && (
              <p className="font-display text-[13px]" style={{ color: "#B3261E" }}>
                {passwordError}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 w-full rounded-full py-3 font-display text-[14px] font-semibold"
          style={{ backgroundColor: "#F2E4D8", color: "#E87323" }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
