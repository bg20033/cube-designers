# Invitation orders with Neon and admin

The normal `/ftesa` page uses the existing Neon connection. There is no local-storage fallback for real orders. The original isolated demo remains available at `/ftesa?demo=1` and does not create database records or confirm payments.

## Configure

Set the following server-side environment variables in `.env.local` for local development or in the deployment settings:

- `DATABASE_URL` (or `POSTGRES_URL`): Neon Postgres connection string.
- `ADMIN_PASSWORD`: password for `/admin`.
- `ADMIN_SESSION_SECRET`: a separate strong random signing secret.
- `INVITATION_PRICE_EUR`, optional: server-controlled package price. Unset means a manual quote.

Do not put credentials in public `VITE_` variables or commit them. Both Vercel functions and the Cloudflare Worker use the same handlers. The Worker enables Node compatibility for the Neon client and cryptography; configure secrets in Cloudflare before deployment. [Cloudflare process.env support](https://developers.cloudflare.com/workers/runtime-apis/nodejs/process/) documents how Worker secrets become server environment variables.

The existing database initializer creates `invitation_orders`, `invitation_sessions`, and `invitation_login_attempts` plus indexes on first use. Changes are additive and preserve existing shop orders, products and contact submissions. The PostgreSQL role needs permission to create these tables/indexes.

## Customer and admin flow

1. The customer enters contact details, couple's names, date and a password of at least 12 characters. A unique `FTE-…` reference identifies the saved order. Request IDs prevent duplicate orders on network retries.
2. The order starts **pending / unpaid**. The customer keeps the reference and password to sign in from another device. No automatic card charge occurs.
3. In `/admin` → **Ftesat**, the studio verifies payment outside this app and selects **Konfirmo pagesën dhe aktivizo**. Public endpoints cannot activate orders or set paid status.
4. The active customer dashboard manages designs, event details, individual invitations, families and +1. New guests receive random server-generated 256-bit tokens. Organizer edits cannot fabricate RSVP.
5. Guest links contain only a token in the URL fragment. The page fetches only that guest's current invitation using an authorization header. Replies are stored centrally, independently of the organizer's browser. The dashboard refreshes on focus and every 12 seconds while visible.
6. Admins can set the package price and notes, suspend/cancel the order, or open its dashboard through an admin-protected order URL. Suspended/cancelled packages stop public invitations and customer edits while retaining records.

Passwords use salted scrypt. Organizer sessions use random tokens in Secure, HttpOnly, SameSite cookies; only their hashes are stored in Postgres. Login attempts are limited per order. JSON mutation requests and same-site cookies protect authenticated writes. Responses have no-store cache headers.

Edits use a revision check. A guest response or another edit arriving concurrently causes a conflict response instead of overwriting data; the dashboard reloads the latest revision so the organizer can retry. A deleted guest's old token stops resolving. Design/event changes appear on previously shared links automatically.

## Private wedding planner

The **Buxheti i dasmës**, **Kontaktet**, and **Detyrat tona** tabs share the wedding's optional `planning` document. Older records without this field remain valid and start with an empty budget and contact book, six zero-price expense templates and eight unchecked planning tasks. No supplier recommendations or fictional contact details are seeded.

- The budget stores money as integer cents. Fixed prices multiply by a chosen quantity; per-guest expenses use the selected event's invited/confirmed people, or an explicit manual scenario count. Reserve is tracked separately from actual outstanding supplier payments. Excess payments on one expense never hide unpaid amounts on another.
- Calculator input changes preview immediately; **Ruaj skenarin** persists the scenario. Expense changes persist independently of an unsaved scenario. CSV export includes the displayed scenario, expense details and its summary.
- Contacts include service, person, phone, email, website, city, status, assigned events and private notes. Categories cover photography, video/camera, combined photo/video, venue, music, decor, beauty, transport and other services. Contact buttons open phone/email/website actions; the app does not send messages or book suppliers automatically.
- Expenses can reference a contact. Removing the contact unlinks it but retains all expense amounts and payments.
- Checklist items support optional event/due date, completion, editing, deletion and pending/done/overdue filters. Dates use Europe/Belgrade for overdue status.
- The same authenticated, revision-checked save path persists all three features. Server validation checks amounts, event/contact references, dates and safe website protocols. Public invitation payloads explicitly omit the entire planning document, including in portable demo links.

## Verify

```sh
npm test
npm run build
npm run preview
```

`GET /api/invitations?action=status` checks actual database availability. Without credentials, ordering stays unavailable and does not pretend to save an order. Shop orders use the same database and appear under `/admin` → **Porositë**.

The SQL integration tests use an ephemeral PostgreSQL engine (PGlite), including the actual production schema, queries, sessions and admin authorization. They do not contact the studio's Neon database.

The complete organizer → admin activation → guest RSVP → second organizer session flow can also be tested against that isolated PostgreSQL engine with the built frontend:

```sh
npm run test:invitations:online
```

The isolated server runs on port 4178 with disposable, test-only credentials and an in-memory database. It never supplies a test database to the normal application server. The ordinary desktop/mobile demo tests remain in `tests/e2e/invitations.spec.ts`.

Live Neon persistence still needs verification against the actual configured database before launch. Payment-provider checkout/webhooks, password recovery and customer email delivery are not included.


## Linku i përgjithshëm dhe ndarja e shpejtë

- Në Kryefaqja, “Kopjo linkun për të gjithë” e krijon dhe kopjon direkt linkun, pa modal. Parazgjedhja është vetëm Dasma, deri në 6 persona. “Ndrysho” lejon zgjedhjen e eventeve dhe maksimumin 1–30 persona për konfirmim.
- Linku online përdor `/ftesa#teftuar=TOKEN`. Tokeni krijohet nga serveri dhe ruhet në `document.generalLink`; nuk ndan listën e mysafirëve, kontaktet apo buxhetin.
- `GET /api/invitation-public?general=1` jep vetëm detajet publike të eventeve të zgjedhura. `POST` me emër, persona, përgjigje dhe `requestId` UUID regjistron një mysafir të ri me token personal të veçantë. Riprovimi me të njëjtën ID nuk krijon rresht tjetër. Ndryshimet përdorin kontrollin ekzistues të versionit në PostgreSQL.
- Pas konfirmimit, shfletuesi merr linkun personal për t'i ndryshuar përgjigjet. Çaktivizimi i linkut të përgjithshëm ndalon regjistrimet e reja; ftesat personale ekzistuese mbeten të vlefshme ndërsa porosia është aktive dhe e paguar.
- Lista ka butona “Kopjo linkun” dhe “Kopjo të gjitha linket”. Krijimi i një mysafiri ruan dhe kopjon linkun në një hap; kur Clipboard API bllokohet, provohet kopjimi direkt përmes përzgjedhjes, pa modal.
- Demoja përdor një kopje publike në `#teftuar-demo=…`. Konfirmimi i kthehet listës vetëm brenda të njëjtit shfletues; në pajisje të ndara nuk ka sinkronizim pa backend. Linket demo të dërguara nuk mund të revokohen nga larg.
