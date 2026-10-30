import { type Stop } from '../../core/enemies';
import { needsRoute, actStops } from '../../core/run';
import { ABILITY_UI, abilityName } from '../../present/hud';
import { COLORS, W } from '../../present/layout';
import { drawPortrait, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import { drawChip, drawPanel, KIT, T } from '../kit';
import { BUILD, MapTip, CX } from './shared';
import { CabinetScreen } from './cabinets';

/** The street map's colours: asphalt, its curbs, the centre line (dim, travelled, the picked path). */
export const STREET = { asphalt: '#221b30', curb: '#3a3250', dash: '#4e4430', lit: '#ffd23f', w: 26 };

/** An encounter's table icon (16x10 pixels): green felt on a gold rim, two cards dealt, wooden legs. */
const TABLE_ICON = [
  '...oooooooooo...',
  '.oogggggggggggoo',
  'ogfffwwwfrrrfffg',
  'ogfffwrwfrgrfffg',
  'ogfffwwwfrrrfffg',
  '.ogFFFFFFFFFFFgo',
  '..oggggggggggoo.',
  '...ob......bo...',
  '...ob......bo...',
  '...oo......oo...',
];
const TABLE_COLORS: Record<string, string> = { o: '#120c1c', g: '#ffd23f', f: '#1f8a4c', F: '#14603a', w: '#f4eee0', r: '#e8374b', k: '#1a1426', b: '#8a5a2e' };

export abstract class MapScreens extends CabinetScreen {
  /** An asphalt street from (x1, y1) to (x2, y2) (horizontal or vertical), its centre dashes lit up to `lit` of it. */
  protected street(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, o: { lit?: boolean; scroll?: number; dim?: boolean } = {}): void {
    const w = STREET.w;
    const horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    const ax = Math.round(Math.min(x1, x2));
    const ay = Math.round(Math.min(y1, y2));
    const len = Math.round(horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1));
    ctx.fillStyle = STREET.curb;
    if (horiz) ctx.fillRect(ax - w / 2, ay - w / 2 - 2, len + w, w + 4);
    else ctx.fillRect(ax - w / 2 - 2, ay - w / 2, w + 4, len + w);
    ctx.fillStyle = STREET.asphalt;
    if (horiz) ctx.fillRect(ax - w / 2, ay - w / 2, len + w, w);
    else ctx.fillRect(ax - w / 2, ay - w / 2, w, len + w);
    ctx.fillStyle = o.lit ? STREET.lit : STREET.dash;
    if (o.dim) ctx.globalAlpha *= 0.6;
    const off = Math.round(o.scroll ?? 0) % 16;
    for (let d = -off; d < len; d += 16) {
      const a = Math.max(0, d);
      const b = Math.min(len, d + 8);
      if (b <= a) continue;
      if (horiz) ctx.fillRect(ax + a, ay - 1, b - a, 3);
      else ctx.fillRect(ax - 1, ay + a, 3, b - a);
    }
    if (o.dim) ctx.globalAlpha /= 0.6;
  }

  /** The act as a street (the opener, your route, the Cashier, the boss); a fork sign holds the route until it's picked. */
  protected drawMap(ctx: CanvasRenderingContext2D, y: number, time: number): void {
    const run = this.run!;
    const stops: (Stop | null)[] = actStops(run);
    if (needsRoute(run) || (run.route === null && run.map.routes.length > 1)) stops.splice(1, 0, null);
    const n = stops.length;
    const gap = Math.min(116, 860 / Math.max(1, n - 1));
    const x0 = Math.round(CX - ((n - 1) * gap) / 2);
    const here = needsRoute(run) ? 1 : run.stop;
    this.street(ctx, x0, y, x0 + (n - 1) * gap, y);
    // The way you came, lit.
    ctx.fillStyle = STREET.lit;
    for (let d = 0; d < Math.min(here, n - 1) * gap; d += 16) ctx.fillRect(x0 + d, y - 1, Math.min(8, Math.min(here, n - 1) * gap - d), 3);
    let tip: MapTip | null = null;
    stops.forEach((st, i) => {
      const x = Math.round(x0 + i * gap);
      const t = this.drawStop(ctx, st, x, y, 1, { done: i < here, here: i === here });
      tip ??= t;
      if (i === here) drawSprite(ctx, 'nodeHere', x, y - 36 + (this.reduceMotion ? 0 : Math.round(Math.sin(time * 6) * 3)), 2);
      else if (st?.enemy?.isBoss) drawSprite(ctx, 'nodeBoss', x, y - 34, 2);
    });
    // Drawn last by the screen (over its cards).
    this.mapTip = tip;
  }

  /** An encounter's table icon at pixel scale `k`, centred. */
  protected drawTableIcon(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, dim = false): void {
    const h = TABLE_ICON.length;
    const w = TABLE_ICON[0].length;
    const x0 = Math.round(x - (w * k) / 2);
    const y0 = Math.round(y - (h * k) / 2);
    ctx.save();
    if (dim) ctx.globalAlpha *= 0.45;
    TABLE_ICON.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const col = TABLE_COLORS[ch];
        if (!col) return;
        ctx.fillStyle = col;
        ctx.fillRect(x0 + c * k, y0 + r * k, k, k);
      }),
    );
    ctx.restore();
  }

  /**
   * One stop: a framed portrait (fights; elites in orange, the boss in red), the Cashier, an encounter's table, or the
   * fork sign. `k` is the portraits' pixel scale (1 on the strip, 2 on the street map). Returns its tip when hovered.
   */
  protected drawStop(ctx: CanvasRenderingContext2D, st: Stop | null, x: number, y: number, k: number, o: { done?: boolean; here?: boolean; faded?: boolean; label?: boolean } = {}): MapTip | null {
    const e = st?.enemy;
    const s = Math.round((32 * k + 8) / 2);
    const dim = o.done || o.faded ? 0.6 : 0;
    const frame = e?.isBoss ? '#e04a3a' : st?.kind === 'elite' ? '#ff9a3a' : st?.kind === 'encounter' ? '#1f8a4c' : st?.kind === 'shop' ? '#5ad8e8' : o.here ? COLORS.goldLight : KIT.frameDim;
    ctx.save();
    if (o.faded) ctx.globalAlpha *= 0.55;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - s - 2, y - s - 2, s * 2 + 4, s * 2 + 4);
    ctx.fillStyle = o.here ? COLORS.goldLight : frame;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    ctx.fillStyle = e?.isBoss ? '#3a1218' : st?.kind === 'elite' ? '#3a2010' : st?.kind === 'encounter' ? '#0e2a1a' : st?.kind === 'shop' ? '#14283a' : '#1c1530';
    ctx.fillRect(x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4);
    ctx.clip();
    if (e) drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x, y + 2 * k, k * (32 / 32), { dim });
    else if (st?.kind === 'shop') drawPortrait(ctx, 'cashierPortrait', x, y + 2 * k, (k * 32) / 24, { dim });
    else if (st) this.drawTableIcon(ctx, x, y, 2 * k, !!(o.done || o.faded));
    else drawSprite(ctx, 'mapFork', x, y, 2 * k);
    ctx.restore();
    if (e?.elite) drawSprite(ctx, 'mapBadgeElite', x - s + 2 + 4 * k, y - s + 2 + 4 * k, 2 * Math.min(k, 1.5));
    if (o.done && st) drawSprite(ctx, 'nodeDone', x + s - 6 * k, y + s - 6 * k, 2 * Math.min(k, 1.5));
    if (o.label && st?.kind === 'encounter') drawText(ctx, 'GAMBLE', x, y + s + 14, T.small, '#7dff7a');
    else if (o.label && st?.kind === 'shop') drawText(ctx, 'CASHIER', x, y + s + 14, T.small, '#5ad8e8');
    ctx.restore();
    if (Math.abs(this.mouse.x - x) > s || Math.abs(this.mouse.y - y) > s) return null;
    if (e) return { e, x, y: y + s };
    if (st?.kind === 'shop') return { title: 'THE CASHIER', sub: 'SPEND YOUR CHIPS', x, y: y + s };
    if (st?.kind === 'encounter') return { title: 'A GAMBLE', sub: 'WHICH GAME? YOU FIND OUT AT THE TABLE', x, y: y + s };
    return { title: 'CHOOSE YOUR PATH', sub: 'AFTER THIS FIGHT', x, y: y + s };
  }

  /** A stop's tip: the name, then its ability as a chip (or the stop's line), in a kit panel. */
  protected drawNodeTip(ctx: CanvasRenderingContext2D, t: MapTip): void {
    const name = t.e ? (t.e.name ?? 'ENEMY') : (t.title ?? '');
    const ab = t.e?.ability ? ABILITY_UI[t.e.ability.kind] : null;
    const label = t.e?.ability ? abilityName(t.e.ability.kind) : '';
    const sub = t.e ? '' : (t.sub ?? '');
    const w = Math.round(Math.max(textWidth(name, T.body), ab ? textWidth(label, T.small) + 60 : 0, sub ? textWidth(sub, T.small) : 0) + 32);
    const h = ab || sub ? 66 : 40;
    const x = Math.round(Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, t.x - w / 2)));
    const y = Math.round(t.y + 12);
    drawPanel(ctx, x, y, w, h, { frame: t.e?.isBoss ? '#e04a3a' : t.e?.elite ? '#ff9a3a' : KIT.frame });
    drawText(ctx, name, x + 16, y + 20, T.body, t.e?.isBoss ? '#ff8a7a' : t.e ? COLORS.slime : KIT.title, { align: 'left' });
    if (ab) drawChip(ctx, label, x + 16 + (textWidth(label, T.small) + 40) / 2, y + 46, { scale: T.small, color: '#ffb060', icon: (ix, iy) => drawSprite(ctx, ab.icon, ix, iy, 2), iconW: 20 });
    else if (sub) drawText(ctx, sub, x + 16, y + 46, T.small, KIT.dim, { align: 'left' });
  }
}
