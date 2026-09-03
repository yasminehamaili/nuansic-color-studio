import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";
import { AuthShell, AuthInput, AuthButton, AuthError, AuthFootnote } from "./AuthShell";

export function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    if (!email || !password) {
      setError("Enter an email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is enabled in your Supabase project, there's no
    // active session yet — show a "check your email" state instead of
    // navigating straight in.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    navigate({ to: "/" });
  };

  if (checkEmail) {
    return (
      <AuthShell>
        <p className="text-center font-display text-[15px]" style={{ color: "#0B0B0B" }}>
          Check your inbox to confirm your email, then log in.
        </p>
        <div className="mt-4">
          <AuthButton onClick={() => navigate({ to: "/login" })}>Go to Log in</AuthButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-3">
        <AuthInput type="email" placeholder="Email" value={email} onChange={setEmail} autoComplete="email" />
        <AuthInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <AuthInput
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
      </div>

      <div className="mt-4">
        <AuthButton onClick={handleSignUp} disabled={loading}>
          {"Sign Up"}
        </AuthButton>
      </div>

      <AuthError message={error} />

      <AuthFootnote>
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold" style={{ color: "#E87323" }}>
            Log in
          </Link>
        </span>
        <Link to="/">← Back</Link>
      </AuthFootnote>
    </AuthShell>
  );
}
