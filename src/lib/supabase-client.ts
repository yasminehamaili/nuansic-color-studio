import { createClient } from "@supabase/supabase-js";

// Values come from the root `.env` file (see `.env.example`). This module is
// evaluated at import time, and it sits in the SSR module graph of every
// route (router.tsx -> routeTree.gen -> routes -> Header/Workspace ->
// lib/color-ai -> here). Throwing here therefore takes the entire app down
// with `Error: supabaseUrl is required.` during renderToReadableStream,
// instead of giving a useful message. So: warn loudly and fall back to
// placeholders, letting Supabase calls fail at call time where the UI can
// actually report it.
// Bracket access is required: tsconfig sets
// `noPropertyAccessFromIndexSignature: true`, so `import.meta.env.X` is a
// TS4111 error. This matches the convention already used in lib/color-ai.ts.
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"];
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[supabase-client] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Auth, saved palettes, profile and billing will not work. " +
      "Copy .env.example to .env and fill it in, then restart the dev server.",
  );
}

export const supabase = createClient(
  // anon key — safe to expose, RLS does the real work
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "missing-anon-key",
);
