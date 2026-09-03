import type { ReactNode } from "react";

/**
 * Shared shell for the auth pages (Login / SignUp / ForgotPassword) —
 * matches the reference design: plain light background, centered content,
 * no card border, fully-rounded "pill" inputs and buttons with a soft
 * shadow. Logo replaces the reference's "HOKEN*" wordmark.
 *
 * Assumes nuansic-logo2.png lives in /public — adjust the src below if
 * it's actually under src/assets/ instead.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA] px-6">
      <div className="w-full max-w-[350px]">
        <div className="flex justify-center">
          <img src="/nuansic-logo2.png" alt="Nuansic" className="h-[80px] w-auto" />
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function AuthInput({
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      className="w-full rounded-full bg-white px-6 py-3.5 font-display text-[15px] text-[#0B0B0B] outline-none placeholder:text-[#9A9A9A]"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
    />
  );
}

export function AuthButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full py-3.5 font-display text-[15px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      style={
        variant === "primary"
          ? { backgroundColor: "#0B0B0B", color: "#FFFFFF" }
          : { backgroundColor: "#F2E4D8", color: "#E87323" }
      }
    >
      {children}
    </button>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-center font-display text-[13px]" style={{ color: "#B3261E" }}>
      {message}
    </p>
  );
}

export function AuthFootnote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-1.5 font-display text-[13px]" style={{ color: "#6B6863" }}>
      {children}
    </div>
  );
}
