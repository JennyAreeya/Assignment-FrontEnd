export function bankersRound(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  const n = value * factor;
  const f = Math.floor(n);
  const diff = n - f;

  const EPS = 1e-10;
  if (diff > 0.5 + EPS) return Math.round(n) / factor;
  if (diff < 0.5 - EPS) return f / factor;

  // tie .5 => round to even
  return (f % 2 === 0 ? f : f + 1) / factor;
}

export function clampNonNeg(n: number) {
  return n < 0 ? 0 : n;
}

// แปลงเป็นสตางค์
export function toCents(n: number) {
  return Math.round(bankersRound(n, 2) * 100);
}
export function fromCents(cents: number) {
  return bankersRound(cents / 100, 2);
}
