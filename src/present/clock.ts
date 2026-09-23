import { linear, type Ease } from './ease';

/** Anything that advances with game time. update() returns true when done. */
export interface Task {
  update(dt: number): boolean;
  /** Jump straight to the end state (tap-to-skip). */
  finish(): void;
}

export interface TweenOpts {
  from?: number;
  to?: number;
  dur: number;
  ease?: Ease;
  onUpdate: (v: number) => void;
}

/**
 * Game-time driver for every presentation animation. Owns the speed multiplier, hitstop
 * freeze and tap-to-skip. Audio is never routed through this, so a hitstop never
 * silences the stinger it punctuates (juice §5).
 */
export class Clock {
  speed = 1;
  /** Seconds of game time elapsed (frozen during hitstop). */
  time = 0;
  /** While true every wait/tween resolves instantly (tap-to-skip). */
  skipping = false;
  private freeze = 0;
  private tasks: Task[] = [];

  /** Advance by real seconds; returns the game dt applied. */
  tick(realDt: number): number {
    if (this.freeze > 0) {
      this.freeze -= realDt;
      return 0;
    }
    const dt = realDt * this.speed;
    this.time += dt;
    const tasks = this.tasks;
    this.tasks = [];
    const keep: Task[] = [];
    for (const t of tasks) if (!t.update(dt)) keep.push(t);
    // Tasks added during update were pushed onto the fresh array.
    this.tasks = keep.concat(this.tasks);
    return dt;
  }

  get frozen(): boolean {
    return this.freeze > 0;
  }

  /** Freeze gameplay animation for N frames @60fps (shortened a bit at high speed). */
  hitstop(frames: number): void {
    if (this.skipping || frames <= 0) return;
    this.freeze = Math.max(this.freeze, frames / 60 / Math.sqrt(Math.max(0.25, this.speed)));
  }

  add(task: Task): void {
    if (this.skipping) task.finish();
    else this.tasks.push(task);
  }

  wait(sec: number): Promise<void> {
    if (this.skipping || sec <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      let t = 0;
      this.tasks.push({
        update: (dt) => {
          t += dt;
          if (t < sec) return false;
          resolve();
          return true;
        },
        finish: resolve,
      });
    });
  }

  tween({ from = 0, to = 1, dur, ease = linear, onUpdate }: TweenOpts): Promise<void> {
    if (this.skipping || dur <= 0) {
      onUpdate(to);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let t = 0;
      onUpdate(from);
      this.tasks.push({
        update: (dt) => {
          t += dt;
          const k = Math.min(1, t / dur);
          onUpdate(from + (to - from) * ease(k));
          if (k < 1) return false;
          resolve();
          return true;
        },
        finish: () => {
          onUpdate(to);
          resolve();
        },
      });
    });
  }

  /** Tween a numeric property on an object. */
  to<T extends object, K extends keyof T>(obj: T, key: K, to: number, dur: number, ease?: Ease): Promise<void> {
    const from = obj[key] as unknown as number;
    return this.tween({ from, to, dur, ease, onUpdate: (v) => ((obj[key] as unknown as number) = v) });
  }

  /** Fast-forward everything currently running and anything started until endSkip(). */
  skip(): void {
    this.skipping = true;
    this.freeze = 0;
    // finish() may resolve promises whose continuations add more tasks; those finish
    // immediately via add()/wait()/tween() because skipping is set.
    let guard = 0;
    while (this.tasks.length && guard++ < 1000) {
      const tasks = this.tasks;
      this.tasks = [];
      for (const t of tasks) t.finish();
    }
  }

  endSkip(): void {
    this.skipping = false;
  }
}
