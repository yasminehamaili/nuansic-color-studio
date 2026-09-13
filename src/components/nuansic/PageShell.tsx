import type { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Header } from "./Header";

/**
 * Wraps the inner account pages (Profile, Settings, Saved Palettes, Upgrade)
 * with the same site Header used on the landing page, plus a "back" control
 * so people don't get stranded once they're a click deep from the dropdown.
 *
 * Goes back through actual browser history when there is any (so it returns
 * to wherever the user actually came from), and falls back to Home when a
 * page was opened directly (e.g. a bookmark or a fresh tab).
 */
export function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1500px] px-6">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 pb-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
      {children}
    </div>
  );
}