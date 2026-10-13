import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity as ActivityIcon,
  ClipboardList,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import {
  addActivityData,
  addTeamData,
  deleteActivityData,
  deleteScoreData,
  deleteTeamData,
  getAuditLogs,
  updateActivityData,
  updateTeamData,
  upsertScoreData,
  type AuditLogItem,
} from "@/lib/data-service";
import { formatScore, formatCapital, formatTime, type Activity, type Score, type Team } from "@/lib/leaderboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { clearAdminSession } from "@/routes/_authenticated/route";

const emblem = "/bizznnovate-emblem.webp";
const wordmark = "/bizznnovate-wordmark.webp";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — BIZZNNOVATE" },
      {
        name: "description",
        content: "Teams, activities, score management and score history for BIZZNNOVATE.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Section = "dashboard" | "teams" | "activities" | "scores" | "history";

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "teams", label: "Teams", icon: Users },
  { id: "activities", label: "Activities", icon: ActivityIcon },
  { id: "scores", label: "Score Management", icon: ClipboardList },
  { id: "history", label: "Score History", icon: History },
];

const TRACK_OPTIONS = [
  "Food & Nutrition",
  "Health & Fitness",
  "Fashion & Lifestyle",
  "Tech & Innovation",
  "FinTech",
  "EdTech",
  "General Track",
];

const errMsg = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

/* ---------- shared UI ---------- */

const panel = "border border-kraft/45 bg-ecru-soft shadow-xs";
const th =
  "px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text font-bold";
const td = "px-3 py-2.5 text-sm font-sans";
const btnEdit =
  "h-9 border border-kraft/60 bg-transparent px-3 text-xs font-mono font-semibold uppercase tracking-wider text-espresso hover:bg-kraft/20 cursor-pointer";
const btnDelete =
  "h-9 border border-destructive/40 bg-transparent px-3 text-xs font-mono font-semibold uppercase tracking-wider text-destructive hover:bg-destructive/10 cursor-pointer";
const btnSave =
  "h-9 bg-forest-green px-4 text-xs font-mono font-bold uppercase tracking-wider text-ecru-soft hover:bg-forest-dark cursor-pointer";

function Confirm(props: {
  open: boolean;
  busy?: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "warn" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={(o) => !o && !props.busy && props.onCancel()}>
      <AlertDialogContent className="border-kraft/45 bg-ecru-soft font-sans">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl text-espresso">
            {props.title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-text">{props.description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.busy} className="font-mono text-xs uppercase">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={props.busy}
            onClick={(e) => {
              e.preventDefault();
              props.onConfirm();
            }}
            className={cn(
              "font-mono text-xs font-bold uppercase tracking-wider text-ecru-soft",
              props.tone === "warn"
                ? "bg-kraft-deep hover:bg-espresso"
                : "bg-destructive hover:bg-destructive/90",
            )}
          >
            {props.busy ? "Working…" : props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function useRefresh() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["leaderboard"] }),
      qc.invalidateQueries({ queryKey: ["score-history"] }),
    ]);
}

/* ---------- page ---------- */

function AdminPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("dashboard");
  const lb = useLeaderboard();
  const { teams, activities, scores, standings, lastUpdated } = lb;

  const historyQuery = useQuery({
    queryKey: ["score-history"],
    queryFn: () => getAuditLogs(),
    refetchInterval: 10000,
  });
  const logs = historyQuery.data ?? [];

  const totals = useMemo(() => new Map(standings.map((s) => [s.team.id, s])), [standings]);

  const signOut = async () => {
    clearAdminSession();
    await supabase.auth.signOut();
    toast.info("Signed out of Admin Console.");
    void navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col font-sans text-espresso antialiased md:flex-row bg-ecru">
      <aside className="flex shrink-0 flex-col border-b border-kraft/45 bg-ecru-soft p-4 md:w-64 md:border-b-0 md:border-r shadow-xs">
        <div className="flex items-center gap-3 px-2">
          <img src={emblem} alt="BIZZNNOVATE emblem" className="size-10 object-contain" />
          <div className="min-w-0">
            <img
              src={wordmark}
              alt="BIZZNNOVATE"
              className="h-auto w-32 object-contain object-left"
            />
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-forest-green font-bold flex items-center gap-1">
              <ShieldCheck className="size-3 text-forest-green" /> Admin Console
            </div>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto md:mt-8 md:block md:space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xs px-3 py-2.5 text-sm font-semibold transition-all md:w-full md:gap-3 cursor-pointer",
                section === item.id
                  ? "bg-forest-green text-ecru-soft shadow-xs"
                  : "text-muted-text hover:bg-kraft/20 hover:text-espresso",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-3 flex gap-2 md:mt-auto md:block md:space-y-1 pt-4 border-t border-kraft/35">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-text hover:bg-kraft/15 hover:text-espresso md:w-full transition-colors"
          >
            <ListChecks className="size-4" /> Public Leaderboard
          </Link>
          <Link
            to="/display"
            className="flex items-center gap-3 px-3 py-2 text-sm text-muted-text hover:bg-kraft/15 hover:text-espresso md:w-full transition-colors"
          >
            <ActivityIcon className="size-4" /> Projector View
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 md:w-full transition-colors cursor-pointer"
          >
            <LogOut className="size-4" /> Logout Admin
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-kraft/35 pb-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-espresso">
              {NAV.find((n) => n.id === section)?.label}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-text font-semibold">
              Verified Event Admin · Updated {lastUpdated ? formatTime(lastUpdated) : "Live"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-green/15 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-forest-green">
              <span className="size-2 rounded-full bg-forest-green animate-pulse" />
              Database Active & Synced
            </span>
          </div>
        </div>

        {lb.isLoading ? (
          <p className="font-mono text-sm text-muted-text animate-pulse">
            Connecting to database…
          </p>
        ) : (
          <>
            {section === "dashboard" && (
              <Dashboard
                teams={teams}
                activities={activities}
                scores={scores}
                lastUpdated={lastUpdated}
                logs={logs}
              />
            )}
            {section === "teams" && <TeamsSection teams={teams} totals={totals} />}
            {section === "activities" && (
              <ActivitiesSection activities={activities} scores={scores} />
            )}
            {section === "scores" && (
              <ScoresSection
                teams={teams}
                activities={activities}
                scores={scores}
              />
            )}
            {section === "history" && (
              <HistorySection logs={logs} loading={historyQuery.isLoading} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- dashboard ---------- */

const ACTION_LABEL: Record<string, string> = {
  score_create: "Created",
  score_update: "Updated",
  score_delete: "Deleted",
  score_rollback: "Rolled back",
  team_create: "Team added",
  team_rename: "Team renamed",
  team_delete: "Team deleted",
  team_update: "Team updated",
  activity_create: "Activity added",
  activity_update: "Activity updated",
  activity_delete: "Activity deleted",
};

function describe(l: AuditLogItem) {
  const o = l.old_value;
  const n = l.new_value;
  if (l.entity_type === "score") {
    const from = o?.points ?? null;
    const to = n?.points ?? null;
    return `Score: ${from === null ? "—" : formatScore(from)} → ${to === null ? "—" : formatScore(to)} pts`;
  }
  if (l.entity_type === "team") {
    if (l.action === "team_create") return `Team "${n?.name}" (${n?.theme ?? ""}) added`;
    if (l.action === "team_update") return `Team "${n?.name}" updated`;
    if (l.action === "team_delete") return `Team removed`;
    return n?.name ?? o?.name ?? "Team";
  }
  if (l.entity_type === "activity") return n?.name ?? o?.name ?? "Activity";
  return "";
}

function Dashboard(props: {
  teams: Team[];
  activities: Activity[];
  scores: Score[];
  lastUpdated: Date | null;
  logs: AuditLogItem[];
}) {
  const cards = [
    { label: "Total Teams", value: String(props.teams.length) },
    { label: "Total Activities", value: String(props.activities.length) },
    { label: "Recorded Scores", value: String(props.scores.length) },
    { label: "Last Sync", value: props.lastUpdated ? formatTime(props.lastUpdated) : "Live" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={cn(panel, "p-4")}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-text font-bold">
              {c.label}
            </div>
            <div className="mt-2 truncate font-heading text-3xl font-bold text-espresso">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className={panel}>
        <div className="border-b border-kraft/35 px-4 py-3 font-heading text-lg font-bold text-espresso">
          Recent Event Activity & Logs
        </div>
        {props.logs.length === 0 ? (
          <p className="px-4 py-6 font-mono text-sm text-muted-text">
            No score changes logged yet.
          </p>
        ) : (
          <ul className="divide-y divide-kraft/35 font-sans">
            {props.logs.slice(0, 10).map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
              >
                <span className="w-20 font-mono text-xs text-muted-text">
                  {formatTime(new Date(l.created_at))}
                </span>
                <span className="font-semibold text-espresso">
                  {ACTION_LABEL[l.action] ?? l.action}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-text">{describe(l)}</span>
                <span className="font-mono text-xs text-forest-green font-semibold">
                  {l.performer}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- teams section ---------- */

function TeamsSection({
  teams,
  totals,
}: {
  teams: Team[];
  totals: Map<string, { total: number; rank: number }>;
}) {
  const refresh = useRefresh();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState(TRACK_OPTIONS[0]);
  const [teamCode, setTeamCode] = useState("");
  const [members, setMembers] = useState("4");
  const [capital, setCapital] = useState("100000");
  const [adding, setAdding] = useState(false);

  const [search, setSearch] = useState("");
  const [filterTrack, setFilterTrack] = useState("all");

  // Edit Team state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [editTheme, setEditTheme] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editMembers, setEditMembers] = useState("");
  const [editCapital, setEditCapital] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [toDelete, setToDelete] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    const n = name.trim();
    if (!n) {
      toast.error("Team name is required.");
      return;
    }
    setAdding(true);
    try {
      await addTeamData({
        name: n,
        theme: theme,
        team_code: teamCode.trim() || undefined,
        members_count: Number(members) || 4,
        initial_capital: Number(capital) || 100000,
        current_capital: Number(capital) || 100000,
      });
      toast.success(`Team "${n}" added and saved to database.`);
      setName("");
      setTeamCode("");
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to add team."));
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (t: Team) => {
    setEditingTeam(t);
    setEditName(t.name);
    setEditTheme(t.theme);
    setEditCode(t.team_code);
    setEditMembers(String(t.members_count || 4));
    setEditCapital(String(t.current_capital || 100000));
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || savingEdit) return;
    const n = editName.trim();
    if (!n) {
      toast.error("Team name is required.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateTeamData(editingTeam.id, {
        name: n,
        theme: editTheme,
        team_code: editCode.trim() || editingTeam.team_code,
        members_count: Number(editMembers) || 4,
        current_capital: Number(editCapital) || 100000,
      });
      toast.success(`Team "${n}" updated successfully in database.`);
      setEditingTeam(null);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update team."));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTeamData(toDelete.id);
      toast.success(`Team "${toDelete.name}" deleted from database.`);
      setToDelete(null);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete team."));
    } finally {
      setDeleting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = teams
    .filter((t) => {
      const matchQ =
        !q || t.name.toLowerCase().includes(q) || t.team_code.toLowerCase().includes(q);
      const matchTrack = filterTrack === "all" || t.theme === filterTrack;
      return matchQ && matchTrack;
    })
    .sort((a, b) => a.team_code.localeCompare(b.team_code));

  return (
    <div className="space-y-6">
      {/* Add New Team Form */}
      <form
        onSubmit={add}
        className={cn(
          panel,
          "grid gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-5 items-end",
        )}
      >
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="team-name" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            Team Name *
          </Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. NutriBloom Labs"
            maxLength={100}
            required
            className="h-11 border-kraft/45 bg-ecru-light/60 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="team-theme" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            Sector / Industry Track *
          </Label>
          <select
            id="team-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="h-11 w-full rounded-xs border border-kraft/45 bg-ecru-light/60 px-3 text-sm text-espresso font-sans focus:outline-none focus:ring-1 focus:ring-forest-green"
          >
            {TRACK_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="team-code" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            Code (Auto if blank)
          </Label>
          <Input
            id="team-code"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            placeholder="Auto e.g. T07"
            maxLength={10}
            className="h-11 border-kraft/45 bg-ecru-light/60 font-mono text-sm"
          />
        </div>

        <Button
          type="submit"
          disabled={adding}
          className={cn(btnSave, "h-11 w-full font-mono uppercase tracking-wider font-bold shadow-xs")}
        >
          {adding ? "Saving…" : "+ Add Team"}
        </Button>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-text" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${teams.length} teams by name or code…`}
            className="h-11 pl-9 border-kraft/45 bg-ecru-soft font-sans text-sm"
          />
        </div>

        <div className="flex items-center gap-2 sm:w-64">
          <Filter className="size-4 text-muted-text shrink-0" />
          <select
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            className="h-11 w-full rounded-xs border border-kraft/45 bg-ecru-soft px-3 text-sm text-espresso font-sans focus:outline-none focus:ring-1 focus:ring-forest-green"
          >
            <option value="all">All Sectors ({teams.length})</option>
            {TRACK_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} ({teams.filter((t) => t.theme === opt).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Table */}
      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-kraft/35 bg-ecru-light/50">
            <tr>
              <th className={th}>Code</th>
              <th className={th}>Team Name</th>
              <th className={th}>Sector / Track</th>
              <th className={cn(th, "text-right")}>Members</th>
              <th className={cn(th, "text-right")}>Total Score</th>
              <th className={cn(th, "text-right")}>Rank</th>
              <th className={cn(th, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kraft/30 font-sans">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center font-mono text-sm text-muted-text">
                  No teams found. Use "+ Add Team" above to register teams.
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const standing = totals.get(t.id);
              return (
                <tr key={t.id} className="hover:bg-ecru-light/40 transition-colors">
                  <td className={cn(td, "font-mono font-bold text-forest-green")}>
                    {t.team_code}
                  </td>
                  <td className={cn(td, "font-semibold text-espresso")}>
                    {t.name}
                  </td>
                  <td className={td}>
                    <span className="inline-block rounded-xs bg-kraft/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-kraft-deep">
                      {t.theme}
                    </span>
                  </td>
                  <td className={cn(td, "text-right font-mono text-xs text-muted-text")}>
                    {t.members_count || 4}
                  </td>
                  <td className={cn(td, "text-right font-mono font-bold text-base text-espresso")}>
                    {formatScore(standing?.total ?? 0)}
                  </td>
                  <td className={cn(td, "text-right font-mono font-bold text-forest-green")}>
                    #{standing?.rank ?? "—"}
                  </td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEdit(t)} className={btnEdit}>
                        <Pencil className="size-3 mr-1" /> Edit
                      </Button>
                      <Button onClick={() => setToDelete(t)} className={btnDelete}>
                        <Trash2 className="size-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <Dialog open={!!editingTeam} onOpenChange={(o) => !o && setEditingTeam(null)}>
          <DialogContent className="border-kraft/45 bg-ecru-soft font-sans sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl font-bold text-espresso">
                Edit Team: {editingTeam.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={saveEdit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
                  Team Name
                </Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="border-kraft/45 bg-ecru-light/60 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
                  Sector / Industry Track
                </Label>
                <select
                  value={editTheme}
                  onChange={(e) => setEditTheme(e.target.value)}
                  className="h-10 w-full rounded-xs border border-kraft/45 bg-ecru-light/60 px-3 text-sm text-espresso font-sans"
                >
                  {TRACK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
                    Team Code
                  </Label>
                  <Input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="border-kraft/45 bg-ecru-light/60 font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
                    Members Count
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={editMembers}
                    onChange={(e) => setEditMembers(e.target.value)}
                    className="border-kraft/45 bg-ecru-light/60 font-mono text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingTeam(null)}
                  className="font-mono text-xs uppercase"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-forest-green hover:bg-forest-dark text-ecru-soft font-mono text-xs font-bold uppercase tracking-wider"
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <Confirm
        open={!!toDelete}
        busy={deleting}
        confirmLabel="Delete Team"
        title={`Delete "${toDelete?.name}"?`}
        description={
          <>
            This will permanently remove <strong>{toDelete?.name}</strong> and all of its scores
            from the database. Standings and rankings will be recalculated in real-time.
          </>
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

/* ---------- activities section ---------- */

const STATUSES = ["upcoming", "live", "completed", "disabled"] as const;

function ActivitiesSection({
  activities,
  scores,
}: {
  activities: Activity[];
  scores: Score[];
}) {
  const refresh = useRefresh();
  const [name, setName] = useState("");
  const [max, setMax] = useState("100");
  const [day, setDay] = useState("1");
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMax, setEditMax] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [toDelete, setToDelete] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scores) m.set(s.activity_id, (m.get(s.activity_id) ?? 0) + 1);
    return m;
  }, [scores]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adding) return;
    const n = name.trim();
    const m = Number(max);
    if (!n) {
      toast.error("Activity name is required.");
      return;
    }
    if (!Number.isInteger(m) || m < 1) {
      toast.error("Maximum score must be a whole number of at least 1.");
      return;
    }
    setAdding(true);
    try {
      await addActivityData({
        name: n,
        maxScore: m,
        day: Number(day) || 1,
        status: "upcoming",
      });
      toast.success(`Activity "${n}" added to database.`);
      setName("");
      setMax("100");
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to add activity."));
    } finally {
      setAdding(false);
    }
  };

  const updateStatus = async (a: Activity, status: Activity["status"]) => {
    try {
      await updateActivityData(a.id, { status });
      toast.success(`Activity "${a.name}" status updated to ${status}.`);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update status."));
    }
  };

  const saveEdit = async (a: Activity) => {
    const n = editName.trim();
    const m = Number(editMax);
    if (!n) {
      toast.error("Activity name is required.");
      return;
    }
    if (!Number.isInteger(m) || m < 1) {
      toast.error("Maximum score must be at least 1.");
      return;
    }
    setSavingEdit(true);
    try {
      await updateActivityData(a.id, { name: n, max_score: m });
      toast.success("Activity updated successfully in database.");
      setEditing(null);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to update activity."));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteActivityData(toDelete.id);
      toast.success(`Activity "${toDelete.name}" deleted from database.`);
      setToDelete(null);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to delete activity."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Activity Form */}
      <form
        onSubmit={add}
        className={cn(
          panel,
          "grid gap-3.5 p-4 sm:grid-cols-[1fr_8rem_6rem_auto] sm:items-end",
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="act-name" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            Activity / Round Name *
          </Label>
          <Input
            id="act-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pitch Perfect"
            maxLength={100}
            required
            className="h-11 border-kraft/45 bg-ecru-light/60 font-sans"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-max" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            Max Score *
          </Label>
          <Input
            id="act-max"
            type="number"
            min={1}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="h-11 border-kraft/45 bg-ecru-light/60 font-mono text-right"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-day" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            Day #
          </Label>
          <Input
            id="act-day"
            type="number"
            min={1}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-11 border-kraft/45 bg-ecru-light/60 font-mono text-right"
          />
        </div>

        <Button
          type="submit"
          disabled={adding}
          className={cn(btnSave, "h-11 px-6 font-mono uppercase tracking-wider font-bold shadow-xs")}
        >
          {adding ? "Adding…" : "+ Add Activity"}
        </Button>
      </form>

      <p className="font-mono text-xs text-muted-text">
        ℹ️ Only <strong>live</strong> and <strong>completed</strong> activities count toward total
        leaderboard rankings.
      </p>

      {/* Activities Table */}
      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-kraft/35 bg-ecru-light/50">
            <tr>
              <th className={th}>Activity</th>
              <th className={cn(th, "text-right")}>Max Score</th>
              <th className={th}>Day</th>
              <th className={th}>Status</th>
              <th className={cn(th, "text-right")}>Teams Scored</th>
              <th className={cn(th, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kraft/30 font-sans">
            {activities.map((a) => (
              <tr key={a.id} className="hover:bg-ecru-light/40 transition-colors">
                <td className={td}>
                  {editing === a.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-9 border-kraft/45 bg-ecru-light/60 font-sans"
                    />
                  ) : (
                    <span className="font-semibold text-espresso">{a.name}</span>
                  )}
                </td>
                <td className={cn(td, "text-right font-mono font-bold")}>
                  {editing === a.id ? (
                    <Input
                      type="number"
                      min={1}
                      value={editMax}
                      onChange={(e) => setEditMax(e.target.value)}
                      className="ml-auto h-9 w-24 border-kraft/45 bg-ecru-light/60 text-right font-mono"
                    />
                  ) : (
                    a.max_score
                  )}
                </td>
                <td className={cn(td, "font-mono text-xs text-muted-text")}>Day {a.day}</td>
                <td className={td}>
                  <select
                    value={a.status}
                    onChange={(e) => void updateStatus(a, e.target.value as Activity["status"])}
                    className="h-9 rounded-xs border border-kraft/45 bg-ecru-light/60 px-2 text-xs font-mono font-bold uppercase tracking-wider text-espresso"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cn(td, "text-right font-mono font-bold text-forest-green")}>
                  {counts.get(a.id) ?? 0}
                </td>
                <td className={cn(td, "text-right")}>
                  <div className="flex justify-end gap-2">
                    {editing === a.id ? (
                      <>
                        <Button
                          disabled={savingEdit}
                          onClick={() => void saveEdit(a)}
                          className={btnSave}
                        >
                          {savingEdit ? "Saving…" : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(null)}
                          className="h-9 font-mono text-xs uppercase"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            setEditing(a.id);
                            setEditName(a.name);
                            setEditMax(String(a.max_score));
                          }}
                          className={btnEdit}
                        >
                          <Pencil className="size-3 mr-1" /> Edit
                        </Button>
                        <Button onClick={() => setToDelete(a)} className={btnDelete}>
                          <Trash2 className="size-3 mr-1" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Confirm
        open={!!toDelete}
        busy={deleting}
        confirmLabel="Delete Activity"
        title={`Delete "${toDelete?.name}"?`}
        description={
          <>
            This will permanently remove the activity and all associated scores from the database.
          </>
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

/* ---------- scores section ---------- */

function ScoresSection({
  teams,
  activities,
  scores,
}: {
  teams: Team[];
  activities: Activity[];
  scores: Score[];
}) {
  const refresh = useRefresh();
  const [activityId, setActivityId] = useState<string>(
    activities.find((a) => a.status === "live")?.id ?? activities[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Quick entry state
  const [qTeam, setQTeam] = useState("");
  const [qAct, setQAct] = useState("");
  const [qPts, setQPts] = useState("");
  const [qBusy, setQBusy] = useState(false);

  const [toDelete, setToDelete] = useState<{ team: Team; score: Score } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activity = activities.find((a) => a.id === activityId);
  const scoreOf = (teamId: string, actId: string) =>
    scores.find((s) => s.team_id === teamId && s.activity_id === actId);

  const saveScoreEntry = async (teamId: string, actId: string, raw: string): Promise<boolean> => {
    const a = activities.find((x) => x.id === actId);
    if (!a) {
      toast.error("Please select an activity.");
      return false;
    }
    const val = Number(raw);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Score must be a positive number.");
      return false;
    }
    if (val > a.max_score) {
      toast.error(`Score cannot exceed max score of ${a.max_score}.`);
      return false;
    }

    const team = teams.find((t) => t.id === teamId);
    try {
      await upsertScoreData({
        teamId,
        activityId: actId,
        points: val,
      });

      toast.success(
        `Score saved for ${team?.name ?? "Team"}: ${formatScore(val)} pts in ${a.name}`,
      );

      setSavedIds((s) => new Set(s).add(teamId));
      setTimeout(() => {
        setSavedIds((s) => {
          const n = new Set(s);
          n.delete(teamId);
          return n;
        });
      }, 3000);

      await refresh();
      return true;
    } catch (err) {
      toast.error(errMsg(err, "Failed to save score."));
      return false;
    }
  };

  const saveRow = async (teamId: string) => {
    if (savingIds.has(teamId)) return;
    const raw = drafts[teamId];
    if (raw === undefined || raw === "") return;

    setSavingIds((s) => new Set(s).add(teamId));
    const ok = await saveScoreEntry(teamId, activityId, raw);
    if (ok) {
      setDrafts((d) => {
        const n = { ...d };
        delete n[teamId];
        return n;
      });
    }
    setSavingIds((s) => {
      const n = new Set(s);
      n.delete(teamId);
      return n;
    });
  };

  const quickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qBusy) return;
    const targetAct = qAct || activityId;
    if (!qTeam || !targetAct) {
      toast.error("Please select both a team and an activity.");
      return;
    }
    setQBusy(true);
    const ok = await saveScoreEntry(qTeam, targetAct, qPts);
    if (ok) {
      setQPts("");
    }
    setQBusy(false);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteScoreData(toDelete.team.id, toDelete.score.activity_id);
      toast.success("Score removed successfully from database.");
      setToDelete(null);
      await refresh();
    } catch (err) {
      toast.error(errMsg(err, "Failed to remove score."));
    } finally {
      setDeleting(false);
    }
  };

  const q = search.trim().toLowerCase();
  const rows = teams
    .filter((t) => {
      const matchesSearch =
        !q || t.name.toLowerCase().includes(q) || t.team_code.toLowerCase().includes(q);
      const matchesTrack = trackFilter === "all" || t.theme === trackFilter;
      return matchesSearch && matchesTrack;
    })
    .sort((a, b) => a.team_code.localeCompare(b.team_code));

  const targetQuickAct = activities.find((a) => a.id === (qAct || activityId));

  return (
    <div className="space-y-6">
      {/* Quick Entry Form */}
      <form
        onSubmit={quickSave}
        className={cn(
          panel,
          "grid gap-3.5 p-4 md:grid-cols-[1.2fr_1.2fr_9rem_auto] md:items-end",
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="q-team" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            1. Select Team
          </Label>
          <select
            id="q-team"
            value={qTeam}
            onChange={(e) => setQTeam(e.target.value)}
            className="h-11 w-full rounded-xs border border-kraft/45 bg-ecru-light/60 px-3 text-sm text-espresso font-sans"
          >
            <option value="">Choose a team…</option>
            {teams
              .slice()
              .sort((a, b) => a.team_code.localeCompare(b.team_code))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.team_code} · {t.name} ({t.theme})
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-act" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            2. Challenge / Round
          </Label>
          <select
            id="q-act"
            value={qAct || activityId}
            onChange={(e) => {
              setQAct(e.target.value);
              setActivityId(e.target.value);
            }}
            className="h-11 w-full rounded-xs border border-kraft/45 bg-ecru-light/60 px-3 text-sm text-espresso font-sans"
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (Max {a.max_score} pts · Day {a.day})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="q-pts" className="font-mono text-xs uppercase tracking-wider text-muted-text font-bold">
            3. Marks (Max {targetQuickAct?.max_score ?? 100})
          </Label>
          <Input
            id="q-pts"
            type="number"
            min={0}
            max={targetQuickAct?.max_score}
            step="any"
            placeholder="e.g. 85"
            value={qPts}
            onChange={(e) => setQPts(e.target.value)}
            className="h-11 border-kraft/45 bg-ecru-light/60 font-mono text-base font-bold text-espresso text-right"
          />
        </div>

        <Button
          type="submit"
          disabled={qBusy || !qTeam}
          className={cn(btnSave, "h-11 px-6 font-mono uppercase tracking-wider font-bold shadow-xs")}
        >
          {qBusy ? "Saving…" : "Save Score"}
        </Button>
      </form>

      {/* Main Scorer Table & Filtering */}
      <div className="space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end justify-between bg-ecru-light/60 p-3.5 rounded-md border border-kraft/35">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end flex-1">
            <div className="space-y-1 sm:w-72">
              <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-text font-bold">
                Selected Challenge
              </Label>
              <select
                value={activityId}
                onChange={(e) => {
                  setActivityId(e.target.value);
                  setQAct(e.target.value);
                  setDrafts({});
                }}
                className="h-10 w-full rounded-xs border border-kraft/45 bg-ecru-soft px-3 text-sm text-espresso font-sans"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · Max {a.max_score} pts · Day {a.day} ({a.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:w-48">
              <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-text font-bold">
                Filter Sector
              </Label>
              <select
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="h-10 w-full rounded-xs border border-kraft/45 bg-ecru-soft px-3 text-sm text-espresso font-sans"
              >
                <option value="all">All Sectors</option>
                {TRACK_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 flex-1">
              <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-text font-bold">
                Search Team
              </Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team by name or code…"
                className="h-10 border-kraft/45 bg-ecru-soft font-sans text-sm"
              />
            </div>
          </div>
        </div>

        {activity && (
          <div className={cn(panel, "overflow-x-auto")}>
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-kraft/35 bg-ecru-light/50">
                <tr>
                  <th className={th}>Team</th>
                  <th className={th}>Sector</th>
                  <th className={cn(th, "text-right")}>Recorded Score</th>
                  <th className={cn(th, "text-right")}>
                    Quick Enter Score (Max {activity.max_score})
                  </th>
                  <th className={cn(th, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kraft/30 font-sans">
                {rows.map((t) => {
                  const cur = scoreOf(t.id, activity.id);
                  const draft = drafts[t.id] ?? "";
                  const busy = savingIds.has(t.id);
                  const isSaved = savedIds.has(t.id);

                  return (
                    <tr key={t.id} className="hover:bg-ecru-light/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-espresso">{t.name}</div>
                        <div className="font-mono text-xs text-muted-text">{t.team_code}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block rounded-xs bg-kraft/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-kraft-deep">
                          {t.theme}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-base text-espresso">
                        {cur ? (
                          formatScore(cur.points)
                        ) : (
                          <span className="text-muted-text/50 font-normal">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={activity.max_score}
                            step="any"
                            value={draft}
                            placeholder={cur ? String(cur.points) : "0"}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [t.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveRow(t.id);
                            }}
                            className={cn(
                              "h-9 w-28 border-kraft/45 bg-ecru-light/60 text-right font-mono font-bold text-espresso text-base",
                              isSaved && "border-forest-green ring-1 ring-forest-green",
                            )}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            disabled={busy || draft === ""}
                            onClick={() => void saveRow(t.id)}
                            className={cn(
                              btnSave,
                              "h-9 px-4 font-mono uppercase tracking-wider font-bold transition-all",
                              isSaved && "bg-forest-green text-ecru-soft",
                            )}
                          >
                            {busy ? "Saving…" : isSaved ? "Saved ✓" : cur ? "Update" : "Save"}
                          </Button>
                          {cur && (
                            <Button
                              disabled={busy}
                              onClick={() => setToDelete({ team: t, score: cur })}
                              className={btnDelete}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center font-mono text-sm text-muted-text">
                      No teams match your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Confirm
        open={!!toDelete}
        busy={deleting}
        confirmLabel="Clear Score"
        title="Clear this team's score?"
        description={
          <>
            {toDelete?.team.name} ({toDelete?.team.team_code}) · current score{" "}
            <strong>{toDelete ? formatScore(toDelete.score.points) : ""} pts</strong>.
            The ranking will be updated in real-time.
          </>
        }
        onCancel={() => setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

/* ---------- history section ---------- */

function HistorySection({ logs, loading }: { logs: AuditLogItem[]; loading: boolean }) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const shown = logs.filter(
    (l) => !q || describe(l).toLowerCase().includes(q) || l.performer.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search audit trail by team, round or admin…"
        className="h-11 border-kraft/45 bg-ecru-soft font-sans text-sm"
      />

      <div className={cn(panel, "overflow-x-auto")}>
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-kraft/35 bg-ecru-light/50">
            <tr>
              <th className={th}>Time</th>
              <th className={th}>Action</th>
              <th className={th}>Details</th>
              <th className={th}>Performer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kraft/30 font-sans">
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center font-mono text-sm text-muted-text">
                  Loading history…
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center font-mono text-sm text-muted-text">
                  No changes recorded yet.
                </td>
              </tr>
            )}
            {shown.map((l) => (
              <tr key={l.id} className="hover:bg-ecru-light/40 transition-colors">
                <td className={cn(td, "whitespace-nowrap font-mono text-xs text-muted-text")}>
                  {new Date(l.created_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </td>
                <td className={cn(td, "font-semibold text-espresso")}>
                  {ACTION_LABEL[l.action] ?? l.action}
                </td>
                <td className={td}>{describe(l)}</td>
                <td className={cn(td, "font-mono text-xs text-forest-green font-semibold")}>
                  {l.performer}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
