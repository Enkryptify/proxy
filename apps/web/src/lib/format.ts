const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDuration(ms: number): string {
  if (ms < 1) return "<1 ms";
  if (ms < 1000) return `${decimalFormatter.format(ms)} ms`;
  return `${decimalFormatter.format(ms / 1000)} s`;
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return dateTimeFormatter.format(d);
}

export function formatRelative(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
