/**
 * Pack loader: metadata load-time validators V-00a to V-00g (§Q.1.2, [M-17]). Runs once
 * per pack load, not per generation (§Q.1.2 header note). Pure: takes raw rows and the
 * set of known equipment IDs, returns the admitted pool plus rejection/repair notices.
 */
import { ExerciseMetadataSchema, type ExerciseMetadata, type Family } from '../contracts';

/** A pool row: like ExerciseMetadata, but `family` is guaranteed non-null (V-00b passed). */
export type PoolExercise = Omit<ExerciseMetadata, 'family'> & { family: Family };

export interface MetadataNotice {
  exercise_id: string;
  validator: 'V-00a' | 'V-00b' | 'V-00c' | 'V-00d' | 'V-00e' | 'V-00f' | 'V-00g';
}

export interface PoolLoadResult {
  pool: PoolExercise[];
  /** Rows excluded from the pool entirely (V-00a, b, d, f, g). */
  rejected: MetadataNotice[];
  /** Rows kept but auto-repaired (V-00c: PRIMARY removed from roles_allowed). */
  repaired: MetadataNotice[];
}

function computeHeavyLower(row: { family: string | null; laterality: string; load_mode: string; position_tags: string[] }): boolean {
  return (
    (row.family === 'KD' || row.family === 'HD') &&
    row.laterality === 'BILATERAL' &&
    row.load_mode === 'EXTERNAL_LOAD' &&
    !row.position_tags.includes('ballistic')
  );
}

/**
 * Loads and validates raw metadata rows. Throws only for V-00e (duplicate
 * `default_order` within a family), which is a configuration error the spec says
 * refuses the whole load, not a per-row rejection.
 */
export function loadPool(rawRows: unknown[], knownEquipmentIds: ReadonlySet<string>): PoolLoadResult {
  const rejected: MetadataNotice[] = [];
  const repaired: MetadataNotice[] = [];
  const accepted: PoolExercise[] = [];

  for (const raw of rawRows) {
    // V-00a: every required field present with a value from its vocabulary.
    const parsed = ExerciseMetadataSchema.safeParse(raw);
    if (!parsed.success) {
      const exerciseId =
        raw && typeof raw === 'object' && 'exercise_id' in raw && typeof (raw as { exercise_id: unknown }).exercise_id === 'string'
          ? (raw as { exercise_id: string }).exercise_id
          : 'UNKNOWN';
      rejected.push({ exercise_id: exerciseId, validator: 'V-00a' });
      continue;
    }
    const row = parsed.data;

    // V-00b: family not null.
    if (row.family === null) {
      rejected.push({ exercise_id: row.exercise_id, validator: 'V-00b' });
      continue;
    }

    // V-00d: heavy_lower must equal the §Q.1.1 formula.
    if (row.heavy_lower !== computeHeavyLower(row)) {
      rejected.push({ exercise_id: row.exercise_id, validator: 'V-00d' });
      continue;
    }

    // V-00f: equipment_options non-empty; every equipment ID must be known.
    if (row.equipment_options.length === 0 || row.equipment_options.some((set) => set.some((id) => !knownEquipmentIds.has(id)))) {
      rejected.push({ exercise_id: row.exercise_id, validator: 'V-00f' });
      continue;
    }

    // V-00g: MOBILITY rows whose hands bear weight must carry UPPER soreness.
    if (row.roles_allowed.includes('MOBILITY') && row.hand_support !== 'NONE' && !row.sore_regions.includes('UPPER')) {
      rejected.push({ exercise_id: row.exercise_id, validator: 'V-00g' });
      continue;
    }

    // V-00c: PRIMARY requires (EXTERNAL_LOAD, or family VPULL) and no ballistic/impact — repair, not reject.
    let rolesAllowed = row.roles_allowed;
    if (rolesAllowed.includes('PRIMARY')) {
      const primaryOk =
        (row.load_mode === 'EXTERNAL_LOAD' || row.family === 'VPULL') &&
        !row.position_tags.includes('ballistic') &&
        !row.position_tags.includes('impact');
      if (!primaryOk) {
        rolesAllowed = rolesAllowed.filter((r) => r !== 'PRIMARY');
        repaired.push({ exercise_id: row.exercise_id, validator: 'V-00c' });
      }
    }

    accepted.push({ ...row, family: row.family, roles_allowed: rolesAllowed });
  }

  // V-00e: default_order values unique within each family — a configuration error, not a per-row rejection.
  const byFamily = new Map<Family, Map<number, string[]>>();
  for (const row of accepted) {
    let orders = byFamily.get(row.family);
    if (!orders) {
      orders = new Map();
      byFamily.set(row.family, orders);
    }
    const list = orders.get(row.default_order) ?? [];
    list.push(row.exercise_id);
    orders.set(row.default_order, list);
  }
  for (const [family, orders] of byFamily) {
    for (const [order, ids] of orders) {
      if (ids.length > 1) {
        throw new Error(
          `V-00e: duplicate default_order ${order} within family ${family} (${ids.join(', ')}) — engine refuses to load`,
        );
      }
    }
  }

  return { pool: accepted, rejected, repaired };
}
