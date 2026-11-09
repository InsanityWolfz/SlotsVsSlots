import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { RELICS } from '../src/core/relics';
import { generateActMap } from '../src/core/enemies';
import { Rng } from '../src/core/rng';

// QA PLAY stream (2026-11-09): the expert playtest's bugs, fixed.
function setup(mut: (c: GameConfig) => void, line: SymbolId[]): { f: Fight; ev: CombatEvent[] } {
  const c = defaultConfig();
  c.seed = 7;
  c.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
  mut(c);
  const f = new Fight(c, 7);
  f.forceNext('player', line);
  return { f, ev: f.step().events };
}
const playerSpin = (ev: CombatEvent[]) => ev.find((e) => e.type === 'spin' && e.side === 'player') as Extract<CombatEvent, { type: 'spin' }>;

describe('PLAY-02: relic names in the pay climb', () => {
  it('LOADED DICE names itself LOADED DICE on a pair it doubles (not the old SKELETON KEY name)', () => {
    const { ev } = setup((c) => (c.relics = ['key']), ['sword', 'sword', 'shield']);
    const pair = playerSpin(ev).score.groups.find((g) => g.symbol === 'sword' && g.matched)!;
    expect(RELICS.key.name).toBe('LOADED DICE');
    expect(pair.notes?.join(' ')).toContain('LOADED DICE');
  });
});

describe('PLAY-03: elite names drop the adjective', () => {
  it('no elite keeps a regular adjective (TWO-BIT included)', () => {
    const ADJ = ['GRUMPY', 'SNEAKY', 'SHADY', 'SLICK', 'CROOKED', 'TWO-BIT', 'BROKE', 'SPITEFUL', 'DESPERATE', 'GREEDY'];
    const bad: string[] = [];
    for (let s = 1; s <= 400; s++)
      for (const act of [1, 2, 3]) {
        const map = generateActMap(new Rng(s), act, 1, 'knight');
        for (const route of map.routes)
          for (const st of route) {
            const name = st.kind === 'elite' ? (st.enemy?.name ?? '') : '';
            if (ADJ.some((a) => name.includes(a))) bad.push(name);
          }
      }
    expect([...new Set(bad)]).toEqual([]);
  });
});

describe('PLAY-01: the PAIR! HOLD IT call reads the reels as they stand', () => {
  const pairOf = () => {
    const { f, ev } = setup(() => {}, ['sword', 'sword', 'shield']);
    const g = playerSpin(ev).score.groups.find((q) => q.matched && q.reels.length === 2)!;
    return { f, g, cell: (r: number) => f.sides.player.reels[r].cells[f.sides.player.reels[r].stop] };
  };
  it('the pair just paid is holdable', () => {
    const { f, g } = pairOf();
    expect(f.pairHoldable(g.symbol, g.reels)).toBe(true);
  });
  it('a STEAL on a pair cell takes the call back (the PICKPOCKET stole both swords and the call stayed up)', () => {
    const { f, g, cell } = pairOf();
    cell(g.reels[0]).stolen = true;
    expect(f.pairHoldable(g.symbol, g.reels)).toBe(false);
  });
  it('a SPILL, a fake or a jam on a pair reel takes it back too', () => {
    for (const hurt of ['spill', 'fake', 'jam'] as const) {
      const { f, g, cell } = pairOf();
      if (hurt === 'spill') cell(g.reels[1]).slimed = true;
      if (hurt === 'fake') cell(g.reels[1]).faked = 2;
      if (hurt === 'jam') f.sides.player.locked[g.reels[1]] = 1;
      expect(f.pairHoldable(g.symbol, g.reels), hurt).toBe(false);
    }
  });
  it('a reel moved off the symbol (a rock or a freeze slip) takes it back', () => {
    const { f, g } = pairOf();
    const reel = f.sides.player.reels[g.reels[0]];
    const other = reel.cells.findIndex((c) => c.symbol !== g.symbol && c.symbol !== 'wild');
    reel.stop = other;
    expect(f.pairHoldable(g.symbol, g.reels)).toBe(false);
  });
});

describe('PLAY-U4: ENDLESS enemy hits say what grows them', () => {
  it('an endless loop names the loop (it said LATE)', () => {
    const c = defaultConfig();
    c.seed = 3;
    c.player = { ...c.player, hp: 1e9, strips: reels3({ shield: 12 }) };
    c.enemy = { hp: 1e9, strips: reels3({ sword: 12 }), endless: true, loop: 3, dmgMul: 1.4 };
    const f = new Fight(c, 3);
    let notes = '';
    for (let i = 0; i < 4 && !notes; i++) {
      const ev = f.step().events;
      const s = ev.find((e) => e.type === 'spin' && e.side === 'enemy') as Extract<CombatEvent, { type: 'spin' }> | undefined;
      notes = s?.score.groups.flatMap((g) => g.notes ?? []).join(' ') ?? '';
    }
    expect(notes).toContain('LOOP 3');
    expect(notes).not.toContain('LATE');
  });
});
