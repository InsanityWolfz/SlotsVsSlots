# Brief: the enemies' reel symbols, casino-town round

You are a pixel artist on "Slots vs. Slots", an 8-bit roguelike where two slot machines fight. The game was re-themed from fantasy creatures to a crooked casino town; the 32×32 portraits are done and approved. Now the enemies' REEL SYMBOLS (16×16), their cell OVERLAYS (16×16, mostly transparent, drawn over a reel cell) and their ability ICONS (8×8) still show the old fantasy art (green slime, bombs, a hex eye, fangs, a purple claw). Redraw the ones assigned to you.

## The director's rules (binding)
- One palette: only the PALETTE in /home/user/SlotsVsSlots/tools/build-art.mjs (single-char keys; '.' transparent). Light from the top-left: lit edge, mid, shadow edge, shaded by form. No anti-aliasing, no gradients, no pillow shading.
- The 1px near-black outline is added automatically (outline() in render.mjs / the build). Never draw the outer outline yourself; leave a 1px transparent margin round the shape.
- Each symbol must read instantly at game size (the reels draw symbols at about x4; check at x3 and x4) and be impossible to confuse with any other symbol on the reels (sword, shield, bolt, chip, cherry, seven, bar, the other enemy symbols). Nothing unnameable, nothing that could read as rude.
- Match the house style of the existing 16×16 symbols the director already likes: look at `S.sword`, `S.shield`, `S.ice`, `S.card`, `S.gavel`, `S.fake` in build-art.mjs (or render the sheet: `node symsheet.mjs out.png sword,shield,ice,card,gavel,fake 16 6`). Same weight, same chunky readable silhouette, similar fill of the 16×16 box.
- Icons are 8×8: one bold silhouette, 2-3 colours plus the outline; they sit next to the ability name on the enemy's HUD.
- Overlays sit on top of a reel cell that already shows a symbol: keep the middle mostly clear (or semi-covering in a way that still lets the symbol underneath read), like `S.frozenOverlay` and `S.fakeOverlay` do.

## Tools (scratch folder; edit nothing in the repo)
Folder: /tmp/claude-0/-home-user-SlotsVsSlots/252cdece-2912-5253-bff7-70fda570cc2f/scratchpad/art/
- `helpers.mjs` (grid, put, stamp, shape, shade, ellipseSpans, rows), `render.mjs` (PALETTE, outline, png), `symsheet.mjs` (renders today's sprites from the game: `node symsheet.mjs <out.png> <id,id,...> <size> <scale>`).
- Write each of your sprites as a module `sym_<name>.mjs` exporting `rows()` that returns the UNOUTLINED rows (16 strings of 16 chars, or 8 of 8 for icons). Write your own small view script that outlines and renders yours beside the existing symbols (and on a dark reel-cell background, roughly #1c1424) at x4 and x1, and look at it every pass.
- About 5 passes per sprite (draw, render, look, harsh critique, fix). The director reviews everything down to the pixel; their notes are the real review.

## Report back briefly
For each sprite: the file, the PNG path, one line on how it reads. Then one PNG with all of yours beside today's versions (old above, new below).
