// Isomorphic display helpers for ledger data (hashes, blocks, ages).

/** `0x1f9a2b…c3d4e5f6`: the same middle ellipsis as the Mono component. */
export function shortHash(value: string): string {
  return value.length <= 24 ? value : `${value.slice(0, 10)}…${value.slice(-8)}`;
}

// locale fija: servidor y navegador imprimen el mismo texto
const LOCALE = 'es-VE';

/** `7.000.123`: block number grouped with the fixed locale. */
export function formatBlockNumber(blockNumber: number): string {
  return blockNumber.toLocaleString(LOCALE);
}

/** `Bloque 7.000.123`. */
export function formatBlock(blockNumber: number): string {
  return `Bloque ${formatBlockNumber(blockNumber)}`;
}

/** `hace 12 s`, `hace 3 min`, `hace 5 h`, `hace 2 d`; a timestamp in the future reads as `hace 0 s`. */
export function formatAge(unixSeconds: number, nowMs: number): string {
  const seconds = Math.max(0, Math.round(nowMs / 1000 - unixSeconds));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.round(hours / 24)} d`;
}
