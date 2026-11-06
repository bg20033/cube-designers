# CUBE DESIGNERS

The studio site is a React/Vite application at `www.cube-designers.com`. The storefront is a separate Astro application in [`apps/shop`](apps/shop/README.md), deployed independently at `shop.cube-designers.com`. The studio exposes one direct Shop link; catalog, cart, checkout, photo prints and the wall planner belong to the shop. Existing `/shop/...` addresses redirect to the matching subdomain route.

Both projects share commerce validation, the product catalog, media and the existing studio admin. See [shop setup and deployment](apps/shop/README.md).

## Run locally

```sh
npm ci
npm run dev
```

For a production build with the real Node API handlers:

```sh
npm run build
npm run preview
```

Preview runs at `http://localhost:4173`. It serves built pages and the same `/api` handlers used on Vercel. `npm run preview:worker` runs the same API handlers inside Cloudflare Workers, including `/admin`; configure Neon and admin secrets in the Worker environment for persistent data.

## Enable saved orders and admin

Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL`: the studio’s Neon/Postgres connection URL.
- `ADMIN_PASSWORD`: the admin login password.
- `ADMIN_SESSION_SECRET`: a separate, strong random session secret.

Use the corresponding environment settings on Vercel for deployment. Keep credentials out of Git. The app creates its database tables on first use. Existing order tables gain nullable `request_key` and `request_hash` columns plus a unique index to make retrying a request safe.

`GET /api/shop-status` probes the database and returns `ordersAvailable`. No database means the checkout prepares an email request instead of pretending an order was saved. The customer must send that email themselves; the app neither sends email automatically nor clears the cart for an email draft.

Open `/admin`, sign in, and import the initial catalog. Existing catalogs can import only missing collection entries without replacing edited products. Products, prices, active status and options can then be managed there. Deactivating all products intentionally leaves the catalog empty.

## Order behavior

- Shirt sizes and poster formats remain separate cart lines.
- Server prices and valid options come from the catalog; browser prices are ignored.
- A successful saved order has a `CUBE-######` reference. Retries with the same request ID return the same order, without creating a duplicate.
- Unavailable products or options must be removed before checkout.
- Cart storage is validated before use. Customer details stay in the current page’s state.
- Prices are indicative. Shipping, final specifications, production timing and payment are confirmed by the studio.

Online card payment, automatic customer emails, inventory quantities and shipping quotes are not connected. This workspace has no configured production database or admin credentials, so live persistence and payment have not been verified. Add the real credentials and verify a complete order in the target deployment before launch.

## Invitation orders

`/ftesa` uses Neon for invitation orders, organizer sessions, designs, guests and RSVP. Visitors submit their name and email as an invitation request. `/admin` → **Ftesat** separates requests from accounts: the studio reviews or rejects requests, creates one account per approved request, copies the generated login credentials, confirms payment, activates/suspends accounts and resets passwords. Account creation is restricted to administrators. Customers sign in using the reference and password provided by the studio. Online card charging is not connected; activation follows manual payment verification by the studio.

Guest links load current data from the server, work on other devices, and save RSVP centrally. Deleting a guest or suspending an order disables its public invitation. Public demo links have been removed. Legacy browser-local demo URLs require an authenticated administrator; visitors return to the public entry page.

The wedding planner also includes a private budget calculator (fixed costs, event-specific per-guest costs, deposits, remaining payments and reserve), a private vendor/contact book, and a checklist with due dates. Contacts link to expenses, and deleting a contact preserves its budget entries. Plans use the same authenticated Neon document and revision checks; guest invitations never include planning data. Budget scenarios and contact lists can be exported as CSV.

See [invitation setup and testing](docs/invitations.md). The optional `INVITATION_PRICE_EUR` environment variable sets the server-side package price; unset means a manual quote.

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:e2e
npm run check:shop
npm run build:shop
npm run test:shop:e2e
```

Unit tests cover cart validation, variants, server prices, order request retries and API failures. Browser tests cover desktop/mobile routes, cart persistence, checkout success/failure, email preparation, product options and accessibility. Saved-order success tests use a mocked database/API; the preview API is also tested directly in its unconfigured state.

See [collection assets](docs/collection-assets.md) for image sources and the generated editorial scene’s prompt.
