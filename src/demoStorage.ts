import { DEMO, demoKey } from './demo';

/**
 * The demo's own saves (imported first in main.ts): on the web the demo shares the site's storage with the full game,
 * so every `slotvslot.` key reads and writes as `demo.slotvslot.` there. The full game's keys are never touched, and
 * without the demo flag nothing here runs.
 */
if (DEMO && typeof Storage !== 'undefined') {
  const P = Storage.prototype;
  const { getItem, setItem, removeItem } = P;
  P.getItem = function (this: Storage, key: string) {
    return getItem.call(this, demoKey(String(key)));
  };
  P.setItem = function (this: Storage, key: string, value: string) {
    setItem.call(this, demoKey(String(key)), value);
  };
  P.removeItem = function (this: Storage, key: string) {
    removeItem.call(this, demoKey(String(key)));
  };
}
