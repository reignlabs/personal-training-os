/**
 * Time module over Intl.DateTimeFormat (APP_TECH_ARCHITECTURE_V0.md §3).
 * All timestamps are UTC instants (ISO 8601 with milliseconds and 'Z'); "local date"
 * means the date in settings.tz (ENGINE_WORKOUT_GENERATOR_V0_2_1.md, Conventions: Time).
 * No function here reads the system clock — `now` is always an argument (engine §5.1).
 */

export type UtcTs = string;
export type LocalDate = string; // "YYYY-MM-DD"
export type LocalTime = string; // "HH:mm"
export type IanaTz = string;

function assertValidTz(tz: IanaTz): void {
  // Throws RangeError for an unknown zone; this is the only validation we need.
  new Intl.DateTimeFormat('en-US', { timeZone: tz });
}

function partsOf(ms: number, tz: IanaTz): Record<string, string> {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const out: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = p.value;
  }
  return out;
}

/** The local calendar date (YYYY-MM-DD) of a UTC instant in the given zone. */
export function toLocalDate(utcTs: UtcTs, tz: IanaTz): LocalDate {
  assertValidTz(tz);
  const p = partsOf(Date.parse(utcTs), tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** The local wall-clock time (HH:mm) of a UTC instant in the given zone. */
export function toLocalTime(utcTs: UtcTs, tz: IanaTz): LocalTime {
  assertValidTz(tz);
  const p = partsOf(Date.parse(utcTs), tz);
  return `${p.hour}:${p.minute}`;
}

/**
 * The zone's UTC offset (in minutes, local minus UTC) at the given UTC instant.
 * Positive east of UTC. Used internally to convert local wall time to a UTC instant.
 */
function offsetMinutesAt(ms: number, tz: IanaTz): number {
  const p = partsOf(ms, tz);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return (asUtc - ms) / 60000;
}

/**
 * Converts a local date + time in `tz` to the UTC instant it denotes. Correct across
 * DST transitions (spring-forward / fall-back) by iterating the offset lookup twice.
 * During a fall-back repeated hour, returns the first (earlier) UTC occurrence, which
 * is the ambiguity-resolution Intl itself would produce from a naive read.
 */
export function localDateTimeToUtc(localDate: LocalDate, localTime: LocalTime, tz: IanaTz): UtcTs {
  assertValidTz(tz);
  const naiveMs = Date.parse(`${localDate}T${localTime}:00.000Z`);
  if (Number.isNaN(naiveMs)) {
    throw new RangeError(`Invalid local date/time: ${localDate}T${localTime}`);
  }
  let guessMs = naiveMs;
  // Two iterations converge even when the first guess lands in a different UTC-offset
  // regime than the true instant (i.e. right around a DST boundary).
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutesAt(guessMs, tz);
    guessMs = naiveMs - offset * 60000;
  }
  return new Date(guessMs).toISOString();
}

/** Hours between two UTC instants (to = now, from = earlier event), as a real number. */
export function hoursBetween(fromUtc: UtcTs, toUtc: UtcTs): number {
  return (Date.parse(toUtc) - Date.parse(fromUtc)) / (1000 * 60 * 60);
}

/** Calendar-day difference between two local dates (to − from), signed. */
export function calendarDaysBetween(fromLocalDate: LocalDate, toLocalDate: LocalDate): number {
  const [fy, fm, fd] = fromLocalDate.split('-').map(Number);
  const [ty, tm, td] = toLocalDate.split('-').map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

/** Adds `days` calendar days to a local date, returning a local date. */
export function addLocalDays(localDate: LocalDate, days: number): LocalDate {
  const [y, m, d] = localDate.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d + days);
  const dt = new Date(ms);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Adds `minutes` to a UTC instant. */
export function addMinutes(utcTs: UtcTs, minutes: number): UtcTs {
  return new Date(Date.parse(utcTs) + minutes * 60000).toISOString();
}

/** Adds `hours` to a UTC instant. */
export function addHours(utcTs: UtcTs, hours: number): UtcTs {
  return addMinutes(utcTs, hours * 60);
}

/** True if `a` is chronologically before `b`. */
export function isBefore(a: UtcTs, b: UtcTs): boolean {
  return Date.parse(a) < Date.parse(b);
}

/** Weekday abbreviation (MON..SUN) of a UTC instant in the given zone. */
export function localWeekday(
  utcTs: UtcTs,
  tz: IanaTz,
): 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN' {
  assertValidTz(tz);
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const short = dtf.format(new Date(Date.parse(utcTs))).toUpperCase(); // "Mon" -> "MON"
  const map: Record<string, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'> = {
    MON: 'MON',
    TUE: 'TUE',
    WED: 'WED',
    THU: 'THU',
    FRI: 'FRI',
    SAT: 'SAT',
    SUN: 'SUN',
  };
  const key = short.slice(0, 3);
  const out = map[key];
  if (!out) throw new RangeError(`Unrecognized weekday: ${short}`);
  return out;
}
