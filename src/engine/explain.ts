/**
 * Explainability (§J). J.2's reason-code enumerations are already the contract's own
 * enums (vocab.ts's FamilyReasonCode, SelectionReason, DecisionCode, UnderfillCause,
 * NoSessionReason) — nothing to re-declare here. This module is §J.3: the FIXED plain-
 * language templates that turn those codes into the three "Why" lines (movement,
 * exercise, dose), plus the underfill and NO_SESSION sentences that reuse the same
 * template style (§G.5, §I.2 / PRODUCT_UX_SPEC_V0.md §10.1).
 *
 * AMBIGUITY NOTE: the canonical spec gives J.3 templates for a representative subset of
 * each code list ("e.g."), not an exhaustive table. Every code in J.2's enumerations is
 * covered below; codes without a spec-given example (marked in comments) were authored
 * to match the voice and structure of the given examples — this is UI copy (SYSTEM_DESIGN),
 * not a new programming rule, and carries no evidence claim about Alloy.
 */
import type { DecisionCode, Family, FamilyReasonCode, NoSessionReason, SelectionReason, UnderfillCause } from '../contracts';

function fmtLoad(load: number | null): string {
  return load === null ? 'bodyweight' : `${load} lb`;
}

// ---------- Line 1: movement (family_reason_code) ----------

export interface MovementArgs {
  when?: string; // caller-formatted (e.g. "Mon", "yesterday")
  source?: string; // e.g. "Alloy", "here"
  n?: number;
  coldStart?: boolean; // LOWER_ROLE_ALTERNATION cold-start variant [M-01]
  family?: Family;
  pattern?: string; // human label for the family's movement pattern, e.g. "Hinging"
}

const PATTERN_LABEL: Partial<Record<Family, string>> = {
  KD: 'Squatting',
  HD: 'Hinging',
  HPUSH: 'Horizontal pressing',
  VPUSH: 'Overhead pressing',
  HPULL: 'Horizontal pulling',
  VPULL: 'Vertical pulling',
  ANTI_EXT: 'Anti-extension core work',
  ANTI_ROT: 'Anti-rotation core work',
  ANTI_LAT: 'Anti-lateral-flexion core work',
  CARRY: 'Carry work',
  GOAL_ACCESSORY: 'Goal accessory work',
  MOBILITY: 'Mobility work',
  CONDITIONING: 'Conditioning',
};

export function movementReasonText(code: FamilyReasonCode, args: MovementArgs = {}): string {
  const pattern = args.pattern ?? (args.family ? PATTERN_LABEL[args.family] : undefined) ?? 'This movement';
  const when = args.when ?? 'recently';
  const source = args.source ?? 'your history';
  switch (code) {
    case 'STALEST_LOWER':
      return `${pattern} is your least recently trained lower-body pattern (last: ${when}, ${source}).`;
    case 'STALEST_UPPER_PARENT': // no spec example; mirrors STALEST_LOWER's phrasing for the upper-body parent
      return `${pattern} is your least recently trained upper-body pattern (last: ${when}, ${source}).`;
    case 'LOWER_ROLE_ALTERNATION':
      return args.coldStart
        ? 'First session: squatting leads by default.'
        : `Squat and hinge were last trained together (${when}); ${pattern.toLowerCase()} led less recently, so it leads today.`;
    case 'UPPER_ROLE_ALTERNATION':
      return `Pushing and pulling were last trained together (${when}); ${pattern.toLowerCase()} led less recently, so it leads today.`;
    case 'OTHER_UPPER_PARENT': // no spec example; the non-leading upper parent's slot
      return `${pattern} fills the second upper-body slot today.`;
    case 'STALEST_CORE': // no spec example
      return `${pattern} is your least recently trained core pattern (last: ${when}, ${source}).`;
    case 'STALEST_C2': // no spec example; second core/carry slot
      return `${pattern} is next up for your second core-or-carry slot (last: ${when}, ${source}).`;
    case 'SORENESS_REPLACEMENT':
      return 'You said your lower body is too sore to load today, so this slot is core work.';
    case 'R04_SWAP':
      return 'You chose to swap pressing for core today because your right arm feels worse.';
    case 'CORE_STARVATION_SWAP':
      return `Short session, and no core work for ${args.n ?? 'several'} days, so core replaced the second strength pair.`;
    case 'FALLBACK_SIBLING': // no spec example
      return `${pattern} wasn't servable today, so its sibling pattern fills this slot instead.`;
    case 'FALLBACK_SAME_SIDE': // no spec example
      return `${pattern} wasn't servable today, so another pattern on the same side (${args.family ? FAMILY_TO_PARENT_LABEL(args.family) : 'this side'}) fills this slot instead.`;
    case 'FALLBACK_CORE': // no spec example
      return 'No strength pattern could fill this slot today, so core work fills it instead.';
    case 'FALLBACK_NEXT_IN_POOL': // no spec example
      return `${pattern} fills this slot from the next available option once the usual choices were unavailable.`;
    case 'SLOT_EMPTY': // no spec example
      return 'Nothing could fill this slot today, so it was left empty.';
    case 'FINISH_GOAL_ACCESSORY':
      return 'This finisher targets one of your personal goals.';
    case 'FINISH_CORE_OR_CARRY':
      return 'This finisher adds core or carry work that the main blocks did not cover.';
    case 'FINISH_CONDITIONING':
      return "This finisher is today's conditioning work.";
    case 'FINISH_MOBILITY':
      return 'This finisher is mobility work to close out the session.';
    default:
      return 'Chosen for today\'s session.';
  }
}

function FAMILY_TO_PARENT_LABEL(f: Family): string {
  return PATTERN_LABEL[f] ?? f;
}

// ---------- Line 2: exercise (selection.reason_code) ----------

export interface SelectionArgs {
  family?: Family;
  anchor?: string; // exercise name
  candidate?: string; // exercise name (SUBSTITUTE_NO_ANCHOR)
  reason?: string; // plain-language reason the candidate isn't a fit today
  other?: string; // STATION_RESELECT: the paired item's name
  firstChoice?: string; // STATION_RESELECT: this item's own first pick
  old?: string; // NEW_ANCHOR_ROTATION: exercise being replaced
  n?: number; // hours, for HF-12
}

/** Parses "SUBSTITUTE_FOR_ANCHOR(HF-12)" etc. into {base, inner}. */
function parseReason(code: SelectionReason): { base: string; inner: string | null } {
  const m = /^([A-Z_]+)(?:\((.+)\))?$/.exec(code);
  return { base: m?.[1] ?? code, inner: m?.[2] ?? null };
}

export function selectionReasonText(code: SelectionReason, args: SelectionArgs = {}): string {
  const { base, inner } = parseReason(code);
  const family = args.family ?? 'exercise';
  switch (base) {
    case 'ANCHOR':
      return `This is your current ${family} exercise; keeping it lets us track progress.`;
    case 'SUBSTITUTE_FOR_ANCHOR':
      if (inner === 'HF-11') return `You did ${args.anchor ?? 'your usual exercise'} yesterday, so this stands in today.`;
      if (inner === 'HF-12') return `Your legs were trained ${args.n ?? 'a few'} hours ago, so we're skipping heavier options like ${args.anchor ?? 'your usual exercise'}.`;
      if (inner === 'R-04') return `Your right arm feels worse, so today uses an option that loads it less than ${args.anchor ?? 'your usual exercise'}.`;
      // no spec example for other HF-ids substituting for an anchor
      return `${args.anchor ?? 'Your usual exercise'} isn't a fit today (${inner}), so this stands in.`;
    case 'SUBSTITUTE_NO_ANCHOR':
      return `${args.candidate ?? 'This exercise'} will become your regular ${family} exercise, but it's not a good fit today (${args.reason ?? inner}), so this stands in.`;
    case 'NEW_ANCHOR_NONE_PRIOR': // no spec example; §E "first pick, nothing to compare it to"
      return `You haven't had a regular ${family} exercise yet, so this one starts as your anchor.`;
    case 'STATION_RESELECT':
      return `${args.other ?? 'The other exercise in this pair'} and ${args.firstChoice ?? 'this one'} use different stations, so this keeps the pair together.`;
    case 'NEW_ANCHOR_ROTATION':
      if (inner === 'LOAD_CAPPED') return `You've outgrown the heaviest weight available for ${args.old ?? 'your previous exercise'}, so we're moving on.`;
      if (inner === 'DISLIKE') return `You marked ${args.old ?? 'your previous exercise'} as disliked, so we've switched.`;
      if (inner === 'EXPOSURES') return `You've done ${args.old ?? 'your previous exercise'} enough times in a row that it's time for a change.`; // no spec example
      if (inner === 'USER_REPLACE') return `You asked to replace ${args.old ?? 'your previous exercise'}, so this is your new regular pick.`; // no spec example
      return `Your regular ${family} exercise changed.`;
    case 'NEW_ANCHOR_BLOCKED': // no spec example
      return `Your usual ${family} exercise isn't available today (${inner}), so this becomes the new regular pick.`;
    case 'USER_SWAP': // no spec example
      return 'You swapped this in for today.';
    case 'USER_REPLACE': // no spec example
      return 'You replaced your regular exercise with this one.';
    default:
      return 'Chosen for this slot today.';
  }
}

/** note NO_ALTERNATIVE_FOR_DISLIKE, attached alongside the main selection reason when it applies. */
export const NO_ALTERNATIVE_FOR_DISLIKE_TEXT = "You marked this as disliked, but it's the only option available here right now.";

// ---------- Line 3: today's dose (progression code) ----------

export interface DoseArgs {
  target?: number;
  load?: number | null;
  otherRole?: string; // SEEDED
  unit?: 'REPS' | 'SECONDS';
}

function unitWord(unit: DoseArgs['unit'], n?: number): string {
  if (unit === 'SECONDS') return n === 1 ? 'second' : 'seconds';
  return n === 1 ? 'rep' : 'reps';
}

export function progressionReasonText(code: DecisionCode, args: DoseArgs = {}): string {
  switch (code) {
    case 'REPS_UP':
      return 'Same weight, one more rep: you hit every rep last time.';
    case 'HOLD':
      return 'Same as last time: you were a rep short.';
    case 'HOLD(REDUCE_LIMIT)':
      return 'Same as last time. We already lowered this once; tell us if it needs a review.';
    case 'CALIBRATE':
      return `First time: pick a weight where ${args.target ?? 'the target'} ${unitWord(args.unit, args.target)} feel GOOD.`;
    case 'SEEDED':
      return `Starting from your ${fmtLoad(args.load ?? null)} from the ${args.otherRole ?? 'other'} version, at ${args.target ?? 'the target'} ${unitWord(args.unit, args.target)}.`;
    case 'IMPLEMENT_CHANGED':
      return "Different equipment today, so use a similar weight; this won't count toward progression.";
    case 'RETURN': // no spec example; §H.7
      return `Back after a gap: same as last time, ${args.target ?? 'the target'} ${unitWord(args.unit, args.target)} at ${fmtLoad(args.load ?? null)}, to ease back in.`;
    case 'NOT_EVIDENCE': // no spec example
      return "Logged, but today's data doesn't count toward progression.";
    case 'REDUCE': // no spec example
      return 'A little lighter today: last time was too hard.';
    case 'CONFIRM_TOP': // no spec example
      return "Same weight again: one more clean set at the top of your range before we add weight.";
    case 'LOAD_UP': // no spec example
      return "Weight goes up today: you've earned it.";
    case 'EXTEND_RANGE': // no spec example
      return "No heavier option yet, so the rep range stretches a bit further.";
    case 'LOAD_CAPPED': // no spec example
      return "You've maxed out the weight available for this exercise; consider a harder variant when you're ready.";
    case 'AT_MINIMUM': // no spec example
      return "Already at the lightest option; holding here for now.";
    default:
      return "Today's dose is set from your history.";
  }
}

// ---------- Underfill sentence (§G.5) ----------

export function underfillSentence(cause: UnderfillCause, plannedMin: number, availableMin: number): string {
  switch (cause) {
    case 'TIER_MAXIMUM':
      return `This session is planned for about ${plannedMin} of your ${availableMin} minutes. Longer sessions aren't set up yet.`;
    case 'FIRST_SESSIONS': // no spec example; mirrors TIER_MAXIMUM's voice
      return `This session is planned for about ${plannedMin} of your ${availableMin} minutes while you're getting started.`;
    case 'LIGHT_POSTURE':
      return `This session is planned for about ${plannedMin} of your ${availableMin} minutes: today is a lighter day.`;
    case 'SLOTS_EMPTY':
      return `This session is planned for about ${plannedMin} of your ${availableMin} minutes: some slots couldn't be filled today.`;
    case 'TIER_BOUNDARY':
      return `This session is planned for about ${plannedMin} of your ${availableMin} minutes.`;
    default:
      return `This session is planned for about ${plannedMin} of your ${availableMin} minutes.`;
  }
}

// ---------- NO_SESSION sentence (§I.2 / PRODUCT_UX_SPEC_V0.md §10.1) ----------

export function noSessionSentence(reason: NoSessionReason, minutesRequested?: number): string {
  switch (reason) {
    case 'USER_SKIP':
      return 'Rest day. Nothing changes.';
    case 'TOO_SHORT':
      return `${minutesRequested ?? 'That many'} minutes is shorter than the shortest session this app plans (15 min). Short mobility sessions aren't set up yet.`;
    case 'NO_BLOCK_A':
      return 'Nothing can fill the first strength pair today.';
    case 'VALIDATION_FAILED':
      return "The plan didn't pass its own checks, so it isn't shown.";
    default:
      return 'No session was generated today.';
  }
}

// ---------- Why entry assembly ----------

export interface WhyEntry {
  slot: string;
  movement: string;
  exercise: string;
  dose: string;
}

export function buildWhyEntry(slot: string, movement: string, exercise: string, dose: string): WhyEntry {
  return { slot, movement, exercise, dose };
}
