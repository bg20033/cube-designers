# Wall planner scene

The visual update is scoped to `/shop/muri`. Poster coordinates, centimetre dimensions, photo crops, materials and cart pricing retain the existing planner geometry.

The wall, directional daylight, plaster grain, baseboard and wood floor are drawn by `src/components/shop/wall-scene.ts`. The same room SVG is used on screen and in the PNG download. The scene uses one fixed daylight treatment. Lighting controls have been removed; older shared links still load, ignoring their former lighting setting. The sofa is a visual scale reference, not a product offered for sale. The editor opens at the room dimensions step, with an empty wall for a fresh session. A sample gallery with larger 50 × 70 cm framed prints is available from the poster step. Existing saved layouts retain their selected sizes.

## Editor workflow

On desktop the workspace uses equal 50% panes: room preview on the left, configuration on the right. On mobile they stack into equal height panes. The configuration content scrolls independently while its tabs, total and next action stay visible.

1. Enter exact wall width and height in centimetres, choose the paint and scale references.
2. Add posters or photos, choose sizes and finishes, drag or enter a print’s centre position, duplicate, remove or centre it.
3. Review configured products and return to edit a line before adding the layout to the cart.

The layout includes centimetre rulers and the wall area. Input bounds are validated before moving on. Undo/Redo includes placement, dimensions, finishes and room edits; continuous drags and range gestures are grouped into one action. The paint picker supports a custom hex color that persists in saved/shared layouts. The generated image uses the same room and material rendering as the preview.

## Generated asset

Final asset: `public/media/collections/wall/linen-sofa.webp` (transparent WebP). Generated with the built-in `image_gen` tool and converted to WebP with alpha preserved. The original generated PNG is retained under the tool's generated-images directory. A calibrated SVG viewport removes transparent margins when the sofa is displayed; the art remains at its original resolution.

## Generation prompt

Use case: product-mockup. Asset for an interactive interior wall planner. Generate a very high quality photorealistic studio cutout of a contemporary low three-seat sofa, front facing orthographic camera at sofa middle height, completely straight on with symmetric visible arms, NOT angled, no perspective yaw. Premium oat beige woven linen upholstery, a softly rounded rectangular silhouette, three realistic back cushions, two large seat cushions, subtly relaxed fabric wrinkles and detailed tactile weave, two simple matching small side cushions. Dark brown low wooden feet visible. Sofa real dimensions approximately 210cm wide and 85cm high. Gentle soft daylight from upper left, physically realistic folds, subtle contact shadow directly under the feet, isolated against genuine transparent background. Frame the entire sofa including feet, very little transparent margin around the sofa. WIDE LANDSCAPE canvas, the sofa occupies almost all the width. No wall, no floor, no rug, no plants, no table, no text, no logos, no extra objects. It must resemble a photographed actual luxury design sofa, not a vector illustration, not a cartoon. Keep material neutral warm light beige so the asset works on differently colored walls.

## Multiple selection

Drag a rectangle in empty wall space to select intersecting prints in either direction. Shift/Ctrl/Cmd-click toggles a print; holding the modifier while drawing adds to the current selection. The group can move, resize, change material, centre, duplicate or delete together. A common movement offset preserves spacing at wall edges, and one drag is one undo action. Ctrl/Cmd+A selects all when the wall has focus; Escape clears selection. Size, material and wall controls use compact buttons.
