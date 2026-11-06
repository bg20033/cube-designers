# CUBE Shop

Independent Astro application for **https://shop.cube-designers.com**. The studio stays at **https://www.cube-designers.com** and links directly to the shop.

This is an npm workspace in the same repository. Astro owns the storefront routes, HTML, SEO and public commerce API. Interactive React components, the catalog, commerce validation and media are shared with the studio/admin rather than duplicated. The studio build no longer loads storefront pages or lists them in its sitemap.

From the repository root:

```sh
npm ci
npm run dev:shop              # http://127.0.0.1:4321
npm run check:shop
npm run build:shop            # Vercel output
npm run build:preview --workspace @cube-designers/shop
npm run preview:shop          # Built Node server, http://127.0.0.1:4321
npm run test:shop:e2e
```

Configure `apps/shop/.env.local` from `.env.example` for local commerce. Use the same Neon database as the studio: the existing `/admin` continues to manage products/orders. Connect the existing Blob store to both projects if photo uploads are enabled. These server secrets must never use `PUBLIC_` or `VITE_` prefixes. With no database the static catalog and existing email-order fallback remain available.

## Routes

| Shop URL | Purpose |
| --- | --- |
| `/` | Catalog, filters and cart (`?cart=1`) |
| `/:slug` | Current product, rendered on demand, including admin-created products |
| `/foto` | Photo print editor |
| `/muri` | Wall planner |
| `/smart-glass` | Smart Glass preview |
| `/api/products`, `/api/orders`, `/api/uploads`, `/api/shop-status` | Commerce API on the shop origin |

Invitations, project requests and admin remain on the studio origin. Old `www.cube-designers.com/shop/...` addresses redirect permanently to the matching shop URL, preserving query parameters. Existing local-storage carts are origin-specific; a cart saved on `www` does not automatically transfer to the subdomain.

## Vercel

Use a separate project with root directory **`apps/shop`**, Astro preset, Node **24.x**, build command **`npm run build`**, install command **`cd ../.. && npm ci`**, and **Include source files outside of the Root Directory** enabled. Keep the studio project's root directory and build command as they are. Both projects install using the repository's root lockfile. Connect the existing Neon resource to the shop project with the `DATABASE` prefix so it supplies `DATABASE_URL`; connect the existing Blob store if available.

Production builds index `shop.cube-designers.com`; previews/local builds stay `noindex`. `SEO_DEPLOYMENT=production` can be set explicitly for a local production SEO check. Product URLs and the sitemap read the managed catalog when a database is configured; a disabled product returns HTTP 404.

Custom domain: **`shop.cube-designers.com`**. The current authoritative DNS provider is Site5. Replace its existing `shop` A record with the CNAME target provided by the shop project's Vercel domain settings. Wait for Vercel to verify routing and HTTPS before promoting the studio deployment with the new direct link and redirects.
