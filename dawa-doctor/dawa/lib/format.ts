export const TZ = "Africa/Tunis";

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  });
}
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}
export function fmtWait(hours: number) {
  if (hours < 24) return `about ${hours} hour${hours === 1 ? "" : "s"}`;
  const d = Math.round(hours / 24);
  return `about ${d} day${d === 1 ? "" : "s"}`;
}
export function fmtKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
export function fmtMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}
export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
