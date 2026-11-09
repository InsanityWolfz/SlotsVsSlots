import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { CLAW } from '../src/core/encounters';
import { ACHIEVEMENTS, FULL_GAME_ONLY } from '../src/core/meta';
import { chooseRoute, createRun, playEncounter, scoreParts, tutorialStart } from '../src/core/run';
import { openStore, setDemo, STORE_APP_ID, STORE_URL, wishlistLabel } from '../src/demo';
import { playRun } from '../src/sim/play';
import { parseStoreAppId, storeIdProblem, storeUrl } from '../src/storeId';

// QA DEMO stream fixes (2026-11-09). The demo's store link, the tutorial run's starting relic, the trophies it can't
// give, the CLAW's last go and the score's chip line.
const base = defaultConfig();

describe('the WISHLIST buttons never open a dead link (QA DEMO-01)', () => {
  it('the store page comes from one numeric app id, or none', () => {
    expect(parseStoreAppId('3141590')).toBe(3141590);
    expect(parseStoreAppId(' 42 ')).toBe(42);
    for (const bad of [undefined, null, '', 'APPID', '12a', '0', '-5']) expect(parseStoreAppId(bad)).toBeNull();
    expect(storeUrl(3141590)).toBe('https://store.steampowered.com/app/3141590');
  });

  it('with no app id (this build), the buttons say COMING SOON TO STEAM and open nothing', () => {
    expect(STORE_APP_ID).toBeNull();
    expect(STORE_URL).toBeNull();
    expect(wishlistLabel()).toBe('COMING SOON TO STEAM');
    expect(wishlistLabel(storeUrl(1))).toBe('WISHLIST ON STEAM');
    const open = vi.fn();
    vi.stubGlobal('window', { open });
    openStore();
    expect(open).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('the Steam demo build fails without the app id; the web demo and the full game build', () => {
    expect(storeIdProblem('steam-demo', undefined)).toMatch(/VITE_STORE_APP_ID/);
    expect(storeIdProblem('steam-demo', 'APPID')).toMatch(/VITE_STORE_APP_ID/);
    expect(storeIdProblem('steam-demo', '3141590')).toBeNull();
    for (const mode of ['demo', 'steam', 'production', 'playtest']) expect(storeIdProblem(mode, undefined)).toBeNull();
  });
});

describe('the tutorial run starts with a relic (QA DEMO-02)', () => {
  afterAll(() => setDemo(false));

  it('it gets the first one a NEW RUN would offer, and no pick is left waiting', () => {
    for (const cab of ['knight', 'tesla'] as const) {
      const run = createRun(base, 7, cab);
      const first = run.pendingStart![0];
      tutorialStart(run);
      expect(run.player.relics).toContain(first);
      expect(run.startRelic).toBe(first);
      expect(run.pendingStart).toBeNull();
    }
  });

  it('in the demo it clears THE HOUSE about as often as a NEW RUN (the gap was 18 points)', () => {
    setDemo(true);
    const rate = (tut: boolean) => {
      let won = 0;
      for (let i = 0; i < 200; i++)
        if (playRun(base, 50_000 + i, 'knight', 0, { policy: 'random', setup: tut ? (r) => { tutorialStart(r); r.tutorial = true; } : undefined }).won) won++;
      return won / 200;
    };
    const gap = rate(false) - rate(true);
    expect(Math.abs(gap)).toBeLessThan(0.1);
  }, 120_000);
});

describe('the demo marks the trophies it can\'t give (QA DEMO-10)', () => {
  it('every FULL_GAME_ONLY id is a real achievement, and the demo\'s own ones are not on it', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const id of FULL_GAME_ONLY) expect(ids.has(id)).toBe(true);
    for (const id of ['first_win', 'house', 'clear', 'clear_knight', 'clear_tesla', 'runs_25']) expect(FULL_GAME_ONLY.has(id)).toBe(false);
  });

  it('no demo run can earn one: a cleared demo run is act 1, WHITE, no ENDLESS', () => {
    const ctx = { won: true, act: 1, acts: 1, cabinet: 'knight', stake: 0, loops: 0, daily: false, score: 3000, chips: 10, relics: 4, fightsWon: 6, stats: { runs: 3, wins: 1, dailies: 0 }, have: {}, found: 10, collection: 65 };
    for (const a of ACHIEVEMENTS.filter((x) => FULL_GAME_ONLY.has(x.id))) expect(a.check(ctx as never), a.id).toBe(false);
  });
});

describe('the CLAW: a go you can\'t follow up never says IT MOVED CLOSER (QA DEMO-18)', () => {
  it('broke after a miss (chips for no other go) it says IT SLIPPED', () => {
    let checked = 0;
    for (let seed = 1; seed < 80 && checked < 3; seed++) {
      const run = createRun(base, seed, 'knight');
      run.pendingStart = null;
      run.map.routes[0][0] = { kind: 'encounter', encounter: 'claw' };
      run.depth = 1;
      run.stop = 1;
      chooseRoute(run, 0);
      run.player.chips = CLAW.price; // one go, then broke
      const res = playEncounter(run, 0)!;
      if (res.claw?.held) continue;
      expect(res.text).toBe('IT SLIPPED');
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('the score names its chip line as points, not chips (QA DEMO-09)', () => {
  it('the part is CHIPS, worth 2 a chip earned', () => {
    const run = createRun(base, 3, 'knight');
    run.chipsEarned = 9;
    expect(scoreParts(run).find(([k]) => k === 'CHIPS')?.[1]).toBe(18);
    expect(scoreParts(run).some(([k]) => k === 'CHIPS EARNED')).toBe(false);
  });
});
