import { BLADES, cloneConfig, UNIT, unitsRound, unitsUp, type Enh, type GameConfig, type RelicId, type SideId, type SymbolId } from './config';
import { CABINETS, hasSpecial, type Cabinet, type Meter } from './cabinets';
import { charmLevel, charmValue, LUCRE_CHIPS, playerSymValue } from './charms';
import type { CombatEvent, DealCard, HealSource, LineCard } from './events';
import { MIDAS_TOUCH_CAP, OVERCHARGE_ECHO, OVERCHARGE, FANG_HEAL, FANG_TESLA_HEAL, NEW_RELIC, LEGEND_RELIC, POT } from './relics';
import { Rng } from './rng';
import { effectiveAbility, STAKE } from './stakes';
import { ENDLESS, GATEKEEPER, OVERTIME, overtimeMul, overtimeRound, OWNER_RULES, rungsClimbed, TUNE, WHEEL_RULES, wheelChipShare } from './enemies';
import { isNearMiss, scoreLine, type LineScore, type ScoreGroup } from './scoring';
import { DEAD, effectiveSymbol, insertOffscreen, wrap, paylineSymbols, symbolValue, type CellRef } from './strip';
// The fight is split in four (2026-10-29): its rules (fightRules), a spin's scoring (fightScore), what enemies do
// to your machine (fightTricks) and this class. Everything stays importable from here.
export * from './fightRules';
import { BUILD_UP, MIDAS, POT_STEAL, PAY, VOLUME, RAIN, highRollerMul, DEALER_RULES, DEALER_HANDS, allInRange, PAYOFF_WORD, PAYING, wheelCharm, JACKPOTABLE, type Combatant, type TurnResult, other, makeCombatant } from './fightRules';
import { scoreSpin } from './fightScore';
import { write, markedCards, tickFakes, defuse, burnFuses, tickStatuses, recover, cleanse, chargeAbility, sweepBets, cashPot, winPot } from './fightTricks';

/**
 * The whole fight as a pure state machine. Each step() is one combatant's turn: the full
 * outcome (stops, scoring, effects) is decided here, before any animation plays.
 */
export class Fight {
  readonly cfg: GameConfig;
  readonly rng: Rng;
  readonly sides: Record<SideId, Combatant>;
  turn = 0;
  next: SideId = 'player';
  winner: SideId | null = null;
  /** The House's progressive pot (boss fight). */
  pot = 0;
  /** ENDLESS: the loop House's pot is sized to your max HP (a flat pot is nothing to a late build). */
  private potCut = POT.houseCut;
  /** Boss went ALL IN (phase 2). */
  allIn = false;
  /** The House's cash-out fires at the start of its next turn (so LETHAL is always accurate). */
  cashPending = false;
  /** Run economy inputs: player jackpots landed and the overkill of the killing blow. */
  playerJackpots = 0;
  overkill = 0;
  /** The run's starting machine rules. */
  readonly cabinet: Cabinet | null;
  /** The player's signature meter (null: KNIGHT, or an engine test with the bare special). */
  readonly meter: Meter | null;
  /** The player has TESLA's lightning special (or no machine at all: the bare engine). */
  readonly special: boolean;
  /** Chips the Mimic ate this fight (taken from the run's purse afterwards). */
  chipsEaten = 0;
  /** Phoenix Feather already burned this fight. */
  phoenixUsed = false;
  /** An act 3 regular fight (graded: its ability opens, its first attack takes a cover charge). */
  get act3Regular(): boolean {
    return (this.cfg.enemy.act ?? 1) >= 3 && !this.isBoss && !this.isWheel && !this.isDealer;
  }
  /** ENDLESS: LAST CALL has been announced. */
  private lastCall = false;
  /** The act 3 cover charge has been taken this fight. */
  private coverTaken = false;
  /** HP you've lost this turn (one-turn cap: regular enemies 40% of your max HP, bosses 60%). */
  private playerTurnHp = 0;
  /** THE OWNER: tricks played so far (the next one is OWNER_TRICKS[n % length]). */
  ownerTricks = 0;
  /** THE OWNER's phase (0, then 1-3 at the ladder's first three rungs). */
  ownerPhase = 0;
  /** GLASS: payline reels whose GLASS shattered this spin (the cells lose it once the spin settles). */
  glassBreaks: number[] = [];
  /** SECOND PAYLINE's groups are resolving (no chips, no heals). */
  private lineTwo = false;
  /** GLASS Charms shattered this fight, by reel and symbol (the run loses them after). */
  readonly shattered: { reel: number; symbol: SymbolId }[] = [];
  /** DRY SPELL: your spins in a row with no pair or jackpot (each adds +25% to the next one). */
  /** BUILD-UP: dead spins banked toward your next pair or jackpot. */
  buildUp = 0;
  /** BUILD-UP's step and cap (DRY SPELL: bigger). */
  buildUpRule(me: Combatant = this.sides.player): { step: number; cap: number; dry: boolean } {
    const dry = me.relics.has('dryspell');
    return dry ? { step: BUILD_UP.dryStep, cap: BUILD_UP.dryCap, dry } : { step: BUILD_UP.on ? BUILD_UP.step : 0, cap: BUILD_UP.cap, dry };
  }
  buildUpMul(me: Combatant = this.sides.player): number {
    return 1 + this.buildUpRule(me).step * this.buildUp;
  }
  /** GOLDEN SPIN: this spin is golden (everything pays x3). */
  goldenNow = false;
  /** INSURANCE POLICY: used this fight; waiting to pay out (the hit landed, the shield comes after). */
  private insuranceUsed = false;
  private insurancePending = false;
  /** INSURANCE's shield still standing: it survives your next turn-start reset (it landed on the enemy's turn). */
  private insuranceKeep = 0;
  /** HOUSE TAX: chips the enemy's jackpots paid you (banked after the fight). */
  taxChips = 0;
  /** CERTIFIED HITMAKER: drops played this fight. */
  drops = 0;
  /** GOLDEN PARACHUTE: used this fight (its chips come off after). */
  private parachuteUsed = false;
  parachuteChips = 0;
  /** This enemy turn was announced (ALL IN). */
  private bigTurn = false;
  /** E3: reels of yours that thawed on your last turn can't be frozen or jammed on the next enemy turn. */
  thawShield = new Set<number>();
  /** Relics that act as the fight opens (Battery): popped on turn 1. */
  private openers: RelicId[] = [];
  /** THE WHEEL: chips (bets) on each of your reels. */
  readonly bets: number[] = [0, 0, 0];
  /** THE WHEEL SPINS FASTER (phase 2, or from the start at GREEN): it places WHEEL_RULES.fast chips a turn. */
  fast = false;
  /** GREEN: THE WHEEL STARTS FAST, so there is no half-HP phase (and no gate). */
  private fastFromStart = false;
  /** The turn THE WHEEL hit half HP on: it takes no more HP damage that turn (the half-HP gate). */
  private gateTurn = -1;
  /** THE WHEEL: chips your sweeps won this fight (paid if you win; CASSIDY's go straight into his hand). */
  betChips = 0;
  /** THE HOUSE: LAST CALL is on (it skims every turn). */
  houseLastCall = false;
  /** What each side did on its last spin: biggest group, and total damage sent (for the Mimic). */
  readonly last: Record<SideId, { best: number; damage: number }> = { player: { best: 0, damage: 0 }, enemy: { best: 0, damage: 0 } };
  /** BLAZE: extra special damage from the blaze cells you own. */
  readonly blaze: number;
  /** The Dealer: the card it will deal next, and whether it has dealt yet. */
  nextDeal: DealCard = 'card';
  /** THE DEALER: the hand it's playing (1-3). */
  dealerHand = 1;
  /** THE DEALER: turns its clock runs faster than DEALER_RULES (a new hand used to reset it: playtest C). */
  dealerCut = 0;
  /** THE DEALER's total HP (its hands share it). */
  private dealerTotal = 0;
  dealt = false;
  /** The Dealer's card on your payline (applies to your next spin). */
  lineCard: { reel: number; card: LineCard } | null = null;
  /** The Dealer's next attack is its whole hand. */
  dealerAllIn = false;
  /** DECK DRUM stacks (this fight). */
  drum = 0;
  /** MIDAS TOUCH: gold touches per cell (this fight), and how much meter the current touch spends. */
  readonly touches = new Map<object, number>();
  private touchSpend = 0;
  holyWater = false;
  /** Card Sharp marks placed this fight (THE DECK REMEMBERS). */
  marksPlaced = 0;
  private forced: Partial<Record<SideId, SymbolId[]>> = {};

  /** HOT STREAK: your last spin was a jackpot, so this one pays x2. */
  hotStreak = false;
  repoTaken = 0;
  constructor(cfg: GameConfig, seed: number = cfg.seed ?? Rng.randomSeed()) {
    this.cfg = cloneConfig(cfg);
    this.rng = new Rng(seed);
    this.sides = {
      player: makeCombatant('player', this.cfg.player, this.rng, this.cfg.relics),
      enemy: makeCombatant('enemy', this.cfg.enemy, this.rng, this.cfg.enemy.relics ?? []),
    };
    const p = this.sides.player;
    this.cabinet = this.cfg.cabinet ? CABINETS[this.cfg.cabinet] : null;
    this.meter = this.cabinet?.meter ?? null;
    this.special = hasSpecial(this.cabinet);
    if (this.cabinet?.specialCost) this.cfg.specialCost = this.cabinet.specialCost;
    if (this.cabinet?.specialDamage) this.cfg.specialDamage = this.cabinet.specialDamage;
    // TESLA, one axis: half-size bolts (the boosts' base stays the full strike's, `strikeBase`).
    this.strikeBase = this.cfg.specialDamage;
    if (this.oneAxis) {
      this.cfg.specialCost = Math.round(this.cfg.specialCost / 2);
      this.cfg.specialDamage = Math.round(this.cfg.specialDamage / 2);
    }
    // MIDAS: the VAULT starts pre-filled by the chips you hold (1 per 2 chips, never full).
    if (this.meter?.kind === 'vault') p.energy = Math.max(p.energy, this.vaultBase());
    // QUICKENING (legendary relic): your meter starts every fight half full (it was one short of full, and THE
    // JUKEBOX's DROP on spin 1: 7 of 8 fights after it ended in 1-3 spins, playtest 2026-10-31).
    if (p.relics.has('quickening') && (this.special || this.meter)) {
      const cost = this.special ? this.cfg.specialCost : this.meterCost;
      const half = this.meter?.kind === 'volume' ? Math.floor(cost / 2 / UNIT) * UNIT : Math.floor(cost / 2);
      // (BANKROLL's bar already starts filled by the chips held: QUICKENING never lowers it. Audit 2026-11-01.)
      p.energy = this.meter?.kind === 'vault' ? Math.max(p.energy, half) : half;
      this.openers.push('quickening');
    }
    // WARM-UP (JUKEBOX, ENDLESS): the volume starts at the loop, never at THE DROP itself.
    if (this.meter?.kind === 'volume' && this.cfg.player.volumeStart && !p.armed) p.energy = Math.max(p.energy, Math.min(this.meterCost - UNIT, this.cfg.player.volumeStart * UNIT));
    // HOLD: this fight's HOLDs.
    this.holdsLeft = this.cfg.player.holds ?? 0;
    const e = this.sides.enemy;
    // BLAZE: every blaze cell you own adds to your special.
    const blazeCells = p.reels.reduce((a, reel) => a + reel.cells.filter((c) => c.enh === 'blaze').length, 0);
    this.blaze = blazeCells * charmValue('blaze', this.charmLvl(p, 'blaze'));
    // GREEN: THE WHEEL STARTS FAST (3 chips a turn from its first turn; no half-HP phase).
    if (this.isWheel && (this.cfg.stake ?? 0) >= STAKE.wheelFast) this.fast = this.fastFromStart = true;
    // ENDLESS: the loop House opens with a fatter pot.
    const loopHouse = this.isBoss && !!this.cfg.enemy.endless;
    if (this.isBoss) this.pot = loopHouse ? unitsUp(this.cfg.player.hp * ENDLESS.potSeed) : POT.seed;
    if (loopHouse) this.potCut = unitsUp(this.cfg.player.hp * ENDLESS.potCut);
    // ENDLESS house edges: bosses start shielded; enemies spin first.
    if (this.cfg.enemy.startShield) this.sides.enemy.shield = this.cfg.enemy.startShield;
    if (this.cfg.player.startShield) this.sides.player.shield = this.cfg.player.startShield;
    if (this.cfg.enemy.first) this.next = 'enemy';
    // ACT 3 regulars open with their ability on their first turn (it never fired in 38% of act 3 fights: EXPERT_PLAYTEST_3 C3).
    if (this.act3Regular && this.sides.enemy.ability) this.sides.enemy.charge = Math.max(0, this.sides.enemy.ability.every - 1);
    // THE REPO MAN takes on his first turn, then every 3 (half of MIDAS's fights ended before his 3rd: EXPERT_PLAYTEST_9 D3).
    else if (this.sides.enemy.ability?.kind === 'repo') this.sides.enemy.charge = Math.max(0, this.sides.enemy.ability.every - GATEKEEPER.firstTurn);
    // ACT 1-2 regulars and elites get a head start: the enemy's trick (writing on your machine) shows in nearly every
    // fight, not only the long ones (the feel playtest: BLIZZARD and PILFER never fired before the enemy died).
    else if (this.sides.enemy.ability && !this.isBoss && !this.isWheel && !this.isDealer && !this.cfg.enemy.endless) this.sides.enemy.charge = Math.min(this.sides.enemy.ability.every - 1, TUNE.headStart);
    // THE DEALER deals first on its 2nd turn, then every 3.
    if (this.isDealer) {
      // Its first hand's bar: a share of its total HP.
      const e = this.sides.enemy;
      this.dealerTotal = e.maxHp;
      e.maxHp = e.hp = unitsRound(this.dealerTotal * DEALER_RULES.hands[0]);
      this.nextDeal = 'card';
      if (e.ability) e.charge = Math.max(0, e.ability.every - 2);
    }
    // THE DECK REMEMBERS: marked cards you carried in from the Card Sharp.
    const carried = this.cfg.player.startMarks ?? 0;
    if (carried > 0) {
      const cells = this.rng.shuffle(p.reels.flatMap((reel, r) => reel.cells.map((c, i) => ({ c, r, i })).filter(({ c }) => symbolValue(c.symbol) > 0)));
      const perReel = [0, 0, 0];
      let placed = 0;
      for (const { c, r } of cells) {
        if (placed >= carried) break;
        if (perReel[r] >= TUNE.marksPerReel) continue;
        c.carded = true;
        perReel[r]++;
        placed++;
      }
    }
    // The Golden Hourglass and HIGH STAKES change enemy cadence (the same helper feeds the cards).
    if (e.ability) e.ability = effectiveAbility(e.ability, { stake: this.cfg.stake ?? 0, act: this.cfg.enemy.act ?? 1, sandglass: p.relics.has('sandglass') });
    // THE DEALER: how much faster than its rulebook it plays (FAST HANDS, QUICKENING, the stakes), kept for every hand.
    if (this.isDealer && e.ability) this.dealerCut = DEALER_RULES.bustEvery - e.ability.every;
  }

  get seed(): number {
    return this.rng.seed;
  }

  get over(): boolean {
    return this.winner !== null;
  }

  /** The House (act 1 boss): the pot rules apply. */
  get isBoss(): boolean {
    return this.cfg.enemy.boss === 'house';
  }

  /** THE WHEEL (act 2 boss): PLACE YOUR BETS. */
  get isWheel(): boolean {
    return this.cfg.enemy.boss === 'wheel';
  }

  /** The Dealer (act 3 boss). */
  get isDealer(): boolean {
    return this.cfg.enemy.boss === 'dealer';
  }

  /** MIDAS: chips won mid-fight by gold bars (paid out if you win). */
  midasChips = 0;
  /** LUCRE: chips its groups paid this fight (paid on a win, up to its cap). */
  lucreChips = 0;
  /** Your spins this fight (HYPE MAN). */
  private playerSpins = 0;
  /** PIT BOSS: the enemy's first jackpot was already cut. */
  pitUsed = false;
  pitJustFired = false;
  vaultPaid = 0;
  /** MIDAS: the VAULT's resting level (from chips held). */
  vaultBase(): number {
    const chips = (this.cfg.player.chipsHeld ?? 0) + this.midasChips;
    return Math.min(this.meterCost - UNIT, Math.floor(chips / MIDAS.chipsPerPip) * UNIT);
  }
  /** MIDAS: the VAULT's payoff multiplier: 1 + chips held / 20, max x3. */
  vaultMul(lineShield = 0): number {
    // COMPOUND raises the cap.
    // ARMORED CAR: this spin's shield counts as chips.
    const armored = this.sides.player.relics.has('armoredcar') ? Math.floor(lineShield / NEW_RELIC.armoredShield) : 0;
    return highRollerMul(this.chipsNow() + armored, this.sides.player.relics.has('compound') ? NEW_RELIC.compoundCap : MIDAS.maxMul);
  }
  /** CASH CASSIDY: chips in hand right now (held at the start, plus what this fight paid or cost). */
  chipsNow(): number {
    return (this.cfg.player.chipsHeld ?? 0) + this.midasChips;
  }
  rainCost(me: Combatant): number {
    // OPEN BAR (legendary relic): it costs nothing.
    if (me.side === 'player' && me.relics.has('openbar')) return 0;
    return me.relics.has('rainmaker') ? RAIN.rainmakerCost : RAIN.cost;
  }

  /** How full the player's meter has to be (the special's cost for TESLA). */
  get meterCost(): number {
    if (this.meter?.kind === 'volume') return VOLUME.max * UNIT;
    return this.special ? this.cfg.specialCost : this.meter?.cost ?? 0;
  }

  /** THE JUKEBOX: the volume (0..max). */
  get volume(): number {
    return Math.floor(this.sides.player.energy / UNIT);
  }
  /** THE JUKEBOX: this spin is THE DROP. */
  dropNow = false;
  /** THE DROP this spin: the notes off the payline that join the note group (vamp heals after). */
  dropOff: { cells: { reel: number; row: number; v?: number; wild?: true }[]; vamp: number } | null = null;

  /** HOLD: your HOLDs left this fight, and the reels you've held for your next spin. */
  holdsLeft = 0;
  held: boolean[] = [false, false, false];
  /**
   * HOLD a reel (or let it go) for your next spin: a held reel keeps its symbol for that spin. Only while it's your
   * spin next (the game takes taps during the enemy's turn too: the engine is on your turn by then); each held reel
   * costs a HOLD when you spin. A frozen reel can't be held. Returns whether it's held now.
   */
  hold(reel: number): boolean {
    if (this.over || this.next !== 'player' || reel < 0 || reel > 2) return false;
    if (this.held[reel]) {
      this.held[reel] = false;
      return false;
    }
    if (this.held.filter(Boolean).length >= this.holdsLeft || this.sides.player.frozen[reel] > 0) return false;
    this.held[reel] = true;
    return true;
  }

  /** Debug: make the next spin of `side` land these payline symbols where the strip allows. */
  forceNext(side: SideId, line: SymbolId[]): void {
    this.forced[side] = line;
  }

  /**
   * One turn. Deaths resolve at the END of the turn: a machine at 0 HP mid-turn lets the rest of that turn play out
   * (heals, vamp, echoes, after-hit effects), then it falls.
   */
  step(): TurnResult {
    if (this.over) throw new Error('Fight is over');
    this.resolving = false;
    const res = this.turnBody();
    this.resolving = true;
    const first = res.side === 'player' ? this.sides.enemy : this.sides.player;
    for (const c of [first, this.sides[res.side]]) this.checkDeath(c, res.events);
    this.resolving = false;
    return res;
  }
  /** True while end-of-turn deaths resolve (a 0 HP machine falls only then). */
  private resolving = false;

  private turnBody(): TurnResult {
    const side = this.next;
    const me = this.sides[side];
    const events: CombatEvent[] = [];
    this.turn++;
    if (side === 'player') this.playerSpins++;
    // LAST CALL is announced as the enemy's turn begins (its scored hits carry the multiplier on their banner).
    else this.enemyDmgMul(events);
    events.push({ type: 'turnStart', turn: this.turn, side });
    // ONE STORM A TURN (user, 2026-10-29): every charge this turn (CAPACITOR, each bolt group, SECOND PAYLINE, JACKPOT
    // BELL) is gathered, and the lightning fires once, after them all (two bolt groups fired two storms, each with its
    // own LIVE WIRE cost and heals).
    this.stormHold = side;
    this.stormPending = false;
    // OVERTIME: announced on the first turn of its first round.
    if (this.cfg.overtime && overtimeRound(this.turn) === OVERTIME.from && overtimeRound(this.turn - 1) < OVERTIME.from)
      events.push({ type: 'overtime', side, mul: overtimeMul(this.turn) });
    this.playerTurnHp = 0;
    if (side === 'player') this.thawShield.clear();
    // The Dealer's big turns are the announced ones (ALL IN): only those may hit up to the boss cap.
    // (Your own turn is never a big one: marks biting on your spin stay under the quiet cap.)
    this.bigTurn = side === 'enemy' && this.dealerAllIn;
    if (this.turn === 1) for (const relic of this.openers) events.push({ type: 'relic', side: 'player', relic });
    if (this.turn === 1 && this.isDealer) events.push({ type: 'dealNext', side: 'enemy', card: this.nextDeal });

    if (this.cfg.shieldReset === 'ownTurnStart') this.resetShield(me, events);
    // Saved chips shield you at the start of each boss turn.
    if (side === 'enemy' && (this.isBoss || this.isWheel || this.isDealer)) {
      const p = this.sides.player;
      const stack = this.cfg.player.stackShield ?? 0;
      if (stack > 0) {
        p.shield += stack;
        events.push({ type: 'shieldGain', side: 'player', reels: [], amount: stack, total: p.shield, source: 'chips' });
      }
    }
    if (side === 'enemy' && this.isBoss) {
      const p = this.sides.player;
      if (this.cashPending && me.ability) {
        this.cashPending = false;
        me.charge = 0;
        events.push({ type: 'ability', side: me.side, kind: me.ability.kind, power: me.ability.power });
        cashPot(this, me, p, events);
        if (this.over) {
          this.next = other(side);
          return { turn: this.turn, side, events };
        }
        events.push({ type: 'abilityCharge', side: me.side, charge: 0, every: me.ability.every, kind: me.ability.kind });
      }
    }

    // Someone already fell (e.g. SHIELD BASH at the start of your turn): no new spin; the death resolves now.
    if (this.sides.player.hp <= 0 || this.sides.enemy.hp <= 0) {
      this.next = other(side);
      return { turn: this.turn, side, events };
    }
    const frozen = me.frozen.map((t) => t > 0);
    const locked = me.locked.map((t) => t > 0);
    const forcedLine = this.forced[side];
    // HOLD: your held reels keep their stop this spin (like ice, but yours), then the holds are spent.
    const held = side === 'player' ? this.held.map((h, r) => h && !frozen[r]) : [false, false, false];
    if (side === 'player') {
      this.holdsLeft -= held.filter(Boolean).length;
      this.held = [false, false, false];
    }
    const stops = this.rollStops(me, frozen.map((z, r) => z || held[r]), forcedLine);
    delete this.forced[side];
    me.reels.forEach((reel, i) => (reel.stop = stops[i]));
    const line = paylineSymbols(me.reels).map((s, i) => (locked[i] ? 'lock' : s));
    // The Dealer's BUST on your payline: that cell pays nothing this spin.
    const laid = side === 'player' ? this.lineCard : null;
    if (laid) {
      line[laid.reel] = 'empty';
      this.lineCard = null;
    }
    // LUCKY: a lucky cell on the payline sometimes turns WILD.
    const luckyWilds: number[] = [];
    me.reels.forEach((_, r) => {
      const chance = this.paylineEnh(me, r) === 'lucky' ? charmValue('lucky', this.charmLvl(me, 'lucky')) / 100 : 0;
      if (line[r] !== 'wild' && chance > 0 && this.rng.next() < chance) {
        line[r] = 'wild';
        luckyWilds.push(r);
      }
    });
    const hexed = me.hexed.map((t) => t > 0);
    const drumNow = side === 'player' && me.relics.has('deckdrum') ? NEW_RELIC.deckdrumStep * this.drum : 0;
    // THE JUKEBOX: HYPE MAN turns the volume up before every other spin; a full volume makes this spin THE DROP.
    this.dropNow = false;
    // GOLDEN SPIN: 1 spin in 10 pays x3 (rolled before the score, from the fight's own seed).
    this.goldenNow = side === 'player' && me.relics.has('goldenspin') && this.rng.next() < NEW_RELIC.goldenChance;
    if (side === 'player' && this.meter?.kind === 'volume') {
      if (me.relics.has('hypeman') && !me.armed && this.playerSpins % 2 === 1) {
        events.push({ type: 'relic', side, relic: 'hypeman' });
        this.turnUp(me, 1, [], events, true);
      }
      this.dropNow = me.armed;
    }
    const score = scoreSpin(this, me, line);
    // THE DROP: every note you can see (the payline's too) lights up before the note group hits once.
    let drop: { cells: { reel: number; row: number; v?: number; wild?: true }[]; amount: number } | null = null;
    if (side === 'player' && this.dropNow && this.dropOff) {
      const payline = line.flatMap((x, r) => (x === 'note' || (x === 'wild' && score.groups.some((g) => g.symbol === 'note' && g.reels.includes(r))) ? [{ reel: r, row: 1 }] : []));
      const g = score.groups.find((x) => x.symbol === 'note' && x.drop);
      drop = { cells: [...payline, ...this.dropOff.cells], amount: g?.amount ?? 0 };
    }
    // Dead symbols lining up isn't a tease — except slime, which can cleanse.
    const nearMiss = isNearMiss(line) && (me.casts.has(line[0]) || line[0] === 'slime' || !DEAD.has(line[0]));
    events.push({
      type: 'spin',
      side,
      stops,
      score,
      nearMiss,
      frozen,
      locked,
      ...(held.some(Boolean) ? { held } : {}),
      ...(luckyWilds.length ? { luckyWilds } : {}),
      ...(hexed.some(Boolean) ? { hexed } : {}),
      ...(drumNow ? { symBonus: { sword: drumNow, ace: drumNow } } : {}),
      ...(drop ? { drop } : {}),
    });
    if (score.touched?.length) events.push({ type: 'touch', side, cells: score.touched });
    // (The spin carries THE DROP for the show; this event is its record, for the log and the tests.)
    if (drop) events.push({ type: 'drop', side, ...drop });
    const sentBefore = events.length;

    if (side === 'player' && score.tier === 'triple') this.playerJackpots++;
    // A meter that pays off this spin empties first (so what lands now can refill it).
    if (side === 'player' && (score.raised || score.jackpots)) this.payoff(me, score, events);
    if (laid) events.push({ type: 'lineCardUsed', side, reel: laid.reel, card: laid.card });
    const allIn = side === 'enemy' && this.isDealer && this.dealerAllIn;
    this.lastScoreShield = score.groups.filter((g) => g.symbol === 'shield').reduce((t, g) => t + g.amount, 0);
    for (const group of score.groups) {
      if (allIn && (group.symbol === 'sword' || group.symbol === 'seven')) continue;
      if (group.voided) continue;
      this.resolveGroup(me, group, score, events);
      if (!this.over && side === 'player') this.cellCharms(me, group, events);
      if (this.over) break;
    }
    // SECOND PAYLINE (legendary relic): the row above pays its pairs and jackpots at half.
    if (!this.over && side === 'player' && me.relics.has('secondline')) this.secondLine(me, events);
    if (allIn && !this.over) {
      this.dealerAllIn = false;
      const foe = this.sides[other(side)];
      // Its whole visible hand: every sword and seven in its 3x3.
      let hand = 0;
      for (const reel of me.reels)
        for (const d of [-1, 0, 1]) {
          const c = reel.cells[(reel.stop + d + reel.cells.length) % reel.cells.length];
          if (c.symbol === 'sword' || c.symbol === 'seven') hand += this.cfg.base[c.symbol] ?? 0;
        }
      // Within DEALER_RULES' floor and cap of your max HP. It's never raised.
      const amount = allInRange(foe.maxHp, hand, this.cfg.enemy.loop ?? 0);
      // ALL IN pierces shields: the telegraphed hit is the real threat (EXPERT_PLAYTEST_5 E6).
      const h = this.damage(foe, amount, true);
      events.push({ type: 'allInHit', from: side, to: foe.side, amount, ...h });
      this.checkDeath(foe, events);
    }
    if (!this.over && side === 'player' && (score.raised || score.jackpots)) this.payoffAfter(me, score, events, sentBefore);
    // THE JUKEBOX: THE DROP, or the volume going up (notes on the payline) or down (a spin with no note skips).
    if (!this.over && side === 'player' && this.meter?.kind === 'volume') this.volumeAfterSpin(me, line, score, events);
    // JAX: every WILD on the payline fills the meter (lucky wilds too).
    if (!this.over && side === 'player' && this.meter?.kind === 'jackpots') {
      const wilds = line.flatMap((s, r) => (s === 'wild' ? [r] : []));
      if (wilds.length) this.fillMeter(me, wilds.length * (this.meter.perWild ?? 0), wilds, events);
    }
    // GLASS: what shattered this spin is gone for good.
    if (side === 'player' && this.glassBreaks.length) {
      const reels = [...new Set(this.glassBreaks)];
      this.glassBreaks = [];
      const cells: CellRef[] = [];
      for (const r of reels) {
        const cell = me.reels[r].cells[me.reels[r].stop];
        if (cell?.enh !== 'glass') continue;
        cell.enh = undefined;
        this.shattered.push({ reel: r, symbol: cell.symbol });
        cells.push({ reel: r, index: me.reels[r].stop });
      }
      if (cells.length) events.push({ type: 'glassBreak', side, cells });
    }
    // HOT STREAK: a jackpot makes your next spin pay x2 (any other spin ends it).
    if (side === 'player') this.hotStreak = me.relics.has('hotstreak') && score.tier === 'triple';
    // BUILD-UP: a spin with no pair or jackpot adds a stack; a pair or jackpot spends them.
    const bu = this.buildUpRule(me);
    if (side === 'player' && bu.step > 0 && !this.over) {
      const cashed = score.groups.some((g) => g.matched && (g.reels.length >= 2 || !!g.jackpot) && g.base > 0 && PAYING.has(g.symbol));
      const before = this.buildUp;
      const max = Math.round((bu.cap - 1) / bu.step);
      this.buildUp = cashed ? 0 : Math.min(max, this.buildUp + 1);
      if (this.buildUp !== before) events.push({ type: 'buildUp', side, mul: this.buildUpMul(me), stacks: this.buildUp, ...(cashed ? { cashed: true } : {}) });
    }
    // CERTIFIED HITMAKER: count the drops.
    if (side === 'player' && this.dropNow) this.drops++;
    // HOUSE TAX: an enemy jackpot pays you.
    if (side === 'enemy' && score.tier === 'triple' && this.sides.player.relics.has('housetax')) {
      this.taxChips += NEW_RELIC.taxChips;
      events.push({ type: 'relic', side: 'player', relic: 'housetax' });
    }
    if (this.pitJustFired) {
      this.pitJustFired = false;
      events.push({ type: 'relic', side: 'player', relic: 'pitboss' });
    }
    // Jackpot Bell: a jackpot fills your meter (TESLA: a full special).
    // Not on JOKER's payoff spin: the payoff scores as a jackpot, so the Bell refilled the meter it had just emptied and it
    // never ran dry (EXPERT_PLAYTEST_11 D1: JOKER + BELL 63%).
    if (!this.over && score.tier === 'triple' && me.relics.has('bell') && (side !== 'player' || this.special || this.meter) && !(side === 'player' && score.jackpots) && !(side === 'player' && this.dropNow)) {
      events.push({ type: 'relic', side, relic: 'bell' });
      if (this.special || side !== 'player') this.gainEnergy(me, this.cfg.specialCost, [], events);
      else if (this.meter?.kind === 'vault') this.fillVault(me, events);
      else this.fillMeter(me, this.meterCost, [], events);
    }
    // The turn's charge is all in: the storm fires once (only lightning charge: other meters keep theirs in energy too).
    this.stormHold = null;
    if (this.stormPending && !this.over) this.storm(me, events);
    this.stormPending = false;
    // DECK DRUM: a spin that pays adds a stack (max 5) for the rest of the fight.
    if (!this.over && side === 'player' && me.relics.has('deckdrum') && score.groups.some((g) => g.amount > 0 && PAYING.has(g.symbol))) this.drum = Math.min(NEW_RELIC.drumCap, this.drum + 1);
    // Only a jackpot of your attack symbol (or wilds) steals the pot (2026-10-07: two-symbol reels made jackpots 3x as common).
    const atkJackpot = score.tier === 'triple' && (POT_STEAL.any || score.groups.some((g) => g.matched && g.reels.length >= 3 && (this.isAttack(g.symbol) || g.symbol === 'wild' || !!g.rain)));
    if (!this.over && side === 'player' && this.isBoss && atkJackpot) {
      // ENDLESS: a jackpot takes only half the loop House's pot (it can't be farmed every spin).
      winPot(this, me, events, this.cfg.enemy.endless ? ENDLESS.potSteal : 1);
    }
    // THE WHEEL: your pairs sweep the bets off their reels; a jackpot clears the table.
    if (!this.over && side === 'player' && this.isWheel) sweepBets(this, me, score, events);
    // The house always takes its cut.
    if (!this.over && side === 'enemy' && this.isBoss) {
      const cut = this.potCut;
      this.pot += cut;
      events.push({ type: 'pot', side, reels: [], amount: cut, total: this.pot });
    }

    // What this spin did (the Mimic copies it).
    this.last[side] = {
      best: Math.max(0, ...score.groups.filter((g) => g.matched || !DEAD.has(g.symbol)).map((g) => g.amount)),
      damage:
        events.slice(sentBefore).reduce((a, e) => a + ((e.type === 'attack' || e.type === 'specialFire') && e.from === side ? e.amount : 0), 0),
    };
    if (!this.over) defuse(this, me, events);
    if (!this.over && side === 'player') markedCards(this, me, events);
    if (!this.over) burnFuses(this, me, events);
    if (!this.over) tickFakes(this, me, events);
    if (!this.over) tickStatuses(this, me, events);
    if (!this.over && me.ability) chargeAbility(this, me, events);

    if (!this.over && this.cfg.shieldReset === 'roundEnd' && side === 'enemy') {
      this.resetShield(this.sides.player, events);
      this.resetShield(this.sides.enemy, events);
    }

    // ENDLESS: a fight that stalls past 80 turns goes to the House.
    // Counted in ENEMY turns, with a visible countdown (EXPERT_PLAYTEST_4 B2).
    if (!this.over && this.cfg.enemy.endless && side === 'enemy') {
      const enemyTurns = Math.ceil(this.turn / 2);
      const left = ENDLESS.maxTurns - enemyTurns;
      if (left <= 0) {
        events.push({ type: 'closingTime', side: 'player', hp: this.sides.player.hp });
        this.sides.player.hp = 0;
        this.winner = 'enemy';
        events.push({ type: 'death', side: 'player' });
        events.push({ type: 'fightEnd', winner: 'enemy', turns: this.turn });
      } else if (left <= ENDLESS.closingWarn) events.push({ type: 'closing', side: 'enemy', left });
    }
    this.next = other(side);
    return { turn: this.turn, side, events };
  }

  /** MIDAS TOUCH fires: each sword and shield on the payline gains a gold touch, and every extra full meter touches one more sword or shield anywhere on your reels. */
  midasTouch(me: Combatant, line: SymbolId[], touchable: (r: number) => boolean): { reel: number; index: number; n: number }[] {
    const out = new Map<object, { reel: number; index: number; n: number }>();
    const bump = (reel: number, index: number) => {
      const c = me.reels[reel].cells[index];
      if (!c || (c.symbol !== 'sword' && c.symbol !== 'shield') || c.slimed || c.stolen) return false;
      const n = this.touches.get(c) ?? 0;
      if (n >= MIDAS_TOUCH_CAP) return false;
      this.touches.set(c, n + 1);
      out.set(c, { reel, index, n: n + 1 });
      return true;
    };
    line.forEach((_x, r) => {
      if (!touchable(r)) return;
      bump(r, me.reels[r].stop);
    });
    const k = Math.max(1, Math.floor(me.energy / this.meterCost));
    for (let i = 1; i < k; i++) {
      const pool = me.reels.flatMap((reel, r) => reel.cells.flatMap((c, index) => ((c.symbol === 'sword' || c.symbol === 'shield') && !c.slimed && !c.stolen && (this.touches.get(c) ?? 0) < MIDAS_TOUCH_CAP ? [{ r, index }] : [])));
      if (!pool.length) break;
      const p = this.rng.pick(pool);
      bump(p.r, p.index);
    }
    this.touchSpend = k * this.meterCost;
    return [...out.values()];
  }

  /** SECOND PAYLINE: score the row above your payline (its own matches; singles don't pay there) and resolve its pairs
   * and jackpots at half. Meters, Charms and relics stay the main payline's. */
  private secondLine(me: Combatant, events: CombatEvent[]): void {
    const line = me.reels.map((reel) => effectiveSymbol(reel.cells[wrap(reel.stop - 1, reel.cells.length)]));
    const lv = me.levels;
    const value = (s: SymbolId) => playerSymValue(lv, s, this.cfg.base[s]);
    const s = scoreLine(line, this.cfg, { value, wildAlone: this.wildAlone(me) });
    const groups = s.groups.filter((g) => g.matched && g.reels.length >= 2 && PAYING.has(g.symbol) && g.amount > 0);
    if (!groups.length) return;
    for (const g of groups) {
      g.amount = Math.max(UNIT, unitsRound(g.amount / 2));
      g.notes = [...(g.notes ?? []), 'X0.5 2ND LINE'];
    }
    events.push({ type: 'secondLine', side: me.side, line, groups: groups.map((g) => ({ symbol: g.symbol, reels: g.reels, amount: g.amount })) });
    // The second line hits, blocks and fills your meter; it pays no chips and heals nothing.
    this.lineTwo = true;
    try {
      for (const g of groups) {
        this.resolveGroup(me, g, s, events);
        if (this.over) return;
      }
    } finally {
      this.lineTwo = false;
    }
  }

  /** A charm's level for this side (the player's charm levels; the Golden Ticket adds one). */
  charmLvl(c: Combatant, enh: Enh): number {
    return c.side === 'player' ? charmLevel(c.levels, enh, c.relics.has('ticket')) : 1;
  }

  /** The player's attack symbols: swords and cards, or this machine's own (CASSIDY's chips). */
  isAttack(sym: SymbolId): boolean {
    return BLADES.has(sym) || (!!this.cfg.cabinet && CABINETS[this.cfg.cabinet].attack === sym);
  }

  /** What a lone (or all-) WILD line pays as for this side. */
  wildAlone(c: Combatant): SymbolId {
    return c.side === 'player' && !this.special ? (this.cfg.cabinet ? CABINETS[this.cfg.cabinet].attack : 'sword') : 'bolt';
  }

  /** The WILD wheel: one of your live cells (symbol AND charm), weighted by how many you have of each. */
  wildPick(c: Combatant): { symbol: SymbolId; enh?: Enh } {
    const pool = c.reels.flatMap((reel) => reel.cells.filter((cell) => !cell.slimed && !cell.stolen && !cell.carded && !cell.bomb && JACKPOTABLE.has(cell.symbol)).map((cell) => ({ symbol: cell.symbol, ...(wheelCharm(cell) ? { enh: wheelCharm(cell) } : {}) })));
    if (c.side !== 'player' || !pool.length) return { symbol: this.wildAlone(c) };
    return this.rng.pick(pool);
  }
  /** Charms a WILD's pick brings to its reel this spin (on top of the cell's own). */
  pickEnh = new Map<number, Enh>();

  /** The charm on a reel's payline cell, if it's live (not stolen, spilled, jammed or counterfeit; a jinx leaves it lit). */
  /** The live charms on a payline reel this spin: the cell's own, plus what a WILD's pick brought. */
  enhsAt(c: Combatant, r: number): Enh[] {
    const own = this.paylineEnh(c, r);
    const picked = c.side === 'player' ? this.pickEnh.get(r) : undefined;
    return [...(own ? [own] : []), ...(picked ? [picked] : [])];
  }

  paylineEnh(c: Combatant, r: number): Enh | undefined {
    const cell = c.reels[r].cells[c.reels[r].stop];
    if (!cell?.enh || cell.stolen || cell.slimed || (cell.faked ?? 0) > 0 || c.locked[r] > 0) return undefined;
    return cell.enh;
  }

  private resetShield(c: Combatant, events: CombatEvent[]): void {
    // INSURANCE (audit 2026-11-01): its shield lands on the enemy's turn, so it skips one reset and blocks their next spin.
    const keep = c.side === 'player' ? Math.min(this.insuranceKeep, c.shield) : 0;
    if (c.side === 'player') this.insuranceKeep = 0;
    c.shield -= keep;
    this.resetShieldBody(c, events);
    if (keep > 0 && !this.over) {
      c.shield += keep;
      events.push({ type: 'shieldGain', side: 'player', reels: [], amount: keep, total: c.shield, source: 'insurance' });
    }
  }

  private resetShieldBody(c: Combatant, events: CombatEvent[]): void {
    if (c.shield <= 0) return;
    if (c.side === 'player' && !this.over) {
      const held = c.shield;
      // SHIELD BASH: leftover shield hits back for half before it resets.
      if (c.relics.has('bash')) {
        const amt = Math.round((held * NEW_RELIC.bashShare) / UNIT) * UNIT;
        if (amt > 0) {
          events.push({ type: 'relic', side: 'player', relic: 'bash' });
          this.hit(c, this.sides.enemy, amt, [], events);
        }
      }
      // CAPACITOR (TESLA): leftover shield charges lightning before it resets.
      if (!this.over && this.special && c.relics.has('capacitor')) {
        const q = Math.round(held * NEW_RELIC.capacitorShare);
        if (q > 0) {
          events.push({ type: 'relic', side: 'player', relic: 'capacitor' });
          this.gainEnergy(c, q, [], events);
        }
      }
      if (this.over) return;
      // TOWER SHIELD (KNIGHT): half the leftover shield stays (capped, since SHIELD BASH reads it again next turn).
      if (c.relics.has('tower')) {
        const keep = Math.min(Math.round(held * NEW_RELIC.towerShare), Math.round(c.maxHp * NEW_RELIC.towerCap));
        if (keep > 0) {
          events.push({ type: 'relic', side: 'player', relic: 'tower' });
          events.push({ type: 'shieldReset', side: c.side, lost: c.shield - keep });
          c.shield = keep;
          return;
        }
      }
    }
    events.push({ type: 'shieldReset', side: c.side, lost: c.shield });
    c.shield = 0;
  }

  private rollStops(c: Combatant, frozen: boolean[], forced?: SymbolId[]): number[] {
    return c.reels.map((reel, r) => {
      if (frozen[r]) return reel.stop;
      const want = forced?.[r];
      if (want) {
        const hits = reel.cells.flatMap((cell, i) => (effectiveSymbol(cell) === want ? [i] : []));
        if (hits.length) return this.rng.pick(hits);
      }
      return this.rng.int(reel.cells.length);
    });
  }

  private resolveGroup(me: Combatant, g: ScoreGroup, score: LineScore, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    const player = me.side === 'player';
    switch (g.symbol) {
      case 'sword':
      case 'note':
      case 'ace': {
        // (COUP DE GRACE is in the score now.) KEEN: a keen sword in the group pierces shields. (An enemy's LATE
        // multiplier is already in its amount.)
        this.hit(me, foe, g.amount, g.reels, events, !!g.pierce, undefined, true);
        this.vampHeal(me, g, events);
        return;
      }
      case 'seven':
        // Sevens are the House's heavy hitters.
        this.hit(me, foe, g.amount, g.reels, events, false, undefined, true);
        return;
      case 'shield':
        me.shield += g.amount;
        events.push({ type: 'shieldGain', side: me.side, reels: g.reels, amount: g.amount, total: me.shield });
        this.vampHeal(me, g, events);
        // BULWARK: each bulwark shield also deals a share of its shield as damage.
        if (player && g.amount > 0 && !this.over) {
          const share = g.amount / Math.max(1, g.reels.length);
          const pct = g.reels.reduce((a, r) => a + this.enhsAt(me, r).filter((e) => e === 'spiked').length, 0) * charmValue('spiked', this.charmLvl(me, 'spiked'));
          const dmg = Math.round((share * pct) / 100 / UNIT) * UNIT;
          if (dmg > 0) this.hit(me, foe, dmg, g.reels, events);
        }
        return;
      case 'bolt':
        // Only TESLA (or the bare engine) has a special.
        if (player && !this.special) break;
        this.gainEnergy(me, g.amount, g.reels, events);
        this.vampHeal(me, g, events);
        return;
      case 'goldbar':
        if (!player || this.meter?.symbol !== g.symbol) break;
        // CASH CASSIDY: every chip symbol pays a chip (1, 2 or 3; no cap: MAKE IT RAIN spends them).
        if (g.symbol === 'goldbar' && this.meter.kind === 'vault') {
          // (SECOND PAYLINE's chips hit, but pay no chips.)
          const got = this.lineTwo ? 0 : Math.max(1, g.reels.length - RAIN.chipLess);
          if (got) {
            this.midasChips += got;
            events.push({ type: 'midasChips', side: me.side, amount: got, total: this.midasChips });
          }
          // Chips are CASSIDY's weapon: a chip group hits for its pay (MAKE IT RAIN is the big version).
          if (g.rain) this.makeItRain(me, g, events);
          else if (g.amount > 0) this.hit(me, this.sides[other(me.side)], g.amount + this.depositOnce(me, events), g.reels, events);
          if (this.over) return;
        }
        this.fillMeter(me, g.amount, g.reels, events);
        this.vampHeal(me, g, events);
        return;
    }
    if (me.casts.has(g.symbol)) {
      write(this, me, foe, g.symbol, g.amount, g.reels, events);
      return;
    }
    // A slime jackpot cleanses every slimed cell; a slime pair cleanses the slime on its own reels (user, 2026-10-13).
    if (g.symbol === 'slime' && g.matched && this.cfg.cleanseOnSlimeTriple && g.reels.length >= 2) {
      cleanse(this, me, g.reels, events, g.reels.length < 3);
      return;
    }
    // A jackpot of stolen (empty) cells gets EVERYTHING back, the way slime's cleanse does.
    if (g.symbol === 'empty' && g.matched && g.reels.length >= 3) {
      recover(this, me, events);
      return;
    }
    void score;
    events.push({ type: 'fizzle', side: me.side, reels: g.reels, symbol: g.symbol });
  }

  /**
   * THE DROP: the notes off the payline (rows above and below). What enemies wrote counts: a slimed, stolen or dead-card
   * cell isn't a note, a jammed reel sits out, a jinxed reel pays half (unless the payline's jinx
   * already halves the group), and a counterfeit Charm does nothing. A LUCKY cell rolls: a WILD plays as a note (user, 2026-10-08).
   */
  dropNotes(me: Combatant, groupHexed = false): { cells: { reel: number; row: number; v?: number; wild?: true }[]; base: number; echoes: number; keen: boolean; vamp: number } {
    const out = { cells: [] as { reel: number; row: number; v?: number; wild?: true }[], base: 0, echoes: 0, keen: false, vamp: 0 };
    const noteV = playerSymValue(me.levels, 'note', this.cfg.base.note);
    me.reels.forEach((reel, r) => {
      if (me.locked[r] > 0) return;
      const hexed = me.hexed[r] > 0;
      for (const d of [-1, 1]) {
        const c = reel.cells[(reel.stop + d + reel.cells.length) % reel.cells.length];
        if (!c) continue;
        const sym = effectiveSymbol(c);
        const enh = c.enh && !((c.faked ?? 0) > 0) ? c.enh : undefined;
        const wild = sym !== 'note' && sym !== 'wild' && PAYING.has(sym) && enh === 'lucky' && this.rng.next() < charmValue('lucky', this.charmLvl(me, 'lucky')) / 100;
        if (sym !== 'note' && sym !== 'wild' && !wild) continue;
        let v = noteV;
        if (enh === 'keen') {
          v += charmValue('keen', this.charmLvl(me, 'keen'));
          out.keen = true;
        }
        // GOLD off the payline multiplies its own note (it doesn't add to the payline's gold: x6 on 9 cells was too much).
        if (enh === 'gold') v *= charmValue('gold', this.charmLvl(me, 'gold'));
        if (enh === 'echo') out.echoes++;
        if (enh === 'vamp') out.vamp = Math.max(out.vamp, charmValue('vamp', this.charmLvl(me, 'vamp')));
        out.base += hexed && !groupHexed ? Math.floor(v / 2) : v;
        out.cells.push({ reel: r, row: d + 1, v: hexed && !groupHexed ? Math.floor(v / 2) : v, ...(wild ? { wild: true as const } : {}) });
      }
    });
    return out;
  }

  /** THE JUKEBOX: turn the volume up n (BLOOD PACT doubles it); a full volume arms THE DROP. */
  private turnUp(me: Combatant, n: number, reels: number[], events: CombatEvent[], dropsNow = false): void {
    if (me.armed || n <= 0) return;
    const add = n * UNIT * (this.cfg.player.meterMul ?? 1);
    me.energy = Math.min(this.meterCost, me.energy + add);
    me.armed = me.energy >= this.meterCost;
    events.push({ type: 'meter', side: me.side, reels, amount: add, total: me.energy, ...(me.armed ? { armed: true } : {}), ...(me.armed && dropsNow ? { dropsNow: true } : {}) });
  }

  /** THE JUKEBOX, after a spin: THE DROP plays out, or the volume goes up (notes) or skips down (no note). */
  private volumeAfterSpin(me: Combatant, line: SymbolId[], score: LineScore, events: CombatEvent[]): void {
    if (this.dropNow) {
      // THE DROP hit with the note group (score); the off-payline vamp heals now.
      const vamp = this.dropOff?.vamp ?? 0;
      if (vamp) this.heal(me, vamp, 'vamp', events);
      if (this.over) return;
      me.armed = false;
      me.energy = (me.relics.has('turntable') ? VOLUME.turntable : VOLUME.after) * UNIT;
      if (me.relics.has('turntable')) events.push({ type: 'relic', side: me.side, relic: 'turntable' });
      events.push({ type: 'payoff', side: me.side, kind: 'volume', left: me.energy });
      // SUBWOOFER (the shield build's DROP, 2026-11-01 trial, Body Slam's shape): THE DROP also hits for all the shield
      // you hold (a shield lasts one enemy turn, so a shield DROP did little; this cashes the shield build in).
      if (me.relics.has('subwoofer') && me.shield > 0 && !this.over) {
        events.push({ type: 'relic', side: me.side, relic: 'subwoofer' });
        this.hit(me, this.sides[other(me.side)], me.shield, [], events);
        if (this.over) return;
      }
      this.payoffHeal(me, events);
      return;
    }
    // Notes on the payline turn it up; a WILD counts only when it pairs as a note (user, 2026-10-08).
    const noteGroups = score.groups.filter((g) => g.symbol === 'note');
    const reels = line.flatMap((s, r) => (s === 'note' || (s === 'wild' && noteGroups.some((g) => g.reels.includes(r))) ? [r] : []));
    if (reels.length) this.turnUp(me, reels.length, reels, events);
    else if (me.energy > 0 && !me.armed && !me.relics.has('mixtape')) {
      // The record skips.
      const drop = Math.min(me.energy, VOLUME.skip * UNIT);
      me.energy -= drop;
      events.push({ type: 'meter', side: me.side, reels: [], amount: -drop, total: me.energy });
    } else if (me.relics.has('mixtape') && me.energy > 0 && !me.armed) events.push({ type: 'relic', side: me.side, relic: 'mixtape' });
  }

  /** This spin's shield groups' pay (SAFE DEPOSIT reads it when a chip group hits). */
  private lastScoreShield = 0;
  private depositSpin = -1;
  /** SAFE DEPOSIT: your first chip hit each spin also deals this spin's shield (x safeDepositMul). */
  private depositOnce(me: Combatant, events: CombatEvent[]): number {
    if (me.side !== 'player' || !me.relics.has('safedeposit') || this.depositSpin === this.turn || this.lastScoreShield <= 0) return 0;
    this.depositSpin = this.turn;
    events.push({ type: 'relic', side: me.side, relic: 'safedeposit' });
    return unitsRound(this.lastScoreShield * NEW_RELIC.safeDepositMul);
  }
  private makeItRain(me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    const cost = this.rainCost(me);
    events.push({ type: 'makeItRain', side: me.side, reels: g.reels, chips: this.chipsNow(), cost, total: this.midasChips - cost });
    if (me.relics.has('rainmaker')) events.push({ type: 'relic', side: me.side, relic: 'rainmaker' });
    this.hit(me, foe, g.amount + this.depositOnce(me, events), g.reels, events);
    this.midasChips -= cost;
    events.push({ type: 'midasChips', side: me.side, amount: -cost, total: this.midasChips });
  }

  /**
   * Charms that act when their group lands: the meter charm (TRICK fills JOKER's meter) and LUCRE's chips.
   */
  private cellCharms(me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    const n = (e: Enh) => g.reels.filter((r) => this.enhsAt(me, r).includes(e)).length;
    const v = (e: Enh) => charmValue(e, this.charmLvl(me, e));
    const kind = this.meter?.kind;
    if (kind === 'jackpots' && n('trick')) this.fillMeter(me, n('trick') * v('trick'), g.reels, events);
    const pays = g.amount > 0 && (PAYING.has(g.symbol) || g.symbol === 'goldbar');
    if (pays && n('lucre') && this.lucreChips < v('lucre')) {
      const got = Math.min(LUCRE_CHIPS, v('lucre') - this.lucreChips);
      this.lucreChips += got;
      events.push({ type: 'lucreChips', side: me.side, reels: g.reels, amount: got, total: this.lucreChips });
    }
  }

  /** VAMP: vamp cells in a group that pays heal you (once per group). */
  private vampHeal(me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    if (this.over || g.amount <= 0 || this.lineTwo) return;
    // Once per group (a one-cell jackpot too: JOKER's payoff cells healed x3, EXPERT_PLAYTEST_11 D2), however many vamp cells it holds (stacked vamp was the auto-pick: EXPERT_PLAYTEST_10 D1).
    const any = g.reels.some((r) => this.enhsAt(me, r).includes('vamp'));
    const vamp = any ? charmValue('vamp', this.charmLvl(me, 'vamp')) : 0;
    if (vamp) this.heal(me, vamp, 'vamp', events);
  }

  /** MIDAS / JAX: the full meter pays off this spin — it empties, and you heal. */
  private payoff(me: Combatant, score: LineScore, events: CombatEvent[]): void {
    if (score.jackpots) {
      me.armed = false;
      // ENCORE: the meter keeps a share after it pays.
      me.energy = me.side === 'player' && me.relics.has('encore') ? unitsUp(this.meterCost * NEW_RELIC.encoreKeep) : 0;
      if (me.energy > 0) events.push({ type: 'relic', side: me.side, relic: 'encore' });
      events.push({ type: 'payoff', side: me.side, kind: 'jackpots' });
      // HOUSE OF CARDS: each payoff adds a WILD to reel 2 for the rest of the fight.
      if (me.side === 'player' && me.relics.has('houseofcards')) {
        // The view mirrors the inserts (it used to miss them, so a later cell index ran past its strip: a crash).
        const inserts: CellRef[] = this.rng
          .shuffle(me.reels.map((reel, idx) => ({ reel, idx })))
          .slice(0, 2)
          .map(({ reel, idx }) => ({ reel: idx, index: insertOffscreen(reel, { symbol: 'wild', slimed: false }, this.rng) }));
        events.push({ type: 'relic', side: me.side, relic: 'houseofcards', inserts });
      }
      return;
    }
    if (this.meter?.kind === 'vault') {
      // It rests at 3/4 of its pre-fill after a payoff (full made the House a regen engine: EXPERT_PLAYTEST_5).
      me.energy = Math.floor((this.vaultBase() * 3) / 4 / UNIT) * UNIT;
      me.armed = false;
      events.push({ type: 'payoff', side: me.side, kind: 'vault', left: me.energy, mul: this.vaultPaid });
      this.vaultPaid = 0;
      return;
    }
    // MIDAS TOUCH spends what it used; gold past that stays.
    me.energy = Math.max(0, me.energy - this.touchSpend);
    this.touchSpend = 0;
    me.armed = me.energy >= this.meterCost;
    events.push({ type: 'payoff', side: me.side, kind: 'touch', left: me.energy });
  }

  /** After a payoff's groups resolved: its heal (+ Vampire Fang) and the Overcharge echo. */
  private payoffAfter(me: Combatant, _score: LineScore, events: CombatEvent[], from: number): void {
    const foe = this.sides[other(me.side)];
    const dealt = events.slice(from).reduce((a, e) => a + (e.type === 'attack' && e.from === me.side ? e.amount : 0), 0);
    this.payoffHeal(me, events);
    if (!this.over && me.relics.has('overcharge') && dealt > 0) {
      events.push({ type: 'relic', side: me.side, relic: 'overcharge' });
      this.hit(me, foe, Math.max(1, Math.round(dealt * OVERCHARGE_ECHO)), [], events, false, 'echo');
    }
  }

  /** Every meter payoff heals (the machine's own heal, plus Vampire Fang). */
  private payoffHeal(me: Combatant, events: CombatEvent[], times = 1): void {
    if (me.side !== 'player' || this.over) return;
    // One heal, its parts named (user, 2026-10-13: "what's healing me 15?"): the meter's own and VAMPIRE FANG.
    const parts = [
      { label: PAYOFF_WORD[this.meter?.kind ?? ''] ?? 'METER', amount: (this.meter?.heal ?? 0) * times },
      { label: 'FANG', amount: me.relics.has('fang') ? (this.special ? FANG_TESLA_HEAL : FANG_HEAL) * times : 0 },
    ].filter((x) => x.amount > 0);
    if (!parts.length) return;
    if (me.relics.has('fang')) events.push({ type: 'relic', side: me.side, relic: 'fang' });
    this.heal(me, parts.reduce((a, x) => a + x.amount, 0), 'payoff', events, parts.length > 1 ? parts : undefined);
  }

  /** JACKPOT BELL on BANKROLL: the HIGH ROLLER bar fills all the way (audit 2026-11-01: it added one pip). */
  private fillVault(me: Combatant, events: CombatEvent[]): void {
    if (me.armed) return;
    const add = this.meterCost - me.energy;
    me.energy = this.meterCost;
    me.armed = true;
    events.push({ type: 'meter', side: me.side, reels: [], amount: add, total: me.energy, armed: true });
  }

  /** MIDAS / JAX: fill the signature meter (a full MIDAS / JAX meter locks until it pays off). */
  private fillMeter(me: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    if (me.side !== 'player' || !this.meter) return;
    amount *= this.cfg.player.meterMul ?? 1;
    // MIDAS VAULT: +1 pip per gold bar landed; locks when full.
    if (this.meter.kind === 'vault') {
      if (me.armed) return;
      const add = Math.max(1, reels.length) * UNIT * (this.cfg.player.meterMul ?? 1);
      me.energy = Math.min(this.meterCost, me.energy + add);
      if (me.energy >= this.meterCost) me.armed = true;
      events.push({ type: 'meter', side: me.side, reels, amount: add, total: me.energy, ...(me.armed ? { armed: true } : {}) });
      return;
    }
    // MIDAS: gold is never wasted: it keeps counting past full (each touch spends one full meter).
    if (this.meter.kind === 'touch') {
      me.energy += amount;
      if (me.energy >= this.meterCost) me.armed = true;
      events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}) });
      return;
    }
    if (me.armed) {
      events.push({ type: 'meter', side: me.side, reels, amount: 0, total: me.energy, armed: true, wasted: amount });
      return;
    }
    me.energy = Math.min(this.meterCost, me.energy + amount);
    if (me.energy >= this.meterCost) me.armed = true;
    events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}) });
  }

  /** Enemy damage: the fight's knob x ENDLESS (LAST CALL after enemy turn 40) x ATTRITION (act 3). */
  enemyDmgMul(events?: CombatEvent[]): number {
    // The fight's damage knob (TUNE.enemyDmg, elites hit harder, endless loops); it used to apply only in endless.
    let mul = (this.cfg.enemy.dmgMul ?? 1) * (this.cfg.enemy.stakeDmg ?? 1) * (this.cfg.enemy.lineDmg ?? 1) * (1 + OWNER_RULES.phaseDmg * this.ownerPhase);
    // THE OWNER escalates every turn (OWNER_RULES.rise).
    if (this.cfg.enemy.owner) mul *= 1 + OWNER_RULES.rise * Math.floor(this.turn / 2);
    if (this.cfg.enemy.endless) {
      const late = Math.floor(this.turn / 2) - ENDLESS.lastCall;
      if (late > 0 && !this.lastCall && events) {
        this.lastCall = true;
        events.push({ type: 'lastCall', side: 'enemy' });
      }
      mul *= late > 0 ? 1 + ENDLESS.lastCallStep * late : 1;
    }
    // THE DEALER's second and third hands: its hits are raised.
    if (this.isDealer && this.dealerHand >= 2) mul *= DEALER_RULES.raiseMul;
    // (OVERTIME replaces act 3's ramp: it grows both machines' pays instead.)
    if ((this.cfg.enemy.act ?? 1) >= 3 && !this.cfg.overtime) mul *= Math.min(TUNE.rampMax, 1 + TUNE.rampPerTurn * Math.max(0, Math.floor(this.turn / 2) - 2));
    return mul;
  }

  hit(
    me: Combatant,
    foe: Combatant,
    amount: number,
    reels: number[],
    events: CombatEvent[],
    pierce = false,
    note?: 'drain' | 'mimic' | 'echo',
    scaled = false,
  ): number {
    // Nothing hits a machine that already fell this turn (its death resolves at the end of the turn).
    if (foe.hp <= 0) return 0;
    // ENDLESS (per loop, LAST CALL after enemy turn 40) and ATTRITION (act 3: +6% per enemy turn after the 2nd, max x2).
    // Scored swords and sevens carry it already (it shows on their banner).
    if (me.side === 'enemy' && amount > 0 && !scaled) {
      const mul = this.enemyDmgMul(events);
      if (mul !== 1) amount = Math.min(ENDLESS.clamp, Math.round((amount * mul) / UNIT) * UNIT || amount);
    }
    const pierced = pierce && foe.shield > 0;
    // ACT 3 COVER CHARGE: the first enemy attack each fight puts at least 10% of your max HP through your shield.
    if (me.side === 'enemy' && this.act3Regular && !this.coverTaken && amount > 0) {
      this.coverTaken = true;
      const cut = Math.min(amount, Math.max(UNIT, Math.round((foe.maxHp * TUNE.coverCharge) / UNIT) * UNIT));
      const c = this.damage(foe, cut, true);
      if (c.hpDamage > 0) events.push({ type: 'coverCharge', side: foe.side, amount: c.hpDamage });
      amount -= cut;
      if (amount <= 0) {
        this.checkDeath(foe, events);
        return c.hpDamage;
      }
    }
    const h = this.damage(foe, amount, pierce);
    events.push({ type: 'attack', from: me.side, to: foe.side, reels, amount, ...h, ...(pierced ? { note: 'pierce' as const } : note ? { note } : {}) });
    this.checkDeath(foe, events);
    return h.hpDamage;
  }

  /** TESLA, one axis (PAY.teslaOneAxis): the player's lightning boosts go into its charge, not into each bolt. */
  private get oneAxis(): boolean {
    return !!PAY.teslaOneAxis && this.special && !!this.cabinet;
  }
  private strikeBase = 0;
  /** Every lightning boost as a share of a full strike: BLAZE's flat damage, OVERCHARGE, LIVE WIRE, MELTDOWN, CHAIN. */
  private lightningBoost(me: Combatant): number {
    const over = me.relics.has('overcharge') ? OVERCHARGE.lightning : 0;
    const live = me.relics.has('livewire') ? NEW_RELIC.livewireMul : 0;
    const melt = me.relics.has('meltdown') ? Math.min(NEW_RELIC.meltdownCap, Math.max(0, me.maxHp - me.hp) * NEW_RELIC.meltdownRate) : 0;
    const chain = me.relics.has('chainlightning') ? LEGEND_RELIC.chainAdd : 0;
    return over + live + melt + chain + this.blaze / Math.max(1, this.strikeBase);
  }

  private gainEnergy(me: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    if (me.side === 'player') amount *= this.cfg.player.meterMul ?? 1;
    // TESLA, one axis: the boosts make more bolts (a storm grows longer, never each bolt bigger).
    if (me.side === 'player' && this.oneAxis) amount = Math.round(amount * (1 + this.lightningBoost(me)));
    me.energy += amount;
    events.push({ type: 'energyGain', side: me.side, reels, amount, total: me.energy });
    if (this.stormHold === me.side) this.stormPending = true;
    else this.storm(me, events);
  }

  /** While a side's turn gathers its charge, its lightning waits (one storm a turn); pending: charge came in. */
  private stormHold: SideId | null = null;
  private stormPending = false;

  /** A LIGHTNING STORM: strikes while the charge covers one. */
  private storm(me: Combatant, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    const pierce = this.cfg.specialIgnoresShield;
    // OVERCHARGE (TESLA): every strike hits 30% harder. It used to fire an echo strike after each one, which spammed
    // through a LIGHTNING STORM (user playtest); it pops once per storm now.
    const over = me.relics.has('overcharge');
    const live = me.side === 'player' && me.relics.has('livewire');
    let overPopped = false;
    let strikes = 0;
    while (me.energy >= this.cfg.specialCost && !this.over && foe.hp > 0) {
      me.energy -= this.cfg.specialCost;
      const raw = this.cfg.specialDamage + (me.side === 'player' && !this.oneAxis ? this.blaze : 0);
      // MELTDOWN: +1% per 1% of HP you're missing (capped).
      const melt = me.side === 'player' && me.relics.has('meltdown') ? Math.min(NEW_RELIC.meltdownCap, Math.max(0, me.maxHp - me.hp) * NEW_RELIC.meltdownRate) : 0;
      // CHAIN LIGHTNING (legendary relic): +100%.
      const chain = me.side === 'player' && me.relics.has('chainlightning') ? LEGEND_RELIC.chainAdd : 0;
      // PAY.lightningAdd: the lightning's boosts add up instead of multiplying.
      let dmg = me.side === 'player' && this.oneAxis
        ? raw
        : PAY.lightningAdd
        ? unitsUp(raw * (1 + (over ? OVERCHARGE.lightning : 0) + (live ? NEW_RELIC.livewireMul : 0) + melt + chain))
        : unitsUp(raw * (1 + (over ? OVERCHARGE.lightning : 0)) * (live ? 1 + NEW_RELIC.livewireMul : 1) * (1 + melt) * (1 + chain));
      // OVERTIME grows each strike (a hit), not the charge behind it.
      if (this.cfg.overtime && overtimeMul(this.turn) > 1) dmg = unitsUp(dmg * overtimeMul(this.turn));
      if (over && !overPopped) {
        overPopped = true;
        events.push({ type: 'relic', side: me.side, relic: 'overcharge' });
      }
      if (melt > 0 && strikes === 0) events.push({ type: 'relic', side: me.side, relic: 'meltdown' });
      if (chain && strikes === 0) events.push({ type: 'relic', side: me.side, relic: 'chainlightning' });
      const h = this.damage(foe, dmg, pierce);
      events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: dmg, ...h, energyLeft: me.energy });
      this.checkDeath(foe, events);
      strikes++;
    }
    // Every strike heals a little (TESLA's payoff heal), plus Vampire Fang: once per storm, for all its strikes (one heal
    // after each strike spammed through a LIGHTNING STORM: user playtest).
    // LIVE WIRE: each storm costs HP, once a storm (never per strike), never lethal, outside damage() and its turn cap.
    if (live && strikes > 0 && !this.over) {
      const cost = Math.min(me.hp - 1, NEW_RELIC.livewireCost);
      if (cost > 0) {
        me.hp -= cost;
        events.push({ type: 'relic', side: 'player', relic: 'livewire' });
        events.push({ type: 'hpCost', side: 'player', amount: cost, hp: me.hp });
      }
    }
    // TESLA, one axis: the storm heals once (it healed per bolt: 72-bolt storms walked through THE DEALER).
    // (OVERLOAD, TESLA in ENDLESS: the storm's heal grows with the loop too.)
    if (me.side === 'player' && strikes > 0) this.payoffHeal(me, events, this.oneAxis ? Math.round(PAY.stormHeal * (this.cfg.player.veteranMul ?? 1)) : strikes);
  }

  heal(me: Combatant, amount: number, source: HealSource, events: CombatEvent[], parts?: { label: string; amount: number }[]): void {
    const full = amount;
    // A side at 0 HP is dead when the turn settles: no heal brings it back (a storm's heals on the enemy's turn used to
    // revive TESLA from 0 HP: ENDLESS playtest, 2026-10-14).
    if (me.hp <= 0) return;
    // THE OWNER never heals: his HP is a count of hits.
    if (me.side === 'enemy' && this.cfg.enemy.owner) return;
    if (me.side === 'player' && this.cfg.player.healMul) amount = Math.max(1, Math.round(amount * this.cfg.player.healMul));
    const n = Math.min(amount, me.maxHp - me.hp);
    if (n > 0) {
      me.hp += n;
      // (The parts only when they add up to what landed: capped at max HP or halved, they'd read wrong.)
      events.push({ type: 'heal', side: me.side, amount: n, hp: me.hp, source, ...(parts && n === full ? { parts } : {}) });
    }
  }

  damage(target: Combatant, amount: number, ignoreShield: boolean) {
    const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
    target.shield -= blocked;
    amount = Math.min(ENDLESS.clamp, amount);
    let hpDamage = Math.min(target.hp, amount - blocked);
    // ONE-TURN CAP on you: no turn takes more than 40% of your max HP (60% for bosses): no turn-2 one-shots (EXPERT_PLAYTEST_3 E2).
    if (target.side === 'player') {
      // (THE OWNER has his own, higher cap: OWNER_RULES.capOnYou.)
      const capShare = this.cfg.enemy.owner ? OWNER_RULES.capOnYou + OWNER_RULES.rise * Math.floor(this.turn / 2) : this.isDealer && !this.bigTurn ? TUNE.dealerQuietCap : this.isBoss || this.isWheel || this.isDealer ? TUNE.bossTurnCap : TUNE.turnCap;
      const cap = Math.round(target.maxHp * capShare);
      hpDamage = Math.max(0, Math.min(hpDamage, cap - this.playerTurnHp));
      this.playerTurnHp += hpDamage;
    }
    // THE WHEEL's half-HP gate (the Mirror's old crack gate): it holds at half HP for the rest of the turn it SPINS
    // FASTER on, so both halves of the fight always play. (GREEN starts fast: no phase, no gate.)
    if (target.side === 'enemy' && this.isWheel && !this.fastFromStart) {
      if (this.gateTurn === this.turn) hpDamage = 0;
      else if (!this.fast) hpDamage = Math.min(hpDamage, Math.max(0, target.hp - Math.floor(target.maxHp / 2)));
    }
    target.hp -= hpDamage;
    if (target.hp <= 0 && target.side === 'enemy') this.overkill = amount - blocked - hpDamage;
    // INSURANCE POLICY: the first drop under 25% HP each fight pays out (the shield lands when the hit is settled).
    if (target.side === 'player' && target.hp > 0 && target.relics.has('insurance') && !this.insuranceUsed && target.hp < target.maxHp * NEW_RELIC.insuranceShare) {
      this.insuranceUsed = true;
      this.insurancePending = true;
    }
    return { blocked, hpDamage, targetHp: target.hp, targetShield: target.shield };
  }

  checkDeath(c: Combatant, events: CombatEvent[]): void {
    // THE OWNER's phases: each of the ladder's first three rungs you climb, he gets harder (once each).
    if (c.side === 'enemy' && this.cfg.enemy.owner && c.hp > 0) {
      const phase = Math.min(OWNER_RULES.phases.length, rungsClimbed(c.maxHp - c.hp));
      if (phase > this.ownerPhase) {
        this.ownerPhase = phase;
        events.push({ type: 'ownerPhase', side: 'enemy', phase });
      }
    }
    if (this.insurancePending && c.side === 'player' && c.hp > 0) {
      this.insurancePending = false;
      c.shield += NEW_RELIC.insuranceShield;
      this.insuranceKeep = NEW_RELIC.insuranceShield;
      events.push({ type: 'relic', side: 'player', relic: 'insurance' });
      events.push({ type: 'shieldGain', side: 'player', reels: [], amount: NEW_RELIC.insuranceShield, total: c.shield, source: 'insurance' });
    }
    if (this.over) return;
    if (c.hp > 0 || !this.resolving) {
      if (c.hp <= 0) return;
      // Boss phase 2: at half HP the House goes ALL IN and doubles the pot.
      if (c.side === 'enemy' && this.isBoss && !this.allIn && c.hp <= c.maxHp / 2) {
        this.allIn = true;
        this.pot = Math.max(this.pot * 2, this.pot + POT.allInMin);
        events.push({ type: 'phase', side: c.side, pot: this.pot });
      }
      // THE WHEEL SPINS FASTER at half HP: it places 3 chips a turn from now on.
      if (c.side === 'enemy' && this.isWheel && !this.fast && c.hp <= c.maxHp / 2) {
        this.fast = true;
        this.gateTurn = this.turn;
        events.push({ type: 'wheelFast', side: c.side, per: WHEEL_RULES.fast });
      }
      return;
    }
    // THE DEALER: beating a hand starts the next one (a new bar), until its third falls.
    if (c.side === 'enemy' && this.isDealer && this.dealerHand < DEALER_HANDS.length) {
      this.dealerHand++;
      c.maxHp = c.hp = unitsRound(this.dealerTotal * DEALER_RULES.hands[this.dealerHand - 1]);
      c.shield = 0;
      const allIn = this.dealerHand >= 3;
      this.nextDeal = allIn ? 'allin' : 'card';
      if (c.ability) {
        const base = allIn ? DEALER_RULES.allInEvery : DEALER_RULES.bustEvery;
        c.ability = { ...c.ability, every: Math.max(Math.min(2, base), base - this.dealerCut) };
        c.charge = 0;
      }
      events.push({ type: 'dealerHand', side: c.side, hand: this.dealerHand, hp: c.hp, every: c.ability?.every ?? 0 });
      events.push({ type: 'dealNext', side: c.side, card: this.nextDeal });
      return;
    }
    // Phoenix Feather: once per fight, a lethal hit leaves you at 1 HP.
    if (c.relics.has('phoenix') && !this.phoenixUsed) {
      this.phoenixUsed = true;
      c.hp = 1;
      events.push({ type: 'phoenix', side: c.side, hp: 1 });
      return;
    }
    // GOLDEN PARACHUTE (BANKROLL): pay chips to survive at 1 HP, once a fight (with PHOENIX FEATHER: two saves).
    if (c.side === 'player' && c.relics.has('parachute') && !this.parachuteUsed && this.chipsNow() >= NEW_RELIC.parachuteCost) {
      this.parachuteUsed = true;
      // The chips leave your hand now (audit 2026-11-01: they still counted for HIGH ROLLER and MAKE IT RAIN).
      this.parachuteChips = NEW_RELIC.parachuteCost;
      this.midasChips -= NEW_RELIC.parachuteCost;
      events.push({ type: 'midasChips', side: c.side, amount: -NEW_RELIC.parachuteCost, total: this.midasChips });
      c.hp = Math.max(1, Math.round(c.maxHp * NEW_RELIC.parachuteHp));
      events.push({ type: 'relic', side: c.side, relic: 'parachute' });
      events.push({ type: 'phoenix', side: c.side, hp: c.hp });
      return;
    }
    this.winner = other(c.side);
    events.push({ type: 'death', side: c.side });
    events.push({ type: 'fightEnd', winner: this.winner, turns: this.turn });
  }

  fizzle(me: Combatant, symbol: SymbolId, reels: number[], events: CombatEvent[]): void {
    events.push({ type: 'fizzle', side: me.side, reels, symbol });
  }

  betPer(foe: Combatant = this.sides.player): number {
    return Math.max(UNIT, unitsRound(foe.maxHp * wheelChipShare(this.cfg.cabinet, !!this.cfg.enemy.endless)));
  }

  /** Chips on your reels right now. */
  get betTotal(): number {
    return this.bets.reduce((a, b) => a + b, 0);
  }
}
