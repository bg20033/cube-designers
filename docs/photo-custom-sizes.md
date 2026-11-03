# Custom photo print dimensions

`/shop/foto` offers standard sizes, manual custom dimensions, and dimensions derived from the uploaded image. The custom controls retain the compact configurator layout.

- Width and height use centimetres, with 0.1 cm precision.
- Supported dimensions are 10–70 cm, with the shorter edge at most 50 cm, matching the largest existing production format.
- “Sipas fotos” fits the original aspect ratio to the current long edge. The linked fields update together, rounding to 0.1 cm. Cropping is negligible at zoom 1; deliberate zooming and panning remain available. Ratios beyond 7:1 cannot fit these production limits and are not offered as an automatic fit.
- Unlinking allows independent dimensions. Empty, out-of-range or over-precision inputs retain the last valid preview but prevent continuing to the summary or adding to the cart.

Custom variants encode the sorted millimetre dimensions, for example `custom300x455-kornize-lisi`. The existing photo orientation flag distinguishes a 45.5 × 30 cm landscape print from a 30 × 45.5 cm portrait. Frame dimensions still add 2 cm per side.

## Pricing and order validation

Custom prints use the least expensive existing single-print variant in the chosen material that can physically contain both sides. Batch-only A6 pricing is excluded. This uses the catalog's actual prices and makes no area-based discount assumptions. A custom size is allowed only for products accepting customer photos. The server derives the price, minimum quantity and size label again, ignoring client-supplied prices. No payment is taken online; the studio confirms final production details as before.

The same variant flows through the cart, order, wall planner, saved/shared layouts, admin print command and production output. Customer photo upload availability remains unchanged; local-only previews cannot be ordered.

## Production output verification

`scripts/print-files.mjs` accepts custom variants for photo jobs. The JPEG is rendered at 300 dpi; a JFIF header with physical inch units is written without re-encoding its pixels before PDF conversion. This fixes an existing export issue where ImageIO wrote a density of 300 with unit 0 and PDF output used 72 dpi.

Verified with:

`npm run print -- 'foto@custom102x153@0,0,1,1@l@public/media/collections/photo/alpine-example-v1.webp' --out custom-size-check`

The trim size is 15.3 × 10.2 cm in landscape, plus the existing 3 mm bleed on each edge. JPEG/PDF output is rounded to the 300 dpi pixel grid. Test artifacts are under `print/custom-size-check/` and are ignored by Git.
