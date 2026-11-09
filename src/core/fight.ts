import { BLADES, cloneConfig, UNIT, unitsRound, unitsUp, type AbilityDef, type Enh, type GameConfig, type RelicId, type SideId, type SymbolId } from './config';
import { CABINETS, hasSpecial, type Cabinet, type Meter } from './cabinets';
import { charmLevel, charmValue } from './charms';
import type { CombatEvent, DealCard, HealSource, LineCard } from './events';
import { CONTENT_1107, NEW_RELIC, POT } from './relics';
import { Rng } from './rng';
import { effectiveAbility, STAKE } from './stakes';
import { ENDLESS, GATEKEEPER, OVERTIME, overtimeMul, overtimeRound, TUNE, wheelChipShare } from './enemies';
import { isNearMiss, type ScoreGroup } from './scoring';
import { DEAD, effectiveSymbol, paylineSymbols, symbolValue, type CellRef } from './strip';
// The fight is split in six (2026-10-29, 2026-11-05): its rules (fightRules), a spin's scoring (fightScore), what
// enemies do to your machine (fightTricks), what a spin pays out (fightPayout), hits, heals and deaths
// (fightDamage) and this class. Everything stays importable from here.
export * from './fightRules';
import { BUILD_UP, MIDAS, POT_STEAL, PAY, VOLUME, RAIN, highRollerMul, DEALER_RULES, allInRange, PAYING, wheelCharm, JACKPOTABLE, type Combatant, type TurnResult, other, makeCombatant } from './fightRules';
import { scoreSpin } from './fightScore';
import { markedCards, tickFakes, defuse, burnFuses, tickStatuses, chargeAbility, sweepBets, cashPot, winPot, stickyFingers } from './fightTricks';
import { secondLine, resolveGroup, midasTouch, dropNotes, turnUp, volumeAfterSpin, payoff, payoffAfter, cellCharms, fillVault, fillMeter, gainEnergy, storm } from './fightPayout';
import { resetShield, enemyDmgMul, hit, heal, damage, checkDeath } from './fightDamage';

/**
 * An enemy ability's head start (its charge when the fight begins), as the Fight sets it. The enemy card says "TURN N,
 * THEN EVERY M" from it (QA RULES-15: the card said EVERY 3 while the ability fired on turn 1). Bosses start at 0
 * (THE DEALER sets its own).
 */
export function startCharge(ab: AbilityDef, o: { regular: boolean; act: number; endless: boolean }): number {
  // ACT 3 regulars open with their ability on their first turn (it never fired in 38% of act 3 fights: EXPERT_PLAYTEST_3 C3).
  if (o.regular && o.act >= 3) return Math.max(0, ab.every - 1);
  // THE REPO MAN takes on his first turn, then every 3 (half of MIDAS's fights ended before his 3rd: EXPERT_PLAYTEST_9 D3).
  if (ab.kind === 'repo') return Math.max(0, ab.every - GATEKEEPER.firstTurn);
  // ACT 1-2 regulars and elites get a head start: the enemy's trick (writing on your machine) shows in nearly every
  // fight, not only the long ones (the feel playtest: BLIZZARD and PILFER never fired before the enemy died).
  if (o.regular && !o.endless) return Math.min(ab.every - 1, TUNE.headStart);
  return 0;
}

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
  lastCall = false;
  /** The act 3 cover charge has been taken this fight. */
  coverTaken = false;
  /** HP you've lost this turn (one-turn cap: regular enemies 40% of your max HP, bosses 60%). */
  playerTurnHp = 0;
  /** THE OWNER: tricks played so far (the next one is OWNER_TRICKS[n % length]). */
  ownerTricks = 0;
  /** THE OWNER's phase (0, then 1-3 at the ladder's first three rungs). */
  ownerPhase = 0;
  /** GLASS: payline reels whose GLASS shattered this spin (the cells lose it once the spin settles). */
  glassBreaks: number[] = [];
  /** SECOND PAYLINE's groups are resolving (no chips, no heals). */
  lineTwo = false;
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
  /** An attack pair or jackpot (your machine's hit symbol, or MAKE IT RAIN) that pays: it cashes the BUILD-UP. */
  buildUpCashes(g: ScoreGroup): boolean {
    return g.matched && (g.reels.length >= 2 || !!g.jackpot) && g.base > 0 && (this.isAttack(g.symbol) || !!g.rain);
  }
  buildUpMul(me: Combatant = this.sides.player): number {
    return 1 + this.buildUpRule(me).step * this.buildUp;
  }
  /** GOLDEN SPIN: this spin is golden (everything pays x3). */
  goldenNow = false;
  /** INSURANCE POLICY: used this fight; waiting to pay out (the hit landed, the shield comes after). */
  insuranceUsed = false;
  insurancePending = false;
  /** INSURANCE's shield still standing: it survives your next turn-start reset (it landed on the enemy's turn). */
  insuranceKeep = 0;
  /** HOUSE TAX: chips the enemy's jackpots paid you (banked after the fight). */
  taxChips = 0;
  /** STICKY FINGERS: chips the cells enemies spoiled paid you this fight (banked on a win, up to its cap). */
  stickyChips = 0;
  /** PAIR STREAK: your spins in a row with an attack pair or jackpot (the next one pays more). */
  pairStreak = 0;
  /** STEADY HANDS: the reels you held for this spin. */
  heldNow: boolean[] = [false, false, false];
  /** LEAN MACHINE: your reels with few enough cells, as built (counted at the fight's start: rocks an enemy adds
   * mid-fight don't switch it off; they stay for the run, so the next fight counts them). */
  leanReels: boolean[] = [false, false, false];
  /** CERTIFIED HITMAKER: drops played this fight. */
  drops = 0;
  /** GOLDEN PARACHUTE: used this fight (its chips come off after). */
  parachuteUsed = false;
  parachuteChips = 0;
  /** This enemy turn was announced (ALL IN). */
  bigTurn = false;
  /** E3: reels of yours that thawed on your last turn can't be frozen or jammed on the next enemy turn. */
  thawShield = new Set<number>();
  /** Relics that act as the fight opens (Battery): popped on turn 1. */
  private openers: RelicId[] = [];
  /** THE WHEEL: chips (bets) on each of your reels. */
  readonly bets: number[] = [0, 0, 0];
  /** THE WHEEL SPINS FASTER (phase 2, or from the start at GREEN): it places WHEEL_RULES.fast chips a turn. */
  fast = false;
  /** GREEN: THE WHEEL STARTS FAST, so there is no half-HP phase (and no gate). */
  fastFromStart = false;
  /** The turn THE WHEEL hit half HP on: it takes no more HP damage that turn (the half-HP gate). */
  gateTurn = -1;
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
  dealerTotal = 0;
  dealt = false;
  /** The Dealer's card on your payline (applies to your next spin). */
  lineCard: { reel: number; card: LineCard } | null = null;
  /** The Dealer's next attack is its whole hand. */
  dealerAllIn = false;
  /** DECK DRUM stacks (this fight). */
  drum = 0;
  /** MIDAS TOUCH: gold touches per cell (this fight), and how much meter the current touch spends. */
  readonly touches = new Map<object, number>();
  touchSpend = 0;
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
    if (p.relics.has('lean')) this.leanReels = this.cfg.player.strips.map((st) => Object.values(st).reduce((a, n) => a + (n ?? 0), 0) <= CONTENT_1107.leanCells);
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
    const regular = !this.isBoss && !this.isWheel && !this.isDealer;
    if (this.sides.enemy.ability) this.sides.enemy.charge = startCharge(this.sides.enemy.ability, { regular, act: this.cfg.enemy.act ?? 1, endless: !!this.cfg.enemy.endless });
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
  /** Your spins this fight (HYPE MAN; HOLD opens after the first). */
  playerSpins = 0;
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
   * costs a HOLD when you spin. A frozen reel can't be held, and nothing before your first spin of a fight: the
   * opening line isn't a spin (holding a pair on it made spin 1 a sure pair, demo playtest 2026-11-07). Returns
   * whether it's held now.
   */
  hold(reel: number): boolean {
    if (this.over || this.next !== 'player' || this.playerSpins === 0 || reel < 0 || reel > 2) return false;
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
    // STICKY FINGERS: each cell an enemy spoiled this turn pays a chip, shown as it lands.
    if (this.sides.player.relics.has('sticky')) res.events = stickyFingers(this, res.events);
    this.resolving = true;
    const first = res.side === 'player' ? this.sides.enemy : this.sides.player;
    for (const c of [first, this.sides[res.side]]) this.checkDeath(c, res.events);
    this.resolving = false;
    return res;
  }
  /** True while end-of-turn deaths resolve (a 0 HP machine falls only then). */
  resolving = false;

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

    if (this.cfg.shieldReset === 'ownTurnStart') resetShield(this, me, events);
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
      this.heldNow = held;
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
        turnUp(this, me, 1, [], events, true);
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
    // BUILD-UP: the attack pair or jackpot cashing it in (the plate empties into the hit, before it lands).
    if (side === 'player' && this.buildUp > 0 && score.groups.some((g) => g.notes?.some((n) => n.endsWith(' BUILD-UP'))))
      events.push({ type: 'buildUp', side, mul: 1, stacks: 0, cashed: true, spent: this.buildUpMul(me) });
    if (score.touched?.length) events.push({ type: 'touch', side, cells: score.touched });
    // (The spin carries THE DROP for the show; this event is its record, for the log and the tests.)
    if (drop) events.push({ type: 'drop', side, ...drop });
    const sentBefore = events.length;

    if (side === 'player' && score.tier === 'triple') this.playerJackpots++;
    // A meter that pays off this spin empties first (so what lands now can refill it).
    if (side === 'player' && (score.raised || score.jackpots)) payoff(this, me, score, events);
    if (laid) events.push({ type: 'lineCardUsed', side, reel: laid.reel, card: laid.card });
    const allIn = side === 'enemy' && this.isDealer && this.dealerAllIn;
    this.lastScoreShield = score.groups.filter((g) => g.symbol === 'shield').reduce((t, g) => t + g.amount, 0);
    for (const group of score.groups) {
      if (allIn && (group.symbol === 'sword' || group.symbol === 'seven')) continue;
      if (group.voided) continue;
      resolveGroup(this, me, group, score, events);
      if (!this.over && side === 'player') cellCharms(this, me, group, events);
      if (this.over) break;
    }
    // SECOND PAYLINE (legendary relic): the row above pays its pairs and jackpots at half.
    if (!this.over && side === 'player' && me.relics.has('secondline')) secondLine(this, me, events);
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
    if (!this.over && side === 'player' && (score.raised || score.jackpots)) payoffAfter(this, me, score, events, sentBefore);
    // THE JUKEBOX: THE DROP, or the volume going up (notes on the payline) or down (a spin with no note skips).
    if (!this.over && side === 'player' && this.meter?.kind === 'volume') volumeAfterSpin(this, me, line, score, events);
    // JAX: every WILD on the payline fills the meter (lucky wilds too).
    if (!this.over && side === 'player' && this.meter?.kind === 'jackpots') {
      const wilds = line.flatMap((s, r) => (s === 'wild' ? [r] : []));
      if (wilds.length) fillMeter(this, me, wilds.length * (this.meter.perWild ?? 0), wilds, events);
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
    // PAIR STREAK: an attack pair or jackpot adds to the streak; a spin without one ends it.
    if (side === 'player' && me.relics.has('pairstreak')) this.pairStreak = score.groups.some((g) => this.buildUpCashes(g)) ? this.pairStreak + 1 : 0;
    // BUILD-UP: a spin with no attack pair or jackpot adds a stack; an attack pair or jackpot spends them (playtest
    // 2026-11-01: a shield pair spent it on nothing; a spill pair grew it while the plate said "next pair").
    const bu = this.buildUpRule(me);
    if (side === 'player' && bu.step > 0 && !this.over) {
      const cashed = score.groups.some((g) => this.buildUpCashes(g));
      const before = this.buildUp;
      const max = Math.round((bu.cap - 1) / bu.step);
      this.buildUp = cashed ? 0 : Math.min(max, this.buildUp + 1);
      if (!cashed && this.buildUp !== before) events.push({ type: 'buildUp', side, mul: this.buildUpMul(me), stacks: this.buildUp });
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
      if (this.special || side !== 'player') gainEnergy(this, me, this.cfg.specialCost, [], events);
      else if (this.meter?.kind === 'vault') fillVault(this, me, events);
      else fillMeter(this, me, this.meterCost, [], events);
    }
    // The turn's charge is all in: the storm fires once (only lightning charge: other meters keep theirs in energy too).
    this.stormHold = null;
    if (this.stormPending && !this.over) storm(this, me, events);
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
    // A spin that knocked the other machine out ends it: your own IOUs and marked cards don't go off after the kill
    // (stress test 2026-11-02: they took you to 0 HP and you "won" at 0, then lost the next fight unspun).
    const foeDown = this.sides[other(side)].hp <= 0;
    if (!this.over && !foeDown && side === 'player') markedCards(this, me, events);
    if (!this.over && !foeDown) burnFuses(this, me, events);
    if (!this.over) tickFakes(this, me, events);
    if (!this.over) tickStatuses(this, me, events);
    if (!this.over && me.ability) chargeAbility(this, me, events);

    if (!this.over && this.cfg.shieldReset === 'roundEnd' && side === 'enemy') {
      resetShield(this, this.sides.player, events);
      resetShield(this, this.sides.enemy, events);
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

  /** This spin's shield groups' pay (SAFE DEPOSIT reads it when a chip group hits). */
  lastScoreShield = 0;
  depositSpin = -1;

  /** TESLA, one axis (PAY.teslaOneAxis): the player's lightning boosts go into its charge, not into each bolt. */
  get oneAxis(): boolean {
    return !!PAY.teslaOneAxis && this.special && !!this.cabinet;
  }
  strikeBase = 0;

  /** While a side's turn gathers its charge, its lightning waits (one storm a turn); pending: charge came in. */
  stormHold: SideId | null = null;
  stormPending = false;

  // Moved to fightPayout and fightDamage (2026-11-05); they stay methods here for fightTricks and fightScore.
  midasTouch(me: Combatant, line: SymbolId[], touchable: (r: number) => boolean): { reel: number; index: number; n: number }[] {
    return midasTouch(this, me, line, touchable);
  }
  dropNotes(me: Combatant, groupHexed = false): ReturnType<typeof dropNotes> {
    return dropNotes(this, me, groupHexed);
  }
  enemyDmgMul(events?: CombatEvent[]): number {
    return enemyDmgMul(this, events);
  }
  hit(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[], pierce = false, note?: 'drain' | 'mimic' | 'echo', scaled = false): number {
    return hit(this, me, foe, amount, reels, events, pierce, note, scaled);
  }
  heal(me: Combatant, amount: number, source: HealSource, events: CombatEvent[], parts?: { label: string; amount: number }[]): void {
    heal(this, me, amount, source, events, parts);
  }
  damage(target: Combatant, amount: number, ignoreShield: boolean): ReturnType<typeof damage> {
    return damage(this, target, amount, ignoreShield);
  }
  checkDeath(c: Combatant, events: CombatEvent[]): void {
    checkDeath(this, c, events);
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
