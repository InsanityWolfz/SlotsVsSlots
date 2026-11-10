/**
 * BOSS CLARITY (user, 2026-10-12): every boss's rules as short rows, each with the icon the fight uses for it, and one
 * HOW TO WIN line. The boss card's back and the in-fight card (tap the boss's HUD) both draw these, so a rule reads the
 * same everywhere.
 */
import { DEALER_RULES } from '../core/fight';
import { OWNER_RULES, ownerRung, TURBO, WHEEL_RULES, wheelChipShare } from '../core/enemies';
import { fmtNum } from '../render/text';
import { POT } from '../core/relics';
import { STAKE } from '../core/stakes';
import type { SpriteId } from '../render/spriteData';
import { artId } from '../render/sprites';

export interface BossRules {
  rules: { icon: SpriteId; text: string }[];
  win: string;
}

export interface BossRuleContext {
  stake: number;
  cabinet?: string;
  /** THE HOUSE's skim cadence as it will really play (stake, Golden Hourglass). */
  houseEvery: number;
  /** ENDLESS: the loop (the Dealer's ALL IN grows with it). */
  loop?: number;
  /** THE DEALER: its BUST clock in hand 1 (FAST HANDS, QUICKENING and the stakes speed it up; the same cut runs in every hand). */
  dealerEvery?: number;
  /** THE WHEEL: its NO MORE BETS clock as the fight plays it (ESPRESSO SHOT, FAST NIGHT). */
  wheelEvery?: number;
}

export function bossRules(boss: string, c: BossRuleContext): BossRules {
  // THE OWNER (ENDLESS loop 5): the TURBO boss.
  if (boss === 'owner')
    return {
      rules: [
        { icon: artId('icoGavel'), text: 'EVERY 2 TURNS: A TRICK (SPILL, STEAL, FREEZE, ROCKS, JINX, IOUS) OR THE HAMMER. THEY ALTERNATE' },
        { icon: artId('icoSmash'), text: `THE HAMMER: ${Math.round(OWNER_RULES.hammer * 100)}% OF YOUR MAX HP. IT PIERCES SHIELDS. HIS OTHER HITS GROW ${Math.round(OWNER_RULES.rise * 100)}% EVERY TURN` },
        { icon: 'shieldIcon', text: `HIS HP IS HIS FORTUNE: ${fmtNum(TURBO.hp)}. AT ${[1, 2, 3].map((k) => fmtNum(ownerRung(k))).join(' / ')} TAKEN, HE HITS ${Math.round(OWNER_RULES.phaseDmg * 100)}% HARDER` },
      ],
      win: `THE MORE OF HIS ${fmtNum(TURBO.hp)} YOU TAKE, THE MORE YOU SCORE. TAKE IT ALL TO BREAK THE BANK`,
    };
  return rulesOf(boss, c);
}

function rulesOf(boss: string, c: BossRuleContext): BossRules {
  if (boss === 'dealer') {
    const k = 1 + DEALER_RULES.loopStep * (c.loop ?? 0);
    const pct = (x: number) => Math.round(Math.min(DEALER_RULES.loopMax, x * k) * 100);
    const cut = DEALER_RULES.bustEvery - (c.dealerEvery ?? DEALER_RULES.bustEvery);
    const bust = Math.max(2, DEALER_RULES.bustEvery - cut);
    const allIn = Math.max(2, DEALER_RULES.allInEvery - cut);
    const lo = pct(DEALER_RULES.allInFloor);
    const hi = pct(DEALER_RULES.allInCap);
    return {
      rules: [
        { icon: artId('dealCut'), text: `HAND 1: EVERY ${bust} TURNS, A BUST: YOUR BEST REEL PAYS NOTHING NEXT SPIN` },
        { icon: artId('dealRaise'), text: `HAND 2: THE BUSTS GO ON, AND HIS HITS PAY X${DEALER_RULES.raiseMul}` },
        { icon: artId('dealShuffle'), text: `HAND 3: EVERY ${allIn} TURNS, ALL IN: ${lo === hi ? lo : `${lo}-${hi}`}% OF YOUR MAX HP. IT PIERCES SHIELDS` },
      ],
      win: 'EACH HAND HAS ITS OWN HP BAR. BEAT ALL THREE',
    };
  }
  if (boss === 'wheel') {
    const fast = c.stake >= STAKE.wheelFast;
    return {
      rules: [
        { icon: artId('betChip'), text: `EVERY TURN: ${fast ? WHEEL_RULES.fast : WHEEL_RULES.place} CHIPS ON YOUR REELS` },
        { icon: artId('icoBets'), text: `EVERY ${c.wheelEvery ?? 3} TURNS: NO MORE BETS. EACH CHIP LEFT HITS ${Math.round(wheelChipShare(c.cabinet, (c.loop ?? 0) > 0) * 100)}% OF YOUR MAX HP` },
        // (At GREEN it bets the fast amount from the start: row 1 says so, and there's no half-HP hold.)
        ...(fast ? [] : [{ icon: artId('ball'), text: `AT HALF HP IT HOLDS FOR THE REST OF THAT TURN, THEN BETS ${WHEEL_RULES.fast} CHIPS A TURN` }]),
      ],
      win: 'YOUR PAIRS CLEAR THEIR REELS. A JACKPOT CLEARS THEM ALL',
    };
  }
  const dirty = c.stake >= STAKE.houseDirty;
  return {
    rules: [
      { icon: artId('coin'), text: (c.loop ?? 0) > 0 ? 'HE ADDS TO THE POT EVERY TURN. COINS ON HIS REELS ADD MORE' : `HE ADDS ${fmtNum(POT.houseCut)} TO THE POT EVERY TURN. COINS ON HIS REELS ADD MORE` },
      { icon: artId('icoCoin'), text: `EVERY ${c.houseEvery} TURNS: HE SKIMS HALF THE POT AT YOU` },
      { icon: artId('potTier4'), text: `AT HALF HP THE POT DOUBLES. FROM SPIN ${POT.lastCall}, LAST CALL: HE SKIMS EVERY TURN` },
      ...(dirty ? [{ icon: artId('bomb'), text: 'BLACK: HE STICKS IOUS ON YOUR PAYLINE' }] : []),
    ],
    win: 'YOUR JACKPOTS WIN HIS POT',
  };
}
