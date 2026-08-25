export function formatLocalDate(value: string, locale: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function formatLocalDateTime(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
