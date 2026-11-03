# Photo print preview assets

The update is scoped to `/shop/foto`. Its two equal panes retain the existing crop, original-photo upload, variant pricing and cart behavior. The example photograph is a preview only: it never enables checkout or becomes an uploaded customer photo.

## Assets and provider

Generated with the built-in `image_gen` tool. Higgsfield was discovered as an available plugin but was not connected during this iteration; no Higgsfield generation is claimed. The PNG originals remain under `/Users/bardhgashi/.codex/generated_images/01a1787f-6800-7ab1-82f2-33306a5c196a/`.

- `public/media/collections/photo/living-room-day-v1.webp`: daylight background, 1254 × 1254, 187 KB.
- `public/media/collections/photo/living-room-evening-v1.webp`: same composition relit for evening, 1254 × 1254, 161 KB.
- `public/media/collections/photo/alpine-example-v1.webp`: example print photograph, 1536 × 1024, 371 KB.

Converted to WebP with `cwebp -q 88 -m 6`. No originals were overwritten.

The UI now uses only the daylight background. Lighting controls were removed at the user’s request; the earlier evening asset is retained as an unused source asset. Size and finish selectors use compact rows.

## Calibration

The sofa extends approximately from x=65 to x=1160 in the 1254 px room image and represents a width of 210 cm. Print surfaces use that ratio, including the existing 2 cm frame on each side. The image and the print share one transform at every viewport size. Small screens fit the area containing the print and furniture, with a soft photograph behind it filling the remaining edges. The frame centre is at image coordinate (627, 420). This is an illustrative scale reference, not a measurement of a customer's room.

The photographed background is used only on the photo-print page. The adjustable wall planner retains its separate dimension-based scene and export rendering.

## Daylight prompt

Use case: product-mockup. Asset type: background photograph for a premium online photo-print room configurator; NOT a UI screenshot. Generate a beautiful genuinely photorealistic architectural interior photograph, square composition, approximately 2048x2048. Camera completely straight-on, perpendicular to a large flat warm off-white plaster wall, level, no yaw, no keystone, 50mm architectural lens. Quiet contemporary European apartment, restrained expensive editorial photography with honest natural materials and subtle lived-in details. A 210 cm low three-seat oat linen sofa, luxurious soft irregular linen texture and real gently creased cushions, centered horizontally in the bottom third. Sofa spans approximately 72% of image width, its top around 60% image height and feet around 88% image height. A slim warm oak floor at bottom, floor meets wall at about 86% image height, small light textured rug. At the far right near the sofa arm, a small dark walnut pedestal side table with one cream sculptural dome lamp, unobtrusive, not taller than sofa. A single book on the table. Soft natural daylight enters from an unseen window to the left, gentle diagonal sun patches and soft nuanced shadows, lovely realistic plaster texture, no excessively strong shadows over center of wall. KEEP the broad center upper wall fully blank, especially x=25%-75%, y=15%-55%; an interactive print will be overlaid there. No framed art, no paintings, no posters, no wall decor, no people, no lettering, no logos, no watermark. Entire sofa and feet visible. Composition precise enough for an interactive physical scale overlay. Avoid CGI or illustration appearance, avoid plastic or airbrushed surfaces, avoid busy styling. The result should feel like a real editorial interior photograph with a tactile sofa and subtle daylight, neutral color grading.

## Evening edit prompt

Input: the daylight PNG above, viewed as the generation result before editing.

Use case: lighting-weather. Edit target: the attached generated square interior background. Create the EVENING LIGHTING variant for the same interactive print configurator. Change ONLY the illumination, keep camera, image dimensions, sofa silhouette, furniture positions, wall geometry, tree and every object unchanged with exact registration. Keep the central wall completely blank. The daylight sun patches and window shadows disappear. It is an inviting quiet early evening, soft warm 2800K light from the existing little dome lamp at right, a subtle warm pool on the wall next to it, very gentle cool residual ambient light from unseen window on left, believable subtle shadows under the sofa. Keep room bright enough to see textures and select a photo print on the center wall; not overly dark or moody. Still a realistic editorial interior photograph, natural colors, no orange saturation, no new lights or objects, no prints or frames, no text. Same precise composition; relight only.

## Example photograph prompt

Use case: photorealistic-natural. Asset type: example photograph printed on a wall in a premium photo-print configurator. A quiet fine-art travel photograph of a small still turquoise alpine lake with limestone mountains in the distance, subtle wooded shoreline and small trees, clear pale blue morning sky. Wide landscape 3:2 composition, peaceful restrained naturally beautiful scene. Subtle 35mm film-like color and delicate grain, exquisite real detail with soft atmospheric distance, believable light and understated composition, photographic rather than AI fantasy, no over-saturation, no extreme HDR. Keep main mountain-and-lake scene readable when cropped to a central portrait print too. Natural realistic water reflections. No people, no buildings, no frames, no borders, no text, no labels, no logos, no watermark.
