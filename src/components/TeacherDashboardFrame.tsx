import React, { useRef, useState, useEffect, useCallback } from "react";
import { Maximize2, Minimize2, ExternalLink, RefreshCw, GraduationCap } from "lucide-react";

const TEACHER_URL = "https://live-class-monitor.vercel.app/teacher-assign";

/**
 * Embeds the Teacher Dashboard Overview (a separate app) inside this site via an iframe.
 *
 * Notes on login: the embedded app lives on a different origin, so browsers treat its
 * session as "third-party" inside an iframe and may block its cookies — which can send you
 * back to the login page. The "Open in new tab" button is a reliable fallback for signing in.
 */
export const TeacherDashboardFrame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Native browser fullscreen (covers the whole screen, hides the OS chrome)
  const [nativeFs, setNativeFs] = useState(false);
  // Fallback "maximize within the browser window" when native fullscreen is unavailable
  const [manualFs, setManualFs] = useState(false);
  const expanded = nativeFs || manualFs;

  useEffect(() => {
    const onChange = () => setNativeFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc closes the manual (non-native) fullscreen too
  useEffect(() => {
    if (!manualFs) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setManualFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [manualFs]);

  const toggleFullscreen = useCallback(async () => {
    // Exit whichever mode is active
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
      setManualFs(false);
      return;
    }
    if (manualFs) {
      setManualFs(false);
      return;
    }
    // Try native fullscreen first, fall back to CSS maximize
    const el = containerRef.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
        return;
      } catch {
        /* fall through to manual */
      }
    }
    setManualFs(true);
  }, [manualFs]);

  const reloadFrame = useCallback(() => {
    if (iframeRef.current) {
      // Reassigning src forces a reload (contentWindow.reload() is blocked cross-origin)
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = TEACHER_URL;
    }
  }, []);

  const toolbarBtn =
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-800 text-slate-300 bg-[#0b1324] hover:bg-[#101b33] hover:text-white";

  return (
    <div
      ref={containerRef}
      className={`bg-[#0b1324] border border-slate-800 shadow-xl overflow-hidden flex flex-col ${
        expanded
          ? "fixed inset-0 z-[70] h-screen w-screen rounded-none border-0"
          : "rounded-2xl"
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800 bg-[#070d18] shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <GraduationCap className="w-4 h-4 text-red-500" />
          Teacher Dashboard Overview
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={reloadFrame} className={toolbarBtn} title="Reload the embedded dashboard">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reload</span>
          </button>
          <a
            href={TEACHER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={toolbarBtn}
            title="Open in a new tab (use this to log in reliably)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in new tab</span>
          </a>
          <button
            onClick={toggleFullscreen}
            className={toolbarBtn}
            title={expanded ? "Exit full screen (Esc)" : "Full screen"}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{expanded ? "Exit" : "Full screen"}</span>
          </button>
        </div>
      </div>

      {/* Embedded app */}
      <iframe
        ref={iframeRef}
        src={TEACHER_URL}
        title="Teacher Dashboard Overview"
        className={`w-full border-0 bg-white ${
          expanded ? "flex-1" : "h-[calc(100vh-200px)] min-h-[560px]"
        }`}
        allow="clipboard-read; clipboard-write; fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};
