import React from "react";
import { X, CheckCircle2, AlertCircle, Copy, Check, FileSpreadsheet, KeyRound, ExternalLink } from "lucide-react";
import { SheetsMetaResponse } from "../../services/api";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: SheetsMetaResponse | null;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  meta,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const serviceEmail =
    meta?.serviceAccount ||
    "ops-api-service@my-project-007-500907.iam.gserviceaccount.com";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(serviceEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b1324] rounded-2xl shadow-2xl border border-slate-800 w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#070d18]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Google Sheets Integration & Credentials
              </h3>
              <p className="text-xs text-slate-400">
                Direct read-only pipeline via Google Sheets API (v4)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs sm:text-sm overflow-y-auto max-h-[80vh]">
          {/* Service Account Box */}
          <div className="p-4 bg-[#070d18] border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Service Account Client Email</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2.5 bg-[#0b1324] border border-slate-700 rounded-lg font-mono text-xs text-emerald-300 select-all overflow-x-auto">
                {serviceEmail}
              </code>
              <button
                onClick={handleCopyEmail}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              To grant access to any Google Sheet, click <strong>Share</strong> in Google Sheets and add this email as a <strong>Viewer</strong>.
            </p>
          </div>

          {/* Connected Sheets List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-400 text-xs uppercase tracking-wider">
              Connected Operations Spreadsheets
            </h4>

            {/* Sheet 1: Class OPS */}
            <div className="p-4 border border-slate-800 rounded-xl space-y-2 bg-[#070d18] shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>10MS Class Operations (Daywise & Central 2026)</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                  meta?.classOps?.status === "fulfilled"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                    : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta?.classOps?.status === "fulfilled" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  {meta?.classOps?.status === "fulfilled" ? "Live Sheets Active" : "Pending Sheet Access"}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 pl-6">
                <div>
                  Spreadsheet ID: <code className="font-mono text-slate-300">{meta?.classOps?.id || "13H2FFJ8WzKbis-Ud9SXlea9NNTM6exnOaguML8MVZI4"}</code>
                </div>
                {meta?.classOps?.sheets && (
                  <div>
                    Available Tabs: <span className="text-slate-300">{meta.classOps.sheets.join(", ")}</span>
                  </div>
                )}
                {meta?.classOps?.error && (
                  <div className="p-2 mt-1 rounded bg-red-950/40 border border-red-800/40 text-red-300 text-[11px]">
                    Note: {meta.classOps.error}
                  </div>
                )}
                <a
                  href={`https://docs.google.com/spreadsheets/d/${meta?.classOps?.id || "13H2FFJ8WzKbis-Ud9SXlea9NNTM6exnOaguML8MVZI4"}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs mt-1 font-medium"
                >
                  Open in Google Sheets <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Sheet 2: Content Run Sheet */}
            <div className="p-4 border border-slate-800 rounded-xl space-y-2 bg-[#070d18] shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>Short Content Run Sheet</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  meta?.contentOps?.status === "fulfilled"
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                    : "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                }`}>
                  {meta?.contentOps?.status === "fulfilled" ? "Live Sheets Active" : "Configured"}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1 pl-6">
                <div>
                  Spreadsheet ID: <code className="font-mono text-slate-300">{meta?.contentOps?.id || "12_o4ZMVue2dBipfp8mwf1YMcpmSR9eFovyCLorMfV50"}</code>
                </div>
                {meta?.contentOps?.sheets && (
                  <div>
                    Available Tabs: <span className="text-slate-300">{meta.contentOps.sheets.join(", ")}</span>
                  </div>
                )}
                <a
                  href={`https://docs.google.com/spreadsheets/d/${meta?.contentOps?.id || "12_o4ZMVue2dBipfp8mwf1YMcpmSR9eFovyCLorMfV50"}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs mt-1 font-medium"
                >
                  Open in Google Sheets <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-[#070d18] flex items-center justify-between">
          <span className="text-xs text-slate-400">Security: Read-Only Service Account Auth</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
