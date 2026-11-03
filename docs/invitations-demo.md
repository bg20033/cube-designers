# Ftesa online — local demo

Open `/ftesa?demo=1` with `npm run dev`, or run `npm run build` followed by `npm run preview` and open `http://localhost:4173/ftesa?demo=1`. The normal `/ftesa` page now uses Neon; see [online setup](invitations.md).

The demo is a separate React page in the existing site. Its direct-entry HTML is prerendered, marked noindex and excluded from the sitemap.

## Try the flow

1. Click **Provo pagesën demo**, acknowledge the simulation, and finish. The dashboard opens without collecting card details or charging money.
2. Choose one of four invitation designs. Edit the couple's names and default invitation text in **Cilësimet**.
3. Set dates, times, venues and addresses for kanagjegji, nata e dasmës and dasma.
4. Add a family (1–30 seats), an individual (1 seat) or a guest with +1 (2 seats). Assign events and an optional personal message.
5. Copy a personal invitation link, preview the guest view, or select multiple guests and export their links as CSV.
6. Answer separately for each invited event, including the actual number attending. On the same browser, return to the dashboard to see the counts update.

## Demo boundaries

- Data lives in `localStorage` under `cube-ftesa-demo-v1`. There is no account, server persistence or payment integration. Use sample data.
- The demo initially contains eight sample invitations. Changes persist through reloads and synchronize between tabs on the same origin/browser.
- Shared links include a validated snapshot of just one guest, the couple's invitation text, design and that guest's assigned events. They do not include the other guests. Links open in a fresh browser without needing the owner's storage.
- Existing shared snapshots do not update when the owner edits the design or events, and deleting a guest cannot revoke a previously copied snapshot. Generate a fresh link after edits.
- RSVP is saved only in the browser where the response is made. It updates the owner dashboard only when the matching wedding is in that same browser. There is no cross-device RSVP synchronization.
- Confirmed people count each guest group once, using its largest attendance count across assigned events. Individual event cards show their own attendance totals. Pending invitations include groups that have not answered every assigned event.

The normal online flow already uses server-side guest token lookups, organizer authentication and durable RSVP storage. Until a payment provider is integrated, admin activation follows manual verification of payment. The local demo remains separate.

## Validation

`src/components/invitations/model.test.ts` covers seat totals, Albanian dates, private guest-only payloads, invalid invitations, and CSV formula handling. `tests/e2e/invitations.spec.ts` covers the full family/RSVP flow, shared links in a clean browser context, design persistence, navigation and demo checkout on desktop and mobile.
