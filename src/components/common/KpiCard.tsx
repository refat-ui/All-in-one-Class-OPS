import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  icon: LucideIcon;
  variant?: "blue" | "emerald" | "amber" | "rose" | "purple" | "indigo" | "slate";
  onClick?: () => void;
  active?: boolean;
}

const variantStyles = {
  blue: {
    accentBorder: "border-l-indigo-600",
    iconBg: "bg-indigo-50 text-indigo-600",
    activeRing: "ring-2 ring-indigo-600 border-indigo-200",
  },
  emerald: {
    accentBorder: "border-l-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600",
    activeRing: "ring-2 ring-emerald-600 border-emerald-200",
  },
  amber: {
    accentBorder: "border-l-amber-500",
    iconBg: "bg-amber-50 text-amber-600",
    activeRing: "ring-2 ring-amber-500 border-amber-200",
  },
  rose: {
    accentBorder: "border-l-rose-500",
    iconBg: "bg-rose-50 text-rose-600",
    activeRing: "ring-2 ring-rose-500 border-rose-200",
  },
  purple: {
    accentBorder: "border-l-purple-600",
    iconBg: "bg-purple-50 text-purple-600",
    activeRing: "ring-2 ring-purple-600 border-purple-200",
  },
  indigo: {
    accentBorder: "border-l-indigo-600",
    iconBg: "bg-indigo-50 text-indigo-600",
    activeRing: "ring-2 ring-indigo-600 border-indigo-200",
  },
  slate: {
    accentBorder: "border-l-slate-600",
    iconBg: "bg-slate-100 text-slate-700",
    activeRing: "ring-2 ring-slate-600 border-slate-300",
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  id,
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = "slate",
  onClick,
  active = false,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      id={id || `kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      className={`bg-white p-5 rounded-xl border border-slate-200 border-l-4 ${styles.accentBorder} shadow-xs transition-all duration-150 ${
        onClick
          ? "cursor-pointer hover:border-slate-300 hover:shadow-sm active:scale-[0.99]"
          : ""
      } ${active ? styles.activeRing : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        <div className={`p-2 rounded-lg ${styles.iconBg} shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {trend && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                trend.neutral
                  ? "bg-slate-100 text-slate-700"
                  : trend.positive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-500 text-xs truncate" title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
