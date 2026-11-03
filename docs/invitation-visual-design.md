# Personal invitation — visual design

The public invitation opens directly as a sculpted paper card with names, personal message, recipient, reserved seats, event details and per-event RSVP. Four compatible saved design IDs now select distinct physical treatments: `lilac` / Fildish is ivory letterpress with an arched edge; `olive` / Botanika has embossed botanical relief; `midnight` / Nën yje uses dark paper and metallic orbital rings; `rose` / Perla uses pearl paper, recessed arches and folded sculptural layers. There is no pink or purple palette. Georgia display typography sits alongside Inter utility text. CSS and an inline botanical SVG produce the depth without raster assets or extra libraries.

Public hero cards respond gently to a mouse pointer. Touch devices stay stable and reduced-motion preference disables transforms. The guest experience opens directly with no envelope gate, while map links, calendar downloads and RSVP remain available.

The organizer workspace stays flat and neutral. Four main destinations are Kryefaqja, Mysafirët, Ftesa and Planifikimi. Invitation details and planning tools have three local tabs each. The home screen prioritizes the general link, personal invitations and three totals; charts are available in an expandable section. The guest list becomes stacked cards on mobile, with a direct copy button. Creating a guest saves and attempts to copy the actual saved link, including its server-generated token. Clipboard denial triggers an automatic selection-based copy fallback; copying never opens a dialog.

The dashboard includes interactive monochrome charts for replies, confirmed people versus invited seats by event, and budget payments. Reply counts refer to invitations for one selected event; person counts remain separate. The calculator also charts costs by event and updates from the current scenario, including unsaved changes. Common expenses have their own group; reserve is excluded from payment and event-cost charts. Overpayments do not offset another expense's outstanding balance. Empty budgets show an explanation instead of invented data. All chart values also appear as readable text, with keyboard-accessible event controls.

The demo can be opened directly at `/ftesa?demo=1&preview=1`. Real guest links and server-side RSVP continue using the existing token authorization. No planner or private contact data is included in the public view or calendar files. Calendar times are converted from Europe/Belgrade to UTC, with escaped and UTF-8-folded iCalendar fields.

## Archived visual exploration

The earlier floral artwork is retained as an unused project asset. It is no longer referenced by the invitation interface.

- Final asset: `public/media/invitations/floral-editorial.webp` (1024 × 1536, about 125 KiB).
- Created with the built-in `imagegen` tool, then encoded to WebP for delivery. It is a decorative generated botanical still life, not a photograph of a real couple or venue.
- The source generation remains in the tool's generated-images directory.

Final generation prompt:

> Use case: photorealistic-natural. Asset type: portrait art photograph for a premium Albanian wedding invitation website. Create a highly refined fine-art botanical still life: monumental ivory calla lilies and one open ivory peony, extremely delicate pale lilac sweet-pea blossoms, a small dark aubergine calla lily, long sculptural curved stems, loosely gathered against pale cool lavender raw silk with soft irregular folds. Atmospheric photographic realism, luminous translucent petals, fine tactile grain and real material detail, quiet museum-quality contemporary wedding editorial, soft side daylight, ethereal shadows. Portrait composition about 2:3, flowers rising from bottom left through middle, generous quiet negative space towards upper right, artfully cropped stems extending out of frame. Muted colors: ivory, porcelain, dusty lavender, tiny dark plum accents; green leaves extremely subdued. Full image is the photograph only, absolutely no text, no lettering, no logos, no UI, no borders, no people, no vases, no watermarks. The image will be paired with live oversized serif typography outside the photo in a responsive website. Avoid a flat clip-art bouquet, avoid stock wedding clichés, avoid pink-heavy roses and avoid an overly dense flower wall.
