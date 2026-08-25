import { DaywiseClassRecord, CentralClassRecord, ContentRunSheetRecord, PageTrackerRecord, PageHistoryRecord } from "../types";

export interface DaywiseResponse {
  data: {
    headers: string[];
    records: Record<string, any>[];
    normalizedRecords: DaywiseClassRecord[];
    rowCount: number;
    lastUpdated: string;
    isMockFallback?: boolean;
  };
  cached: boolean;
  lastUpdated: string;
}

export interface CentralResponse {
  data: {
    headers: string[];
    records: Record<string, any>[];
    normalizedRecords: CentralClassRecord[];
    rowCount: number;
    lastUpdated: string;
    isMockFallback?: boolean;
  };
  cached: boolean;
  lastUpdated: string;
}

export interface CoordinatorResponse {
  daywise: {
    headers: string[];
    records: Record<string, any>[];
    normalizedRecords: DaywiseClassRecord[];
    rowCount: number;
    lastUpdated: string;
  } | null;
  central: {
    headers: string[];
    records: Record<string, any>[];
    normalizedRecords: CentralClassRecord[];
    rowCount: number;
    lastUpdated: string;
  } | null;
  lastUpdated: string;
}

export interface ContentResponse {
  data: {
    headers: string[];
    records: ContentRunSheetRecord[];
    rowCount: number;
    lastUpdated: string;
    isMockFallback?: boolean;
  };
  cached: boolean;
  lastUpdated: string;
  permissionNotice?: {
    message: string;
    serviceAccount: string;
    spreadsheetId: string;
    error: string;
  };
}

export interface SheetsMetaResponse {
  serviceAccount: string;
  classOps: {
    id: string;
    status: string;
    sheets: string[] | null;
    error?: string;
  };
  contentOps: {
    id: string;
    status: string;
    sheets: string[] | null;
    error?: string;
  };
}

export interface PageTrackerResponse {
  data: {
    current: PageTrackerRecord[];
    history: PageHistoryRecord[];
    pages: string[];
    dates: string[];
    rowCount: number;
    lastUpdated: string;
    isMockFallback?: boolean;
  };
  cached: boolean;
  lastUpdated: string;
  permissionNotice?: {
    message: string;
    serviceAccount: string;
    spreadsheetId: string;
    error: string;
  };
}

export const api = {
  async fetchWithRetry(url: string, retries = 2, delayMs = 500): Promise<any> {
    let lastError: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });
        const contentType = res.headers.get("content-type") || "";
        
        if (res.ok) {
          if (contentType.includes("application/json")) {
            return await res.json();
          }
          // If response is OK but returns HTML (e.g. index.html SPA rewrite), throw to retry or fallback
          const text = await res.text();
          if (text.trim().startsWith("<")) {
            throw new Error(`Server returned HTML instead of JSON from ${url}`);
          }
          try {
            return JSON.parse(text);
          } catch {
            throw new Error(`Invalid JSON payload from ${url}`);
          }
        }
        
        if (attempt === retries) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      } catch (err: any) {
        lastError = err;
        if (attempt === retries) break;
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
    throw lastError || new Error(`Failed to fetch ${url}`);
  },

  async fetchDaywise(force = false): Promise<DaywiseResponse> {
    return await this.fetchWithRetry(`/api/sheets/daywise${force ? "?force=true" : ""}`);
  },

  async fetchCentral(force = false): Promise<CentralResponse> {
    return await this.fetchWithRetry(`/api/sheets/central${force ? "?force=true" : ""}`);
  },

  async fetchCoordinator(force = false): Promise<CoordinatorResponse> {
    return await this.fetchWithRetry(`/api/sheets/coordinator${force ? "?force=true" : ""}`);
  },

  async fetchContent(force = false): Promise<ContentResponse> {
    return await this.fetchWithRetry(`/api/sheets/content${force ? "?force=true" : ""}`);
  },

  async fetchPageTracker(force = false): Promise<PageTrackerResponse> {
    return await this.fetchWithRetry(`/api/sheets/pagetracker${force ? "?force=true" : ""}`);
  },

  async fetchMeta(): Promise<SheetsMetaResponse> {
    return await this.fetchWithRetry("/api/sheets/meta");
  },

  async clearCache(): Promise<void> {
    await fetch("/api/sheets/clear-cache", { method: "POST" });
  },
};
