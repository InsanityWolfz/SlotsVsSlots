import { formatRow, rowsToCsv, type TurnRow } from '../core/log';
import type { Game } from '../game';

type Filter = 'all' | 'player' | 'enemy' | 'specials' | 'slime' | 'jackpots';

const FILTERS: [Filter, (r: TurnRow) => boolean][] = [
  ['all', () => true],
  ['player', (r) => r.side === 'player'],
  ['enemy', (r) => r.side === 'enemy'],
  ['specials', (r) => r.specials > 0],
  ['slime', (r) => r.slimed + r.cleansed + r.fizzled > 0],
  ['jackpots', (r) => r.tier === 'triple'],
];

/** Combat log drawer (L key): one line per turn, every fight this session, exportable. */
export class CombatLog {
  readonly root: HTMLDivElement;
  private list: HTMLDivElement;
  private filter: Filter = 'all';
  private rendered = 0;

  constructor(private game: Game) {
    this.root = document.createElement('div');
    this.root.className = 'drawer left';
    this.root.id = 'log';
    const head = document.createElement('div');
    head.className = 'drawer-head';
    head.innerHTML = '<span>COMBAT LOG</span>';
    const close = this.btn('×', () => this.toggle(false));
    close.className = 'close';
    head.append(close);

    const tools = document.createElement('div');
    tools.className = 'actions';
    const sel = document.createElement('select');
    for (const [f] of FILTERS) sel.append(new Option(f, f));
    sel.addEventListener('change', () => {
      this.filter = sel.value as Filter;
      this.rebuild();
    });
    tools.append(
      sel,
      this.btn('COPY JSON', () => void this.copy()),
      this.btn('CSV', () => this.download()),
      this.btn('CLEAR', () => {
        game.rows = [];
        this.rebuild();
      }),
    );
    this.list = document.createElement('div');
    this.list.className = 'log-list';
    this.root.append(head, tools, this.list);
    document.getElementById('overlay')!.append(this.root);
    game.onRows.push(() => this.append());
  }

  private btn(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => {
      this.game.sounds.click();
      onClick();
    });
    return b;
  }

  get open(): boolean {
    return this.root.classList.contains('open');
  }

  toggle(force?: boolean): void {
    this.root.classList.toggle('open', force ?? !this.open);
    if (this.open) this.rebuild();
  }

  private line(r: TurnRow, prev?: TurnRow): HTMLElement[] {
    const out: HTMLElement[] = [];
    if (!prev || prev.fight !== r.fight) {
      const h = document.createElement('div');
      h.className = 'log-fight';
      h.textContent = `── FIGHT ${r.fight} · seed ${r.seed} ──`;
      out.push(h);
    }
    const d = document.createElement('div');
    d.className = `log-row ${r.side} ${r.tier}${r.specials ? ' special' : ''}${r.slimed || r.cleansed ? ' slime' : ''}${r.winner ? ' end' : ''}`;
    d.textContent = formatRow(r);
    out.push(d);
    return out;
  }

  private rebuild(): void {
    const test = FILTERS.find(([f]) => f === this.filter)![1];
    const rows = this.game.rows;
    const nodes: HTMLElement[] = [];
    rows.forEach((r, i) => {
      if (test(r)) nodes.push(...this.line(r, i > 0 ? rows[i - 1] : undefined));
    });
    this.list.replaceChildren(...nodes);
    this.rendered = rows.length;
    this.list.scrollTop = this.list.scrollHeight;
  }

  private append(): void {
    if (!this.open) return;
    const rows = this.game.rows;
    const test = FILTERS.find(([f]) => f === this.filter)![1];
    const atBottom = this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight - 30;
    for (let i = this.rendered; i < rows.length; i++) if (test(rows[i])) this.list.append(...this.line(rows[i], rows[i - 1]));
    this.rendered = rows.length;
    if (atBottom) this.list.scrollTop = this.list.scrollHeight;
  }

  private async copy(): Promise<void> {
    await navigator.clipboard.writeText(JSON.stringify({ config: this.game.cfg, rows: this.game.rows }, null, 1)).catch(() => {});
  }

  private download(): void {
    const blob = new Blob([rowsToCsv(this.game.rows)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `slot-vs-slot-log-${Date.now()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
