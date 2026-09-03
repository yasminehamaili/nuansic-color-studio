import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { AccountMenu } from "./AccountMenu";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="mx-auto flex h-[64px] w-full max-w-[1500px] items-center justify-between px-6">
        <a
          href="#top"
          className="font-display text-[20px] font-extrabold tracking-tight text-foreground transition-transform duration-200 hover:-rotate-2 md:text-[27px]"
        >
          <img
            src="/nuansic-logo1.png"
            alt="Nuansic Logo"
            width={50}
            height={50}
            className="mt-4"
          />
        </a>

        {/* Avoid a flash of the wrong state before the initial session
            check resolves — render nothing in that brief window. */}
        {!checked ? null : user ? (
          <AccountMenu userId={user.id} />
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="flex h-[34px] w-[72px] items-center justify-center rounded-[30px] bg-muted text-[13px] font-medium text-foreground transition-all duration-200 hover:scale-105 active:scale-95 md:w-[80px]"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="flex h-[34px] w-[72px] items-center justify-center rounded-[30px] bg-foreground text-[13px] font-medium text-background transition-all duration-200 hover:scale-105 active:scale-95 md:w-[80px]"
            >
              Sign Up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
