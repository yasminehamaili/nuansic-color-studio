// supabase/functions/stripe-webhook/index.ts
//
// This is the ONLY place ai_credits ever gets increased. create-checkout
// only ever starts a Stripe Checkout Session -- it never touches credits.
// This function is what Stripe calls back once a payment actually
// completes, and only after verifying the request really came from Stripe
// (via the signing secret) does it call add_credits().
//
// NOTE: an earlier version of this file was accidentally replaced with an
// unrelated React component (a copy of the homepage route) during a prior
// edit, which meant Stripe payments could succeed while nobody's credits
// were ever granted. This is the restored, working implementation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// service_role bypasses RLS entirely -- that's required here (this function
// writes billing_history and calls add_credits() on behalf of whichever
// user paid, not on behalf of a logged-in caller), and it's safe only
// because this key never reaches the browser; it lives solely in this
// function's server-side environment.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Stripe signs webhooks as `t=<timestamp>,v1=<hex hmac>`. Verifying this is
// what stops anyone who finds this URL from POSTing a fake
// "payment succeeded, grant 999999 credits" event directly.
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;

  // Reject anything older than 5 minutes -- limits how long a captured
  // request could be replayed even if it were somehow intercepted.
  const age = Date.now() / 1000 - Number(timestamp);
  if (!Number.isFinite(age) || age > 300 || age < -60) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time-ish comparison -- avoids leaking match length via timing.
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const verified = await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    console.error("Stripe webhook: signature verification failed");
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  let event: {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  // Idempotency: Stripe can and does deliver the same event more than
  // once. Inserting the event id first, and treating a conflict as
  // "already handled", is what stops a retried delivery from granting
  // credits twice for one payment.
  const { error: dedupeError } = await supabase
    .from("processed_webhook_events")
    .insert({ event_id: event.id });

  if (dedupeError) {
    // Unique violation -> we've seen this event before. Acknowledge with
    // 200 so Stripe stops retrying, but don't process it again.
    if (dedupeError.code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }
    console.error("Stripe webhook: dedupe insert failed", dedupeError);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent?: string;
      amount_total?: number;
      currency?: string;
      metadata?: { user_id?: string; credits?: string };
    };

    const userId = session.metadata?.user_id;
    const credits = Number(session.metadata?.credits);

    if (!userId || !Number.isFinite(credits) || credits <= 0) {
      console.error("Stripe webhook: missing/invalid metadata on session", session.id);
      return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400 });
    }

    const { error: creditError } = await supabase.rpc("add_credits", {
      target_user_id: userId,
      amount: credits,
    });

    if (creditError) {
      console.error("Stripe webhook: add_credits failed", creditError);
      return new Response(JSON.stringify({ error: "Could not grant credits" }), { status: 500 });
    }

    const { error: historyError } = await supabase.from("billing_history").insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent ?? null,
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      credits_granted: credits,
      status: "completed",
    });

    if (historyError) {
      // Credits were already granted at this point -- log it, but don't
      // fail the webhook over a history-row insert (Stripe would retry
      // and add_credits() has no idempotency of its own to protect it a
      // second time around, unlike this whole handler which does via
      // processed_webhook_events above).
      console.error("Stripe webhook: billing_history insert failed", historyError);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});