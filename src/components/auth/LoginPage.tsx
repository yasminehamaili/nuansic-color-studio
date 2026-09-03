import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";
import { AuthShell, AuthInput, AuthButton, AuthError, AuthFootnote } from "./AuthShell";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <AuthShell>
      <div className="flex flex-col gap-3">
        <AuthInput
          type="email"
          placeholder="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthInput
          type="password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
      </div>

      <div className="mt-4">
        <AuthButton onClick={handleLogin} disabled={loading}>
          {"Log in"}
        </AuthButton>
      </div>

      <AuthError message={error} />

      <AuthFootnote>
        <Link to="/forgot-password" className="font-semibold" style={{ color: "#E87323" }}>
          Forgot password?
        </Link>
        <span>
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold" style={{ color: "#E87323" }}>
            Sign Up
          </Link>
        </span>
        <Link to="/">← Back</Link>
      </AuthFootnote>
    </AuthShell>
  );
}
