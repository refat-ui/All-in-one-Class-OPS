import React, { useMemo } from "react";
import { DaywiseClassRecord } from "../types";
import {
  Building,
  Radio,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  FileText,
  Video,
} from "lucide-react";
import { parseTimeToDecimalRange } from "../utils/timeUtils";

interface StudioCardsViewProps {
  records: DaywiseClassRecord[];
  currentTimeDecimal: number;
  isToday?: boolean;
  onSelectClass: (record: DaywiseClassRecord) => void;
}

const ALL_STUDIOS = [
  "Studio 1 - HQ1",
  "Studio 2 - HQ1",
  "Studio 3 - HQ1",
  "Studio 4 - HQ1",
  "Studio 5 - HQ5",
  "Studio 6 - HQ5",
  "Studio 7 - HQ5",
  "Studio 8 - HQ5",
  "Studio 9 - HQ5",
  "Studio 10 - HQ1",
  "Studio 11 - HQ5",
  "Studio 12 - HQ5",
  "Studio 13 - HQ1",
  "Studio 14 - HQ1",
];

export const StudioCardsView: React.FC<StudioCardsViewProps> = ({
  records,
  currentTimeDecimal,
  isToday = true,
  onSelectClass,
}) => {
  const studioCards = useMemo(() => {
    const map = new Map<string, DaywiseClassRecord[]>();

    records.forEach((r) => {
      const s = r.studio || "Studio 1 - HQ1";
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(r);
    });

    const studios = Array.from(new Set([...ALL_STUDIOS, ...Array.from(map.keys())]));

    return studios.map((studioName) => {
      const studioRecords = map.get(studioName) || [];

      // Sort by start time
      const sorted = [...studioRecords].sort((a, b) => {
        const pa = parseTimeToDecimalRange(a.scheduledTime)?.start || 0;
        const pb = parseTimeToDecimalRange(b.scheduledTime)?.start || 0;
        return pa - pb;
      });

      // Find current running class
      let runningClass: DaywiseClassRecord | null = null;
      const upcomingClasses: DaywiseClassRecord[] = [];
      const pastClasses: DaywiseClassRecord[] = [];

      sorted.forEach((r) => {
        const parsed = parseTimeToDecimalRange(r.scheduledTime);
        const start = parsed ? parsed.start : 0;
        const end = parsed ? parsed.end : 0;

        if (isToday) {
          if (currentTimeDecimal >= start && currentTimeDecimal < end) {
            runningClass = r;
          } else if (currentTimeDecimal < start) {
            upcomingClasses.push(r);
          } else {
            pastClasses.push(r);
          }
        } else {
          // On other dates (e.g. tomorrow/future), all classes are upcoming
          upcomingClasses.push(r);
        }
      });

      return {
        studioName,
        runningClass,
        upcomingClasses,
        pastClasses,
        total: sorted.length,
      };
    });
  }, [records, currentTimeDecimal, isToday]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {studioCards.map((card) => {
        const isLive = !!card.runningClass;

        return (
          <div
            key={card.studioName}
            className={`rounded-2xl p-5 border flex flex-col justify-between transition-all ${
              isLive
                ? "bg-[#13112b] border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-500/40"
                : "bg-[#0b1324] border-slate-800 hover:border-slate-700 shadow-md"
            }`}
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isLive
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-blue-950/40 text-blue-400 border border-blue-800/50"
                    }`}
                  >
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {card.studioName}
                    </h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {card.total} classes today
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isLive
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                      : card.total > 0
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                  {isLive ? "LIVE NOW" : card.total > 0 ? "SCHEDULED" : "IDLE"}
                </span>
              </div>

              {/* Running Class Card */}
              {card.runningClass ? (
                <div
                  onClick={() => onSelectClass(card.runningClass!)}
                  className="mt-4 p-3.5 bg-red-950/30 border border-red-500/50 rounded-xl cursor-pointer hover:bg-red-950/50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-red-400 animate-pulse" />
                      ON AIR ({card.runningClass.scheduledTime})
                    </span>
                    <span className="text-[10px] bg-red-900/60 text-red-200 px-1.5 py-0.2 rounded font-semibold border border-red-700">
                      {card.runningClass.productType || "Live"}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    {card.runningClass.course}: {card.runningClass.topic}
                  </p>
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" />
                    {card.runningClass.teacher1}
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3.5 bg-[#070d18] border border-slate-800/80 rounded-xl text-center">
                  <p className="text-xs text-slate-400">
                    Studio room currently available
                  </p>
                </div>
              )}

              {/* Upcoming Queue */}
              {card.upcomingClasses.length > 0 && (
                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Upcoming Next ({card.upcomingClasses.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {card.upcomingClasses.slice(0, 3).map((up, idx) => (
                      <div
                        key={up._rowIndex || up.topic || idx}
                        onClick={() => onSelectClass(up)}
                        className="p-2 bg-[#0e172e] hover:bg-[#142347] border border-slate-800 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-white truncate">
                            {up.course}: {up.topic}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {up.teacher1}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/60">
                          {up.scheduledTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Past completed: {card.pastClasses.length}</span>
              {card.runningClass ? (
                <button
                  onClick={() => onSelectClass(card.runningClass!)}
                  className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  View Stream
                </button>
              ) : card.upcomingClasses.length > 0 ? (
                <button
                  onClick={() => onSelectClass(card.upcomingClasses[0])}
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Next Details
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};
