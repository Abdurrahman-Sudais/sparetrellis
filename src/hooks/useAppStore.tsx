import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type {
  Activity,
  AuditEntry,
  ForecastItem,
  ImportJob,
  InventoryRecord,
  MatchCandidate,
  NormalizationProposal,
  RelationshipType,
  ReorderDecision,
  ReviewStatus,
  StandardPart,
} from "@/types";
import { generateDemoData } from "@/data/generate";

const STORAGE_KEY = "sparetrellis.state.v2";

export interface AppState {
  standardParts: StandardPart[];
  records: InventoryRecord[];
  candidates: MatchCandidate[];
  proposals: NormalizationProposal[];
  forecastItems: ForecastItem[];
  activities: Activity[];
  importJobs: ImportJob[];
  audit: AuditEntry[];
}

type Action =
  | { type: "review"; ids: string[]; status: ReviewStatus; user: string; relationship?: RelationshipType; note?: string }
  | { type: "resolveProposal"; ids: string[]; accept: boolean; user: string; overrides?: Record<string, string> }
  | { type: "addAlias"; partId: string; alias: string; user: string }
  | { type: "removeAlias"; partId: string; alias: string; user: string }
  | { type: "renameStandard"; partId: string; name: string; user: string; note?: string }
  | { type: "forecastDecision"; id: string; decision: ReorderDecision; user: string; note?: string; qty?: number }
  | { type: "import"; job: ImportJob; records: InventoryRecord[]; candidates: MatchCandidate[] }
  | { type: "activity"; activity: Omit<Activity, "id" | "ts"> }
  | { type: "reset"; state: AppState };

let uid = Date.now();
const nextId = (p: string) => `${p}-${(uid++).toString(36).toUpperCase()}`;
const now = () => new Date().toISOString();

function audit(user: string, action: string, entity: string, extra: Partial<AuditEntry> = {}): AuditEntry {
  return { id: nextId("AUD"), ts: now(), user, action, entity, ...extra };
}
function activity(a: Omit<Activity, "id" | "ts">): Activity {
  return { ...a, id: nextId("ACT"), ts: now() };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "review": {
      const ids = new Set(action.ids);
      const entries: AuditEntry[] = [];
      const candidates = state.candidates.map((c) => {
        if (!ids.has(c.id)) return c;
        entries.push(
          audit(action.user, action.status === "approved" ? "Approved match" : action.status === "rejected" ? "Rejected match" : action.status === "flagged" ? "Flagged match" : "Reopened match", c.id, {
            before: c.reviewStatus,
            after: action.status,
            note: [action.relationship === "verified-equivalent" ? "Relationship: verified equivalent" : action.relationship ? "Relationship: duplicate record" : "", action.note].filter(Boolean).join(" · ") || undefined,
          }),
        );
        return {
          ...c,
          reviewStatus: action.status,
          relationship: action.status === "approved" ? action.relationship ?? "duplicate-record" : undefined,
          reviewer: action.status === "pending" ? undefined : action.user,
          reviewedAt: action.status === "pending" ? undefined : now(),
          note: action.note,
        };
      });
      const verb = { approved: "approved", rejected: "rejected", flagged: "flagged", pending: "reopened" }[action.status];
      return {
        ...state,
        candidates,
        audit: [...entries, ...state.audit],
        activities: [activity({ user: action.user, type: "review", message: `${action.ids.length === 1 ? `Match ${action.ids[0]}` : `${action.ids.length} matches`} ${verb}.` }), ...state.activities],
      };
    }
    case "resolveProposal": {
      const ids = new Set(action.ids);
      const entries: AuditEntry[] = [];
      const changes = new Map<string, { field: keyof InventoryRecord; value: string }[]>();
      const proposals = state.proposals.map((p) => {
        if (!ids.has(p.id) || p.status !== "pending") return p;
        const value = action.overrides?.[p.id] ?? p.proposed;
        entries.push(
          audit(action.user, action.accept ? "Accepted normalization" : "Rejected normalization", p.recordId, {
            field: String(p.field),
            before: p.current,
            after: action.accept ? value : p.current,
            note: action.accept && value !== p.proposed ? "Edited before acceptance" : undefined,
          }),
        );
        if (action.accept) {
          const list = changes.get(p.recordId) ?? [];
          list.push({ field: p.field, value });
          changes.set(p.recordId, list);
        }
        return { ...p, status: action.accept ? ("accepted" as const) : ("rejected" as const), proposed: value };
      });
      const records = changes.size
        ? state.records.map((r) => {
            const ch = changes.get(r.id);
            if (!ch) return r;
            const next = { ...r, lastUpdated: now() } as Record<string, unknown>;
            for (const c of ch) next[c.field] = c.value;
            return next as unknown as InventoryRecord;
          })
        : state.records;
      return {
        ...state,
        proposals,
        records,
        audit: [...entries, ...state.audit],
        activities: [
          activity({ user: action.user, type: "normalize", message: `${action.accept ? "Accepted" : "Rejected"} ${entries.length} catalogue correction${entries.length === 1 ? "" : "s"}.` }),
          ...state.activities,
        ],
      };
    }
    case "addAlias":
    case "removeAlias": {
      const add = action.type === "addAlias";
      return {
        ...state,
        standardParts: state.standardParts.map((p) =>
          p.id === action.partId
            ? { ...p, aliases: add ? Array.from(new Set([...p.aliases, action.alias])) : p.aliases.filter((a) => a !== action.alias) }
            : p,
        ),
        audit: [audit(action.user, add ? "Added alternative name" : "Removed alternative name", action.partId, { field: "aliases", after: add ? action.alias : undefined, before: add ? undefined : action.alias }), ...state.audit],
      };
    }
    case "renameStandard": {
      const part = state.standardParts.find((p) => p.id === action.partId);
      if (!part) return state;
      return {
        ...state,
        standardParts: state.standardParts.map((p) =>
          p.id === action.partId ? { ...p, name: action.name, aliases: Array.from(new Set([...p.aliases, part.name])) } : p,
        ),
        audit: [audit(action.user, "Set preferred description", action.partId, { field: "name", before: part.name, after: action.name, note: action.note }), ...state.audit],
      };
    }
    case "forecastDecision": {
      const item = state.forecastItems.find((f) => f.id === action.id);
      if (!item) return state;
      return {
        ...state,
        forecastItems: state.forecastItems.map((f) => (f.id === action.id ? { ...f, decision: action.decision, decisionNote: action.note } : f)),
        audit: [audit(action.user, `Reorder suggestion ${action.decision}`, item.id, { before: item.decision, after: action.decision, note: [action.qty ? `Qty ${action.qty}` : "", action.note].filter(Boolean).join(" · ") || undefined }), ...state.audit],
        activities: [activity({ user: action.user, type: "forecast", message: `Reorder suggestion for ${item.name.split(",").slice(0, 3).join(",")} ${action.decision}.` }), ...state.activities],
      };
    }
    case "import":
      return {
        ...state,
        records: [...action.records, ...state.records],
        candidates: [...action.candidates, ...state.candidates],
        importJobs: [action.job, ...state.importJobs],
        activities: [
          activity({
            user: action.job.user,
            type: "import",
            message: `Imported ${action.job.fileName}: ${action.job.imported} rows, ${action.job.duplicates} duplicate warnings, ${action.job.errors} errors.`,
          }),
          ...state.activities,
        ],
        audit: [audit(action.job.user, "Imported file", action.job.id, { note: `${action.job.fileName} · ${action.job.imported} rows` }), ...state.audit],
      };
    case "activity":
      return { ...state, activities: [activity(action.activity), ...state.activities] };
    case "reset":
      return action.state;
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* storage unavailable */
  }
  return generateDemoData();
}

interface StoreValue extends AppState {
  dispatch: React.Dispatch<Action>;
  recordById: Map<string, InventoryRecord>;
  partById: Map<string, StandardPart>;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* ignore quota / private mode */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  const recordById = useMemo(() => new Map(state.records.map((r) => [r.id, r])), [state.records]);
  const partById = useMemo(() => new Map(state.standardParts.map((p) => [p.id, p])), [state.standardParts]);
  const resetDemo = useCallback(() => dispatch({ type: "reset", state: generateDemoData() }), []);

  const value = useMemo(() => ({ ...state, dispatch, recordById, partById, resetDemo }), [state, recordById, partById, resetDemo]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}
