import React, { useMemo } from "react";
import { DaywiseClassRecord } from "../types";
import {
  parseTimeToDecimalRange,
  formatDecimalToTime,
} from "../utils/timeUtils";
import { Sparkles, Radio } from "lucide-react";

interface StudioTimelineViewProps {
  records: DaywiseClassRecord[];
  currentTimeDecimal: number;
  isToday?: boolean;
  onSelectClass: (record: DaywiseClassRecord) => void;
}

const TIMELINE_START_HOUR = 11; // 11:00 AM
const TIMELINE_END_HOUR = 23; // 11:00 PM
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 12 hours (11 to 23)

const ORDERED_STUDIOS = [
  "Studio 1 - HQ1",
  "Studio 2 - HQ1",
  "Studio 3 - HQ1",
  "Studio 4 - HQ1",
  "Studio 5 - HQ5",
  "Studio 6 - HQ5",
  "Studio 7 - HQ5",
  "Studio 8 - HQ5",
  "Studio 9 - NB2",
  "Studio 10 - NB2",
  "Studio 11 - NB2",
];

interface TimelineEvent {
  record: DaywiseClassRecord;
  start: number;
  end: number;
  duration: number;
  laneIndex: number;
}

export const StudioTimelineView: React.FC<StudioTimelineViewProps> = ({
  records,
  currentTimeDecimal,
  isToday = true,
  onSelectClass,
}) => {
  // Generate hour markers (11:00 AM to 11:00 PM)
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
      const label = formatDecimalToTime(h, true);
      markers.push({ hour: h, label });
    }
    return markers;
  }, []);

  // Organize classes by studio and compute collision sub-lanes
  const studioTracks = useMemo(() => {
    const map = new Map<string, DaywiseClassRecord[]>();

    records.forEach((r) => {
      let studioName = (r.studio || "").trim();
      if (!studioName || studioName === "Unassigned") {
        studioName = "Unassigned";
      }
      if (!map.has(studioName)) map.set(studioName, []);
      map.get(studioName)!.push(r);
    });

    // Build unique studios list preserving ordered studios first, plus any active studios in records
    const allStudiosSet = new Set<string>();
    ORDERED_STUDIOS.forEach((s) => allStudiosSet.add(s));
    records.forEach((r) => {
      if (r.studio && r.studio.trim() && r.studio !== "Cancelled") {
        allStudiosSet.add(r.studio.trim());
      }
    });

    // Keep studios that are standard or have records
    const studios = Array.from(allStudiosSet);

    return studios.map((studioName) => {
      const studioRecords = map.get(studioName) || [];

      // Parse and sort by start time
      const events: { record: DaywiseClassRecord; start: number; end: number; duration: number }[] = [];

      studioRecords.forEach((rec) => {
        const parsed = parseTimeToDecimalRange(rec.scheduledTime);
        if (parsed) {
          events.push({
            record: rec,
            start: parsed.start,
            end: parsed.end,
            duration: parsed.duration,
          });
        }
      });

      events.sort((a, b) => a.start - b.start);

      // Distribute into non-overlapping sub-lanes
      const subLanes: TimelineEvent[][] = [];

      events.forEach((ev) => {
        let placed = false;
        for (let l = 0; l < subLanes.length; l++) {
          const lastInLane = subLanes[l][subLanes[l].length - 1];
          // If the previous event in this sub-lane ends at or before this event starts
          if (lastInLane.end <= ev.start + 0.05) {
            subLanes[l].push({ ...ev, laneIndex: l });
            placed = true;
            break;
          }
        }
        if (!placed) {
          subLanes.push([{ ...ev, laneIndex: subLanes.length }]);
        }
      });

      if (subLanes.length === 0) {
        subLanes.push([]);
      }

      // Check if any class in this studio is actively live right now (ONLY if viewing today)
      const isStudioActiveNow =
        isToday &&
        events.some(
          (e) => currentTimeDecimal >= e.start && currentTimeDecimal < e.end
        );

      return {
        studioName,
        subLanes,
        totalClasses: studioRecords.length,
        isStudioActiveNow,
        parallelTracksCount: subLanes.length,
      };
    });
  }, [records, currentTimeDecimal, isToday]);

  // Current time position indicator % (clipped gracefully to timeline bounds, ONLY when viewing today)
  const currentTimePercent = useMemo(() => {
    if (!isToday) {
      return null;
    }
    if (currentTimeDecimal <= TIMELINE_START_HOUR) {
      return 0;
    }
    if (currentTimeDecimal >= TIMELINE_END_HOUR) {
      return 100;
    }
    return ((currentTimeDecimal - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100;
  }, [currentTimeDecimal, isToday]);

  // Formatted current time for the red marker badge (e.g. 3:30:15 PM BST)
  const timeMarkerBadge = useMemo(() => {
    const formatted = formatDecimalToTime(currentTimeDecimal, true, true);
    return `${formatted} BST`;
  }, [currentTimeDecimal]);

  return (
    <div className="bg-[#0c1424] border border-slate-800/90 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Banner Header & Legend */}
      <div className="p-3.5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 bg-[#080d19] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <h3 className="text-xs sm:text-sm md:text-base font-bold text-slate-100 tracking-wide">
              Studio Operational Timeline
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Collision-free studio tracks (11:00 AM – 11:00 PM). Overlapping events render in dedicated sub-rows.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 sm:gap-5 text-[11px] sm:text-xs font-semibold flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span>Active (Glowing)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-blue-500" />
            <span>Upcoming</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-slate-600" />
            <span>Past</span>
          </div>
        </div>
      </div>

      {/* Main Scrollable Timeline Grid Container */}
      <div className="overflow-x-auto select-none custom-scrollbar overscroll-x-contain">
        <div className="min-w-[960px] sm:min-w-[1100px] xl:min-w-[1240px]">
          {/* Hour Ruler Header */}
          <div className="flex border-b border-slate-800 bg-[#080d19] sticky top-0 z-30">
            {/* Sticky Studio column label */}
            <div className="w-44 sm:w-52 md:w-56 shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider border-r border-slate-800/80 flex items-center sticky left-0 z-30 bg-[#080d19] shadow-[2px_0_8px_rgba(0,0,0,0.4)]">
              <span>STUDIO LANE</span>
            </div>

            {/* Time hour ticks */}
            <div className="flex-1 flex relative">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.hour}
                  className="flex-1 py-2.5 sm:py-3 px-0.5 sm:px-1 text-[10px] sm:text-[11px] font-mono font-semibold text-slate-400 text-center border-r border-slate-800/40"
                >
                  {marker.label}
                </div>
              ))}

              {/* Red current time badge on timeline header */}
              {currentTimePercent !== null && (
                <div
                  className="absolute top-0 bottom-0 z-40 pointer-events-none transition-all duration-1000 ease-linear"
                  style={{ left: `${currentTimePercent}%` }}
                >
                  <div className="relative -left-1/2 top-1 sm:top-1.5 bg-red-600 text-white font-mono text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded shadow-lg shadow-red-600/50 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap border border-red-400/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>{timeMarkerBadge}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Studio Lanes Table */}
          <div className="divide-y divide-slate-800/80 relative">
            {studioTracks.map((track) => {
              const hasParallelTracks = track.parallelTracksCount > 1;

              return (
                <div
                  key={track.studioName}
                  className="flex hover:bg-[#0f1a30]/40 transition-colors group relative"
                >
                  {/* Sticky Left Studio Lane Card */}
                  <div className="w-44 sm:w-52 md:w-56 shrink-0 p-2.5 sm:p-4 border-r border-slate-800/80 bg-[#080d19] sticky left-0 z-20 flex flex-col justify-center gap-0.5 sm:gap-1 shadow-[2px_0_8px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full shrink-0 ${
                          track.isStudioActiveNow
                            ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                            : "bg-blue-500"
                        }`}
                      />
                      <span className="text-[11px] sm:text-xs font-bold text-slate-100 truncate tracking-wide">
                        {track.studioName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3.5 sm:pl-4 flex-wrap">
                      <span className="text-[10px] sm:text-[11px] text-slate-400">
                        {track.totalClasses} Scheduled
                      </span>

                      {hasParallelTracks && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 rounded bg-red-600 text-white shadow-xs">
                          {track.parallelTracksCount} Parallel
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline Track Content Area */}
                  <div className="flex-1 relative p-2 sm:p-3 min-h-[64px] sm:min-h-[72px] flex flex-col justify-center">
                    {/* Hour grid background column lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {hourMarkers.map((m) => (
                        <div
                          key={m.hour}
                          className="flex-1 border-r border-slate-800/30"
                        />
                      ))}
                    </div>

                    {/* Vertical Red Current Time Line Indicator within the Track */}
                    {currentTimePercent !== null && (
                      <div
                        className="absolute top-0 bottom-0 z-20 pointer-events-none w-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] transition-all duration-1000 ease-linear"
                        style={{ left: `${currentTimePercent}%` }}
                      >
                        <div className="absolute top-0 -left-[3px] w-2 h-2 rounded-full bg-red-400 animate-ping shadow-[0_0_8px_rgba(239,68,68,1)]" />
                      </div>
                    )}

                    {/* Dedicated Sub-Lanes for Non-Overlapping Blocks */}
                    <div className="relative space-y-2 sm:space-y-2.5 z-10 w-full">
                      {track.subLanes.map((laneEvents, laneIdx) => (
                        <div key={laneIdx} className="relative h-[48px] sm:h-[54px] w-full">
                          {laneEvents.map((ev) => {
                            const rawLeft =
                              ((ev.start - TIMELINE_START_HOUR) / TOTAL_HOURS) * 100;
                            const rawWidth = (ev.duration / TOTAL_HOURS) * 100;

                            const left = Math.max(0, Math.min(99, rawLeft));
                            const width = Math.max(2.5, Math.min(100 - left, rawWidth));

                            const isLive =
                              isToday &&
                              currentTimeDecimal >= ev.start &&
                              currentTimeDecimal < ev.end;
                            const isPast = isToday
                              ? currentTimeDecimal >= ev.end
                              : false;

                            // BST 12-Hour formatted time range display (e.g. "4:00 PM - 5:30 PM")
                            const startStr = formatDecimalToTime(ev.start, true);
                            const endStr = formatDecimalToTime(ev.end, true);
                            const timeLabel = ev.record.scheduledTime?.trim() || `${startStr} - ${endStr}`;

                            return (
                              <div
                                key={ev.record._rowIndex || `${ev.start}-${ev.record.topic}`}
                                onClick={() => onSelectClass(ev.record)}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                }}
                                className={`absolute top-0 bottom-0 rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 cursor-pointer transition-all flex flex-col justify-between overflow-hidden active:scale-95 group/block ${
                                  isLive
                                    ? "bg-gradient-to-r from-red-600 via-rose-600 to-blue-700 border border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] ring-1 ring-red-400/50"
                                    : isPast
                                    ? "bg-[#0b1322] border border-slate-800 text-slate-300 hover:border-slate-700"
                                    : "bg-[#0c1b38] border border-blue-500/40 text-slate-100 hover:border-blue-400/80 shadow-md shadow-blue-950/40"
                                }`}
                                title={`${ev.record.course} • ${ev.record.topic}\nTeacher: ${ev.record.teacher1}\nTime: ${ev.record.scheduledTime} (${timeLabel})`}
                              >
                                {/* Top Row: Time & LIVE badge */}
                                <div className="flex items-center justify-between gap-1 leading-none">
                                  <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-tight opacity-90 truncate">
                                    {timeLabel}
                                  </span>

                                  {isLive && (
                                    <span className="px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase bg-red-700 text-white border border-red-300 shadow-xs flex items-center gap-1 shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      LIVE
                                    </span>
                                  )}
                                </div>

                                {/* Middle Row: Subject / Topic Heading */}
                                <div className="font-bold text-[10px] sm:text-xs leading-tight truncate text-white">
                                  {ev.record.subject || ev.record.course || "Class"}
                                </div>

                                {/* Bottom Row: Chapter / Details Subtitle */}
                                <div className="text-[9px] sm:text-[10px] text-slate-200/90 truncate leading-tight">
                                  {ev.record.topic || ev.record.course}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
