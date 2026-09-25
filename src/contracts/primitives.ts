/**
 * Primitive types (APP_DATA_CONTRACTS_V0.md §1.2) as Zod schemas. Types are inferred
 * from these schemas (D-099); nothing here is hand-duplicated as a TS `interface`.
 */
import { z } from 'zod';

/** ISO 8601 UTC with milliseconds and 'Z'. */
export const UtcTsSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)) && /Z$/.test(v), { message: 'Expected an ISO 8601 UTC timestamp ending in Z' });
export type UtcTs = z.infer<typeof UtcTsSchema>;

/** "YYYY-MM-DD" in settings.tz. */
export const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export type LocalDate = z.infer<typeof LocalDateSchema>;

/** "HH:mm". */
export const LocalTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');
export type LocalTime = z.infer<typeof LocalTimeSchema>;

/** "America/Los_Angeles" and the like. Validated by construction (Intl throws on a bad zone). */
export const IanaTzSchema = z.string().refine(
  (v) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: v });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Not a recognized IANA time zone' },
);
export type IanaTz = z.infer<typeof IanaTzSchema>;

export const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+/, 'Expected a semantic version');
export type SemVer = z.infer<typeof SemVerSchema>;

/** 16 lowercase hex chars, FNV-1a 64 over canonical JSON. */
export const Hash64Schema = z.string().regex(/^[0-9a-f]{16}$/, 'Expected 16 lowercase hex chars');
export type Hash64 = z.infer<typeof Hash64Schema>;

/** Environment load unit (lb in V0); >= 0; multiple of 0.5. */
export const LoadSchema = z
  .number()
  .nonnegative()
  .refine((v) => Number.isInteger(v * 2), { message: 'Load must be a multiple of 0.5' });
export type Load = z.infer<typeof LoadSchema>;

/** <= 2 decimal places. */
export const MinutesSchema = z
  .number()
  .refine((v) => Math.round(v * 100) === v * 100, { message: 'Minutes must have at most 2 decimal places' });
export type Minutes = z.infer<typeof MinutesSchema>;

export const IntSchema = z.number().int();
export type Int = z.infer<typeof IntSchema>;

export const WeekdaySchema = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
export type Weekday = z.infer<typeof WeekdaySchema>;
