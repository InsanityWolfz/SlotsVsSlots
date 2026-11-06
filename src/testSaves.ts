/**
 * SPIN CHOICES test build: its saves live under their own names, so playing it never touches the main game's
 * profile, settings or run (both builds share the site's storage). Imported first by main.ts.
 */
const PREFIX = 'spinchoices.';
const own = (k: string) => (k.startsWith('slotvslot.') ? PREFIX + k : k);
try {
  const s = Storage.prototype;
  const get = s.getItem;
  const set = s.setItem;
  const del = s.removeItem;
  s.getItem = function (k: string) {
    return get.call(this, own(k));
  };
  s.setItem = function (k: string, v: string) {
    set.call(this, own(k), v);
  };
  s.removeItem = function (k: string) {
    del.call(this, own(k));
  };
} catch {
  /* no storage */
}
export {};
