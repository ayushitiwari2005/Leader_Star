import { supabase } from "@/integrations/supabase/client";
import type { Activity, Score, Standing, Team } from "@/lib/leaderboard";
import { computeStandings } from "@/lib/leaderboard";

export interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  performer: string;
  performed_by?: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
}

const STORAGE_KEY = "leader_star_db_store_v3";
const LOGS_KEY = "leader_star_audit_logs_v3";

const DEFAULT_TEAMS: Team[] = [
  {
    id: "9dcb9ec3-9074-4682-b91d-e6b3f2efb61f",
    team_code: "T01",
    name: "Innovexa",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Surreal Treasures",
    initial_capital: 10000000,
    current_capital: 4000000,
    status: "active",
  },
  {
    id: "719d0003-2018-4bd4-8ef5-266d4e2cdc92",
    team_code: "T02",
    name: "The Visionaries",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "Flexi Fit Physiotherapy",
    initial_capital: 10000000,
    current_capital: 9000000,
    status: "active",
  },
  {
    id: "db3acea2-78b2-4050-a2b8-a6808e62a2b1",
    team_code: "T03",
    name: "SynnergyNexus",
    theme: "Tech & Innovation",
    members_count: 4,
    acquired_business: "Carry",
    initial_capital: 10000000,
    current_capital: 3400000,
    status: "active",
  },
  {
    id: "b875b78d-024f-458a-8cab-4eddd1340c8b",
    team_code: "T04",
    name: "Team Titans",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Bugeese",
    initial_capital: 10000000,
    current_capital: 4300000,
    status: "active",
  },
  {
    id: "94ffdfbb-fe80-4f46-9d8c-c2990d6081db",
    team_code: "T05",
    name: "The Skyblazers",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Dilip Watch Company",
    initial_capital: 10000000,
    current_capital: 4000000,
    status: "active",
  },
  {
    id: "d7abc236-a150-42a4-9029-f24141604364",
    team_code: "T06",
    name: "Manovate",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "Aayush Aayurved",
    initial_capital: 10000000,
    current_capital: 9000000,
    status: "active",
  },
  {
    id: "4ea818e2-c947-4c1e-b7b1-4c0f5bbae9fa",
    team_code: "T07",
    name: "Apex",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: "Bubble sip",
    initial_capital: 10000000,
    current_capital: 4000000,
    status: "active",
  },
  {
    id: "ffd181e7-52d5-401b-a272-71114d341617",
    team_code: "T08",
    name: "The Nexus",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Mehfil Couture",
    initial_capital: 10000000,
    current_capital: 2700000,
    status: "active",
  },
  {
    id: "e3f4bbb1-2c3e-4ec0-8f78-17b13e84ea53",
    team_code: "T09",
    name: "DhandhaVerse",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: "Make My Cake",
    initial_capital: 10000000,
    current_capital: 2700000,
    status: "active",
  },
  {
    id: "4af154b4-ab47-449e-b635-27b2a342baa3",
    team_code: "T10",
    name: "TRINETRA",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "NG Yoga Studio",
    initial_capital: 10000000,
    current_capital: 9000000,
    status: "active",
  },
  {
    id: "c79a82bf-eb29-4db0-8b1b-35f281fa9f82",
    team_code: "T11",
    name: "Team KPI",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "Tri -Star Fitness",
    initial_capital: 10000000,
    current_capital: 4400000,
    status: "active",
  },
  {
    id: "3c96678e-f726-4ce7-aa8d-af5b753f73da",
    team_code: "T12",
    name: "Catalyst",
    theme: "Tech & Innovation",
    members_count: 4,
    acquired_business: "Stage Bright",
    initial_capital: 10000000,
    current_capital: 7000000,
    status: "active",
  },
  {
    id: "84ccee78-2504-47a6-b805-8309db77bd96",
    team_code: "T13",
    name: "The Pioneers",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Ahi Jwellery",
    initial_capital: 10000000,
    current_capital: 1000000,
    status: "active",
  },
  {
    id: "e680b6ab-b7b2-48d9-861f-608473e7d835",
    team_code: "T14",
    name: "The Dooms",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Alterro",
    initial_capital: 10000000,
    current_capital: 2000000,
    status: "active",
  },
  {
    id: "9d76912d-7953-4d7f-9faa-a5f7999498e0",
    team_code: "T15",
    name: "Bytes and Bucks",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: "Milletmarg",
    initial_capital: 10000000,
    current_capital: 2000000,
    status: "active",
  },
  {
    id: "8725950d-2b79-4068-984d-8a2a08d5a186",
    team_code: "T16",
    name: "Mindforge",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: "Flavours Of Jail",
    initial_capital: 10000000,
    current_capital: 5500000,
    status: "active",
  },
  {
    id: "d4638f0d-bc00-48f7-b5e4-fe3290426c27",
    team_code: "T17",
    name: "Synera",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "Orro Wellness",
    initial_capital: 10000000,
    current_capital: 3500000,
    status: "active",
  },
  {
    id: "1a457b2f-4697-4173-ad96-3319cd69b7f7",
    team_code: "T18",
    name: "Crestiq",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: "Momobuzz & Woksum",
    initial_capital: 10000000,
    current_capital: 2200000,
    status: "active",
  },
  {
    id: "a03d7904-0f45-4aea-b92c-1675651aa1ff",
    team_code: "T19",
    name: "Byters Co.",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: "Siolim Speciality Coffee Roasters",
    initial_capital: 10000000,
    current_capital: 2000000,
    status: "active",
  },
  {
    id: "37bdc3f2-ab8a-4b5c-873c-09d18aa013ec",
    team_code: "T20",
    name: "The TechnoPreneurs",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Panchkanya",
    initial_capital: 10000000,
    current_capital: 1200000,
    status: "active",
  },
  {
    id: "9a7bf7f6-0d22-4979-a44e-46698b09f00f",
    team_code: "T21",
    name: "Shrest",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "The Dressing Room",
    initial_capital: 10000000,
    current_capital: 1600000,
    status: "active",
  },
  {
    id: "ccb1c17f-6c57-41f9-8393-4a0f35667737",
    team_code: "T22",
    name: "The wolves of the Wall Street",
    theme: "Tech & Innovation",
    members_count: 4,
    acquired_business: "Varek",
    initial_capital: 10000000,
    current_capital: 2400000,
    status: "active",
  },
  {
    id: "807732e9-8e6d-464b-a5ee-4700fa43f1e6",
    team_code: "T23",
    name: "Insight Partners",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "Shailja Yoga and Fitness",
    initial_capital: 10000000,
    current_capital: 9000000,
    status: "active",
  },
  {
    id: "c319af55-487d-4434-b81a-2e65bccebe69",
    team_code: "T24",
    name: "Catalyx",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "Fitness Guru Gym",
    initial_capital: 10000000,
    current_capital: 5000000,
    status: "active",
  },
  {
    id: "e79aed53-71b1-4cee-9694-d757aef38a9b",
    team_code: "T25",
    name: "The Strategix",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: "16 Hours Fitness",
    initial_capital: 10000000,
    current_capital: 1600000,
    status: "active",
  },
  {
    id: "5792c2a0-eefe-4339-a0c9-f3cb0971f9f8",
    team_code: "T26",
    name: "OpraTech",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: "Cotton Junction",
    initial_capital: 10000000,
    current_capital: 4300000,
    status: "active",
  },
];

const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: "bbcade70-ee0f-49fa-87dc-188e83bf78fd",
    name: "Workforce Wars",
    description: "Organisational and people-management challenge",
    day: 1,
    max_score: 150,
    weight: 1,
    status: "completed",
    sort_order: 1,
  },
  {
    id: "7d1ab1cc-c913-4ee9-b8c6-0ad2fd72c77c",
    name: "TechSprint",
    description: "Business + technology challenge",
    day: 1,
    max_score: 100,
    weight: 1,
    status: "completed",
    sort_order: 2,
  },
  {
    id: "ed522d6b-3207-4d8c-8648-7dc5226ac476",
    name: "Brand Blitz",
    description: "Marketing and advertising challenge",
    day: 1,
    max_score: 100,
    weight: 1,
    status: "live",
    sort_order: 3,
  },
  {
    id: "408d34ec-2bfd-4b03-8cbf-fff802428a1a",
    name: "SurviveX",
    description: "Crisis-management challenge",
    day: 1,
    max_score: 100,
    weight: 1,
    status: "completed",
    sort_order: 4,
  },
  {
    id: "23f49839-b0bb-47b8-9172-631053b130a5",
    name: "Capital Clash",
    description: "Continuous fundraising and investment simulation",
    day: 1,
    max_score: 100,
    weight: 1,
    status: "live",
    sort_order: 5,
  },
  {
    id: "7befe716-f8e1-4a2d-ac2a-f5b9ee69e936",
    name: "The Boardroom",
    description: "Final business defence challenge",
    day: 2,
    max_score: 150,
    weight: 1.5,
    status: "upcoming",
    sort_order: 6,
  },
  {
    id: "8fa0418e-d6f8-4774-9c5d-8514140d453c",
    name: "Viral Vault",
    description: "Digital and social media visibility challenge",
    day: 2,
    max_score: 100,
    weight: 1,
    status: "upcoming",
    sort_order: 7,
  },
  {
    id: "04b6462f-ad29-4cde-b07c-1fbe11b4735e",
    name: "E-Sports",
    description: "Fun and sportsmanship element",
    day: 2,
    max_score: 50,
    weight: 0.5,
    status: "upcoming",
    sort_order: 8,
  },
];

interface DbSnapshot {
  teams: Team[];
  activities: Activity[];
  scores: Score[];
  version: number;
}

const PING_KEY = "leader_star_sync_ping_v3";

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("leader_star_sync_channel");
  } catch {
    broadcastChannel = null;
  }
}

export function notifyDataChanged() {
  if (typeof window === "undefined") return;

  // 1. Same-window custom event
  window.dispatchEvent(
    new CustomEvent("leader_star_data_changed", { detail: { timestamp: Date.now() } }),
  );

  // 2. BroadcastChannel for active browser tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "SYNC", timestamp: Date.now() });
    } catch {}
  }

  // 3. LocalStorage ping for ALL other tabs/windows (100% reliable across all browsers)
  try {
    localStorage.setItem(PING_KEY, String(Date.now()));
  } catch {}
}

export function subscribeToDataChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = () => callback();
  window.addEventListener("leader_star_data_changed", handleCustomEvent);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === LOGS_KEY || e.key === PING_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);

  const handleBroadcast = (msg: MessageEvent) => {
    if (msg.data?.type === "SYNC") callback();
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleBroadcast);
  }

  return () => {
    window.removeEventListener("leader_star_data_changed", handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleBroadcast);
    }
  };
}

function loadLocalSnapshot(): DbSnapshot {
  if (typeof window === "undefined") {
    return { teams: DEFAULT_TEAMS, activities: DEFAULT_ACTIVITIES, scores: [], version: 1 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed.teams) &&
        Array.isArray(parsed.activities) &&
        Array.isArray(parsed.scores)
      ) {
        return parsed;
      }
    }
  } catch {}
  const initial: DbSnapshot = {
    teams: DEFAULT_TEAMS,
    activities: DEFAULT_ACTIVITIES,
    scores: [],
    version: 1,
  };
  saveLocalSnapshot(initial);
  return initial;
}

function saveLocalSnapshot(snap: DbSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch (e) {
    console.warn("Local storage write error:", e);
  }
}

function logAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  oldValue: any,
  newValue: any,
  performer = "Event Admin",
) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    const logs: AuditLogItem[] = raw ? JSON.parse(raw) : [];
    const item: AuditLogItem = {
      id: crypto.randomUUID?.() ?? `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action,
      entity_type: entityType,
      entity_id: entityId,
      performer,
      performed_by: performer,
      old_value: oldValue,
      new_value: newValue,
      created_at: new Date().toISOString(),
    };
    logs.unshift(item);
    if (logs.length > 500) logs.length = 500;
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

    // Also attempt remote audit log
    void (async () => {
      try {
        await supabase.from("audit_logs").insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_value: oldValue,
          new_value: newValue,
          performed_by: null,
        });
      } catch {}
    })();
  } catch {}
}

export function getAuditLogs(): AuditLogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function fetchAllLeaderboardData(): Promise<{
  teams: Team[];
  activities: Activity[];
  scores: Score[];
}> {
  const local = loadLocalSnapshot();

  // Query remote Supabase
  try {
    const [teamsRes, activitiesRes, scoresRes] = await Promise.all([
      supabase.from("teams").select("*").order("team_code"),
      supabase.from("activities").select("*").order("sort_order"),
      supabase.from("scores").select("*"),
    ]);

    const remoteTeams = teamsRes.data as Team[] | null;
    const remoteActivities = activitiesRes.data as Activity[] | null;
    const remoteScores = scoresRes.data as Score[] | null;

    // 1. Intelligent merge of Teams: remote + local overrides
    const teamMap = new Map<string, Team>();
    for (const t of remoteTeams ?? []) teamMap.set(t.id, t);
    for (const t of local.teams) {
      if (!teamMap.has(t.id)) {
        teamMap.set(t.id, t);
      } else {
        const rem = teamMap.get(t.id)!;
        teamMap.set(t.id, { ...rem, ...t });
      }
    }
    const mergedTeams = Array.from(teamMap.values()).sort((a, b) =>
      a.team_code.localeCompare(b.team_code),
    );

    // 2. Intelligent merge of Activities: remote + local overrides
    const actMap = new Map<string, Activity>();
    for (const a of remoteActivities ?? []) actMap.set(a.id, a);
    for (const a of local.activities) {
      if (!actMap.has(a.id)) {
        actMap.set(a.id, a);
      } else {
        const rem = actMap.get(a.id)!;
        actMap.set(a.id, { ...rem, ...a });
      }
    }
    const mergedActivities = Array.from(actMap.values()).sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    // 3. CRITICAL: Intelligent merge of Scores!
    // Start with remote scores, then overlay local scores (local always preserves recent inputs)
    const scoreMap = new Map<string, Score>();
    for (const s of remoteScores ?? []) {
      scoreMap.set(`${s.team_id}:${s.activity_id}`, s);
    }
    for (const s of local.scores) {
      const key = `${s.team_id}:${s.activity_id}`;
      const rem = scoreMap.get(key);
      if (!rem) {
        scoreMap.set(key, s);
      } else {
        const localTime = new Date(s.updated_at || 0).getTime();
        const remTime = new Date(rem.updated_at || 0).getTime();
        if (localTime >= remTime || s.points !== rem.points) {
          scoreMap.set(key, s);
        }
      }
    }
    const mergedScores = Array.from(scoreMap.values());

    const mergedSnap: DbSnapshot = {
      teams: mergedTeams,
      activities: mergedActivities,
      scores: mergedScores,
      version: (local.version || 0) + 1,
    };
    saveLocalSnapshot(mergedSnap);

    return {
      teams: mergedTeams,
      activities: mergedActivities,
      scores: mergedScores,
    };
  } catch (err) {
    console.info("Using cached database state:", err);
  }

  return {
    teams: local.teams,
    activities: local.activities,
    scores: local.scores,
  };
}

/* ---------------- TEAM CRUD ---------------- */

export async function addTeamData(params: {
  name: string;
  theme: string;
  team_code?: string;
  acquired_business?: string;
  members_count?: number;
  initial_capital?: number;
  current_capital?: number;
}): Promise<Team> {
  const local = loadLocalSnapshot();
  const trimmed = params.name.trim();

  // Validate duplicate
  if (local.teams.some((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`A team named "${trimmed}" already exists.`);
  }

  // Calculate next team code if not provided
  let code = params.team_code?.trim();
  if (!code) {
    const max = local.teams.reduce((m, r) => {
      const n = parseInt(String(r.team_code).replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    code = `T${String(max + 1).padStart(2, "0")}`;
  }

  const newTeam: Team = {
    id: crypto.randomUUID?.() ?? `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    team_code: code,
    theme: params.theme || "Food & Nutrition",
    members_count: params.members_count ?? 4,
    acquired_business: params.acquired_business?.trim() || null,
    initial_capital: params.initial_capital ?? 100000,
    current_capital: params.current_capital ?? params.initial_capital ?? 100000,
    status: "active",
  };

  local.teams.push(newTeam);
  saveLocalSnapshot(local);
  logAudit("team_create", "team", newTeam.id, null, newTeam);
  notifyDataChanged();

  // Sync to remote Supabase in background
  void (async () => {
    try {
      await supabase.from("teams").insert({
        id: newTeam.id,
        team_code: newTeam.team_code,
        name: newTeam.name,
        theme: newTeam.theme,
        acquired_business: newTeam.acquired_business,
        members_count: newTeam.members_count,
        initial_capital: newTeam.initial_capital,
        current_capital: newTeam.current_capital,
        status: newTeam.status,
      });
    } catch (e) {
      console.warn("Supabase team insert sync notice:", e);
    }
  })();

  return newTeam;
}

export async function updateTeamData(
  id: string,
  patch: Partial<Omit<Team, "id">>,
): Promise<Team> {
  const local = loadLocalSnapshot();
  const idx = local.teams.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Team not found.");

  const oldTeam = { ...local.teams[idx] };
  const updated: Team = {
    ...oldTeam,
    ...patch,
  };

  if (patch.name) {
    const trimmed = patch.name.trim();
    if (local.teams.some((t) => t.id !== id && t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`A team named "${trimmed}" already exists.`);
    }
    updated.name = trimmed;
  }

  if (patch.acquired_business !== undefined) {
    updated.acquired_business = patch.acquired_business?.trim() || null;
  }

  local.teams[idx] = updated;
  saveLocalSnapshot(local);
  logAudit("team_update", "team", id, oldTeam, updated);
  notifyDataChanged();

  // Sync to remote Supabase in background
  void (async () => {
    try {
      await supabase.from("teams").update({
        name: updated.name,
        theme: updated.theme,
        acquired_business: updated.acquired_business,
        team_code: updated.team_code,
        members_count: updated.members_count,
        current_capital: updated.current_capital,
        initial_capital: updated.initial_capital,
      }).eq("id", id);
    } catch (e) {
      console.warn("Supabase team update sync notice:", e);
    }
  })();

  return updated;
}

export async function clearAllTeamsData(): Promise<void> {
  const local = loadLocalSnapshot();
  const beforeCount = local.teams.length;
  local.teams = [];
  local.scores = [];
  saveLocalSnapshot(local);
  logAudit("teams_clear_all", "team", null, { previousTeams: beforeCount }, null);
  notifyDataChanged();

  void (async () => {
    try {
      await supabase.from("scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.warn("Supabase clear teams notice:", e);
    }
  })();
}

export async function seedOfficialTeamsData(): Promise<Team[]> {
  const local = loadLocalSnapshot();
  local.teams = [...DEFAULT_TEAMS];
  local.scores = [];
  local.version = 3;
  saveLocalSnapshot(local);
  logAudit("teams_seed_official", "team", null, null, { count: DEFAULT_TEAMS.length });
  notifyDataChanged();

  void (async () => {
    try {
      await supabase.from("scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("teams").insert(
        DEFAULT_TEAMS.map((t) => ({
          id: t.id,
          team_code: t.team_code,
          name: t.name,
          theme: t.theme,
          members_count: t.members_count,
          acquired_business: t.acquired_business,
          initial_capital: t.initial_capital,
          current_capital: t.current_capital,
          status: t.status,
        })),
      );
    } catch (e) {
      console.warn("Supabase seed teams notice:", e);
    }
  })();

  return local.teams;
}

export async function deleteTeamData(id: string): Promise<void> {
  const local = loadLocalSnapshot();
  const target = local.teams.find((t) => t.id === id);
  if (!target) return;

  local.teams = local.teams.filter((t) => t.id !== id);
  const removedScores = local.scores.filter((s) => s.team_id === id);
  local.scores = local.scores.filter((s) => s.team_id !== id);

  saveLocalSnapshot(local);
  logAudit("team_delete", "team", id, { team: target, removedScoresCount: removedScores.length }, null);
  notifyDataChanged();

  // Sync to remote Supabase
  void (async () => {
    try {
      await supabase.from("scores").delete().eq("team_id", id);
      await supabase.from("teams").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase team delete sync notice:", e);
    }
  })();
}

/* ---------------- SCORE CRUD ---------------- */

export async function upsertScoreData(params: {
  teamId: string;
  activityId: string;
  points: number;
  remarks?: string;
  performer?: string;
}): Promise<{ score: Score; isNew: boolean; previous: number | null }> {
  const local = loadLocalSnapshot();
  const activity = local.activities.find((a) => a.id === params.activityId);
  if (!activity) throw new Error("Selected activity does not exist.");

  const team = local.teams.find((t) => t.id === params.teamId);
  if (!team) throw new Error("Selected team does not exist.");

  if (params.points < 0) throw new Error("Score cannot be negative.");
  if (params.points > activity.max_score) {
    throw new Error(`Score cannot exceed maximum of ${activity.max_score} for ${activity.name}.`);
  }

  const existingIdx = local.scores.findIndex(
    (s) => s.team_id === params.teamId && s.activity_id === params.activityId,
  );

  let resultScore: Score;
  let isNew = false;
  let prevPoints: number | null = null;

  if (existingIdx !== -1) {
    const existing = local.scores[existingIdx];
    prevPoints = existing.points;
    resultScore = {
      ...existing,
      points: params.points,
      remarks: params.remarks ?? existing.remarks,
      updated_at: new Date().toISOString(),
      version: (existing.version ?? 0) + 1,
    };
    local.scores[existingIdx] = resultScore;
  } else {
    isNew = true;
    resultScore = {
      id: crypto.randomUUID?.() ?? `score-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      team_id: params.teamId,
      activity_id: params.activityId,
      points: params.points,
      remarks: params.remarks ?? null,
      entered_by: null,
      version: 1,
      updated_at: new Date().toISOString(),
    };
    local.scores.push(resultScore);
  }

  saveLocalSnapshot(local);
  logAudit(
    isNew ? "score_create" : "score_update",
    "score",
    resultScore.id,
    prevPoints === null ? null : { team_id: params.teamId, activity_id: params.activityId, points: prevPoints },
    { team_id: params.teamId, activity_id: params.activityId, points: params.points },
    params.performer ?? "Event Admin",
  );
  notifyDataChanged();

  // Sync with remote Supabase using schema-safe payload
  void (async () => {
    try {
      await supabase.from("scores").upsert(
        {
          team_id: params.teamId,
          activity_id: params.activityId,
          points: params.points,
        },
        { onConflict: "team_id,activity_id" },
      );
    } catch (e) {
      console.warn("Supabase score upsert notice:", e);
    }
  })();

  return { score: resultScore, isNew, previous: prevPoints };
}

export async function deleteScoreData(teamId: string, activityId: string): Promise<void> {
  const local = loadLocalSnapshot();
  const existing = local.scores.find(
    (s) => s.team_id === teamId && s.activity_id === activityId,
  );
  if (!existing) return;

  local.scores = local.scores.filter(
    (s) => !(s.team_id === teamId && s.activity_id === activityId),
  );

  saveLocalSnapshot(local);
  logAudit("score_delete", "score", existing.id, existing, null);
  notifyDataChanged();

  // Sync with remote Supabase
  void (async () => {
    try {
      await supabase
        .from("scores")
        .delete()
        .eq("team_id", teamId)
        .eq("activity_id", activityId);
    } catch (e) {
      console.warn("Supabase score delete notice:", e);
    }
  })();
}

/* ---------------- ACTIVITY CRUD ---------------- */

export async function addActivityData(params: {
  name: string;
  maxScore: number;
  day?: number;
  weight?: number;
  status?: Activity["status"];
}): Promise<Activity> {
  const local = loadLocalSnapshot();
  const trimmed = params.name.trim();

  if (local.activities.some((a) => a.name.trim().toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`An activity named "${trimmed}" already exists.`);
  }

  const nextOrder = Math.max(0, ...local.activities.map((a) => a.sort_order)) + 1;
  const newActivity: Activity = {
    id: crypto.randomUUID?.() ?? `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    description: null,
    day: params.day ?? 1,
    max_score: params.maxScore,
    weight: params.weight ?? 1,
    status: params.status ?? "upcoming",
    sort_order: nextOrder,
  };

  local.activities.push(newActivity);
  saveLocalSnapshot(local);
  logAudit("activity_create", "activity", newActivity.id, null, newActivity);
  notifyDataChanged();

  // Sync to remote Supabase
  void (async () => {
    try {
      await supabase.from("activities").insert({
        id: newActivity.id,
        name: newActivity.name,
        max_score: newActivity.max_score,
        day: newActivity.day,
        weight: newActivity.weight,
        status: newActivity.status,
        sort_order: newActivity.sort_order,
      });
    } catch (e) {
      console.warn("Supabase activity insert notice:", e);
    }
  })();

  return newActivity;
}

export async function updateActivityData(
  id: string,
  patch: Partial<Omit<Activity, "id">>,
): Promise<Activity> {
  const local = loadLocalSnapshot();
  const idx = local.activities.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Activity not found.");

  const old = { ...local.activities[idx] };
  const updated: Activity = {
    ...old,
    ...patch,
  };

  local.activities[idx] = updated;
  saveLocalSnapshot(local);
  logAudit("activity_update", "activity", id, old, updated);
  notifyDataChanged();

  // Sync to remote Supabase
  void (async () => {
    try {
      await supabase.from("activities").update({
        name: updated.name,
        max_score: updated.max_score,
        day: updated.day,
        weight: updated.weight,
        status: updated.status,
      }).eq("id", id);
    } catch (e) {
      console.warn("Supabase activity update notice:", e);
    }
  })();

  return updated;
}

export async function deleteActivityData(id: string): Promise<void> {
  const local = loadLocalSnapshot();
  const target = local.activities.find((a) => a.id === id);
  if (!target) return;

  local.activities = local.activities.filter((a) => a.id !== id);
  const removedScores = local.scores.filter((s) => s.activity_id === id);
  local.scores = local.scores.filter((s) => s.activity_id !== id);

  saveLocalSnapshot(local);
  logAudit("activity_delete", "activity", id, { activity: target, scoresRemoved: removedScores.length }, null);
  notifyDataChanged();

  // Sync to remote Supabase
  void (async () => {
    try {
      await supabase.from("scores").delete().eq("activity_id", id);
      await supabase.from("activities").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase activity delete notice:", e);
    }
  })();
}
