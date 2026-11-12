/**
 * BOSS CLARITY (user, 2026-10-12): every boss's rules as short rows, each with the icon the fight uses for it, and one
 * HOW TO WIN line. The boss card's back and the in-fight card (tap the boss's HUD) both draw these, so a rule reads the
 * same everywhere.
 */
import { DEALER_RULES } from '../core/fight';
import { OWNER, OWNER_RULES, ownerRung, TURBO, WHEEL_RULES, wheelChipShare } from '../core/enemies';
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
        { icon: artId('icoGavel'), text: `EVERY ${OWNER.ability!.every} SPINS HE SABOTAGES YOUR REELS OR SWINGS THE HAMMER. HE SWAPS EACH TIME. HE SPILLS, STEALS, FREEZES, ADDS ROCKS, JINXES, THEN STICKS IOUS` },
        { icon: artId('icoSmash'), text: `THE HAMMER HITS YOU FOR ${Math.round(OWNER_RULES.hammer * 100)}% OF YOUR MAX HP AND PIERCES SHIELDS. HIS OTHER HITS GROW ${Math.round(OWNER_RULES.rise * 100)}% EVERY SPIN` },
        { icon: 'shieldIcon', text: `HIS HP IS HIS FORTUNE OF ${fmtNum(TURBO.hp)}. HE HITS ${Math.round(OWNER_RULES.phaseDmg * 100)}% HARDER WHEN YOU HAVE TAKEN ${fmtNum(ownerRung(1))}, AGAIN AT ${fmtNum(ownerRung(2))} AND AGAIN AT ${fmtNum(ownerRung(3))}` },
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
        { icon: artId('dealCut'), text: `IN HAND 1 HE DEALS A BUST EVERY ${bust} SPINS. A BUST MAKES YOUR BEST REEL PAY NOTHING NEXT SPIN` },
        { icon: artId('dealRaise'), text: `IN HAND 2 THE BUSTS GO ON AND HE HITS X${DEALER_RULES.raiseMul}` },
        { icon: artId('dealShuffle'), text: `IN HAND 3 HE GOES ALL IN EVERY ${allIn} SPINS FOR ${lo === hi ? `${lo}%` : `${lo}% TO ${hi}%`} OF YOUR MAX HP. IT PIERCES SHIELDS` },
      ],
      win: 'EACH HAND HAS ITS OWN HP BAR. BEAT ALL THREE',
    };
  }
  if (boss === 'wheel') {
    const fast = c.stake >= STAKE.wheelFast;
    return {
      rules: [
        { icon: artId('betChip'), text: `EACH SPIN SHE PLACES ${fast ? WHEEL_RULES.fast : WHEEL_RULES.place} BETS ON YOUR REELS` },
        { icon: artId('icoBets'), text: `EVERY ${c.wheelEvery ?? 3} SPINS SHE CALLS NO MORE BETS. EACH BET LEFT HITS YOU FOR ${Math.round(wheelChipShare(c.cabinet, (c.loop ?? 0) > 0) * 100)}% OF YOUR MAX HP` },
        // (At GREEN she bets the fast amount from the start: row 1 says so, and there's no half-HP hold.)
        ...(fast ? [] : [{ icon: artId('ball'), text: `THE SPIN THAT TAKES HER TO HALF HP CAN'T HURT HER MORE. THEN SHE PLACES ${WHEEL_RULES.fast} BETS EACH SPIN` }]),
      ],
      win: 'A PAIR CLEARS THE BETS ON ITS 2 REELS. A JACKPOT CLEARS THEM ALL',
    };
  }
  const dirty = c.stake >= STAKE.houseDirty;
  // (An ENDLESS loop's DOORMAN: his pot is sized to your HP, a jackpot wins a third of it, and he has no LAST CALL.)
  const loop = (c.loop ?? 0) > 0;
  return {
    rules: [
      { icon: artId('coin'), text: loop ? 'HE ADDS TO THE POT EACH SPIN. COINS ON HIS REELS ADD MORE' : `HE ADDS ${fmtNum(POT.houseCut)} TO THE POT EACH SPIN. COINS ON HIS REELS ADD MORE` },
      { icon: artId('icoCoin'), text: `EVERY ${c.houseEvery} SPINS HE SKIMS HALF THE POT AND HITS YOU WITH IT` },
      { icon: artId('potTier4'), text: loop ? 'AT HALF HP THE POT DOUBLES' : `AT HALF HP THE POT DOUBLES. FROM SPIN ${POT.lastCall} HE SKIMS EVERY TIME HE SPINS` },
      ...(dirty ? [{ icon: artId('bomb'), text: 'HE STICKS IOUS ON YOUR SYMBOLS' }] : []),
    ],
    win: loop ? 'YOUR JACKPOTS WIN A THIRD OF HIS POT AND HIT HIM WITH IT' : 'YOUR JACKPOTS WIN HIS POT AND HIT HIM WITH IT',
  };
}
