/**
 * BOSS CLARITY (user, 2026-10-12): every boss's rules as short rows, each with the icon the fight uses for it, and one
 * HOW TO WIN line. The boss card's back and the in-fight card (tap the boss's HUD) both draw these, so a rule reads the
 * same everywhere.
 */
import { DEALER_RULES } from '../core/fight';
import { OWNER_RULES, TURBO, WHEEL_RULES, wheelChipShare } from '../core/enemies';
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
}

export function bossRules(boss: string, c: BossRuleContext): BossRules {
  // THE OWNER (ENDLESS loop 5): the TURBO boss.
  if (boss === 'owner')
    return {
      rules: [
        { icon: artId('icoGavel'), text: 'EVERY 2 TURNS HE CHEATS. EVERY OTHER TIME IT IS A NEW TRICK (SPILL, THEFT, FREEZE, ROCKS, JINX, IOUS)' },
        { icon: artId('icoSmash'), text: `THE REST IS THE HAMMER: ${Math.round(OWNER_RULES.hammer * 100)}% OF YOUR MAX HP THROUGH SHIELDS. NO TURN OF HIS TAKES MORE THAN ${Math.round(OWNER_RULES.capOnYou * 100)}%` },
        { icon: 'shieldIcon', text: `HE HAS ${TURBO.hp} HP: A SPIN THAT HITS HIM TAKES 1, HOWEVER BIG. AT 75 / 50 / 25% OF IT HE HITS ${Math.round(OWNER_RULES.phaseDmg * 100)}% HARDER EACH TIME` },
      ],
      win: 'EVERY HP YOU TAKE SCORES. BEAT HIM AND THE RUN IS WON',
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
        { icon: artId('dealCut'), text: `HAND 1: EVERY ${bust} TURNS A BUST. YOUR BEST REEL PAYS NOTHING NEXT SPIN` },
        { icon: artId('dealRaise'), text: `HAND 2: ITS HITS ARE X${DEALER_RULES.raiseMul}. STILL BUSTS` },
        { icon: artId('dealShuffle'), text: `HAND 3: EVERY ${allIn} TURNS ALL IN, ${lo === hi ? lo : `${lo}-${hi}`}% OF YOUR MAX HP. IT PIERCES SHIELDS` },
      ],
      win: 'EACH HAND HAS ITS OWN HP BAR. BEAT ALL THREE',
    };
  }
  if (boss === 'wheel') {
    const fast = c.stake >= STAKE.wheelFast;
    return {
      rules: [
        { icon: artId('betChip'), text: `EACH TURN IT PUTS ${fast ? WHEEL_RULES.fast : WHEEL_RULES.place} CHIPS ON YOUR REELS` },
        { icon: artId('icoBets'), text: `EVERY 3RD TURN, EACH CHIP LEFT HITS ${Math.round(wheelChipShare(c.cabinet, (c.loop ?? 0) > 0) * 100)}% OF YOUR MAX HP` },
        { icon: artId('ball'), text: fast ? 'GREEN: IT STARTS FAST' : `AT HALF HP: ${WHEEL_RULES.fast} CHIPS A TURN` },
      ],
      win: 'YOUR PAIRS CLEAR THEIR REELS. A JACKPOT CLEARS THEM ALL',
    };
  }
  const dirty = c.stake >= STAKE.houseDirty;
  return {
    rules: [
      { icon: artId('coin'), text: 'COINS ON ITS REELS FILL THE POT' },
      { icon: artId('icoCoin'), text: `EVERY ${c.houseEvery} TURNS IT SKIMS HALF THE POT AT YOU` },
      { icon: artId('potTier4'), text: `AT HALF HP THE POT DOUBLES. FROM TURN ${POT.lastCall}, IT SKIMS EVERY TURN` },
      ...(dirty ? [{ icon: artId('bomb'), text: 'BLACK: IT STICKS IOUS ON YOUR PAYLINE' }] : []),
    ],
    win: 'YOUR JACKPOTS STEAL ITS POT',
  };
}
