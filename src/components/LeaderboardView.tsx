import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Maximize, Search, Trophy, Sparkles, ShieldCheck } from "lucide-react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { formatScore, formatTime, type Standing } from "@/lib/leaderboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const emblem = "/bizznnovate-emblem.webp";
const wordmark = "/bizznnovate-wordmark.webp";
const tagline = "/bizznnovate-tagline.webp";

function PodiumCard({
  standing,
  place,
  onSelect,
}: {
  standing: Standing;
  place: 1 | 2 | 3;
  onSelect: (s: Standing) => void;
}) {
  const isFirst = place === 1;
  const isSecond = place === 2;

  return (
    <button
      onClick={() => onSelect(standing)}
      className={cn(
        "paper-card relative overflow-hidden rounded-md p-5 sm:p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl w-full cursor-pointer",
        isFirst
          ? "border-2 border-forest-green bg-[#f7f3ea] shadow-[0_4px_16px_-4px_rgba(59,97,58,0.25)] ring-1 ring-forest-green/20"
          : "border border-kraft/40 bg-[#f4f1ea] shadow-md",
        isSecond && "md:order-1 md:mt-6",
        isFirst && "md:order-2",
        place === 3 && "md:order-3 md:mt-10",
      )}
    >
      {/* Decorative top sweep for 1st place */}
      {isFirst && (
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-forest-green">
          <div className="sweep h-full w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      )}

      {/* Rank Header */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em]",
            isFirst
              ? "bg-forest-green text-ecru-soft shadow-xs"
              : "bg-kraft/15 text-kraft-deep",
          )}
        >
          {isFirst && <Trophy className="size-3" />}
          Rank 0{place}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {standing.team.team_code}
        </span>
      </div>

      {/* Big Rank Number & Badge */}
      <div className="mt-4 flex items-baseline justify-between">
        <div
          className={cn(
            "font-heading font-bold leading-none select-none",
            isFirst ? "text-6xl sm:text-7xl text-forest-green" : "text-5xl sm:text-6xl text-kraft-deep/70",
          )}
        >
          {place}
        </div>
        <div className="text-right">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Total Score
          </span>
          <span
            className={cn(
              "font-mono font-bold leading-none tracking-tight",
              isFirst ? "text-3xl sm:text-4xl text-espresso" : "text-2xl sm:text-3xl text-espresso",
            )}
          >
            {formatScore(standing.total)}
          </span>
        </div>
      </div>

      {/* Team Info */}
      <div className="mt-4 pt-3 border-t border-kraft/20">
        <h3
          className={cn(
            "font-display font-semibold text-espresso break-words line-clamp-2",
            isFirst ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
          )}
        >
          {standing.team.name}
        </h3>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-forest-green font-medium truncate">
            {standing.team.theme}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-forest-green/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-forest-green font-semibold">
            Active
          </span>
        </div>
      </div>
    </button>
  );
}

export function LeaderboardView({ displayMode = false }: { displayMode?: boolean }) {
  const { standings, activities, lastUpdated, liveFlash, isLoading } = useLeaderboard();
  const [query, setQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Standing | null>(null);

  const themes = useMemo(
    () => Array.from(new Set(standings.map((s) => s.team.theme))),
    [standings],
  );

  const filtered = useMemo(
    () =>
      standings.filter((s) => {
        const q = query.trim().toLowerCase();
        const matchesQ =
          !q || s.team.name.toLowerCase().includes(q) || s.team.team_code.toLowerCase().includes(q);
        const matchesT = themeFilter === "all" || s.team.theme === themeFilter;
        return matchesQ && matchesT;
      }),
    [standings, query, themeFilter],
  );

  const podium = standings.slice(0, 3);
  const rest = filtered.filter((s) => s.rank > 3);

  const requestFullscreen = () => {
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.();
    }
  };

  return (
    <div className="min-h-screen font-sans text-espresso antialiased">
      <div
        className={cn(
          "relative mx-auto px-4 sm:px-6 py-5",
          displayMode ? "max-w-[1600px] lg:px-12" : "max-w-[1440px] lg:px-10",
        )}
      >
        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-kraft/35 pb-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={emblem}
                alt="BIZZNNOVATE Emblem"
                className={cn(
                  "object-contain shrink-0 transition-transform duration-300 group-hover:scale-105",
                  displayMode ? "size-14 sm:size-16" : "size-11 sm:size-13",
                )}
              />
              <div className="flex flex-col">
                <img
                  src={wordmark}
                  alt="BIZZNNOVATE"
                  className={cn(
                    "h-auto object-contain object-left",
                    displayMode ? "w-48 sm:w-60" : "w-36 sm:w-44",
                  )}
                />
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-forest-green font-semibold">
                    IIPS · DAVV · INDORE
                  </span>
                  <span className="hidden sm:inline text-kraft/50 text-[10px]">·</span>
                  <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-[0.16em] text-kraft-deep">
                    Live Leaderboard
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {liveFlash && (
              <div className="slide-in border border-forest-green/40 bg-forest-green/10 px-3 py-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-forest-green font-semibold rounded-xs">
                {liveFlash}
              </div>
            )}
            <div className="flex items-center gap-2 border border-forest-green/40 bg-forest-green/10 px-3 py-1.5 rounded-xs">
              <span className="live-dot size-2 rounded-full bg-forest-green" />
              <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-forest-green">
                Live Scoring
              </span>
            </div>
            <div className="hidden border border-kraft/35 bg-ecru-soft/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-text rounded-xs lg:block">
              Updated {lastUpdated ? formatTime(lastUpdated) : "—"}
            </div>
            {/* Navigation Switcher: Public | Display | Admin */}
            <div className="flex items-center gap-1 border border-kraft/40 bg-ecru-soft/80 p-1 rounded-xs shadow-xs">
              <Link
                to="/"
                className={cn(
                  "px-3 py-1 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] rounded-xs transition-colors",
                  !displayMode
                    ? "bg-forest-green text-ecru-soft shadow-xs"
                    : "text-muted-text hover:text-espresso hover:bg-kraft/15",
                )}
              >
                Public
              </Link>
              <Link
                to="/display"
                className={cn(
                  "px-3 py-1 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] rounded-xs transition-colors",
                  displayMode
                    ? "bg-forest-green text-ecru-soft shadow-xs"
                    : "text-muted-text hover:text-espresso hover:bg-kraft/15",
                )}
              >
                Display
              </Link>
              <Link
                to="/admin"
                className="flex items-center gap-1 bg-kraft/15 hover:bg-forest-green hover:text-ecru-soft px-3 py-1 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-kraft-deep rounded-xs transition-colors border border-kraft/30"
              >
                <ShieldCheck className="size-3.5" />
                <span>Admin</span>
              </Link>
            </div>

            {displayMode && (
              <button
                onClick={requestFullscreen}
                className="flex items-center gap-1.5 border border-kraft/40 bg-ecru-soft px-3 py-1.5 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-espresso hover:bg-kraft/15 transition-colors rounded-xs cursor-pointer shadow-xs"
                title="Toggle Fullscreen"
              >
                <Maximize className="size-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            )}
          </div>
        </header>

        {/* TICKER - EVENT LIVE MARQUEE */}
        <div className="mt-4 sm:mt-5 overflow-hidden border-y border-kraft/40 bg-ecru-light/80">
          <div className="flex items-center gap-3 sm:gap-6 whitespace-nowrap py-2.5 pl-3 pr-2 sm:pl-4">
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-forest-green bg-forest-green/10 px-2 py-0.5 rounded-xs">
              ARENA STATUS
            </span>
            <div className="relative flex-1 overflow-hidden">
              <div className="flex gap-8 font-mono text-[12px] text-muted-text animate-marquee animate-marquee-hover-pause">
                <span>
                  FOOD / NUTRITION:{" "}
                  <strong className="text-forest-green">
                    {standings.filter((s) => s.team.theme === "Food & Nutrition").length} TEAMS
                  </strong>
                </span>
                <span>
                  HEALTH / FITNESS:{" "}
                  <strong className="text-forest-green">
                    {standings.filter((s) => s.team.theme === "Health & Fitness").length} TEAMS
                  </strong>
                </span>
                <span>
                  FASHION / LIFESTYLE:{" "}
                  <strong className="text-forest-green">
                    {standings.filter((s) => s.team.theme === "Fashion & Lifestyle").length} TEAMS
                  </strong>
                </span>
                <span>
                  TOTAL TEAMS ACTIVE:{" "}
                  <strong className="text-espresso">{standings.length} TEAMS</strong>
                </span>
                <span>
                  VENUE: <strong className="text-kraft-deep">IIPS, DAVV, INDORE</strong>
                </span>
                <span>
                  DATES: <strong className="text-kraft-deep">23–24 OCTOBER 2026</strong>
                </span>

                {/* Looped duplicate */}
                <span className="border-l border-kraft/40 pl-8">
                  FOOD / NUTRITION:{" "}
                  <strong className="text-forest-green">
                    {standings.filter((s) => s.team.theme === "Food & Nutrition").length} TEAMS
                  </strong>
                </span>
                <span>
                  HEALTH / FITNESS:{" "}
                  <strong className="text-forest-green">
                    {standings.filter((s) => s.team.theme === "Health & Fitness").length} TEAMS
                  </strong>
                </span>
                <span>
                  FASHION / LIFESTYLE:{" "}
                  <strong className="text-forest-green">
                    {standings.filter((s) => s.team.theme === "Fashion & Lifestyle").length} TEAMS
                  </strong>
                </span>
                <span>
                  TOTAL TEAMS ACTIVE:{" "}
                  <strong className="text-espresso">{standings.length} TEAMS</strong>
                </span>
                <span>
                  VENUE: <strong className="text-kraft-deep">IIPS, DAVV, INDORE</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO TITLE SECTION */}
        <section className="mt-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-forest-green mb-1.5">
                <Sparkles className="size-3.5" />
                <span>Inter-College Business & Innovation Arena</span>
              </div>
              <h1
                className={cn(
                  "font-heading font-bold tracking-tight text-espresso",
                  displayMode ? "text-5xl sm:text-6xl" : "text-3xl sm:text-5xl",
                )}
              >
                Official Standings
              </h1>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-text border border-kraft/30 bg-ecru-soft/70 px-3 py-1.5 rounded-xs">
              {activities.filter((a) => a.status !== "upcoming").length} of {activities.length} Challenges Evaluated
            </div>
          </div>

          {/* PODIUM TOP 3 */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-60 animate-pulse rounded-md border border-kraft/30 bg-ecru-soft/60" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {podium.map((s) => (
                <PodiumCard
                  key={s.team.id}
                  standing={s}
                  place={s.rank as 1 | 2 | 3}
                  onSelect={setSelected}
                />
              ))}
            </div>
          )}
        </section>

        {/* FULL STANDINGS TABLE (NO CAPITAL OR TRENDS COLUMNS) */}
        <section className="mt-10">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                className={cn(
                  "font-heading font-bold tracking-wide text-espresso",
                  displayMode ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
                )}
              >
                Full Leaderboard
              </h2>
              <p className="font-sans text-xs text-muted-text mt-0.5">
                Live rankings across all competition challenges and categories
              </p>
            </div>

            {!displayMode && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-text" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search team or code…"
                    className="h-10 w-full rounded-xs border border-kraft/50 bg-ecru-soft/90 pl-9 pr-3 font-mono text-xs text-espresso placeholder:text-muted-text focus:outline-none focus:ring-1 focus:ring-forest-green"
                  />
                </div>
                <select
                  value={themeFilter}
                  onChange={(e) => setThemeFilter(e.target.value)}
                  className="h-10 rounded-xs border border-kraft/50 bg-ecru-soft/90 px-3 font-mono text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-forest-green"
                >
                  <option value="all">All Tracks</option>
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mobile Card List (< 640px) */}
          <div className="sm:hidden space-y-3">
            {rest.map((s) => (
              <button
                key={s.team.id}
                onClick={() => setSelected(s)}
                className="w-full text-left p-4 rounded-md border border-kraft/35 bg-ecru-soft shadow-xs transition-colors hover:bg-ecru-light flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="font-mono text-lg font-bold text-kraft-deep shrink-0 w-8">
                    {String(s.rank).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-espresso text-base truncate">
                      {s.team.name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-text truncate mt-0.5">
                      {s.team.team_code} · {s.team.theme}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-base text-espresso">
                    {formatScore(s.total)}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-forest-green font-semibold mt-0.5">
                    Active
                  </div>
                </div>
              </button>
            ))}
            {rest.length === 0 && !isLoading && (
              <div className="p-8 text-center font-mono text-sm text-muted-text rounded-md border border-kraft/30 bg-ecru-soft">
                No teams match your selection.
              </div>
            )}
          </div>

          {/* Desktop & Display Table (>= 640px) */}
          {/* Note: Capital & Trends columns completely omitted as requested */}
          <div className="hidden sm:block overflow-x-auto rounded-md border border-kraft/40 bg-ecru-soft shadow-md">
            <div className="min-w-[640px]">
              <div
                className={cn(
                  "grid grid-cols-[4rem_1fr_8rem_6rem] gap-4 border-b border-kraft/35 px-6 py-3.5 font-mono uppercase tracking-[0.2em] text-muted-text font-bold",
                  displayMode ? "text-xs py-4 grid-cols-[5rem_1fr_10rem_7rem]" : "text-[11px]",
                )}
              >
                <span>Rank</span>
                <span>Team & Track</span>
                <span className="text-right">Total Score</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-kraft/20">
                {rest.map((s) => (
                  <button
                    key={s.team.id}
                    onClick={() => setSelected(s)}
                    className={cn(
                      "grid w-full grid-cols-[4rem_1fr_8rem_6rem] items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-ecru-light/70 cursor-pointer",
                      displayMode && "grid-cols-[5rem_1fr_10rem_7rem] py-4",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono font-bold text-kraft-deep",
                        displayMode ? "text-2xl" : "text-base",
                      )}
                    >
                      {String(s.rank).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate font-display font-semibold text-espresso",
                          displayMode ? "text-xl" : "text-base",
                        )}
                      >
                        {s.team.name}
                      </span>
                      <span className="block truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-text mt-0.5">
                        {s.team.team_code} · {s.team.theme}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "text-right font-mono font-bold text-espresso",
                        displayMode ? "text-2xl" : "text-lg",
                      )}
                    >
                      {formatScore(s.total)}
                    </span>
                    <span className="text-right">
                      <span className="inline-flex items-center rounded-xs bg-forest-green/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-forest-green">
                        Active
                      </span>
                    </span>
                  </button>
                ))}
                {rest.length === 0 && !isLoading && (
                  <div className="px-6 py-10 text-center font-mono text-sm text-muted-text">
                    No teams match your selection.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-kraft/35 pt-6 pb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-text text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img src={emblem} alt="" className="size-4 object-contain inline-block" />
            <span>BIZZNNOVATE · IIPS DAVV INDORE</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Where Business Meets Innovation · 23–24 October 2026</span>
            <span className="text-kraft/40">·</span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-forest-green hover:text-forest-dark font-semibold tracking-wider hover:underline"
            >
              <ShieldCheck className="size-3" />
              <span>Admin Console</span>
            </Link>
          </div>
        </footer>
      </div>

      {/* TEAM DETAIL MODAL */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="border-kraft/40 bg-ecru-soft text-espresso w-[calc(100vw-2rem)] sm:max-w-lg p-6 rounded-md shadow-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-forest-green font-bold">
                    Rank 0{selected.rank} · {selected.team.team_code}
                  </span>
                  <span className="rounded bg-forest-green/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-forest-green font-semibold">
                    Active Contender
                  </span>
                </div>
                <DialogTitle className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-espresso mt-1">
                  {selected.team.name}
                </DialogTitle>
                <p className="font-mono text-xs uppercase tracking-wider text-muted-text">
                  Track: {selected.team.theme}
                </p>
              </DialogHeader>

              {/* Clean Summary Stats (No Capital or Trends) */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-md bg-ecru-light/90 p-3.5 border border-kraft/30 text-center sm:text-left">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-text">
                    Total Points
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-espresso">
                    {formatScore(selected.total)}
                  </div>
                </div>
                <div className="rounded-md bg-ecru-light/90 p-3.5 border border-kraft/30 text-center sm:text-left">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-text">
                    Team Members
                  </div>
                  <div className="mt-1 font-mono text-2xl font-bold text-espresso">
                    {selected.team.members_count}
                  </div>
                </div>
              </div>

              {selected.team.acquired_business && (
                <div className="rounded-md bg-kraft/15 p-3.5 border border-kraft/35">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-kraft-deep font-bold">
                    Acquired Business Unit
                  </span>
                  <div className="mt-0.5 text-sm font-semibold text-espresso">
                    {selected.team.acquired_business}
                  </div>
                </div>
              )}

              {/* Challenges Breakdown */}
              <div className="space-y-3 mt-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-text font-bold">
                  Challenge Score Breakdown
                </div>
                {activities.map((a) => {
                  const pts = selected.scores[a.id];
                  const pct = pts !== undefined ? Math.min(100, (pts / a.max_score) * 100) : 0;
                  return (
                    <div key={a.id} className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px] text-muted-text">
                        <span className="font-medium text-espresso">
                          {a.name}
                          {a.status === "upcoming" && (
                            <span className="ml-2 text-muted-text/60">· upcoming</span>
                          )}
                        </span>
                        <span className="font-bold text-espresso">
                          {pts !== undefined ? `${formatScore(pts)} / ${a.max_score}` : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-kraft/25">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            a.status === "live" ? "bg-forest-green" : "bg-kraft-deep",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
