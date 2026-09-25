import { useState } from 'react';
import type { AppStore, AppSnapshot } from '../app/store';
import type { Availability } from '../contracts';
import { ChipGroup } from './components/Primitives';

/** EQUIPMENT: corrects availability/known loads/max confirmed load for one item at a
 * time, via the engine's own CONFIRM_EQUIPMENT mechanism (AppStore.confirmEquipment) —
 * layered over the pack's authored baseline as `equipment_overrides`, so a change here
 * is visible to the very next GENERATE call. station_group isn't editable here: the
 * pack's overrides carry it, but effectiveEquipmentMap() (the thing GENERATE actually
 * reads) doesn't merge it in V0, so exposing it here would imply an effect it doesn't
 * have. */
export function Equipment(props: { store: AppStore; snapshot: AppSnapshot }) {
  const { store, snapshot } = props;
  const catalog = store.getEquipmentCatalog();
  const equip = store.getEquip();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="screen screen--no-primary">
      <h1>Equipment</h1>
      <p className="muted">What&rsquo;s actually available at your gym right now. Corrections here apply to the next session you build.</p>

      {catalog.map((item) => {
        const eff = equip.get(item.equipment_id);
        const isOpen = openId === item.equipment_id;
        return (
          <div className="card" key={item.equipment_id}>
            <div className="list-row" onClick={() => setOpenId(isOpen ? null : item.equipment_id)}>
              <div>
                <div className="name">{item.display_name}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {availabilityLabel(eff?.availability ?? 'UNKNOWN')}
                  {eff?.loads ? ` · loads: ${eff.loads.join(', ')} lb` : ''}
                  {eff?.max_confirmed_load ? ` · max confirmed: ${eff.max_confirmed_load} lb` : ''}
                </div>
              </div>
              <span className="muted">{isOpen ? '−' : '+'}</span>
            </div>
            {isOpen && (
              <EquipmentEditor
                equipmentId={item.equipment_id}
                initial={eff ?? { availability: 'UNKNOWN', loads: null, max_confirmed_load: null }}
                onSave={async (patch) => {
                  await store.confirmEquipment({ equipmentId: item.equipment_id, ...patch });
                  setOpenId(null);
                }}
              />
            )}
          </div>
        );
      })}

      {Object.keys(snapshot.equipmentOverrides).length > 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          {Object.keys(snapshot.equipmentOverrides).length} item(s) have a correction on file, layered over the gym&rsquo;s baseline setup.
        </p>
      )}
    </div>
  );
}

function availabilityLabel(a: Availability): string {
  if (a === 'AVAILABLE') return 'Available';
  if (a === 'NOT_AVAILABLE') return 'Not available';
  return 'Unknown';
}

function EquipmentEditor(props: {
  equipmentId: string;
  initial: { availability: Availability; loads: number[] | null; max_confirmed_load: number | null };
  onSave: (patch: { availability: Availability; loads: number[] | null; maxConfirmedLoad: number | null }) => void;
}) {
  const [availability, setAvailability] = useState<Availability>(props.initial.availability);
  const [loadsText, setLoadsText] = useState(props.initial.loads ? props.initial.loads.join(', ') : '');
  const [maxLoadText, setMaxLoadText] = useState(props.initial.max_confirmed_load !== null ? String(props.initial.max_confirmed_load) : '');

  function parseLoads(): number[] | null {
    const nums = loadsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    return nums.length > 0 ? [...new Set(nums)].sort((a, b) => a - b) : null;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div className="field">
        <label>Availability</label>
        <ChipGroup
          options={[
            { value: 'AVAILABLE', label: 'Available' },
            { value: 'NOT_AVAILABLE', label: 'Not available' },
            { value: 'UNKNOWN', label: 'Unknown' },
          ]}
          value={availability}
          onChange={(v) => setAvailability(v as Availability)}
        />
      </div>
      <div className="field">
        <label>Known loads (lb, comma-separated — optional)</label>
        <input className="text-input" inputMode="decimal" placeholder="e.g. 20, 25, 30" value={loadsText} onChange={(e) => setLoadsText(e.target.value)} />
      </div>
      <div className="field">
        <label>Max confirmed load (lb — optional)</label>
        <input className="text-input" inputMode="decimal" placeholder="optional" value={maxLoadText} onChange={(e) => setMaxLoadText(e.target.value)} />
      </div>
      <button
        className="btn-secondary"
        onClick={() =>
          props.onSave({
            availability,
            loads: parseLoads(),
            maxConfirmedLoad: maxLoadText.trim() ? Number(maxLoadText) : null,
          })
        }
      >
        Save
      </button>
    </div>
  );
}
