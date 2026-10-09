export function shortAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// UTC on both server and client so SSR output matches hydration.
export function formatTimeUtc(iso: string) {
  return timeFormat.format(new Date(iso));
}

export function formatDateTimeUtc(iso: string) {
  return `${dateTimeFormat.format(new Date(iso))} UTC`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
