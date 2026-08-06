# Urban Aura

A streetwear brand storefront — static HTML/CSS/JS frontend, backed by a Supabase database for products and orders. Checkout is handled by Paystack; a Supabase Edge Function receives Paystack's webhook to record orders and decrement stock server-side, independent of the customer's browser staying open. Order confirmation emails go through EmailJS. Customer contact happens via the WhatsApp chat widget and the header/footer social links (no dedicated contact page/form).

## Folder structure

```
Urban Aura/
├── index.html          Landing page (hero slideshow, trust row)
├── shop.html            Full product grid (loads live from Supabase)
├── cart.html             Cart (quantity/remove controls)
├── checkout.html         Order form + Paystack payment
├── assets/
│   ├── css/
│   │   └── style.css     All site styling
│   ├── js/
│   │   ├── supabase-config.js   Supabase project URL + publishable key
│   │   └── script.js            Cart logic, product rendering, nav, toasts — shared by every page
│   └── images/
│       ├── products/     Product photos
│       ├── hero/         Homepage hero assets
│       └── lookbook/      Lifestyle photos used in the hero slideshow
├── supabase/
│   └── functions/
│       └── paystack-webhook/
│           └── index.ts   Deployed via the Supabase Dashboard (Edge Functions), not the CLI
└── README.md
```

Every page loads `assets/css/style.css`, then `assets/js/script.js`. `shop.html` additionally loads the Supabase JS client (CDN) and `supabase-config.js` before `script.js`, since it fetches the product catalog live.

## Running it locally

No build tools needed, but open the HTML files through a local server rather than `file://`. Any static server works, e.g.:

```
npx serve .
```

Then visit `http://localhost:3000` (or whatever port it prints).

## The backend (Supabase)

Project: `Urban-Aura` at supabase.com. Two tables:

- **`products`** — publicly readable (that's how the shop page displays them), but not publicly writable. Columns: `name`, `price`, `image`, `featured`, `stock`.
- **`orders`** — completely locked down (Row Level Security enabled, no public policies at all). The publishable key used in the browser cannot read or write it under any circumstance. Only the webhook function (using the secret service-role key, never exposed to the browser) can write to it. View orders through the Supabase Table Editor.

## Managing products

Add, edit, or retire products directly in the Supabase **Table Editor** → `products` table. No code changes needed — the shop page re-fetches on every load.

- **Add a product** — insert a row. Drop its photo in `assets/images/products/` and reference that path in the `image` column. (The `featured` column is currently unused — the homepage Bestsellers strip was removed — safe to ignore.)
- **Stock** — `stock` is decremented automatically by the Paystack webhook when an order comes in for that product (matched by name). You can also edit it by hand for manual restocks/corrections:
  - `stock` at `0` — shows a "Sold Out" badge, hides the buy controls, shows an "Ask about restock" WhatsApp link instead.
  - The exact number left is never shown to customers — it's only used internally to cap the quantity picker so nobody can order more than you actually have (also accounts for what a customer already has sitting in their cart).

## Orders & the Paystack webhook

`checkout.html` sends the full order (customer details, cart items, pricing) to Paystack as `metadata` on the transaction. When Paystack confirms payment, it calls the deployed Edge Function directly (server-to-server) — that function:

1. Verifies the request is genuinely from Paystack (HMAC signature check using `PAYSTACK_SECRET_KEY`, set as a function secret in the Supabase Dashboard, never in this repo).
2. Writes the order into the `orders` table (skips it if that reference was already processed, so Paystack retries don't create duplicates).
3. Decrements `stock` in `products` for each item purchased.

This means an order gets recorded even if the customer's connection drops or they close the tab right after paying — it doesn't depend on their browser successfully doing anything after payment.

The confirmation email checkout.html sends via EmailJS afterward is a courtesy copy only; its failure doesn't affect whether the order was recorded.

To redeploy the function after editing `supabase/functions/paystack-webhook/index.ts`: Supabase Dashboard → Edge Functions → `paystack-webhook` → Code → paste the updated file → Deploy.

## Features

- Live product catalog backed by a real database — add/retire products without touching code
- Cart with per-item size, quantity steppers, and remove — synced across a floating mini-cart preview, the cart page, and checkout
- Orders recorded server-side via a verified Paystack webhook, independent of the customer's browser
- Toast notifications instead of browser alerts
- Mobile nav (hamburger), responsive grid, floating WhatsApp chat widget
- Paystack checkout with delivery fee calculation
- EmailJS order confirmation email

## Tools used

- HTML, CSS, vanilla JavaScript (no framework, no bundler)
- [Supabase](https://supabase.com) for the database and the order-processing Edge Function
- [Paystack](https://paystack.com) for payment
- [EmailJS](https://www.emailjs.com) for order/contact emails
