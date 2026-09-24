import type { Sounds } from '../audio/sounds';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../core/cabinets';
import type { Enh, RelicId } from '../core/config';
import { ALL_CHARMS, runScore, type Profile, type RunEntry } from '../core/profile';
import { BLAZE_BONUS, LEGENDARY, LUCKY_CHANCE, RELICS, RELIC_TIER } from '../core/relics';
import { GILD_SYMBOLS } from '../core/run';
import { STAKES } from '../core/stakes';
import type { Clock } from '../present/clock';
import { sineOut } from '../present/ease';
import { COLORS, H, W } from '../present/layout';
import { ENH_SPRITE } from '../present/reel';
import { SPRITES } from '../render/spriteData';
import { artId, drawSprite, hasSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';
import { Button } from './button';
import { wrap } from './runScreens';

/**
 * Out-of-run screens: LOADING (warms the sprite cache, then asks for a click so audio can start),
 * the MAIN MENU, the COLLECTION log and personal HISCORES.
 */
export type MenuMode = 'none' | 'loading' | 'main' | 'collection' | 'hiscores';

export const CHARM_INFO: Record<Enh, { name: string; text: string }> = {
  gold: { name: 'GOLD', text: 'SWORDS, BOLTS OR SHIELDS. A GROUP WITH IT PAYS X2 (MORE WITH TIER II).' },
  keen: { name: 'KEEN', text: 'SWORDS DEAL +1 AND PIERCE SHIELDS.' },
  charged: { name: 'CHARGED', text: 'BOLTS GIVE +1 ENERGY FOR YOUR SPECIAL.' },
  spiked: { name: 'SPIKED', text: 'SHIELDS HIT BACK FOR 2 WHEN YOU ARE HIT.' },
  vamp: { name: 'VAMP', text: 'ACT 2. SWORDS HEAL YOU 1 WHEN THEY HIT.' },
  lucky: { name: 'LUCKY', text: `ACT 2. SHIELDS OR BOLTS: ${Math.round(LUCKY_CHANCE.each * 100)}% CHANCE TO LAND AS A WILD.` },
  blaze: { name: 'BLAZE', text: `ACT 2. BOLTS: YOUR SPECIAL DEALS +${BLAZE_BONUS.each}.` },
};

const TIER_COLOR = { common: '#c9c9d9', uncommon: '#5ad8e8', legendary: '#ffd23f', other: '#9a8fb0' };

/** Every relic, grouped common → uncommon → legendary → the rest (counters and specials). */
export const RELIC_ORDER: RelicId[] = (() => {
  const seen = new Set<RelicId>();
  const out: RelicId[] = [];
  for (const t of ['common', 'uncommon', 'legendary'] as const)
    for (const r of RELIC_TIER[t])
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
  for (const r of Object.keys(RELICS) as RelicId[]) if (!seen.has(r)) out.push(r);
  return out;
})();

const relicTier = (r: RelicId): keyof typeof TIER_COLOR =>
  LEGENDARY.has(r) ? 'legendary' : RELIC_TIER.uncommon.includes(r) ? 'uncommon' : RELIC_TIER.common.includes(r) ? 'common' : 'other';

export const heroSprite = (id: CabinetId): SpriteId => (hasSprite(CABINETS[id].heroSprite) ? artId(CABINETS[id].heroSprite) : 'playerPortrait');

const LOAD_MIN = 1.3;
const ROWS_PER_PAGE = 7;

export class Menus {
  mode: MenuMode = 'none';
  private buttons: Button[] = [];
  private active: Button | null = null;
  private fade = 0;
  private mouse = { x: -1, y: -1 };
  // loading
  private loadT = 0;
  private warmed = 0;
  private readonly warmList = Object.keys(SPRITES) as SpriteId[];
  private readonly scratch = document.createElement('canvas').getContext('2d');
  private ready = false;
  // hiscores
  private sort: 'best' | 'recent' = 'best';
  private page = 0;
  private resetArmed = 0;

  constructor(
    private ui: Clock,
    private sounds: Sounds,
    private profile: () => Profile,
    private unlocked: () => Set<CabinetId>,
    private cb: { onNewRun: () => void; onTutorial: () => void; onReset: () => void; tutorialDone: () => boolean },
  ) {}

  get isOpen(): boolean {
    return this.mode !== 'none';
  }

  private btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void, textScale = 2): Button {
    const b = new Button(label, x, y, w, h, onClick, this.ui, () => this.sounds.click(), { textScale });
    this.buttons.push(b);
    return b;
  }

  private open(mode: MenuMode): void {
    this.mode = mode;
    this.buttons = [];
    this.active = null;
    this.fade = 0;
    void this.ui.tween({ from: 0, to: 1, dur: 0.25, ease: sineOut, onUpdate: (v) => (this.fade = v) });
  }

  hide(): void {
    this.mode = 'none';
    this.buttons = [];
  }

  showLoading(): void {
    this.open('loading');
    this.loadT = 0;
    this.warmed = 0;
    this.ready = false;
  }

  showMain(): void {
    this.open('main');
    const x = W / 2;
    const first = !this.cb.tutorialDone();
    this.btn('NEW RUN', x, 336, 380, 60, () => this.cb.onNewRun(), 3).opts.idlePulse = !first;
    this.btn('TUTORIAL', x, 410, 380, 60, () => this.cb.onTutorial(), 3).opts.idlePulse = first;
    this.btn('COLLECTION', x, 484, 380, 60, () => this.showCollection(), 3);
    this.btn('HISCORES', x, 558, 380, 60, () => this.showHiscores(), 3);
    this.resetArmed = 0;
    const reset = this.btn('RESET SAVE', W - 110, 36, 190, 40, () => {
      if (performance.now() - this.resetArmed < 400) return;
      if (!this.resetArmed) {
        this.resetArmed = performance.now();
        reset.label = 'SURE? CLICK AGAIN';
        reset.w = 250;
        reset.x = W - 140;
        this.sounds.fizzle();
        setTimeout(() => {
          if (this.mode !== 'main') return;
          this.resetArmed = 0;
          reset.label = 'RESET SAVE';
          reset.w = 190;
          reset.x = W - 110;
        }, 2500);
        return;
      }
      this.cb.onReset();
      this.showMain();
    });
  }

  showCollection(): void {
    this.open('collection');
    this.btn('BACK', 100, 44, 140, 48, () => this.showMain());
  }

  showHiscores(): void {
    this.open('hiscores');
    this.page = 0;
    this.hiscoreButtons();
  }

  private hiscoreButtons(): void {
    this.buttons = [];
    this.btn('BACK', 100, 44, 140, 48, () => this.showMain());
    const best = this.btn('BEST', W - 250, 44, 130, 44, () => {
      this.sort = 'best';
      this.page = 0;
      this.hiscoreButtons();
    });
    const recent = this.btn('RECENT', W - 110, 44, 130, 44, () => {
      this.sort = 'recent';
      this.page = 0;
      this.hiscoreButtons();
    });
    best.toggled = this.sort === 'best';
    recent.toggled = this.sort === 'recent';
    const pages = Math.max(1, Math.ceil(this.entries().length / ROWS_PER_PAGE));
    if (pages > 1) {
      const prev = this.btn('PREV', W / 2 - 160, H - 36, 130, 40, () => {
        this.page = Math.max(0, this.page - 1);
        this.hiscoreButtons();
      });
      const next = this.btn('NEXT', W / 2 + 160, H - 36, 130, 40, () => {
        this.page = Math.min(pages - 1, this.page + 1);
        this.hiscoreButtons();
      });
      prev.enabled = this.page > 0;
      next.enabled = this.page < pages - 1;
    }
  }

  private entries(): RunEntry[] {
    const runs = [...this.profile().runs];
    if (this.sort === 'recent') return runs.sort((a, b) => b.at - a.at);
    return runs.sort((a, b) => runScore(b) - runScore(a) || b.at - a.at);
  }

  // ---- input -------------------------------------------------------------------------

  pointerDown(x: number, y: number): boolean {
    if (!this.isOpen) return false;
    if (this.mode === 'loading') {
      if (this.ready) {
        this.sounds.fanfareJackpot();
        this.showMain();
      }
      return true;
    }
    const b = this.buttons.find((b) => b.visible && b.contains(x, y));
    if (b) {
      this.active = b;
      b.down();
    }
    return true;
  }

  pointerUp(x: number, y: number): void {
    const b = this.active;
    this.active = null;
    b?.up(b.contains(x, y));
  }

  pointerMove(x: number, y: number): boolean {
    this.mouse = { x, y };
    let any = false;
    for (const b of this.buttons) {
      b.hover = b.visible && b.contains(x, y);
      any ||= b.hover && b.enabled;
    }
    return any;
  }

  /** Space / Enter on the loading screen. */
  key(k: string): boolean {
    if (this.mode === 'loading') {
      if ((k === ' ' || k === 'enter') && this.ready) this.pointerDown(0, 0);
      return true;
    }
    return this.isOpen;
  }

  // ---- frame -------------------------------------------------------------------------

  update(dt: number): void {
    for (const b of this.buttons) b.update(dt);
    if (this.mode !== 'loading') return;
    this.loadT += dt;
    // Build every sprite once now, so the first fight doesn't hitch.
    const ctx = this.scratch;
    for (let i = 0; i < 24 && this.warmed < this.warmList.length; i++, this.warmed++) if (ctx) drawSprite(ctx, this.warmList[this.warmed], -100, -100, 1);
    if (!this.ready && this.loadT >= LOAD_MIN && this.warmed >= this.warmList.length) this.ready = true;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.isOpen) return;
    ctx.fillStyle = 'rgba(6,2,12,0.9)';
    if (this.mode !== 'main') ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.mode === 'loading') this.drawLoading(ctx, t);
    else if (this.mode === 'main') this.drawMain(ctx, t);
    else if (this.mode === 'collection') this.drawCollection(ctx);
    else if (this.mode === 'hiscores') this.drawHiscores(ctx, t);
    for (const b of this.buttons) b.draw(ctx, t);
    if (this.mode === 'main') {
      // Icons on the menu buttons (over them, scaled with their press).
      const icons = ['iconNewRun', 'iconTutorial', 'iconCollection', 'iconHiscores'];
      this.buttons.slice(0, 4).forEach((b, i) => {
        if (hasSprite(icons[i])) drawSprite(ctx, artId(icons[i]), b.x - (b.w / 2 - 38) * b.scale, b.y, 2.5 * b.scale);
      });
    }
    ctx.restore();
  }

  private logo(ctx: CanvasRenderingContext2D, y: number, t: number, scale = 4): void {
    const bob = Math.sin(t * 2) * 3;
    if (hasSprite('logo')) drawSprite(ctx, artId('logo'), W / 2, y + bob, scale);
    else {
      drawText(ctx, 'SLOTS', W / 2 - 230, y + bob, 8, COLORS.goldLight);
      drawText(ctx, 'VS.', W / 2, y - bob, 6, '#ff6a5a');
      drawText(ctx, 'SLOTS', W / 2 + 230, y + bob, 8, COLORS.slime);
    }
  }

  private drawLoading(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    this.logo(ctx, 220, t);
    const frame = Math.floor(t * 8) % 4;
    const coin = `coinSpin${frame}`;
    if (hasSprite(coin)) drawSprite(ctx, artId(coin), W / 2, 400, 4);
    else drawSprite(ctx, 'chip', W / 2, 400, 4, { sx: Math.abs(Math.cos(t * 5)) + 0.1 });
    const p = Math.min(1, Math.min(this.loadT / LOAD_MIN, this.warmed / Math.max(1, this.warmList.length)));
    const bw = 420;
    const bx = W / 2 - bw / 2;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 6, 470, bw + 12, 30);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(bx - 3, 473, bw + 6, 24);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(bx, 476, bw, 18);
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(bx, 476, Math.round(bw * p), 18);
    if (this.ready) drawText(ctx, 'CLICK TO PLAY', W / 2, 560, 3, COLORS.goldLight, { alpha: 0.55 + 0.45 * Math.sin(t * 5) });
    else drawText(ctx, `SHUFFLING THE REELS... ${Math.round(p * 100)}%`, W / 2, 530, 2, COLORS.textDim);
    drawText(ctx, 'PLAYTEST BUILD. PROGRESS SAVES IN THIS BROWSER.', W / 2, H - 30, 1.5, COLORS.textDim);
  }

  private drawMain(ctx: CanvasRenderingContext2D, t: number): void {
    // The casino backdrop shows through; darken it so the menu reads.
    ctx.fillStyle = 'rgba(6,2,12,0.72)';
    ctx.fillRect(0, 0, W, H);
    this.logo(ctx, 130, t);
    drawText(ctx, 'A SLOT MACHINE ROGUELIKE', W / 2, 238, 2, COLORS.textDim);
    // Your unlocked heroes on the left, their machines on the right.
    const open = this.unlocked();
    CABINET_ORDER.forEach((id, i) => {
      const on = open.has(id);
      const y = 300 + i * 70;
      const bob = on ? Math.sin(t * 2 + i) * 2 : 0;
      drawSprite(ctx, on ? heroSprite(id) : 'playerPortrait', 190, y + bob, 2.5, on ? {} : { variant: 'black', alpha: 0.5 });
      drawText(ctx, on ? CABINETS[id].hero : '???', 240, y, 2, on ? COLORS.goldLight : COLORS.textDim, { align: 'left' });
      drawText(ctx, on ? CABINETS[id].name : 'LOCKED', 240, y + 20, 1.25, COLORS.textDim, { align: 'left' });
    });
    drawSprite(ctx, 'cabinetKnight', W - 250, 440, 4.5, { rot: Math.sin(t * 1.3) * 0.02 });
    if (hasSprite('menuBackdrop')) drawSprite(ctx, artId('menuBackdrop'), W / 2, 646, 3);
    const p = this.profile();
    const found = p.found.relics.length + p.found.charms.length;
    const total = RELIC_ORDER.length + ALL_CHARMS.length;
    const best = p.runs.reduce((m, e) => Math.max(m, runScore(e)), 0);
    drawText(ctx, `COLLECTION ${found}/${total}   RUNS ${p.runs.length}   BEST ${best}`, W / 2, 604, 1.5, COLORS.textDim);
    if (!this.cb.tutorialDone()) drawText(ctx, 'NEW HERE? TRY THE TUTORIAL', W / 2, 276, 2, COLORS.goldLight, { alpha: 0.6 + 0.4 * Math.sin(t * 4) });
    drawText(ctx, 'PLAYTEST BUILD', 20, H - 20, 1.5, COLORS.textDim, { align: 'left' });
  }

  private tile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, border: string, hover: boolean): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6);
    ctx.fillStyle = hover ? '#ffffff' : border;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size - 6);
  }

  private mystery(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    if (hasSprite('mysterySlot')) drawSprite(ctx, artId('mysterySlot'), x, y, scale);
    else drawText(ctx, '?', x, y, scale * 1.5, COLORS.textDim);
  }

  private near(x: number, y: number, r: number): boolean {
    return Math.abs(this.mouse.x - x) < r && Math.abs(this.mouse.y - y) < r;
  }

  private drawCollection(ctx: CanvasRenderingContext2D): void {
    const p = this.profile();
    drawText(ctx, 'COLLECTION', W / 2, 44, 5, COLORS.goldLight);
    let tip: { title: string; text: string; color: string } | null = null;

    // Charms.
    const nc = p.found.charms.length;
    drawText(ctx, `CHARMS ${nc}/${ALL_CHARMS.length}`, 60, 110, 2.5, COLORS.text, { align: 'left' });
    drawText(ctx, 'FULL SET: THE SAME CHARM ON ALL 3 REELS', W - 60, 110, 1.5, COLORS.textDim, { align: 'right' });
    ALL_CHARMS.forEach((enh, i) => {
      const x = W / 2 + (i - 3) * 150;
      const y = 176;
      const got = p.found.charms.includes(enh);
      const hover = this.near(x, y, 36);
      this.tile(ctx, x, y, 72, got ? COLORS.gold : '#3a3448', hover);
      if (got) {
        drawSprite(ctx, GILD_SYMBOLS[enh][0] as SpriteId, x, y, 3);
        drawSprite(ctx, ENH_SPRITE[enh], x, y, 3);
      } else this.mystery(ctx, x, y, 3);
      drawText(ctx, got ? CHARM_INFO[enh].name : '???', x, y + 52, 1.5, got ? COLORS.goldLight : COLORS.textDim);
      if (hover) tip = got ? { title: `${CHARM_INFO[enh].name} CHARM`, text: CHARM_INFO[enh].text, color: COLORS.goldLight } : { title: '???', text: 'NOT DISCOVERED YET. PUT THIS CHARM ON YOUR MACHINE IN A RUN.', color: COLORS.textDim };
    });

    // Relics.
    const nr = p.found.relics.length;
    drawText(ctx, `RELICS ${nr}/${RELIC_ORDER.length}`, 60, 270, 2.5, COLORS.text, { align: 'left' });
    (['common', 'uncommon', 'legendary'] as const).forEach((tier, i) =>
      drawText(ctx, tier.toUpperCase(), W - 360 + i * 120, 270, 1.5, TIER_COLOR[tier], { align: 'left' }),
    );
    const cols = 14;
    const pitch = 80;
    RELIC_ORDER.forEach((r, i) => {
      const x = W / 2 + ((i % cols) - (cols - 1) / 2) * pitch;
      const y = 330 + Math.floor(i / cols) * 76;
      const got = p.found.relics.includes(r);
      const hover = this.near(x, y, 30);
      const tier = relicTier(r);
      this.tile(ctx, x, y, 58, got ? TIER_COLOR[tier] : '#3a3448', hover);
      if (got) drawSprite(ctx, RELICS[r].sprite as SpriteId, x, y, 2.5);
      else this.mystery(ctx, x, y, 2.5);
      if (hover)
        tip = got
          ? { title: RELICS[r].name, text: RELICS[r].text, color: TIER_COLOR[tier] }
          : { title: '???', text: tier === 'other' ? 'NOT DISCOVERED YET. SOME RELICS ONLY TURN UP AGAINST CERTAIN ENEMIES.' : `NOT DISCOVERED YET. A ${tier.toUpperCase()} RELIC.`, color: COLORS.textDim };
    });

    // Detail panel.
    const py = 610;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(W / 2 - 424, py - 44, 848, 92);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(W / 2 - 420, py - 40, 840, 84);
    const shown = tip as { title: string; text: string; color: string } | null;
    if (shown) {
      drawText(ctx, shown.title, W / 2, py - 20, 2.5, shown.color);
      wrap(shown.text, 64).slice(0, 2).forEach((l, k) => drawText(ctx, l, W / 2, py + 10 + k * 20, 2, COLORS.text));
    } else drawText(ctx, 'HOVER A TILE TO READ IT', W / 2, py, 2, COLORS.textDim);
  }

  private drawHiscores(ctx: CanvasRenderingContext2D, t: number): void {
    drawText(ctx, 'HISCORES', W / 2, 44, 5, COLORS.goldLight);
    const list = this.entries();
    if (!list.length) {
      drawText(ctx, 'NO RUNS YET. GO PLAY ONE!', W / 2, H / 2, 3, COLORS.textDim);
      return;
    }
    const rows = list.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE);
    const bestScore = runScore([...list].sort((a, b) => runScore(b) - runScore(a))[0]);
    drawText(ctx, 'SCORE: 100 PER FIGHT WON, +1000 FOR A CLEAR, +1000 FOR THE DEALER. X1.5 PER STAKE.', W / 2, 92, 1.25, COLORS.textDim);
    rows.forEach((e, i) => {
      const y = 150 + i * 72;
      const rank = this.page * ROWS_PER_PAGE + i + 1;
      const top = runScore(e) === bestScore && this.sort === 'best' && rank === 1;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(40, y - 32, W - 80, 66);
      ctx.fillStyle = e.won ? '#8a6a1c' : '#3a2d52';
      ctx.fillRect(43, y - 29, W - 86, 60);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(46, y - 26, W - 92, 54);
      drawText(ctx, String(rank), 76, y, 3, top ? '#ffd23f' : COLORS.textDim);
      drawSprite(ctx, heroSprite(e.cabinet), 130, y, 2);
      const stake = STAKES[e.stake];
      drawText(ctx, CABINETS[e.cabinet].hero, 164, y - 12, 2, COLORS.goldLight, { align: 'left' });
      drawText(ctx, `${CABINETS[e.cabinet].name}  ${e.stake ? `STAKE ${e.stake} ${stake.name}` : 'BASE GAME'}`, 164 + CABINETS[e.cabinet].hero.length * 12 + 14, y - 12, 1.25, e.stake ? stake.color : COLORS.textDim, { align: 'left' });
      // Result.
      const icon = e.won ? 'trophySmall' : 'hsSkull';
      if (hasSprite(icon)) drawSprite(ctx, artId(icon), 172, y + 13, 1.5);
      const result = e.won
        ? e.acts >= 3
          ? 'BEAT THE DEALER! TRUE ENDING'
          : 'BEAT THE MIRROR! RUN CLEARED'
        : `KILLED BY ${e.killer ?? '???'}, FIGHT ${e.killerFight ?? e.fights + 1}/${e.total}`;
      drawText(ctx, result, 188, y + 13, 1.5, e.won ? '#ffd23f' : '#ff8a7a', { align: 'left' });
      if (!e.won && e.killerPortrait) drawSprite(ctx, e.killerPortrait as SpriteId, 188 + result.length * 9 + 22, y + 4, 1.5);
      // Build: relics then charms.
      const bx = 650;
      e.relics.slice(0, 14).forEach((r, k) => drawSprite(ctx, RELICS[r].sprite as SpriteId, bx + (k % 7) * 26, y - 12 + Math.floor(k / 7) * 26, 1.4));
      if (e.relics.length > 14) drawText(ctx, `+${e.relics.length - 14}`, bx + 7 * 26, y + 14, 1.25, COLORS.textDim, { align: 'left' });
      if (!e.relics.length) drawText(ctx, 'NO RELICS', bx, y - 12, 1.25, COLORS.textDim, { align: 'left' });
      const cx = 860;
      e.charms.forEach((c, k) => {
        const x = cx + (k % 4) * 30;
        const yy = y - 12 + Math.floor(k / 4) * 26;
        drawSprite(ctx, GILD_SYMBOLS[c.enh][0] as SpriteId, x, yy, 1.4);
        drawSprite(ctx, ENH_SPRITE[c.enh], x, yy, 1.4);
        if (c.tier) drawText(ctx, 'II', x + 11, yy + 9, 1, '#ffffff');
        if (c.set) drawText(ctx, '3', x - 11, yy + 9, 1, '#ffd23f');
      });
      if (!e.charms.length) drawText(ctx, 'NO CHARMS', cx - 12, y - 12, 1.25, COLORS.textDim, { align: 'left' });
      // Score and date.
      drawText(ctx, String(runScore(e)), W - 64, y - 8, 3, top ? '#ffd23f' : COLORS.text, { align: 'right', punch: top ? 1 + 0.04 * Math.sin(t * 4) : 1 });
      const d = new Date(e.at);
      drawText(ctx, `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}  ${e.maxHp} MAX HP`, W - 64, y + 18, 1.25, COLORS.textDim, { align: 'right' });
    });
    const pages = Math.ceil(list.length / ROWS_PER_PAGE);
    if (pages > 1) drawText(ctx, `PAGE ${this.page + 1}/${pages}`, W / 2, H - 36, 2, COLORS.textDim);
    drawText(ctx, 'II: TIER II   3: FULL SET', 60, H - 30, 1.25, COLORS.textDim, { align: 'left' });
  }
}
