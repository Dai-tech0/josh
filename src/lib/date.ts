// 日付ユーティリティ（ローカルタイムゾーンで yyyy-mm-dd 文字列として扱う）

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function dayOfWeek(iso: string): number {
  return parseISODate(iso).getDay(); // 0=日 ... 6=土
}

export function isBefore(a: string, b: string): boolean {
  return a < b;
}

export function isAfter(a: string, b: string): boolean {
  return a > b;
}

export function isWithinRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export function weekdayLabel(iso: string): string {
  return WEEKDAY_LABELS[dayOfWeek(iso)];
}

export function formatDateJP(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}(${weekdayLabel(iso)})`;
}
