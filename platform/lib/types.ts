import type { Phase, Role } from "./config";

export type Deck = "RED" | "GREEN" | "BLUE" | "PRACTICE";
export type Validity = "VALID" | "INVALID" | "OUT_OF_SCOPE";
export type CardAction = "FILE" | "QUARANTINE";
export type CardPositionState =
  | "PENDING"
  | "FILED"
  | "QUARANTINED"
  | "TRADED"
  | "PLAYED";

export type EventKind =
  | "FILE_VALID_OWN"
  | "FILE_FOREIGN"
  | "FILE_INVALID"
  | "FILE_OUT_OF_SCOPE"
  | "QUARANTINE_CORRECT"
  | "QUARANTINE_INCORRECT"
  | "TRADE_VALIDATED"
  | "LEDGER_CLOSED"
  | "OUTAGE_TICK"
  | "OUTAGE_ARMED"
  | "OUTAGE_RESOLVED"
  | "GREEN_PLAYED"
  | "BLUE_PLAYED"
  | "PRACTICE_SCAN"
  | "FACILITATOR_ADJUST"
  | "FACILITATOR_ACTION"
  | "BADGE_AWARDED"
  | "ROLE_CLAIMED"
  | "PHASE_CHANGE";

export interface CardPayload {
  title?: string;
  counterparty?: string;
  amount?: string;
  vat?: string;
  format?: string;
  route?: string;
  detail?: string[];
  verdict?: string;
  why?: string;
  penalty?: number;
  penalty_label?: string;
  strap?: string;
  body?: string;
  effect?: string;
  teaches?: string;
  [key: string]: unknown;
}

export interface CardRow {
  card_id: string;
  qr: string;
  deck: Deck;
  archetype: string;
  owner_table: number;
  validity: Validity | null;
  correct_action: CardAction | null;
  penalty_aed: number;
  locked_until_phase: string | null;
  payload: CardPayload;
}

export interface TeamState {
  table_no: number;
  capital_aed: number;
  ledger_closed: boolean;
  outage_active: boolean;
  green_unlocked: boolean;
  badges: string[];
  penalty_cap_aed: number | null;
  impl_immunity: boolean;
  final_multiplier: boolean;
  outage_loss_aed: number;
  outage_wrong_tries: number;
  outage_scheduled_at?: string | null;
  outage_started_at?: string | null;
  outage_extra_hint?: boolean;
}

export interface TeachingModal {
  title: string;
  kind: EventKind;
  delta_aed: number;
  why: string;
  icon: "check" | "cross" | "info" | "warn";
  word: string;
  card_id: string;
}

export interface ScoreResult {
  kind: EventKind;
  delta_aed: number;
  modal: TeachingModal;
  flags?: {
    set_impl_immunity?: boolean;
    set_penalty_cap?: number;
    set_final_multiplier?: boolean;
    set_green_unlocked?: boolean;
    auto_resolve_held?: boolean;
    ledger_close_candidate?: boolean;
  };
}

export interface GameStateRow {
  id: number;
  phase: Phase;
  clock_started_at: string | null;
  clock_paused_at: string | null;
  paused_ms_total: number;
  narrative_banner: string | null;
  activeTables: number;
  event_mode: boolean;
}

export interface DeviceSession {
  deviceId: string;
  tableNo: number;
  role: Role;
}

export function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${String(x)}`);
}
