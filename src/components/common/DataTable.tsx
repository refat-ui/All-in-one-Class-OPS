import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  Eye,
  ExternalLink,
  X,
} from "lucide-react";

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  id?: string;
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  pageSizeOptions?: number[];
  title?: string;
  subtitle?: string;
  onRowClick?: (row: T) => void;
  rawHeaders?: string[];
  rawRecords?: Record<string, any>[];
  exportFilename?: string;
  dark?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  id,
  data,
  columns,
  searchPlaceholder = "Search records...",
  defaultSortKey,
  defaultSortDir = "asc",
  pageSizeOptions = [10, 25, 50, 100],
  title,
  subtitle,
  onRowClick,
  rawHeaders,
  rawRecords,
  exportFilename = "operations_export.csv",
  dark = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] || 25);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);

  // Global search filtering
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val || "").toLowerCase().includes(term)
      )
    );
  }, [data, search]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null || aVal === "") return 1;
      if (bVal === undefined || bVal === null || bVal === "") return -1;

      // Numerical check
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDir === "asc"
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = "";
    if (rawHeaders && rawRecords && rawRecords.length > 0) {
      // Export full raw spreadsheet format
      csvContent += rawHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
      rawRecords.forEach((r) => {
        const row = rawHeaders.map((h) => {
          const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : "";
          return `"${val.replace(/"/g, '""')}"`;
        });
        csvContent += row.join(",") + "\n";
      });
    } else {
      // Export current columns
      csvContent += columns.map((c) => `"${c.header}"`).join(",") + "\n";
      sortedData.forEach((row) => {
        const line = columns.map((c) => {
          const val = row[c.key as string] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvContent += line.join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", exportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id={id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white">
        <div>
          {title && (
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              {title}
              <span className="text-[11px] font-medium text-slate-600 px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                {filteredData.length} records
              </span>
            </h3>
          )}
          {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export CSV button */}
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            title="Download full CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto min-h-[320px]">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10">
              <th className="py-3 px-3.5 w-12 text-center text-slate-400 font-medium">#</th>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={String(col.key)}
                    style={{ width: col.width }}
                    onClick={() => col.sortable !== false && handleSort(String(col.key))}
                    className={`py-3 px-3.5 select-none whitespace-nowrap ${
                      col.sortable !== false
                        ? "cursor-pointer hover:bg-slate-100/80 transition-colors"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="py-3 px-3 w-16 text-center text-slate-400 font-medium">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="py-12 text-center text-slate-500 bg-white"
                >
                  <p className="font-medium text-slate-700">No records found matching your filters</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your search or clearing active filters.</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowIndex = (page - 1) * pageSize + index + 1;
                return (
                  <tr
                    key={row._rowIndex || rowIndex}
                    onClick={() => (onRowClick ? onRowClick(row) : setSelectedRow(row))}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="py-2.5 px-3.5 text-center text-slate-400 text-xs font-mono">
                      {row._rowIndex || rowIndex}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className="py-2.5 px-3.5 text-slate-700 max-w-[260px] truncate"
                      >
                        {col.render
                          ? col.render(row)
                          : String(row[col.key as string] ?? "-")}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedRow(row)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="View all details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 sm:px-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="font-semibold text-slate-900">{sortedData.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{" "}
            <strong className="font-semibold text-slate-900">{Math.min(page * pageSize, sortedData.length)}</strong> of{" "}
            <strong className="font-semibold text-slate-900">{sortedData.length}</strong> entries
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2.5 font-medium text-slate-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row detail modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Record Details — #{selectedRow._rowIndex || "N/A"}
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedRow.date || selectedRow.assignedDate || "Operations Record"} • {selectedRow.course || selectedRow.category || ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body: all properties */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(selectedRow).map(([key, val]) => {
                  if (key === "_rowIndex") return null;
                  const isLink = String(val).startsWith("http://") || String(val).startsWith("https://");

                  return (
                    <div
                      key={key}
                      className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 space-y-1"
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-slate-800 font-medium break-words">
                        {isLink ? (
                          <a
                            href={String(val)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                          >
                            Open Link <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : String(val) ? (
                          String(val)
                        ) : (
                          <span className="text-slate-400 italic font-normal">None / Empty</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
