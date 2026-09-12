// supabase/functions/create-checkout/index.ts
//
// Called by the logged-in user's browser (with the anon key + their
// own access token) to start a Stripe Checkout session for buying
// AI credits. This function never touches ai_credits itself — it
// only creates a Checkout Session. The actual credit grant happens
// later, only from the stripe-webhook function, only after Stripe
// confirms the payment really happened. That separation is the
// point: even if this function were called a thousand times, no
// credits move until a real, signature-verified payment event
// arrives.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:5173";

// Fixed, server-defined credit packs. Prices and credit amounts are
// NEVER read from the request body — if they were, a user could
// send { credits: 999999, price: 1 } and get free credits. The
// client only ever sends which pack id it wants; this table is the
// single source of truth for what that pack actually costs/grants.
const CREDIT_PACKS: Record<string, { priceCents: number; credits: number; label: string }> = {
  pack_20: { priceCents: 499, credits: 20, label: "20 credits" },
  pack_50: { priceCents: 999, credits: 50, label: "50 credits" },
  pack_150: { priceCents: 1999, credits: 150, label: "150 credits" },
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // 1. Identify the caller from their JWT (never trust a user_id in the body).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401 });
  }
  const userId = userData.user.id;

  // 2. Validate the requested pack against the server-side table only.
  let body: { pack?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const pack = body.pack ? CREDIT_PACKS[body.pack] : undefined;
  if (!pack) {
    return new Response(
      JSON.stringify({ error: "Unknown pack", valid_packs: Object.keys(CREDIT_PACKS) }),
      { status: 400 }
    );
  }

  // 3. Create the Checkout Session via Stripe's REST API directly
  //    (no Stripe SDK dependency needed for this one call).
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${SITE_URL}/settings?billing=success`);
  params.set("cancel_url", `${SITE_URL}/settings?billing=cancelled`);
  // client_reference_id + metadata are what the webhook reads back
  // out later — this is how the payment gets tied to the right user
  // and the right credit amount without trusting anything the
  // client says at that later point either.
  params.set("client_reference_id", userId);
  params.set("metadata[credits]", String(pack.credits));
  params.set("metadata[user_id]", userId);
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][product_data][name]", pack.label);
  params.set("line_items[0][price_data][unit_amount]", String(pack.priceCents));
  params.set("line_items[0][quantity]", "1");

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!stripeRes.ok) {
    const errText = await stripeRes.text();
    console.error("Stripe error:", errText);
    return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 502 });
  }

  const session = await stripeRes.json();
  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
});
