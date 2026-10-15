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

const STORAGE_KEY = "leader_star_db_store_v2";
const LOGS_KEY = "leader_star_audit_logs_v2";

const DEFAULT_TEAMS: Team[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    team_code: "T01",
    name: "NutriForge Labs",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: null,
    initial_capital: 100000,
    current_capital: 145000,
    status: "active",
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    team_code: "T02",
    name: "PureHarvest Pro",
    theme: "Food & Nutrition",
    members_count: 4,
    acquired_business: null,
    initial_capital: 100000,
    current_capital: 120000,
    status: "active",
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    team_code: "T03",
    name: "PulseFit AI",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: null,
    initial_capital: 100000,
    current_capital: 180000,
    status: "active",
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    team_code: "T04",
    name: "AuraWear Studio",
    theme: "Fashion & Lifestyle",
    members_count: 3,
    acquired_business: null,
    initial_capital: 100000,
    current_capital: 135000,
    status: "active",
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    team_code: "T05",
    name: "Zenith Activewear",
    theme: "Health & Fitness",
    members_count: 4,
    acquired_business: null,
    initial_capital: 100000,
    current_capital: 110000,
    status: "active",
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    team_code: "T06",
    name: "EcoThread Fashion",
    theme: "Fashion & Lifestyle",
    members_count: 4,
    acquired_business: null,
    initial_capital: 100000,
    current_capital: 95000,
    status: "active",
  },
];

const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    name: "TechSprint",
    description: "Rapid MVP & product architecture showcase",
    day: 1,
    max_score: 100,
    weight: 1,
    status: "completed",
    sort_order: 1,
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    name: "Pitch Perfect",
    description: "Business viability & investor pitch",
    day: 1,
    max_score: 100,
    weight: 1,
    status: "live",
    sort_order: 2,
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    name: "The Boardroom",
    description: "Executive crisis resolution & tiebreaker round",
    day: 2,
    max_score: 100,
    weight: 1.5,
    status: "upcoming",
    sort_order: 3,
  },
];

interface DbSnapshot {
  teams: Team[];
  activities: Activity[];
  scores: Score[];
  version: number;
}

const PING_KEY = "leader_star_sync_ping_v2";

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
