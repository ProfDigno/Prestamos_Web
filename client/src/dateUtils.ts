export function isoDateToDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function displayDateToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    candidate.getFullYear() !== Number(year) ||
    candidate.getMonth() !== Number(month) - 1 ||
    candidate.getDate() !== Number(day)
  ) return null;
  return `${year}-${month}-${day}`;
}

export function todayDisplayDate(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}
