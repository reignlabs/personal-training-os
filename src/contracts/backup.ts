/**
 * Backup file (APP_DATA_CONTRACTS_V0.md §9): a self-contained JSON export via the
 * share sheet (D-107). Import replaces everything, with confirmation.
 */
import { z } from 'zod';
import { Hash64Schema, IntSchema, SemVerSchema, UtcTsSchema } from './primitives';
import { DatapackSchema } from './datapack';
import { PackHistorySchema } from './packHistory';
import { SettingsSchema } from './settings';
import { CheckInSchema } from './checkIn';
import { GenerationSchema } from './generation';
import { WorkoutSchema } from './workout';
import { ExternalSessionSchema } from './externalSession';
import { UserActionEventSchema } from './event';

export const BackupSchema = z.object({
  format: z.literal('pto-backup'),
  app_schema_version: IntSchema,
  contract_version: SemVerSchema,
  exported_at: UtcTsSchema,
  app_version: SemVerSchema,
  engine_version: SemVerSchema,
  device_label: z.string().min(1),
  datapack: DatapackSchema,
  pack_history: PackHistorySchema,
  settings: SettingsSchema,
  documents: z.object({
    check_ins: z.array(CheckInSchema),
    generations: z.array(GenerationSchema),
    workouts: z.array(WorkoutSchema),
    external_sessions: z.array(ExternalSessionSchema),
    events: z.array(UserActionEventSchema),
  }),
  counts: z.object({
    check_ins: IntSchema,
    generations: IntSchema,
    workouts: IntSchema,
    external_sessions: IntSchema,
    events: IntSchema,
  }),
  state_digest: Hash64Schema,
});
export type Backup = z.infer<typeof BackupSchema>;
