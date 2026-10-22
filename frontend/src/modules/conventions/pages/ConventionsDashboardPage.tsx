import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, FileText, AlertTriangle, CheckCircle2,
  Clock, Building2, RefreshCw, Search,
  ChevronLeft, ChevronRight, Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useConventionDashboard, useConventions, useConventionAlerts,
} from "../api/index";
import { ConventionCard, ConventionAlertPanel, ConventionKpiCard } from "../components/ConventionComponents";
import { EmptyState, Spinner } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import type { ConventionFilters } from "../types";

export function ConventionsDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ConventionFilters>({ page: 1, page_size: 12, ordering: "-created_at" });
  const [search, setSearch] = useState("");

  const { data: dashboard, isLoading: dashLoading } = useConventionDashboard();
  const { data: convData, isLoading, refetch } = useConventions(filters);
  const { data: alertData } = useConventionAlerts({ unresolved: "true", page_size: "10" });

  const conventions = convData?.results ?? [];
  const pagination = convData?.pagination;
  const alerts = alertData?.results ?? [];

  const upd = (key: keyof ConventionFilters, val: unknown) => {
    setFilters(p => ({ ...p, [key]: val, page: key !== "page" ? 1 : val as number }));
  };

  const handleSearch = () => {
    upd("search", search);
  };

  if (dashLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("conventions.title")}</h1>
          <p className="text-gray-500 text-sm">{t("conventions.conventionsCount", { count: dashboard?.total ?? 0 })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <RoleGuard permission="convention.create">
            <button onClick={() => navigate("/conventions/new")}
              className="flex items-center gap-2 px-3 py-2 bg-brand text-white text-sm rounded-lg hover:bg-blue-800">
              <Plus className="w-4 h-4" />{t("conventions.newConvention")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <ConventionKpiCard
            label={t("common.all")} value={String(dashboard.total)}
            icon={FileText} iconBg="bg-gray-100" iconColor="text-gray-600"
          />
          <ConventionKpiCard
            label={t("conventions.active")} value={String(dashboard.active)}
            icon={CheckCircle2} iconBg="bg-green-100" iconColor="text-green-600"
          />
          <ConventionKpiCard
            label={t("conventions.expiringSoon")} value={String(dashboard.expiring_soon)}
            icon={Clock} iconBg="bg-amber-100" iconColor="text-amber-600"
            alert={dashboard.expiring_soon > 0}
          />
          <ConventionKpiCard
            label={t("conventions.expired")} value={String(dashboard.expired)}
            icon={AlertTriangle} iconBg="bg-red-100" iconColor="text-red-600"
            alert={dashboard.expired > 0}
          />
          <ConventionKpiCard
            label={t("conventions.draft")} value={String(dashboard.draft)}
            icon={FileText} iconBg="bg-gray-100" iconColor="text-gray-500"
          />
          <ConventionKpiCard
            label={t("conventions.terminated")} value={String(dashboard.terminated)}
            icon={BarChart3} iconBg="bg-gray-100" iconColor="text-gray-400"
          />
        </div>
      )}

      {/* Search + Filter */}
      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={t("conventions.searchConventions")}
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={filters.status ?? ""} onChange={e => upd("status", e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
            <option value="">{t("conventions.allStatuses")}</option>
            <option value="draft">{t("conventions.draft")}</option>
            <option value="active">{t("conventions.active")}</option>
            <option value="expiring_soon">{t("conventions.expiringSoon")}</option>
            <option value="expired">{t("conventions.expired")}</option>
            <option value="terminated">{t("conventions.terminated")}</option>
          </select>
          <select value={filters.ordering ?? "-start_date"} onChange={e => upd("ordering", e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
            <option value="-start_date">{t("conventions.newest")}</option>
            <option value="end_date">{t("conventions.deadlineAsc")}</option>
            <option value="-end_date">{t("conventions.deadlineDesc")}</option>
          </select>
        </div>
        <div className="flex gap-3 mt-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={!!filters.expiring_soon}
              onChange={e => upd("expiring_soon", e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-brand" />
            {t("conventions.expiringSoon")}
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={!!filters.expired}
              onChange={e => upd("expired", e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-brand" />
            {t("conventions.expired")}
          </label>
        </div>
      </div>

      {/* Contenu */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Liste conventions */}
        <div className="xl:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : conventions.length === 0 ? (
            <EmptyState icon={Building2} title={t("conventions.noConventions")}
              description={t("conventions.noConventionsDescription")} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conventions.map(c => (
                <div key={c.id} onClick={() => navigate(`/conventions/${c.id}`)}
                  className="cursor-pointer">
                  <ConventionCard convention={c as never} />
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">{t("conventions.results", { count: pagination.count })}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => upd("page", (filters.page ?? 1) - 1)} disabled={!pagination.previous}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-sm text-brand font-medium">
                  {pagination.page} / {pagination.total_pages}
                </span>
                <button onClick={() => upd("page", (filters.page ?? 1) + 1)} disabled={!pagination.next}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alertes */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {t("conventions.alerts")}
                {alerts.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </h3>
            </div>
            <ConventionAlertPanel alerts={alerts} maxItems={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
