import base64, io, json, re, os, shutil
from PIL import Image
P = '/tmp/claude-0/-home-user-SlotsVsSlots/252cdece-2912-5253-bff7-70fda570cc2f/scratchpad/pw/steam/'
C = [
 ("sh_tesla", "teslax_3", "Tesla's mega win", "DOC VOLTZ lands three bolts on the CROUPIER: the MEGA WIN beat. My pick for #1, since it's the first thing a visitor sees."),
 ("sh_map", "s_map", "Choose your path", "The act's street map: three paths, every stop shown, the boss at the end. It says roguelike at a glance."),
 ("sh_house", "housex_5", "Pot stolen", "SIR REGINALD jackpots THE HOUSE and steals its pot: 120 damage. Shows the boss's own rule."),
 ("sh_draft", "s_draft", "The draft", "After a win: pick one of three. Charms on Tesla's bolts."),
 ("sh_joker", "jokerx_2", "Joker's wild", "JESTER JAX vs the CARD SHARP: a wild star completes the line."),
 ("sh_shop", "s_shop", "The Cashier", "The shop, with the new Cashier behind his counter."),
 ("sh_dealer", "dealerx_2", "The Dealer", "Act 3's boss: his machine plays a hand of cards against you (HAND 1/3, BUST)."),
 ("sh_bj", "s_bj", "Twenty-One", "A gamble stop on the map: blackjack on the felt for chips."),
 ("sh_juke", "jukex_2", "The Jukebox", "DJ DECIBEL vs JINX: three notes on the line, Jinx's black cats on the enemy reels."),
 ("sh_wheel", "wheelx_2", "The Wheel", "Act 2's boss: the roulette over the reels and THE TABLE's bets."),
 ("sh_housejp", "housex_3", "Jackpot!", "The plain JACKPOT banner against THE HOUSE (an alternate to Pot stolen)."),
]
os.makedirs('final', exist_ok=True)
IMG = {}
for cid, f, *_ in C:
    shutil.copy(P + f + '.png', f'final/{cid}.png')
    im = Image.open(P + f + '.png').convert('RGB').resize((1280, 720), Image.NEAREST)
    b = io.BytesIO(); im.save(b, 'WEBP', lossless=True); IMG[cid] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
items = [{"id": c, "img": c, "w": 1280, "h": 720, "max": 1280, "name": f"{i+1}. {n}", "text": t} for i, (c, f, n, t) in enumerate(C)]
h = open('../capsule/pass.html').read()
h = h.replace('<div class="eyebrow">Steam page · the capsule</div>', '<div class="eyebrow">Steam page · the screenshots</div>')
h = h.replace('<h1>The gang: pass 1</h1>', '<h1>Screenshots</h1>')
h = re.sub(r'<p class="lede">Concept B.*?</p>', lambda m: '<p class="lede">Steam wants at least 5; most good pages run 8 to 10, and the first 4 show on the page without a click, so they carry it. These are all real gameplay from the current build at 2560×1440 (crisp 2x pixels), shown in my suggested order. <strong>Use it or cut it on each; a note if you want a different moment or a different order.</strong></p>', h, flags=re.S)
h = h.replace('.concept .small { width: 230px; height: auto; border: 1px solid var(--rail); }', '.concept .full { max-width: var(--max); margin-inline: auto; }')
h = re.sub(r'const C = \[.*?\];', lambda m: 'const C = ' + json.dumps(items, ensure_ascii=False) + ';', h, flags=re.S)
a = """    const full = el("img", "full"); full.src = IMG[c.id]; full.alt = c.name; full.width = 920; full.height = 430;
    const row = el("div", "row");
    const sm = el("img", "small"); sm.src = IMG[c.id + "_small"]; sm.alt = `${c.name}, list size`; sm.width = 230; sm.height = 108;
    const p = el("p", "lede", c.text);
    row.append(sm, p);"""
assert a in h
h = h.replace(a, """    const full = el("img", "full"); full.src = IMG[c.img]; full.alt = c.name; full.width = c.w; full.height = c.h; full.style.setProperty("--max", c.max + "px"); full.loading = "lazy";
    const row = el("div", "row");
    row.append(el("p", "lede", c.text));""")
h = h.replace('[["yes", "Love it"], ["change", "Change it"]]', '[["yes", "Use it"], ["change", "Cut it"]]')
b = """  const v = state[C[0].id]?.verdict;
  document.getElementById("tally").innerHTML = `<span>Verdict <b>${v === "yes" ? "Love it" : v === "change" ? "Change it" : "open"}</b></span>`;"""
assert b in h
h = h.replace(b, """  const yes = C.filter((c) => state[c.id]?.verdict === "yes").length, ch = C.filter((c) => state[c.id]?.verdict === "change").length;
  document.getElementById("tally").innerHTML = `<span>Use it <b>${yes}</b></span><span>Cut it <b>${ch}</b></span><span>Still open <b>${C.length - yes - ch}</b></span>`;""")
h = h.replace('capsule_pass', 'shots').replace('placeholder = "What to change, down to the pixel"', 'placeholder = "A different moment, a different spot in the order..."')
h = h.replace("<title>", "<title>").replace('__IMG__', json.dumps(IMG))
open('shots_out.html', 'w').write(h)
print(os.path.getsize('shots_out.html') / 1e6, h[:200])
