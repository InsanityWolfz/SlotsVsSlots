import { type Stop } from '../../core/enemies';
import { needsRoute, actStops } from '../../core/run';
import { ABILITY_UI, abilityName } from '../../present/hud';
import { COLORS, W } from '../../present/layout';
import { drawPortrait, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { BADGE, BUILD, MapTip, CX } from './shared';
import { CabinetScreen } from './cabinets';

export abstract class MapScreens extends CabinetScreen {
  /** The act as a strip of stops (the opener, your route, the Cashier, the boss); a "?" holds the route until it's picked. */
  protected drawMap(ctx: CanvasRenderingContext2D, y: number, time: number): void {
    const run = this.run!;
    const stops: (Stop | null)[] = actStops(run);
    if (needsRoute(run) || (run.route === null && run.map.routes.length > 1)) stops.splice(1, 0, null);
    const n = stops.length;
    const gap = Math.min(130, 880 / Math.max(1, n - 1));
    const x0 = CX - ((n - 1) * gap) / 2;
    const here = needsRoute(run) ? 1 : run.stop;
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(x0, y - 2, (n - 1) * gap, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y - 2, Math.min(here, n - 1) * gap, 4);
    let tip: MapTip | null = null;
    stops.forEach((st, i) => {
      const x = x0 + i * gap;
      const t = this.drawStop(ctx, st, x, y, 26, { done: i < here, here: i === here });
      tip ??= t;
      if (i === here) drawSprite(ctx, 'nodeHere', x, y - 44 + Math.sin(time * 6) * 4, 2);
      if (st?.enemy?.isBoss) drawSprite(ctx, 'nodeBoss', x, y - 38, 2);
    });
    // Drawn last by the screen (over its cards).
    this.mapTip = tip;
  }

  /** One stop's node: a portrait (fights), the Cashier, a "?" ticket (encounters), or the unpicked route. Returns its tip when hovered. */
  protected drawStop(ctx: CanvasRenderingContext2D, st: Stop | null, x: number, y: number, s: number, o: { done?: boolean; here?: boolean; faded?: boolean } = {}): MapTip | null {
    const e = st?.enemy;
    const dim = o.done || o.faded ? 0.65 : 0;
    // Elites wear an orange frame (the crown badge alone was easy to miss).
    ctx.fillStyle = st?.kind === 'elite' && !o.faded ? '#ff9a3a' : COLORS.outline;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    // Encounters are gold boxes (the only "?" on the map); which one it is stays a secret until you get there.
    if (st?.kind === 'encounter') {
      ctx.fillStyle = o.faded || o.done ? '#7a6020' : COLORS.gold;
      ctx.fillRect(x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4);
    }
    ctx.fillStyle = e?.isBoss ? '#5a1a10' : st?.kind === 'elite' ? '#4a2410' : st?.kind === 'encounter' ? '#5a3a10' : st?.kind === 'shop' ? '#1e3a24' : o.here ? '#3a2a14' : COLORS.panelLight;
    ctx.fillRect(x - s + 3, y - s + 3, s * 2 - 6, s * 2 - 6);
    const k = s / 26;
    if (e) {
      drawPortrait(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x, y, 2 * k, { dim });
      const badge = BADGE[e.archetype];
      if (badge) drawSprite(ctx, badge, x + s - 2, y + s - 4, 2 * k, { alpha: o.faded ? 0.4 : 1 });
      if (e.elite) drawSprite(ctx, 'mapBadgeElite', x - s + 4, y - s + 4, 2 * k, { alpha: o.faded ? 0.4 : 1 });
    } else if (st?.kind === 'shop') drawSprite(ctx, 'cashierPortrait', x, y, 1.8 * k, { dim });
    else if (st) drawText(ctx, '?', x, y + 1, 3 * k, COLORS.goldLight, { alpha: o.done || o.faded ? 0.5 : 1 });
    else drawSprite(ctx, 'mapFork', x, y, 2.5 * k);
    if (o.done && st) drawSprite(ctx, 'nodeDone', x - s + 6, y + s - 6, 2 * k);
    if (Math.abs(this.mouse.x - x) > s || Math.abs(this.mouse.y - y) > s) return null;
    if (e) return { e, x, y: y + s };
    if (st?.kind === 'shop') return { title: 'THE CASHIER', sub: 'SPEND YOUR CHIPS', x, y: y + s };
    if (st?.kind === 'encounter') return { title: 'AN ENCOUNTER', sub: 'A GAMBLE. YOU FIND OUT WHICH WHEN YOU GET THERE', x, y: y + s };
    return { title: 'CHOOSE YOUR PATH', sub: 'AFTER THIS FIGHT', x, y: y + s };
  }

  /** A map node's mini card: name, then its ability icon and name (or a stop's name and line). */
  protected drawNodeTip(ctx: CanvasRenderingContext2D, t: MapTip): void {
    const name = t.e ? (t.e.name ?? 'ENEMY') : (t.title ?? '');
    const ab = t.e?.ability ? ABILITY_UI[t.e.ability.kind] : null;
    const sub = t.e ? (t.e.ability ? abilityName(t.e.ability.kind) : '') : (t.sub ?? '');
    const w = Math.max(name.length * 12, sub ? sub.length * 9 + (ab ? 30 : 0) : 0) + 24;
    const h = sub ? 52 : 32;
    const x = Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, t.x - w / 2));
    const y = t.y + 10;
    const edge = t.e?.isBoss ? '#ff6a5a' : t.e?.elite ? '#ff9a3a' : COLORS.gold;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = edge;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    drawText(ctx, name, x + 12, y + 16, 2, t.e?.isBoss ? '#ff6a5a' : t.e ? COLORS.slime : COLORS.goldLight, { align: 'left' });
    if (ab) {
      drawSprite(ctx, ab.icon, x + 20, y + 38, 1.5);
      drawText(ctx, ab.label, x + 34, y + 38, 1.5, '#ff9a3a', { align: 'left' });
    } else if (sub) drawText(ctx, sub, x + 12, y + 38, 1.5, COLORS.textDim, { align: 'left' });
  }

  /** A straight connector between two points, drawn as a 4px pixel line. */
  protected link(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
    for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(x1 + ((x2 - x1) * i) / steps) - 2, Math.round(y1 + ((y2 - y1) * i) / steps) - 2, 4, 4);
  }
}
