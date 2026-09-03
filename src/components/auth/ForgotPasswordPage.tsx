import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";
import { AuthShell, AuthInput, AuthButton, AuthError, AuthFootnote } from "./AuthShell";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell>
        <p className="text-center font-display text-[15px]" style={{ color: "#0B0B0B" }}>
          If an account exists for that email, a reset link is on its way.
        </p>
        <div className="mt-4">
          <AuthButton onClick={() => navigate({ to: "/login" })}>Back to Log in</AuthButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthInput type="email" placeholder="Email" value={email} onChange={setEmail} autoComplete="email" />

      <div className="mt-4">
        <AuthButton onClick={handleSend} disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </AuthButton>
      </div>

      <AuthError message={error} />

      <AuthFootnote>
        <Link to="/login">← Back to Log in</Link>
      </AuthFootnote>
    </AuthShell>
  );
}
