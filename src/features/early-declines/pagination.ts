export function parseEarlyDeclinePage(value: unknown): number {
  return typeof value === "string" && /^[1-9][0-9]{0,5}$/.test(value) ? Number(value) : 1;
}
