/** Local-storage persistence: leaderboard of fastest runs + mute preference. */

import { SAVE_KEYS } from '../config';

export interface BoardEntry { timeMs: number; date: string; }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — scores just won't persist */
  }
}

export function getBoard(): BoardEntry[] {
  return read<BoardEntry[]>(SAVE_KEYS.board, []);
}

/** Record a winning run. Returns the entry's rank (0-based) or -1 if off-board. */
export function recordWin(timeMs: number): number {
  const board = getBoard();
  const entry: BoardEntry = { timeMs, date: new Date().toLocaleDateString() };
  board.push(entry);
  board.sort((a, b) => a.timeMs - b.timeMs);
  const top = board.slice(0, 5);
  write(SAVE_KEYS.board, top);
  return top.indexOf(entry);
}

export function getBest(): number | null {
  const b = getBoard();
  return b.length ? b[0].timeMs : null;
}

export function getMuted(): boolean {
  return read<boolean>(SAVE_KEYS.muted, false);
}

export function setMuted(m: boolean): void {
  write(SAVE_KEYS.muted, m);
}

export function getMusicMuted(): boolean {
  return read<boolean>(SAVE_KEYS.musicMuted, false);
}

export function setMusicMuted(m: boolean): void {
  write(SAVE_KEYS.musicMuted, m);
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}
