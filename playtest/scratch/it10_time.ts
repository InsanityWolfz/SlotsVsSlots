import { snapshotsAt, fullRuns, P } from './it10_lib';
let t = Date.now(); const s = snapshotsAt('knight', 100); console.log('snap100', s.length, Date.now() - t);
t = Date.now(); const r = fullRuns('knight', P.commit, 100, 0); console.log('full100', r.filter(x=>x.won).length, Date.now() - t);
