/**
 * Settings (APP_DATA_CONTRACTS_V0.md §6.6): the single 'settings' document.
 */
import { z } from 'zod';
import { DocBaseSchema } from './document';
import { IanaTzSchema, LocalTimeSchema, UtcTsSchema, WeekdaySchema } from './primitives';

export const SettingsSchema = DocBaseSchema.extend({
  type: z.literal('settings'),
  id: z.literal('settings'),
  tz: IanaTzSchema,
  units: z.literal('lb'),
  sound_rest_end: z.boolean(),
  /** D-082 */
  ask_sleep_and_fueling_every_time: z.boolean(),
  technical_details: z.boolean(),
  /** null = pack default (D-112) */
  alloy_schedule: z.array(z.object({ weekday: WeekdaySchema, start: LocalTimeSchema })).nullable(),
  setup_completed_at: UtcTsSchema.nullable(),
  last_export_at: UtcTsSchema.nullable(),
  device_label: z.string().min(1),
});
export type Settings = z.infer<typeof SettingsSchema>;
