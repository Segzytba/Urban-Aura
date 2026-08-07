// Paystack webhook: runs on Supabase's servers, not the customer's browser.
// Paystack calls this directly the instant a payment clears, so an order
// gets recorded (and the order-notification emails go out) even if the
// customer's connection drops or they close the tab right after paying.
//
// Deploy this via the Supabase Dashboard -> Edge Functions (paste this file's
// contents in there). Needs one secret set in that function's settings:
//   PAYSTACK_SECRET_KEY - from Paystack Dashboard -> Settings -> API Keys & Webhooks
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// Supabase for every Edge Function - no setup needed for those two.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Same EmailJS service/template/key checkout.html used to use client-side -
// moved server-side so it fires reliably even if the customer's browser
// closes right after paying. The "Contact Us" template is the admin
// new-order alert (To Email is hardcoded to the shop owner); it has a linked
// Auto-Reply template that sends the customer's order confirmation to
// whichever address is in the `email` param below - one send triggers both.
const EMAILJS_SERVICE_ID = 'service_29moyrs';
const EMAILJS_TEMPLATE_ID = 'template_38x21c9';
const EMAILJS_PUBLIC_KEY = 'QQOHK4e4OmAmnBa_a';

async function sendOrderEmail(params: Record<string, string>): Promise<void> {
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // EmailJS restricts its public key to requests from allowed origins;
        // this mirrors the site's own origin since the call now comes from
        // this server instead of the customer's browser.
        'Origin': 'https://urban-aura.netlify.app',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: params,
      }),
    });
    if (!res.ok) {
      console.error('EmailJS send failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('EmailJS send threw:', err);
  }
}

async function isFromPaystack(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!(await isFromPaystack(rawBody, signature))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== 'charge.success') {
    return new Response('Ignored', { status: 200 });
  }

  const data = event.data;
  const metadata = data.metadata || {};
  const items = Array.isArray(metadata.items) ? metadata.items : [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Paystack may retry the same webhook - don't create a duplicate order.
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('reference', data.reference)
    .maybeSingle();

  if (existing) {
    return new Response('Already processed', { status: 200 });
  }

  // Atomically decrement stock BEFORE inserting the order, so a payment
  // that can't actually be fulfilled is clearly flagged rather than quietly
  // recorded as a normal paid order. decrement_stock_by_name does the
  // check-and-subtract as a single conditional UPDATE inside Postgres
  // (`WHERE stock >= qty`), which is what actually closes the race: two
  // webhook calls for the last unit running at the same instant can't both
  // read "1 left" and both succeed the way a separate SELECT-then-UPDATE
  // would let them. By the time payment reaches this webhook the customer
  // has already been charged either way (Paystack doesn't know about our
  // inventory), so a failed decrement can't stop the order - it gets
  // recorded with an 'oversold' status instead of 'paid' so it's
  // impossible to miss in the admin dashboard and needs a manual refund.
  const oversoldItems: string[] = [];
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const { data: success, error: rpcError } = await supabase.rpc('decrement_stock_by_name', {
      p_name: item.productName,
      p_qty: qty,
    });

    if (rpcError) {
      console.error('Stock decrement RPC failed:', rpcError);
    } else if (!success) {
      oversoldItems.push(`${item.productName} x${qty}`);
    }
  }

  const { error: insertError } = await supabase.from('orders').insert({
    reference: data.reference,
    customer_name: metadata.full_name || '',
    email: data.customer?.email || '',
    phone: metadata.phone || '',
    address: metadata.address || '',
    country: metadata.country || 'Nigeria',
    state: metadata.state || '',
    items,
    subtotal: metadata.subtotal || 0,
    fee: metadata.fee || 0,
    total: Math.round(data.amount / 100),
    status: oversoldItems.length > 0 ? 'oversold' : 'paid',
  });

  if (insertError) {
    console.error('Failed to insert order:', insertError);
    return new Response('Failed to save order', { status: 500 });
  }

  // Fires the admin new-order alert, which triggers the linked customer
  // confirmation as an auto-reply (see the EMAILJS_* constants above).
  // Best-effort: an email hiccup here shouldn't turn a successfully
  // recorded order into a failed webhook response.
  const orderDetailsText = items
    .map((item: { productName?: string; size?: string; quantity?: number; price?: number }) => {
      const qty = Number(item.quantity) || 1;
      const lineTotal = (Number(item.price) || 0) * qty;
      return `📦 ${item.productName || 'Item'} (${item.size || 'M'}) x${qty} - ₦${lineTotal.toLocaleString()}`;
    })
    .join('\n');

  const oversoldWarning = oversoldItems.length > 0
    ? `⚠️ OVERSOLD - ALREADY PAID, MANUAL REFUND/RESTOCK NEEDED: ${oversoldItems.join(', ')} ⚠️\n\n`
    : '';

  await sendOrderEmail({
    fullname: metadata.full_name || '',
    email: data.customer?.email || '',
    phone: metadata.phone || '',
    address: metadata.address || '',
    amount: Math.round(data.amount / 100).toLocaleString(),
    reference: data.reference,
    order: oversoldWarning + orderDetailsText,
  });

  return new Response('OK', { status: 200 });
});
