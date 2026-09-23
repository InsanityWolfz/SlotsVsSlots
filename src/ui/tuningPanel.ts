import { defaultConfig, type GameConfig, type PairRule, type ShieldReset, type SideId, type SymbolId } from '../core/config';
import { formatSummary, simulate } from '../sim/simulate';
import type { Game } from '../game';
import type { JuiceToggles } from '../present/stage';

const SIDE_SYMBOLS: Record<SideId, SymbolId[]> = { player: ['sword', 'shield', 'bolt'], enemy: ['sword', 'shield', 'slime'] };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...kids);
  return e;
}

/**
 * Live tuning drawer (` key). Edits a draft config; "Apply & restart" starts a new fight with
 * it. Also hosts juice toggles, seed control, forced outcomes and the in-browser sim.
 */
export class TuningPanel {
  readonly root: HTMLDivElement;
  private draft: GameConfig;
  private body: HTMLDivElement;
  private simOut!: HTMLPreElement;

  constructor(private game: Game) {
    this.draft = structuredClone(game.cfg);
    this.root = el('div', { class: 'drawer right', id: 'tuning' });
    const head = el('div', { class: 'drawer-head' }, el('span', {}, 'TUNING'), this.button('×', () => this.toggle(false), 'close'));
    this.body = el('div', { class: 'drawer-body' });
    this.root.append(head, this.body);
    document.getElementById('overlay')!.append(this.root);
    this.render();
    game.onFightChange.push(() => this.refreshSeed());
  }

  get open(): boolean {
    return this.root.classList.contains('open');
  }

  toggle(force?: boolean): void {
    const open = force ?? !this.open;
    this.root.classList.toggle('open', open);
    if (open) {
      this.draft = structuredClone(this.game.cfg);
      this.render();
    }
  }

  private button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
    const b = el('button', { class: cls }, label);
    b.addEventListener('click', () => {
      this.game.sounds.click();
      onClick();
    });
    return b;
  }

  private num(label: string, get: () => number, set: (v: number) => void, min = 0, step = 1): HTMLLabelElement {
    const input = el('input', { type: 'number', min: String(min), step: String(step), value: String(get()) });
    input.addEventListener('change', () => {
      const v = Number(input.value);
      if (Number.isFinite(v)) set(v);
    });
    return el('label', { class: 'row' }, el('span', {}, label), input);
  }

  private check(label: string, get: () => boolean, set: (v: boolean) => void): HTMLLabelElement {
    const input = el('input', { type: 'checkbox' });
    input.checked = get();
    input.addEventListener('change', () => set(input.checked));
    return el('label', { class: 'row' }, el('span', {}, label), input);
  }

  private select<T extends string>(label: string, options: [T, string][], get: () => T, set: (v: T) => void): HTMLLabelElement {
    const s = el('select');
    for (const [v, text] of options) {
      const o = el('option', { value: v }, text);
      if (v === get()) o.selected = true;
      s.append(o);
    }
    s.addEventListener('change', () => set(s.value as T));
    return el('label', { class: 'row' }, el('span', {}, label), s);
  }

  private section(title: string, ...kids: Node[]): HTMLElement {
    return el('section', {}, el('h3', {}, title), ...kids);
  }

  private stripGrid(side: SideId): HTMLElement {
    const syms = SIDE_SYMBOLS[side];
    const grid = el('div', { class: 'strip-grid' });
    grid.append(el('span'), ...syms.map((s) => el('span', { class: 'sym' }, s)));
    this.draft[side].strips.forEach((counts, r) => {
      grid.append(el('span', { class: 'sym' }, `reel ${r + 1}`));
      for (const s of syms) {
        const input = el('input', { type: 'number', min: '0', value: String(counts[s] ?? 0) });
        input.addEventListener('change', () => (counts[s] = Math.max(0, Math.floor(Number(input.value) || 0))));
        grid.append(input);
      }
    });
    return grid;
  }

  private seedLabel!: HTMLSpanElement;

  private refreshSeed(): void {
    if (this.seedLabel) this.seedLabel.textContent = `current: ${this.game.fight.seed}`;
  }

  private render(): void {
    const d = this.draft;
    const g = this.game;
    this.body.replaceChildren();

    this.body.append(
      el(
        'div',
        { class: 'actions' },
        this.button('APPLY & RESTART', () => this.apply(), 'primary'),
        this.button('RESET DEFAULTS', () => {
          this.draft = defaultConfig();
          this.render();
        }),
      ),
      this.section(
        'Fight',
        this.num('Player HP', () => d.player.hp, (v) => (d.player.hp = Math.max(1, v)), 1),
        this.num('Enemy HP', () => d.enemy.hp, (v) => (d.enemy.hp = Math.max(1, v)), 1),
        this.num('Special cost', () => d.specialCost, (v) => (d.specialCost = Math.max(1, v)), 1),
        this.num('Special damage', () => d.specialDamage, (v) => (d.specialDamage = v)),
        this.check('Special ignores shield', () => d.specialIgnoresShield, (v) => (d.specialIgnoresShield = v)),
        this.select<ShieldReset>(
          'Shield reset',
          [
            ['ownTurnStart', 'start of own turn'],
            ['roundEnd', 'end of round (both)'],
            ['never', 'never'],
          ],
          () => d.shieldReset,
          (v) => (d.shieldReset = v),
        ),
        this.check('Slime triple cleanses', () => d.cleanseOnSlimeTriple, (v) => (d.cleanseOnSlimeTriple = v)),
      ),
      this.section(
        'Scoring',
        this.select<PairRule>(
          'Pair rule',
          [
            ['inOrder', 'in order (reels 1+2)'],
            ['anyTwo', 'any two'],
          ],
          () => d.pairRule,
          (v) => (d.pairRule = v),
        ),
        this.num('Pair multiplier', () => d.pairMult, (v) => (d.pairMult = v), 0, 0.5),
        this.num('Triple multiplier', () => d.tripleMult, (v) => (d.tripleMult = v), 0, 0.5),
        ...(['sword', 'shield', 'bolt', 'slime'] as SymbolId[]).map((s) => this.num(`Base ${s}`, () => d.base[s], (v) => (d.base[s] = v))),
      ),
      this.section('Player strips', this.stripGrid('player')),
      this.section('Enemy strips', this.stripGrid('enemy')),
    );

    // Seed.
    const seedInput = el('input', { type: 'number', placeholder: 'random', value: d.seed === null ? '' : String(d.seed) });
    seedInput.addEventListener('change', () => (d.seed = seedInput.value === '' ? null : Number(seedInput.value) >>> 0));
    this.seedLabel = el('span', { class: 'dim' });
    this.refreshSeed();
    this.body.append(
      this.section(
        'Seed',
        el('label', { class: 'row' }, el('span', {}, 'Fixed seed'), seedInput),
        el(
          'div',
          { class: 'row' },
          this.seedLabel,
          this.button('LOCK CURRENT', () => {
            d.seed = g.fight.seed;
            seedInput.value = String(d.seed);
          }),
        ),
      ),
    );

    // Meta progression (dev).
    this.body.append(
      this.section(
        'Cabinets',
        this.check('Unlock all cabinets (dev)', () => g.prefs.unlockAll, (v) => {
          g.prefs.unlockAll = v;
          g.savePrefs();
        }),
        this.button('RESET UNLOCKS', () => {
          g.prefs.unlocked = ['knight'];
          g.prefs.stakes = {};
          g.prefs.stakeSel = 0;
          g.prefs.act3 = false;
          g.savePrefs();
        }),
      ),
    );

    // Juice toggles: apply immediately.
    const j = g.prefs.juice;
    const keys = Object.keys(j) as (keyof JuiceToggles)[];
    this.body.append(
      this.section(
        'Juice layers (live)',
        el(
          'div',
          { class: 'toggles' },
          ...keys.map((k) =>
            this.check(
              k,
              () => j[k],
              (v) => {
                j[k] = v;
                g.applyJuice();
              },
            ),
          ),
        ),
      ),
    );

    // Force next outcome.
    const forceRow = (side: SideId) => {
      const opts = side === 'player' ? ['sword', 'shield', 'bolt', 'slime'] : SIDE_SYMBOLS.enemy;
      const sels = [0, 1, 2].map(() => {
        const s = el('select');
        s.append(el('option', { value: '' }, 'any'), ...opts.map((o) => el('option', { value: o }, o)));
        return s;
      });
      return el(
        'div',
        { class: 'row force' },
        el('span', {}, side),
        ...sels,
        this.button('FORCE', () => {
          const line = sels.map((s) => s.value as SymbolId);
          if (line.some(Boolean)) g.fight.forceNext(side, line);
        }),
      );
    };
    this.body.append(
      this.section('Force next spin (live fight)', forceRow('player'), forceRow('enemy'), el('p', { class: 'dim' }, 'Player "slime" only lands where a symbol is already slimed.')),
    );

    // Sim.
    const nInput = el('input', { type: 'number', min: '100', step: '100', value: '2000' });
    this.simOut = el('pre', { class: 'sim-out' }, 'Runs the real rules engine headless with the draft config above.');
    this.body.append(
      this.section(
        'Simulate',
        el(
          'div',
          { class: 'row' },
          el('span', {}, 'Fights'),
          nInput,
          this.button('RUN SIM', () => {
            this.simOut.textContent = 'running…';
            setTimeout(() => {
              const t0 = performance.now();
              const s = simulate(this.draft, Math.max(100, Number(nInput.value) || 2000));
              const ms = (performance.now() - t0).toFixed(0);
              this.simOut.textContent =
                `${formatSummary(s)}\n` +
                `avg dmg dealt: player ${s.avgPlayerDamage.toFixed(1)} / enemy ${s.avgEnemyDamage.toFixed(1)}\n(${s.fights} fights, ${ms}ms)`;
            }, 20);
          }),
        ),
        this.simOut,
      ),
    );
  }

  private apply(): void {
    this.game.cfg = structuredClone(this.draft);
    this.game.saveConfig();
    this.game.restart();
  }
}
