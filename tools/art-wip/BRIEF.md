# Brief for the round 4 portrait revisions (shared by seven artists)

You are a pixel artist for the 8-bit game "Slots vs. Slots" (two slot machines fight), being re-themed as a crooked casino town. The director reviews art down to the pixel. They approved the format (32×32 bust portraits), the art rules below and eight portraits as the house standard: THE BARFLY (`barfly32.mjs`), THE COOLER (`cooler32.mjs`), THE LOAN SHARK (`shark32.mjs`), THE PICKPOCKET (`pickpocket32.mjs`), THE LEG BREAKER (`legbreaker32.mjs`), THE REPO MAN (`repoman32.mjs`), THE LEECH (`leech32.mjs`) and THE COPYCAT (`copycat32.mjs`). Make yours as good as those; "the approved four" below means the approved set.

## Process: 20 passes
Do 20 iterations of draw → render → view the PNG with the Read tool → write yourself a short, harsh critique → fix. On every pass, check the director's notes one by one and say whether each one is fixed. Every 5 passes, render your portrait beside the approved four (write your own small set script, as in `setview.mjs` or `all.mjs`) and fix anything that breaks the set: head size, shoulder width, shading, how far the outline sits from the frame. Don't stop early: the director asked for 20 passes.

## Files (work only here; edit nothing in the repo)
Folder: /tmp/claude-0/-home-user-SlotsVsSlots/252cdece-2912-5253-bff7-70fda570cc2f/scratchpad/art/
- `helpers.mjs` (grid, put, stamp with literal rows where space = skip, shape, shade, ellipseSpans, rows); `render.mjs` (the game's PALETTE with single-char keys, '.' transparent; outline() adds the 1px near-black outline automatically; png(); check()); `sheet.mjs` (`node sheet.mjs <file>.mjs <fn> 32 12` writes `<fn>.png` and prints the rows). The colour names are in the comments at the top of /home/user/SlotsVsSlots/tools/build-art.mjs.
- Your file is `<name>32.mjs` (keep its export name). The rejected round-3 version is saved in `r3/<name>32.round3.mjs` for reference. You may redraw from scratch.
- Never modify helpers.mjs, render.mjs, sheet.mjs, the approved four, any other artist's portrait, or any existing `*_tools.mjs` file (other artists import them). If you need helpers, copy what you need into a NEW file named `<name>_r4.mjs`.

## Art rules (binding, approved by the director)
1. One palette: only PALETTE colours. Light from the top-left: lit edge, mid, shadow edge; shade by form. No gradients, no anti-aliasing, no pillow shading.
2. One outline: added by outline(); never draw the outer outline yourself (leave a 1px transparent margin where you want it; shoulders may run off the bottom).
3. Portraits are busts: head in the top two-thirds, shoulders run off the bottom, one hand and one prop. Head size matching the approved four.
4. Anatomy connects: an arm comes OUT OF its own shoulder, bends at an elbow, and the forearm leads to the hand. Upper arm and forearm about the same thickness (forearm may be slightly thinner, never thicker than the upper arm unless it's a rolled-sleeve brute). Hands sized to the arm: a fist is about as wide as the forearm plus 1px, not bigger. A line (dark interior pixels) separates an arm in front of the chest from the chest.
5. One prop and one accent colour that name the mechanic. The prop must read as that object at game size; if it doesn't, choose a clearer object or pose.
6. Faces read at game size (×3 = 96px): eyes with a white and a pupil, a clear nose, a clear mouth, one clear expression. No jumble of pixels that only makes sense zoomed in.
7. Casino town only: suits, hats, chips, cards, drinks, neon. No fantasy creatures, no robots.

## Lessons from the director's notes on this round (apply them to yours)
- **Symmetric shoulders.** Three portraits were rejected because one shoulder ran straight off to the frame edge while the other ended sooner. Both shoulders end the same distance from their edge (±1px), and the torso is centred under the head. A raised arm must not widen the silhouette sideways: bring the hand up in front of the chest or beside the face, inside the shoulder line.
- **Arms come from their own shoulder,** never into the frame from outside it or across from the wrong side.
- **Clothing reads as clothing:** a vest or jacket goes over the shoulder (no background showing between the garment and the shoulder line); seams, straps and lapels follow the body.
- **Nothing unexplained:** every coloured blob has to be something the director could name. Remove it if not.
- **Hand on wrist, head on neck** (director, on the Mechanic): the hand sits directly on its forearm, centred on the wrist, no sideways offset; a fist never floats without a visible forearm. The chin, neck and shoulder rows match the approved four within 1px: a visible neck, and shoulders that slope from it, never a flat high bar under the chin.
- **Arms are straight, not hoses** (director, on the Slug Pusher): never show an upper arm running down the side and folding back up inside the frame; it reads as a bent hose. A raised hand sits on a forearm that rises straight from the bottom edge (elbow off-frame), like the Pickpocket.
- **Forearms are forearm-length** (director, on the Slug Pusher and the Mechanic): a forearm rising from the bottom edge with no elbow showing can only be as long as a real forearm. Keep arms LOW (director, 2026-10-30): the hand at chin height or below, and it's fine, even preferred, for the held prop to sit lower than the head. Never up by the hat or brim.
- **Build fits the character** (director, on the Mechanic): a slim or female character gets thinner arms, wrists and hands than a brute.
- **Nothing rude** (director, on the Jinx's rabbit's foot): check every prop at game size for any shape that could read as rude; if in doubt, change it.
- **Beards and stubble:** either a solid beard shape or clean skin; no checker patterns, no diagonal split of skin and beard to a point.

## Report back briefly
Pass count, the final PNG path, and for each of the director's notes one line on how you fixed it. Don't paste grids.

## Heroes (the player's five machines)
The heroes are the player's side: each is the character of one slot machine the player picks. They stay in the same set (same palette, shading, outline, head size, bust framing, art rules) but they are the good guys: confident, likeable, a bit heroic, never sleazy. Their current sprites **face RIGHT** (three-quarter view, looking toward the enemy across the screen); keep that: a three-quarter bust turned to the viewer's right, eyes looking right. They keep their identity from the current 24×24 sprite. "No arm" is allowed (the director accepted it for a boss); if a hand shows, it follows every arm rule above (low, forearm-length, straight on the wrist). Check every pass at x3 beside the approved enemies (e.g. barfly32, pickpocket32, sharp32, leech32) and, every 5 passes, beside the other heroes if their files exist yet (knight32, cassidy32, voltz32, jax32, decibel32).
