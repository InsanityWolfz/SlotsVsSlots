/**
 * THE LEADERBOARDS: Supabase's REST API over plain fetch (no SDK). Boards:
 *   "all"            every finished run (not the tutorial),
 *   "daily:<day>"    THE DAILY RUN of that day,
 *   "weekly:<week>"  THE WEEKLY CHALLENGE of that week (your best try; every try is posted, the board keeps the top).
 * Everything here fails soft: offline, a timeout or a bad answer just means no board / not submitted.
 */
import type { CabinetId } from '../core/cabinets';
import { online, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export interface ScoreRow {
  name: string;
  title: string;
  board: string;
  score: number;
  cabinet: CabinetId;
  stake: number;
  won: boolean;
  level: number;
  /** Sent with a score (it proves the name is yours); the boards never send it back. */
  pid?: string;
  created_at?: string;
}

const TIMEOUT_MS = 6000;

async function call(path: string, init: RequestInit = {}, prefer?: string): Promise<Response | null> {
  if (!online()) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      signal: ctl.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Post a score. Resolves to its rank on the board (1 = top), or null if it didn't go up. */
export async function submitScore(row: ScoreRow): Promise<number | null> {
  const res = await call('scores', { method: 'POST', body: JSON.stringify(row) }, 'return=minimal');
  if (!res?.ok) return null;
  return rankOf(row.board, row.score);
}

/** How many scores on the board beat this one, plus one. */
export async function rankOf(board: string, score: number): Promise<number | null> {
  const res = await call(`scores?select=score&board=eq.${encodeURIComponent(board)}&score=gt.${Math.floor(score)}`, { method: 'HEAD' }, 'count=exact');
  const range = res?.headers.get('content-range'); // "*/42"
  const n = range ? Number(range.split('/')[1]) : NaN;
  return Number.isFinite(n) ? n + 1 : null;
}

/** The board's top rows, one per player (their best), highest first. */
export async function topScores(board: string, limit = 10): Promise<ScoreRow[] | null> {
  // Over-fetch, then keep each player's best (a player can post many runs on "all" and many weekly tries). A name
  // belongs to one player, so names stand in for players.
  const res = await call(`scores?select=name,title,board,score,cabinet,stake,won,level,created_at&board=eq.${encodeURIComponent(board)}&order=score.desc&limit=${limit * 5}`);
  if (!res?.ok) return null;
  try {
    const rows = (await res.json()) as ScoreRow[];
    const seen = new Set<string>();
    return rows.filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true))).slice(0, limit);
  } catch {
    return null;
  }
}

/**
 * Claim a name for this player id. 'ok' (yours now, or already yours), 'taken' (someone else's), 'have:<NAME>' (this
 * player already owns another name), or 'offline' (no backend: the name is kept locally and claimed later).
 */
export async function claimName(name: string, pid: string): Promise<string> {
  const res = await call('rpc/claim_name', { method: 'POST', body: JSON.stringify({ p_name: name, p_pid: pid }) });
  if (!res?.ok) return 'offline';
  try {
    const r = (await res.json()) as unknown;
    return typeof r === 'string' ? r : 'offline';
  } catch {
    return 'offline';
  }
}
