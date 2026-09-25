/**
 * Externally logged Alloy sessions (§L). L.2's missing-session prompt, L.3's crediting
 * table, and the L.4 data-hygiene rules that affect engine state (merge-on-replay is
 * driven from here; the two-logs-on-one-date tie-break itself is a pure helper any
 * caller — including a future replay/rebuild — can use). Pure: no clock reads (`now` is
 * always an argument), no randomness.
 */
import type { EngineConfigValues, Family, UtcTs } from '../contracts';
import type { GeneratorState } from './types';
import { cloneState, latestTs } from './state';
import { creditFamily, creditParent } from './credit';
import { addHours, addMinutes, localDateTimeToUtc, localWeekday, type IanaTz, type LocalDate } from '../domain/time';

// ---------- L.2 missing-session prompt ----------

export interface AlloyScheduleEntry {
  weekday: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  start: string; // "HH:mm"
}

export interface ScheduledSlot {
  /** = local_date of the scheduled class; also the `alloy_resolved` map key */
  slotKey: string;
  localDate: LocalDate;
  scheduledAtUtc: UtcTs;
  weekday: AlloyScheduleEntry['weekday'];
}

/** Every ALLOY_SCHEDULE occurrence in the last `lookbackHours`, oldest first. */
export function scheduledSlotsInLookback(now: UtcTs, tz: IanaTz, lookbackHours: number, schedule: AlloyScheduleEntry[]): ScheduledSlot[] {
  const slots: ScheduledSlot[] = [];
  const daysBack = Math.ceil(lookbackHours / 24) + 1;
  // Walk local calendar dates (not UTC-ms days, which can shift under tz offsets).
  const cursorLocalDate = localDateFloor(now, tz);
  for (let d = 0; d <= daysBack; d++) {
    const localDate = addDaysToLocalDate(cursorLocalDate, -d);
    for (const entry of schedule) {
      const weekdayOfDate = weekdayOfLocalDate(localDate, tz);
      if (weekdayOfDate !== entry.weekday) continue;
      const scheduledAtUtc = localDateTimeToUtc(localDate, entry.start, tz);
      const hoursAgo = (Date.parse(now) - Date.parse(scheduledAtUtc)) / (1000 * 60 * 60);
      if (hoursAgo < 0 || hoursAgo > lookbackHours) continue;
      slots.push({ slotKey: localDate, localDate, scheduledAtUtc, weekday: entry.weekday });
    }
  }
  slots.sort((a, b) => Date.parse(a.scheduledAtUtc) - Date.parse(b.scheduledAtUtc));
  return slots;
}

function localDateFloor(now: UtcTs, tz: IanaTz): LocalDate {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = dtf.formatToParts(new Date(Date.parse(now)));
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

function addDaysToLocalDate(localDate: LocalDate, days: number): LocalDate {
  const [y, m, d] = localDate.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d + days);
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function weekdayOfLocalDate(localDate: LocalDate, tz: IanaTz): AlloyScheduleEntry['weekday'] {
  // noon avoids any DST-boundary ambiguity for the weekday read alone
  const noonUtc = localDateTimeToUtc(localDate, '12:00', tz);
  return localWeekday(noonUtc, tz);
}

export interface PromptCandidate extends ScheduledSlot {
  status: 'LOGGED' | 'SKIPPED' | 'UNKNOWN' | 'UNRESOLVED';
}

/** §L.2: which scheduled slots to prompt about, newest first, capped at ALLOY_MAX_PROMPTS. */
export function promptsDue(
  now: UtcTs,
  tz: IanaTz,
  config: EngineConfigValues,
  schedule: AlloyScheduleEntry[],
  alloyResolved: Record<string, 'LOGGED' | 'SKIPPED' | 'UNKNOWN'>,
  hasAlloyLogOnDate: (localDate: LocalDate) => boolean,
): ScheduledSlot[] {
  const slots = scheduledSlotsInLookback(now, tz, config.ALLOY_PROMPT_LOOKBACK_HOURS, schedule);
  const due = slots.filter((s) => {
    const resolved = alloyResolved[s.slotKey];
    if (resolved === 'LOGGED' || resolved === 'SKIPPED') return false;
    if (hasAlloyLogOnDate(s.localDate)) return false;
    return true;
  });
  due.sort((a, b) => Date.parse(b.scheduledAtUtc) - Date.parse(a.scheduledAtUtc)); // newest first
  return due.slice(0, config.ALLOY_MAX_PROMPTS);
}

export type AlloyPromptAnswer = 'yes' | 'no' | 'unsure';

export interface AlloyPromptLogPayload {
  local_date: LocalDate;
  performed_at: UtcTs;
  ended_at: UtcTs;
  focus: 'full';
  log_mode: 'SUMMARY';
  source: 'CHECKIN_PROMPT';
}

export interface ResolvePromptResult {
  state: GeneratorState;
  /** present only when answer === 'yes' — caller persists this as an ExternalSession(ALLOY) doc */
  logToCreate: AlloyPromptLogPayload | null;
}

/** §L.2 [M-15]: recovery_end = scheduled start + ALLOY_DEFAULT_DURATION_MINUTES + ALLOY_TIME_UNCERTAINTY_HOURS. */
export function resolveAlloyPrompt(state: GeneratorState, slot: ScheduledSlot, answer: AlloyPromptAnswer, config: EngineConfigValues): ResolvePromptResult {
  const next = cloneState(state);
  const recoveryEnd = addHours(addMinutes(slot.scheduledAtUtc, config.ALLOY_DEFAULT_DURATION_MINUTES), config.ALLOY_TIME_UNCERTAINTY_HOURS);

  if (answer === 'yes') {
    const endedAt = addMinutes(slot.scheduledAtUtc, config.ALLOY_DEFAULT_DURATION_MINUTES);
    next.alloy_resolved[slot.slotKey] = 'LOGGED';
    addRecoveryCredit(next, recoveryEnd);
    return {
      state: next,
      logToCreate: { local_date: slot.localDate, performed_at: slot.scheduledAtUtc, ended_at: endedAt, focus: 'full', log_mode: 'SUMMARY', source: 'CHECKIN_PROMPT' },
    };
  }
  if (answer === 'no') {
    next.alloy_resolved[slot.slotKey] = 'SKIPPED';
    return { state: next, logToCreate: null };
  }
  // 'unsure' or dismissed without an answer
  next.alloy_resolved[slot.slotKey] = 'UNKNOWN';
  addRecoveryCredit(next, recoveryEnd);
  return { state: next, logToCreate: null };
}

function addRecoveryCredit(state: GeneratorState, ts: UtcTs): void {
  if (!state.recovery_credits.includes(ts)) state.recovery_credits.push(ts);
}

// ---------- L.3 crediting ----------

export interface AlloyLogForCrediting {
  ended_at: UtcTs;
  log_mode: 'SUMMARY' | 'FULL';
  focus: 'full' | 'upper' | 'lower';
  /** FULL only: families tagged on >= 1 item */
  familiesTagged: Family[];
  /** FULL only: exercise_ids carried by items with a library exercise_id */
  exerciseIdsUsed: string[];
}

/** §L.3 (FIXED). Alloy logs never set family_last_primary/parent_last_primary (§B.3) and
 * never touch progression lines, anchors, preferences, or holds (§L.1, D-025). */
export function creditAlloyLog(state: GeneratorState, log: AlloyLogForCrediting): GeneratorState {
  const next = cloneState(state);
  const ts = log.ended_at;

  if (log.focus === 'full') {
    creditParent(next, 'LOWER', ts);
    creditParent(next, 'PUSH', ts);
    creditParent(next, 'PULL', ts);
  } else if (log.focus === 'upper') {
    creditParent(next, 'PUSH', ts);
    creditParent(next, 'PULL', ts);
  } else if (log.focus === 'lower') {
    creditParent(next, 'LOWER', ts);
  }

  if (log.log_mode === 'FULL') {
    for (const family of log.familiesTagged) {
      // CORE, CARRY, GOAL_ACCESSORY, MOBILITY, CONDITIONING are never credited from
      // Alloy summaries/logs (§L.3) — only the six main families carry a repeat rule
      // and a staleness ordering that Alloy participation should inform.
      if (['ANTI_EXT', 'ANTI_ROT', 'ANTI_LAT', 'CARRY', 'GOAL_ACCESSORY', 'MOBILITY', 'CONDITIONING'].includes(family)) continue;
      creditFamily(next, family, ts);
    }
    for (const exerciseId of log.exerciseIdsUsed) {
      next.exercise_last_used[exerciseId] = latestTs(next.exercise_last_used[exerciseId], ts) ?? ts;
    }
  }

  return next;
}

// ---------- L.4 data hygiene ----------

export interface AlloyLogSummary {
  local_date: LocalDate;
  log_mode: 'SUMMARY' | 'FULL';
  ended_at: UtcTs;
}

/** §L.4: two Alloy logs on the same local date merge — FULL wins over SUMMARY; the
 * later ended_at is kept. Pure decision helper; the caller applies it to its document
 * store (or during replay). */
export function mergeSameDateAlloyLogs(a: AlloyLogSummary, b: AlloyLogSummary): AlloyLogSummary {
  if (a.local_date !== b.local_date) throw new Error('mergeSameDateAlloyLogs: local_date mismatch');
  const modeWinner = a.log_mode === b.log_mode ? null : a.log_mode === 'FULL' ? a : b;
  const base = modeWinner ?? a;
  const other = modeWinner === a ? b : a;
  return { ...base, ended_at: Date.parse(base.ended_at) >= Date.parse(other.ended_at) ? base.ended_at : other.ended_at };
}
