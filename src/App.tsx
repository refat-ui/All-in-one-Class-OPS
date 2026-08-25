import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Header,
  ActiveTab,
} from "./components/Header";
import { DaywiseRealtimeDashboard } from "./components/DaywiseRealtimeDashboard";
import { CentralClassOpsDashboard } from "./components/CentralClassOpsDashboard";
import { StudioCoordinatorDashboard } from "./components/StudioCoordinatorDashboard";
import { ContentEditingDashboard } from "./components/ContentEditingDashboard";
import { TeacherDashboardFrame } from "./components/TeacherDashboardFrame";
import { ConnectionModal } from "./components/common/ConnectionModal";
import {
  api,
  DaywiseResponse,
  CentralResponse,
  CoordinatorResponse,
  ContentResponse,
  SheetsMetaResponse,
} from "./services/api";
import {
  AlertCircle,
  RefreshCw,
  Loader2,
  Database,
  Radio,
  CalendarDays,
  LayoutGrid,
  Video,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("daywise");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 30 seconds default
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [meta, setMeta] = useState<SheetsMetaResponse | null>(null);

  // Tab Data States
  const [daywiseData, setDaywiseData] = useState<DaywiseResponse["data"] | null>(null);
  const [centralData, setCentralData] = useState<CentralResponse["data"] | null>(null);
  const [coordinatorData, setCoordinatorData] = useState<CoordinatorResponse | null>(null);
  const [contentData, setContentData] = useState<ContentResponse | null>(null);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of loaded tabs
  const loadedTabsRef = useRef<Set<ActiveTab>>(new Set());

  // Load Meta
  useEffect(() => {
    api.fetchMeta().then(setMeta).catch(() => {});
  }, []);

  // Fetch data for a specific tab
  const fetchTabData = useCallback(
    async (tab: ActiveTab, force = false) => {
      setError(null);
      try {
        if (tab === "daywise") {
          const res = await api.fetchDaywise(force);
          setDaywiseData(res.data);
          setLastUpdated(res.lastUpdated || new Date().toISOString());
        } else if (tab === "central") {
          const res = await api.fetchCentral(force);
          setCentralData(res.data);
          setLastUpdated(res.lastUpdated || new Date().toISOString());
        } else if (tab === "coordinator") {
          const res = await api.fetchCoordinator(force);
          setCoordinatorData(res);
          setLastUpdated(res.lastUpdated || new Date().toISOString());
        } else if (tab === "content") {
          const res = await api.fetchContent(force);
          setContentData(res);
          setLastUpdated(res.lastUpdated || new Date().toISOString());
        }
        loadedTabsRef.current.add(tab);
      } catch (err: any) {
        console.error(`Error loading data for ${tab}:`, err);
        setError("Unable to load data. Please check the connection and try again.");
      }
    },
    []
  );

  // Initial tab loading or on tab switch if not yet loaded
  useEffect(() => {
    if (!loadedTabsRef.current.has(activeTab)) {
      setIsLoading(true);
      fetchTabData(activeTab, false).finally(() => setIsLoading(false));
    }
  }, [activeTab, fetchTabData]);

  // Force Refresh current tab or all loaded tabs
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await fetchTabData(activeTab, true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh interval timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      // Background silent refresh for current active tab
      fetchTabData(activeTab, true);
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, activeTab, fetchTabData]);

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans antialiased selection:bg-red-500/30 selection:text-white">
      {/* Top Persistent Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lastUpdated={lastUpdated}
        isLoading={isRefreshing || isLoading}
        onRefresh={handleRefresh}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
        onOpenConnectionModal={() => setIsConnectionModalOpen(true)}
        meta={meta}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-3 sm:px-5 md:px-6 lg:px-8 py-3.5 sm:py-5 md:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Error Alert Box */}
        {error && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between gap-3 text-rose-300 text-sm shadow-md animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <span className="font-semibold">{error}</span>
                <span className="text-xs text-rose-400 block mt-0.5">
                  Verify Google Sheets connectivity or credentials.
                </span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* Loading Spinner for Initial Tab Load */}
        {isLoading && !daywiseData && !centralData && !coordinatorData && !contentData ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-[#0b1324] rounded-2xl border border-slate-800 shadow-xl">
            <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            <p className="font-semibold text-white text-sm">
              Connecting directly to Google Sheets API...
            </p>
            <p className="text-xs text-slate-400">
              Fetching and normalizing operational records in real-time
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1 — Class OPS Studio Realtime Update */}
            {activeTab === "daywise" && daywiseData && (
              <DaywiseRealtimeDashboard
                records={daywiseData.normalizedRecords || []}
                rawHeaders={daywiseData.headers || []}
                rawRecords={daywiseData.records || []}
                lastUpdated={lastUpdated}
                isLoading={isRefreshing}
                onRefresh={handleRefresh}
              />
            )}

            {/* TAB 2 — Class Operational Dashboard 2026 */}
            {activeTab === "central" && centralData && (
              <CentralClassOpsDashboard
                records={centralData.normalizedRecords || []}
                rawHeaders={centralData.headers || []}
                rawRecords={centralData.records || []}
                lastUpdated={lastUpdated}
                isLoading={isRefreshing}
                onRefresh={handleRefresh}
              />
            )}

            {/* TAB 3 — Studio Coordinator Update */}
            {activeTab === "coordinator" && (
              <StudioCoordinatorDashboard
                daywiseRecords={coordinatorData?.daywise?.normalizedRecords || daywiseData?.normalizedRecords || []}
                centralRecords={coordinatorData?.central?.normalizedRecords || centralData?.normalizedRecords || []}
                rawHeadersDaywise={coordinatorData?.daywise?.headers || daywiseData?.headers || []}
                rawRecordsDaywise={coordinatorData?.daywise?.records || daywiseData?.records || []}
                lastUpdated={lastUpdated}
                isLoading={isRefreshing}
                onRefresh={handleRefresh}
              />
            )}

            {/* TAB 4 — Content Editing Dashboard */}
            {activeTab === "content" && contentData && (
              <ContentEditingDashboard
                records={contentData.data.records || []}
                rawHeaders={contentData.data.headers || []}
                lastUpdated={lastUpdated}
                isLoading={isRefreshing}
                onRefresh={handleRefresh}
                permissionNotice={contentData.permissionNotice}
              />
            )}

            {/* TAB 5 — Teacher Dashboard Overview (external app embedded in-site) */}
            {activeTab === "teacher" && <TeacherDashboardFrame />}
          </>
        )}
      </main>

      {/* Minimalist Clean Footer */}
      <footer className="bg-[#070d18] border-t border-slate-800 py-3.5 px-6 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            <span className="font-semibold text-slate-200">10MS Class & Content Operations Command</span>
            <span>•</span>
            <span className="text-slate-400">Live Sheets Data Feed</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <span>Read-Only Service Account</span>
            <button
              onClick={() => setIsConnectionModalOpen(true)}
              className="text-red-400 hover:text-red-300 font-semibold transition-colors cursor-pointer"
            >
              Connection Config
            </button>
          </div>
        </div>
      </footer>

      {/* Sheets Connection & Service Account Details Modal */}
      <ConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        meta={meta}
      />
    </div>
  );
}
