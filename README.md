# Urban Aura

A streetwear brand storefront — static HTML/CSS/JS frontend, backed by a Supabase database for products and orders. Checkout is handled by Paystack; a Supabase Edge Function receives Paystack's webhook to record orders and decrement stock server-side, independent of the customer's browser staying open. Order confirmation emails go through EmailJS. Customer contact happens via the WhatsApp chat widget and the header/footer social links (no dedicated contact page/form).

## Folder structure

```
Urban Aura/
├── index.html            Landing page (hero slideshow, trust row)
├── shop.html             Full product grid (loads live from Supabase)
├── cart.html              Cart (quantity/remove controls)
├── checkout.html          Order form + Paystack payment
├── product.html           Single product detail page (product.html?id=...)
├── shipping-returns.html  Shipping & returns policy page
├── admin.html             Password-protected dashboard (product/order management)
├── robots.txt
├── sitemap.xml
├── assets/
│   ├── css/               One file per page/component — see below
│   ├── js/                One file per feature/module — see below
│   └── images/
│       ├── products/      Product photos
│       ├── hero/          Homepage hero assets + the "UA" header badge
│       └── lookbook/       Lifestyle photos used in the hero slideshow
├── supabase/
│   └── functions/
│       └── paystack-webhook/
│           └── index.ts   Deployed via the Supabase Dashboard (Edge Functions), not the CLI
└── README.md
```

### CSS (`assets/css/`)

Split by component/page instead of one monolithic stylesheet, so each page only loads what it actually uses:

| File | Contains | Loaded on |
|---|---|---|
| `base.css` | CSS variables, reset, typography, generic buttons, toasts, empty states, back-to-top, shared animations | every page |
| `header.css` | Header bar, logo, nav (desktop inline + mobile slide-in drawer) | every page |
| `footer.css` | Footer, social links, copyright | every page |
| `cart.css` | Floating cart icon, mini-cart preview, and the full cart page | every page except admin |
| `chat-widget.css` | Floating WhatsApp chat widget | every page except admin |
| `hero.css` | Homepage hero slideshow + trust row | `index.html` |
| `shop.css` | Product grid, product card, size/qty selectors, skeleton loaders | `shop.html`, `product.html` |
| `product-detail.css` | Single product detail page layout | `product.html` |
| `checkout.css` | Checkout form, order summary | `checkout.html` |
| `policy.css` | Shipping & returns page | `shipping-returns.html` |
| `admin.css` | Admin login/dashboard, product/order rows, modals | `admin.html` |

### JavaScript (`assets/js/`)

Same idea — one file per feature. All are plain scripts (no bundler, no ES modules) sharing the global scope exactly like the old single file did, so load order matters: `utils.js` → `toast.js` → `cart.js` → `products.js` → `nav.js` → `hero.js` → `chat-widget.js` → `ui.js` → `main.js` (the bootstrap, always loaded last). `admin.html` additionally loads `admin-modal.js` → `admin-products.js` → `admin-orders.js` → `admin-auth.js` → `admin-main.js` after that shared set.

| File | Contains |
|---|---|
| `supabase-config.js` | Supabase project URL + publishable key |
| `utils.js` | `escapeHtml` |
| `toast.js` | Toast notification system |
| `cart.js` | Cart state (localStorage), add/remove/update, mini-cart + full cart rendering |
| `products.js` | Shop grid + product detail page rendering, fetched from Supabase |
| `nav.js` | Mobile nav drawer, active-link highlighting, header height sync |
| `hero.js` | Homepage hero slideshow autoplay |
| `chat-widget.js` | WhatsApp chat widget toggle |
| `ui.js` | Back-to-top button, scroll reveal, click-outside-to-close behavior |
| `main.js` | `DOMContentLoaded` bootstrap — calls the init functions above |
| `admin-modal.js` | Reusable confirm dialog |
| `admin-products.js` | Product CRUD + image upload |
| `admin-orders.js` | Order list rendering |
| `admin-auth.js` | Login/logout/password reset, inactivity auto-logout |
| `admin-main.js` | Admin `DOMContentLoaded` bootstrap |

`shop.html`, `product.html`, and `admin.html` additionally load the Supabase JS client (CDN) and `supabase-config.js` before the rest, since they talk to the database directly.

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
