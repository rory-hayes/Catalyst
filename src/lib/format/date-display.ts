const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  dateStyle: "short",
  timeStyle: "short",
});

function parseDateInput(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatDateDisplay(value: string | Date | null | undefined, fallback = "-"): string {
  const parsed = parseDateInput(value);
  return parsed ? DATE_FORMATTER.format(parsed) : fallback;
}

export function formatDateTimeDisplay(value: string | Date | null | undefined, fallback = "-"): string {
  const parsed = parseDateInput(value);
  return parsed ? DATE_TIME_FORMATTER.format(parsed) : fallback;
}
