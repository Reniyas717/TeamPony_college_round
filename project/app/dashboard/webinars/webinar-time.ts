function partsAt(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
}

function parseLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid local date and time.");
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wall);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute) throw new Error("Enter a valid local date and time.");
  return { year, month, day, hour, minute, wall };
}

export function localTimeInZoneToIso(value: string, timezone: string) {
  const target = parseLocal(value);
  const offsets = new Set<number>();
  for (let hours = -48; hours <= 48; hours += 6) {
    const probe = new Date(target.wall + hours * 3600000);
    const p = partsAt(probe, timezone);
    const localAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    offsets.add(localAsUtc - probe.getTime());
  }
  const matches: number[] = [];
  for (const offset of offsets) {
    const candidate = target.wall - offset;
    const p = partsAt(new Date(candidate), timezone);
    if (Number(p.year) === target.year && Number(p.month) === target.month && Number(p.day) === target.day && Number(p.hour) === target.hour && Number(p.minute) === target.minute) matches.push(candidate);
  }
  if (!matches.length) throw new Error("That local time does not exist in the selected timezone because of a clock change.");
  if (matches.length > 1) throw new Error("That local time occurs twice in the selected timezone. Choose a different start time.");
  return new Date(matches[0]).toISOString();
}

export function isoToLocalTimeInZone(value: string | null | undefined, timezone: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = partsAt(date, timezone);
  return p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute;
}
