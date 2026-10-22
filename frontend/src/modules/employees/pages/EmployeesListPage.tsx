/**
 * EMPLOYEES LIST PAGE — Re-exported from separate file
 * Full implementation in EmployeesPage component below
 */
import { useState, useCallback } from "react";
import { Users, Plus, Search, Download, RefreshCw, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEmployees, useCreateEmployee, useDeleteEmployee, useExportEmployees, useEmployeeStatistics } from "../hooks/useEmployees";
import { EmployeeStatusBadge, Modal, ConfirmDialog, EmptyState, Spinner } from "@shared/components/ui/index";
import { EmployeeForm } from "../components/EmployeeForm";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { fmtDate } from "@shared/utils/format";
import type { EmployeeFilters } from "../types";

const PAGE_SIZES = [10, 25, 50, 100];

export function EmployeesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1, page_size: 25, ordering: "-created_at" });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useEmployees(filters);
  const { data: stats } = useEmployeeStatistics();
  const createMutation  = useCreateEmployee();
  const deleteMutation  = useDeleteEmployee();
  const exportMutation  = useExportEmployees();

  const employees  = data?.results ?? [];
  const pagination = data?.pagination;

  const updateFilter = useCallback((key: keyof EmployeeFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== "page" ? 1 : value as number }));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("employees.title")}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination ? t("common.totalItems", { count: pagination.count }) : t("common.loading")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <RoleGuard permission="employee.export">
            <button onClick={() => exportMutation.mutate(filters)} disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Download className="w-4 h-4" />{t("common.export")} CSV
            </button>
          </RoleGuard>
          <RoleGuard permission="employee.create">
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
              <Plus className="w-4 h-4" />{t("employees.add")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("employees.active"),      value: stats.active_count,                          color:"text-green-600"  },
            { label: t("employees.retired"),     value: stats.retired_count,                         color:"text-amber-600"  },
            { label: t("employees.newThisYear"), value: stats.new_this_year,                         color:"text-blue-600"   },
            { label: t("employees.avgSeniority"), value: `${stats.avg_seniority_years} ${t("employees.seniority").toLowerCase()}`, color:"text-purple-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={t("employees.searchPlaceholder")}
              value={filters.search ?? ""} onChange={(e) => updateFilter("search", e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? "border-brand bg-blue-50 text-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <SlidersHorizontal className="w-4 h-4" />{t("common.filter")}
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            {[
              { key:"status",        label:t("employees.status"),   opts:[["",t("common.all")],["active",t("employees.active")],["inactive",t("employees.inactive")],["retired",t("employees.retired")]] },
              { key:"gender",        label:t("employees.gender"),    opts:[["",t("common.all")],["M",t("employees.male")],["F",t("employees.female")]] },
              { key:"contract_type", label:t("employees.contractType"),  opts:[["",t("common.all")],["cdi",t("employees.cdi")],["cdd",t("employees.cdd")],["stage",t("employees.intern")]] },
              { key:"ordering",      label:t("common.filter"),      opts:[["-created_at",t("employees.sortNewest")],["last_name",t("employees.sortNameAZ")],["-date_hired",t("employees.sortSeniority")]] },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <select value={(filters as any)[key] ?? ""} onChange={(e) => updateFilter(key as keyof EmployeeFilters, e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : employees.length === 0 ? (
          <EmptyState icon={Users} title={t("employees.noEmployees")} description={t("employees.emptySearchDescription")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[t("employees.employee"),`${t("employees.position")} / ${t("employees.grade")}`,t("employees.department"),t("employees.seniority"),t("employees.status"),t("beneficiaries.title"),t("common.actions")].map((h, i) => (
                    <th key={h} className={`text-left px-4 py-3 font-semibold text-gray-700 ${i > 1 && i < 5 ? "hidden lg:table-cell" : ""} ${i === 5 ? "hidden sm:table-cell" : ""} ${i === 6 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp.photo_url
                          ? <img src={emp.photo_url} alt={emp.full_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold shrink-0">{emp.first_name[0]}{emp.last_name[0]}</div>
                        }
                        <div>
                          <p className="font-medium text-gray-900">{emp.full_name}</p>
                          <p className="text-xs text-gray-500 font-mono">{emp.matricule}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-gray-800">{emp.job_title}</p>
                      {emp.grade && <p className="text-xs text-gray-400">{emp.grade}</p>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{emp.department_code}</span>
                      <span className="text-sm text-gray-600 ml-1">{emp.department_name}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-sm text-gray-700">{emp.seniority_label}</p>
                      <p className="text-xs text-gray-400">{fmtDate(emp.date_hired)}</p>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <EmployeeStatusBadge status={emp.status} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-sm font-medium ${emp.beneficiaries_count > 0 ? "text-blue-600" : "text-gray-400"}`}>{emp.beneficiaries_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/employees/${emp.id}`)} className="px-2 py-1 text-xs text-brand hover:bg-blue-50 rounded">{t("employees.view")}</button>
                        <RoleGuard permission="employee.update">
                          <button onClick={() => navigate(`/employees/${emp.id}/edit`)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">{t("common.edit")}</button>
                        </RoleGuard>
                        <RoleGuard permission="employee.delete">
                          <button onClick={() => setDeleteTarget(emp.id)} className="px-2 py-1 text-xs text-red-400 hover:bg-red-50 rounded">{t("common.delete")}</button>
                        </RoleGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t("common.totalItems", { count: pagination.count })}</span>
              <select value={filters.page_size ?? 25} onChange={(e) => updateFilter("page_size", Number(e.target.value))}
                className="text-xs border border-gray-200 rounded px-2 py-1">
                {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}{t("employees.perPage")}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => updateFilter("page",(filters.page??1)-1)} disabled={!pagination.previous}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-3 py-1.5 text-sm text-brand font-medium">{pagination.page} / {pagination.total_pages}</span>
              <button onClick={() => updateFilter("page",(filters.page??1)+1)} disabled={!pagination.next}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("employees.add")} size="xl">
        <EmployeeForm mode="create"
          onSubmit={async (payload) => { await createMutation.mutateAsync(payload); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)} isLoading={createMutation.isPending} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) { await deleteMutation.mutateAsync(deleteTarget); setDeleteTarget(null); }}}
        title={t("employees.confirmDeleteTitle")} message={t("employees.confirmDeleteMessage")}
        confirmLabel={t("common.delete")} loading={deleteMutation.isPending} />
    </div>
  );
}
