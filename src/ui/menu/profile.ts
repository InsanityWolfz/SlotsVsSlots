import { W } from '../../present/layout';
import type { Button } from '../button';
import { T } from '../kit';
import type { MenuScreen, Menus } from '../menus';
import { CollectionTab } from './collection';
import { StatsTab } from './stats';
import { TrophiesTab } from './trophies';

/**
 * PROFILE: one screen with three tabs (the near-empty hub is gone): COLLECTION (Charms, Relics and the casino town's
 * cast), TROPHIES (the achievements as plaques) and STATS (your numbers, your title and trim). The tabs are buttons in
 * a row, so the pad reaches them like anything else; Q / E (and the shoulder keys' [ ]) step through them too.
 */
export type ProfileTab = 'collection' | 'trophies' | 'stats';
const TABS: [ProfileTab, string][] = [
  ['collection', 'COLLECTION'],
  ['trophies', 'TROPHIES'],
  ['stats', 'STATS'],
];
export const TAB_Y = 112;

/** What a tab draws and builds; it adds its own buttons through the host. */
export interface TabBody {
  draw(ctx: CanvasRenderingContext2D, t: number): void;
  drawOver?(ctx: CanvasRenderingContext2D, t: number): void;
  update?(dt: number): void;
}

export class ProfileScreen implements MenuScreen {
  private keep: Button[] = [];
  private body: TabBody | null = null;

  constructor(
    private m: Menus,
    private tab: ProfileTab,
    private onTab: (t: ProfileTab) => void,
  ) {
    this.keep.push(m.header(() => m.showMain()));
    TABS.forEach(([id, label], i) => {
      const b = m.btn(label, W / 2 + (i - 1) * 232, TAB_Y, 216, 44, () => this.select(id), T.body);
      this.keep.push(b);
    });
    this.build();
  }

  private select(tab: ProfileTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.m.mode = tab === 'collection' ? 'collection' : tab === 'trophies' ? 'trophies' : 'progress';
    this.onTab(tab);
    this.build();
  }

  private build(): void {
    this.m.clearButtons(this.keep);
    TABS.forEach(([id], i) => (this.keep[i + 1].toggled = id === this.tab));
    this.body = this.tab === 'collection' ? new CollectionTab(this.m) : this.tab === 'trophies' ? new TrophiesTab(this.m) : new StatsTab(this.m);
    this.m.pointerMove(this.m.mouse.x, this.m.mouse.y);
  }

  key(k: string): boolean {
    const step = k === 'q' || k === '[' ? -1 : k === 'e' || k === ']' ? 1 : 0;
    if (!step) return false;
    const i = TABS.findIndex(([id]) => id === this.tab);
    const next = TABS[(i + step + TABS.length) % TABS.length][0];
    this.m.sounds.click();
    this.select(next);
    return true;
  }

  update(dt: number): void {
    this.body?.update?.(dt);
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    this.m.drawHeader(ctx, 'PROFILE');
    this.body?.draw(ctx, t);
  }

  drawOver(ctx: CanvasRenderingContext2D, t: number): void {
    this.body?.drawOver?.(ctx, t);
  }
}
