import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type Sb = SupabaseClient<Database>;

function getClient(userClient: Sb): Sb {
  return supabaseAdmin || userClient;
}

/** Admin = any authenticated evaluator / admin session */
async function getRole(_supabase: Sb, userId: string): Promise<string | null> {
  if (!userId) return null;
  return "admin";
}

async function assertAdmin(_supabase: Sb, userId: string) {
  if (!userId) throw new Error("Please sign in to access the Admin Panel.");
  return "admin";
}

async function names(supabase: Sb, teamId: string, activityId: string) {
  const db = getClient(supabase);
  const [t, a] = await Promise.all([
    db.from("teams").select("name").eq("id", teamId).maybeSingle(),
    db.from("activities").select("name").eq("id", activityId).maybeSingle(),
  ]);
  return {
    team_name: t.data?.name ?? "Unknown team",
    activity_name: a.data?.name ?? "Unknown activity",
  };
}

async function logScore(
  supabase: Sb,
  userId: string,
  action: "score_create" | "score_update" | "score_delete" | "score_rollback",
  scoreId: string,
  teamId: string,
  activityId: string,
  oldPoints: number | null,
  newPoints: number | null,
  extra: Record<string, unknown> = {},
) {
  try {
    const db = getClient(supabase);
    const n = await names(supabase, teamId, activityId);
    const base = { team_id: teamId, activity_id: activityId, ...n };
    await db.from("audit_logs").insert({
      action,
      entity_type: "score",
      entity_id: scoreId,
      old_value: oldPoints === null ? null : { ...base, points: oldPoints },
      new_value:
        newPoints === null
          ? { ...base, points: null, ...extra }
          : { ...base, points: newPoints, ...extra },
      performed_by: userId,
    });
  } catch (e) {
    console.warn("Audit log notice:", e);
  }
}

/** Writes a score (create / update / delete when points === null) smoothly and fast. */
async function writeScore(
  supabase: Sb,
  userId: string,
  _role: string,
  teamId: string,
  activityId: string,
  points: number | null,
  _expectedVersion?: number,
  remarks?: string,
) {
  const db = getClient(supabase);
  const { data: activity } = await db
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();
  if (!activity) throw new Error("This activity no longer exists.");

  if (points !== null) {
    if (points < 0) throw new Error("Score cannot be negative.");
    if (points > activity.max_score)
      throw new Error(`Score cannot exceed the maximum of ${activity.max_score}.`);
  }
  const { data: team } = await db.from("teams").select("id").eq("id", teamId).maybeSingle();
  if (!team) throw new Error("This team no longer exists.");

  const { data: existing } = await db
    .from("scores")
    .select("*")
    .eq("team_id", teamId)
    .eq("activity_id", activityId)
    .maybeSingle();

  if (points === null) {
    if (!existing) return { existing: null, score: null };
    const { error } = await db.from("scores").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { existing, score: null };
  }

  if (existing) {
    const { data: updated, error } = await db
      .from("scores")
      .update({
        points,
        remarks: remarks ?? existing.remarks,
        entered_by: userId,
        version: (existing.version || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { existing, score: updated };
  }

  const { data: inserted, error } = await db
    .from("scores")
    .insert({
      team_id: teamId,
      activity_id: activityId,
      points,
      remarks: remarks ?? null,
      entered_by: userId,
      version: 1,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { existing: null, score: inserted };
}

/* ---------------- Roles ---------------- */

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return { role: await getRole(supabase, userId) };
  });

/* ---------------- Scores ---------------- */

export const upsertScore = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        teamId: z.string().uuid(),
        activityId: z.string().uuid(),
        points: z.number().finite().min(0, "Score cannot be negative."),
        remarks: z.string().max(500).optional(),
        expectedVersion: z.number().int().optional().default(0),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const role = await assertAdmin(supabase, userId);
    const { existing, score } = await writeScore(
      supabase,
      userId,
      role,
      data.teamId,
      data.activityId,
      data.points,
      data.expectedVersion,
      data.remarks,
    );
    if (existing && existing.points === data.points)
      return { score, previous: existing.points, unchanged: true };
    await logScore(
      supabase,
      userId,
      existing ? "score_update" : "score_create",
      score!.id,
      data.teamId,
      data.activityId,
      existing?.points ?? null,
      data.points,
      data.remarks ? { remarks: data.remarks } : {},
    );
    return { score, previous: existing?.points ?? null };
  });

export const deleteScore = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        teamId: z.string().uuid(),
        activityId: z.string().uuid(),
        expectedVersion: z.number().int().optional().default(0),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const role = await assertAdmin(supabase, userId);
    const { existing } = await writeScore(
      supabase,
      userId,
      role,
      data.teamId,
      data.activityId,
      null,
      data.expectedVersion,
    );
    if (existing) {
      await logScore(
        supabase,
        userId,
        "score_delete",
        existing.id,
        data.teamId,
        data.activityId,
        existing.points,
        null,
      );
    }
    return { ok: true };
  });

export const rollbackScore = createServerFn({ method: "POST" })
  .validator((data) => z.object({ logId: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const role = await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    const { data: log } = await db
      .from("audit_logs")
      .select("*")
      .eq("id", data.logId)
      .maybeSingle();
    if (!log || log.entity_type !== "score") throw new Error("History entry not found.");
    const oldV = (log.old_value ?? null) as {
      team_id?: string;
      activity_id?: string;
      points?: number | null;
    } | null;
    const newV = (log.new_value ?? null) as {
      team_id?: string;
      activity_id?: string;
      points?: number | null;
    } | null;
    const teamId = newV?.team_id ?? oldV?.team_id;
    const activityId = newV?.activity_id ?? oldV?.activity_id;
    if (!teamId || !activityId) throw new Error("Incomplete log data for rollback.");
    const target = oldV?.points ?? null;
    const { score } = await writeScore(
      supabase,
      userId,
      role,
      teamId,
      activityId,
      target,
    );
    await logScore(
      supabase,
      userId,
      "score_rollback",
      score?.id ?? data.logId,
      teamId,
      activityId,
      newV?.points ?? null,
      target,
      { rolled_back_log: log.id },
    );
    return { ok: true, restored: target };
  });

export const getScoreHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    const { data, error } = await db
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const ids = [...new Set((data ?? []).map((l) => l.performed_by).filter(Boolean))] as string[];
    const emails: Record<string, string> = {};
    if (ids.length && supabaseAdmin) {
      try {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        for (const u of users?.users ?? []) if (ids.includes(u.id)) emails[u.id] = u.email ?? u.id;
      } catch (e) {
        console.warn("List users fallback:", e);
      }
    }
    return {
      logs: (data ?? []).map((l) => ({
        ...l,
        performer: l.performed_by ? (emails[l.performed_by] ?? "Evaluator") : "System",
      })),
    };
  });

/* ---------------- Teams ---------------- */

async function assertUniqueName(supabase: Sb, name: string, exceptId?: string) {
  const db = getClient(supabase);
  const { data } = await db.from("teams").select("id, name");
  const n = name.trim().toLowerCase();
  if ((data ?? []).some((r) => r.id !== exceptId && r.name.trim().toLowerCase() === n)) {
    throw new Error(`A team named "${name}" already exists.`);
  }
}

const teamName = z.string().trim().min(1, "Team name is required.").max(100);

export const createTeam = createServerFn({ method: "POST" })
  .validator((data) => z.object({ name: teamName }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    await assertUniqueName(supabase, data.name);
    const db = getClient(supabase);
    const { data: codes } = await db.from("teams").select("team_code");
    const max = (codes ?? []).reduce((m, r) => {
      const n = parseInt(String(r.team_code).replace(/\D/g, ""), 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const code = `T${String(max + 1).padStart(2, "0")}`;
    const { data: team, error } = await db
      .from("teams")
      .insert({ name: data.name, team_code: code })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error(`A team named "${data.name}" already exists.`);
      throw new Error(error.message);
    }
    await db.from("audit_logs").insert({
      action: "team_create",
      entity_type: "team",
      entity_id: team.id,
      old_value: null,
      new_value: { name: data.name, team_code: code },
      performed_by: userId,
    });
    return { team };
  });

export const renameTeam = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid(), name: teamName }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    await assertUniqueName(supabase, data.name, data.id);
    const db = getClient(supabase);
    const { data: before } = await db.from("teams").select("name").eq("id", data.id).single();
    const { error } = await db
      .from("teams")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) {
      if (error.code === "23505") throw new Error(`A team named "${data.name}" already exists.`);
      throw new Error(error.message);
    }
    await db.from("audit_logs").insert({
      action: "team_rename",
      entity_type: "team",
      entity_id: data.id,
      old_value: before ? { name: before.name } : null,
      new_value: { name: data.name },
      performed_by: userId,
    });
    return { ok: true };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    const { data: before } = await db.from("teams").select("*").eq("id", data.id).single();
    const { count } = await db
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("team_id", data.id);
    const { error } = await db.from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("audit_logs").insert({
      action: "team_delete",
      entity_type: "team",
      entity_id: data.id,
      old_value: before
        ? { name: before.name, team_code: before.team_code, scores_removed: count ?? 0 }
        : null,
      new_value: null,
      performed_by: userId,
    });
    return { ok: true };
  });

/* ---------------- Activities ---------------- */

const activityStatus = z.enum(["upcoming", "live", "completed", "disabled"]);

export const createActivity = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        name: z.string().trim().min(1, "Activity name is required.").max(100),
        maxScore: z.number().int().min(1, "Maximum score must be at least 1.").max(100000),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    const { data: all } = await db.from("activities").select("name, sort_order");
    if ((all ?? []).some((a) => a.name.trim().toLowerCase() === data.name.toLowerCase()))
      throw new Error(`An activity named "${data.name}" already exists.`);
    const nextOrder = Math.max(0, ...(all ?? []).map((a) => a.sort_order)) + 1;
    const { data: act, error } = await db
      .from("activities")
      .insert({
        name: data.name,
        max_score: data.maxScore,
        sort_order: nextOrder,
        status: "upcoming",
      })
      .select()
      .single();
    if (error)
      throw new Error(
        error.code === "23505" ? `An activity named "${data.name}" already exists.` : error.message,
      );
    await db.from("audit_logs").insert({
      action: "activity_create",
      entity_type: "activity",
      entity_id: act.id,
      old_value: null,
      new_value: { name: data.name, max_score: data.maxScore },
      performed_by: userId,
    });
    return { activity: act };
  });

export const updateActivity = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(100).optional(),
        status: activityStatus.optional(),
        maxScore: z.number().int().min(1).max(100000).optional(),
        weight: z.number().min(0).optional(),
      })
      .parse(data),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    const { data: before } = await db
      .from("activities")
      .select("*")
      .eq("id", data.id)
      .single();
    if (!before) throw new Error("Activity not found.");
    if (data.name) {
      const { data: all } = await db.from("activities").select("id, name");
      if (
        (all ?? []).some(
          (a) => a.id !== data.id && a.name.trim().toLowerCase() === data.name!.toLowerCase(),
        )
      )
        throw new Error(`An activity named "${data.name}" already exists.`);
    }
    const patch: { name?: string; status?: string; max_score?: number; weight?: number } = {};
    if (data.name) patch.name = data.name;
    if (data.status) patch.status = data.status;
    if (data.maxScore !== undefined) patch.max_score = data.maxScore;
    if (data.weight !== undefined) patch.weight = data.weight;
    const { error } = await db.from("activities").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("audit_logs").insert({
      action: "activity_update",
      entity_type: "activity",
      entity_id: data.id,
      old_value: {
        name: before.name,
        status: before.status,
        max_score: before.max_score,
        weight: before.weight,
      },
      new_value: JSON.parse(JSON.stringify(patch)),
      performed_by: userId,
    });
    return { ok: true };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    const { data: before } = await db
      .from("activities")
      .select("*")
      .eq("id", data.id)
      .single();
    if (!before) throw new Error("Activity not found.");
    const { count } = await db
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", data.id);
    const { error } = await db.from("activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("audit_logs").insert({
      action: "activity_delete",
      entity_type: "activity",
      entity_id: data.id,
      old_value: { name: before.name, max_score: before.max_score, scores_removed: count ?? 0 },
      new_value: null,
      performed_by: userId,
    });
    return { ok: true };
  });

export const reorderActivities = createServerFn({ method: "POST" })
  .validator((data) => z.object({ ids: z.array(z.string().uuid()) }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const db = getClient(supabase);
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await db
        .from("activities")
        .update({ sort_order: i + 1 })
        .eq("id", data.ids[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
