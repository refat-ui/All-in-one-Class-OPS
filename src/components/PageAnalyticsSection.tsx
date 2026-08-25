import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
} from "lucide-react";
import { api } from "../services/api";
import { PageTrackerRecord, PageHistoryRecord } from "../types";

// ── Categorical palette (validated dark-mode slots, fixed order, colorblind-safe) ──
// Assigned to pages by stable identity (alphabetical), never by rank, so a page
// keeps its colour even as its follower position changes.
const PAGE_PALETTE = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];
const OTHER_COLOR = "#64748b";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtNum(num: number): string {
  if (!isFinite(num)) return "0";
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Math.round(num).toLocaleString();
}

function fmtDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${MONTHS[+m[2] - 1]} ${+m[3]}`;
  return iso;
}

// Sheet stores upload dates like "19 August 2026 at 14:00" — strip the time clause so Date can parse it.
function parsePostDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+at\s+.*$/i, "").trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  const d2 = new Date(raw);
  return isNaN(d2.getTime()) ? null : d2;
}

function daysSince(d: Date | null): number | null {
  if (!d) return null;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// Compact "last post" date, e.g. "Aug 19" (drops the year — a last-post date is always recent).
function fmtPostDate(d: Date | null): string {
  if (!d) return "—";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export const PageAnalyticsSection: React.FC = () => {
  const [current, setCurrent] = useState<PageTrackerRecord[]>([]);
  const [history, setHistory] = useState<PageHistoryRecord[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isMockFallback, setIsMockFallback] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.fetchPageTracker(force);
      setCurrent(res.data.current || []);
      setHistory(res.data.history || []);
      setDates(res.data.dates || []);
      setLastUpdated(res.lastUpdated || res.data.lastUpdated || null);
      setIsMockFallback(!!res.data.isMockFallback);
      setPermissionNotice(res.permissionNotice?.message || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load page analytics data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const windowDays = dates.length;
  const pagesTracked = current.length;

  // Stable colour per page, keyed on identity (alphabetical order of page names).
  const pageColor = useMemo(() => {
    const sorted = [...new Set(current.map((c) => c.pageName))].sort((a, b) => a.localeCompare(b));
    const map = new Map<string, string>();
    sorted.forEach((p, i) => map.set(p, i < PAGE_PALETTE.length ? PAGE_PALETTE[i] : OTHER_COLOR));
    return map;
  }, [current]);

  const pages = useMemo(() => current.map((c) => c.pageName), [current]);

  // ── Per-page follower growth over the tracked window ──
  const perPageGrowth = useMemo(() => {
    const map = new Map<string, { delta: number; pct: number }>();
    pages.forEach((p) => {
      const series = history
        .filter((h) => h.pageName === p)
        .sort((a, b) => a.snapshotIso.localeCompare(b.snapshotIso));
      if (series.length >= 2) {
        const first = series[0].currentFollowers;
        const last = series[series.length - 1].currentFollowers;
        const delta = last - first;
        map.set(p, { delta, pct: first > 0 ? (delta / first) * 100 : 0 });
      } else {
        map.set(p, { delta: 0, pct: 0 });
      }
    });
    return map;
  }, [history, pages]);

  // ── Per-page follower sparkline series + content added over the window ──
  const perPageSeries = useMemo(() => {
    const map = new Map<string, { spark: { iso: string; v: number }[]; contentGain: number }>();
    pages.forEach((p) => {
      const series = history
        .filter((h) => h.pageName === p)
        .sort((a, b) => a.snapshotIso.localeCompare(b.snapshotIso));
      const spark = series.map((h) => ({ iso: h.snapshotIso, v: h.currentFollowers }));
      const contentGain =
        series.length >= 2 ? series[series.length - 1].totalContent - series[0].totalContent : 0;
      map.set(p, { spark, contentGain });
    });
    return map;
  }, [history, pages]);

  // ── Per-page scorecards (the small-multiple grid; each page reads on its own scale) ──
  const scorecards = useMemo(() => {
    return current
      .map((c) => {
        const growth = perPageGrowth.get(c.pageName) || { delta: 0, pct: 0 };
        const series = perPageSeries.get(c.pageName) || { spark: [], contentGain: 0 };
        const lastPost = parsePostDate(c.lastContentDate);
        return {
          ...c,
          delta: growth.delta,
          pct: growth.pct,
          spark: series.spark,
          contentGain: series.contentGain,
          daysSinceLastPost: daysSince(lastPost),
          lastPostLabel: fmtPostDate(lastPost),
        };
      })
      .sort((a, b) => b.currentFollowers - a.currentFollowers);
  }, [current, perPageGrowth, perPageSeries]);

  // ── Loading / error states ──
  if (isLoading && current.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <RefreshCw className="w-7 h-7 animate-spin text-sky-500" />
        <p className="text-sm font-medium">Loading page scorecards…</p>
      </div>
    );
  }

  if (error && current.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-300">Could not load page scorecards</p>
          <p className="text-xs text-red-400/80 mt-1">{error}</p>
          <button
            onClick={() => loadData(true)}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Section header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <LayoutGrid className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Page Scorecards</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Total posts, last-post reach &amp; posting recency across {pagesTracked} pages
              {windowDays > 1 ? ` · ${windowDays}-day follower trend` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-slate-500 hidden sm:block">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-[#0b1324] text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Data-source notice */}
      {(isMockFallback || permissionNotice) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/90">
            {permissionNotice ||
              "Showing high-fidelity sample data. Live values will appear once the sheet is reachable."}
          </p>
        </div>
      )}

      {/* Page scorecards — small multiples so a 7.6K page and a 17-follower page each read on their own scale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {scorecards.map((s) => {
          const color = pageColor.get(s.pageName) || OTHER_COLOR;
          const stale = s.daysSinceLastPost !== null && s.daysSinceLastPost >= 3;
          return (
            <div
              key={s.pageName}
              className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3"
            >
              {/* head: name + owner + growth badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-bold text-white text-sm truncate">{s.pageName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 pl-[18px]">{s.stakeholder}</p>
                </div>
                {windowDays > 1 && (
                  <span
                    className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                      s.delta > 0
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : s.delta < 0
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {s.delta > 0 ? <TrendingUp className="w-3 h-3" /> : s.delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                    {s.pct >= 0 ? "+" : ""}
                    {s.pct.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* follower count + sparkline */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <span className="text-2xl font-extrabold text-white tracking-tight">
                    {fmtNum(s.currentFollowers)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">followers</span>
                </div>
                <div className="h-10 flex-1 max-w-[150px]">
                  {s.spark.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={s.spark} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={color}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Tooltip
                          cursor={{ stroke: "#334155", strokeWidth: 1 }}
                          content={({ active, payload }: any) =>
                            active && payload && payload.length ? (
                              <div className="bg-[#070d18] border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-mono text-white shadow-xl">
                                {fmtDateShort(payload[0].payload.iso)} · {fmtNum(payload[0].value)}
                              </div>
                            ) : null
                          }
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-end text-[10px] text-slate-600">
                      single snapshot
                    </div>
                  )}
                </div>
              </div>

              {/* footer stat grid: total posts · last-post reach · posting recency */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/70 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">Posts</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {s.totalContent}
                    {s.contentGain > 0 && (
                      <span className="text-emerald-400 font-semibold"> +{s.contentGain}</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Last post views</span>
                  <span className="text-xs font-bold text-slate-200 font-mono">
                    {fmtNum(s.lastContentViews)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Last post date</span>
                  <span
                    className={`text-xs font-bold font-mono ${
                      stale ? "text-amber-400" : "text-slate-200"
                    }`}
                  >
                    {s.lastPostLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
