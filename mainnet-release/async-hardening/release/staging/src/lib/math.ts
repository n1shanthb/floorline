export const SCALE = 10n ** 24n;
export const U128_MAX = (1n << 128n) - 1n;
export const U64_MAX = (1n << 64n) - 1n;
export function durationLabel(ns: string): string {
  const n = BigInt(ns);
  for (const [unit, scale] of [
    ["hours", 3600000000000n],
    ["minutes", 60000000000n],
    ["seconds", 1000000000n],
  ] as const) {
    if (n > 0n && n % scale === 0n) return `${n / scale} ${unit}`;
  }
  return `${n} nanoseconds`;
}
export function parseAmount(text: string): bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,24})?$/.test(text))
    throw new Error(
      "Enter a decimal amount with up to 24 places. No exponents or commas.",
    );
  const [whole, part = ""] = text.split(".");
  const n = BigInt(whole) * SCALE + BigInt(part.padEnd(24, "0"));
  if (n > U128_MAX) throw new Error("Amount exceeds the contract U128 limit.");
  return n;
}
export function units(n: bigint | string, places = 5): string {
  const value = BigInt(n),
    negative = value < 0n,
    a = negative ? -value : value;
  const fraction = (a % SCALE)
    .toString()
    .padStart(24, "0")
    .slice(0, places)
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${a / SCALE}${fraction ? "." + fraction : ""}`;
}
export function exact(n: bigint | string): string {
  return units(n, 24);
}
export function ratio(
  l: bigint | string,
  t: bigint | string,
  places = 8,
): string {
  return BigInt(t) === 0n
    ? "—"
    : units((BigInt(l) * SCALE) / BigInt(t), places);
}
export function quote(l: bigint, t: bigint, c: bigint, tax: bigint): bigint {
  if (
    l < 0n ||
    l > U128_MAX ||
    t <= 0n ||
    t > U128_MAX ||
    c <= 0n ||
    c > t ||
    tax < 0n ||
    tax >= 10000n
  )
    throw new Error("Invalid redemption amount or treasury state.");
  return (l * c * ((10000n - tax) * t + tax * c)) / (10000n * t * t);
}
export function issuance(d: bigint, l: bigint, t: bigint, num = 1n, den = 1n) {
  if (d <= 0n || num <= 0n || den <= 0n)
    throw new Error("Positive issuance required.");
  const minted = (d * num) / den;
  return {
    minted,
    allowed:
      minted > 0n &&
      minted <= U128_MAX &&
      l + d <= U128_MAX &&
      t + minted <= U128_MAX &&
      (t === 0n || d * t >= l * minted),
  };
}
export function canonicalId(s: string) {
  return /^(0|[1-9]\d*)$/.test(s) && BigInt(s) <= U64_MAX;
}
export function validAccount(s: string) {
  return (
    s.length >= 2 &&
    s.length <= 64 &&
    /^([a-z0-9]+[-_])*[a-z0-9]+(\.([a-z0-9]+[-_])*[a-z0-9]+)*$/.test(s)
  );
}
export function canRepay(
  loan: { state: number; owner: string; pending: number; expiry: string },
  account: string,
  nowNs: bigint,
) {
  return (
    loan.state === 1 &&
    loan.owner === account &&
    loan.pending === 0 &&
    nowNs < BigInt(loan.expiry)
  );
}
export const claimNames = [
  "Available",
  "In flight · outcome unresolved",
  "Known transfer failure",
  "Paid",
] as const;
export const loanNames = [
  "Open offer",
  "Active",
  "Repaid · NFT burned",
  "Defaulted · NFT burned",
  "Cancelled",
] as const;
