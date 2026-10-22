import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  FileText, Coins, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { useLoans, useDeleteLoan, useLoanStatistics } from "../hooks/useLoans";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { ConfirmDialog, Spinner, EmptyState } from "@shared/components/ui/index";
import type { LoanFilters, WorkflowState } from "../types";
import { STATE_UI } from "../types";

const PAGE_SIZES = [10, 25, 50, 100];

const STATE_TABS: { key: string; labelKey: string }[] = [
  { key: "",       labelKey: "loans.all" },
  { key: "draft",  labelKey: "loans.statusDraft" },
  { key: "submitted", labelKey: "loans.statusSubmitted" },
  { key: "under_review", labelKey: "loans.statusUnderReview" },
  { key: "validated", labelKey: "loans.statusValidated" },
  { key: "paid",   labelKey: "loans.statusPaid" },
  { key: "rejected", labelKey: "loans.statusRejected" },
];

export function LoansListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LoanFilters>({ page: 1, page_size: 25, ordering: "-created_at" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useLoans(filters);
  const { data: stats } = useLoanStatistics();
  const deleteMutation = useDeleteLoan();

  const loans = data?.results ?? [];
  const pagination = data?.pagination;

  const updateFilter = useCallback((key: keyof LoanFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== "page" ? 1 : value as number }));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("loans.title")}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pagination ? t("loans.count", { count: pagination.count }) : t("common.loading")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <RoleGuard permission="loan.create">
            <button onClick={() => navigate("/loans/new")}
              className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
              <Plus className="w-4 h-4" />{t("loans.newLoan")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 font-medium">{t("loans.total")}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.pending_count}</p>
                <p className="text-xs text-gray-500 font-medium">{t("loans.pending")}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.paid_count}</p>
                <p className="text-xs text-gray-500 font-medium">{t("loans.paid")}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{stats.rejected_count}</p>
                <p className="text-xs text-gray-500 font-medium">{t("loans.rejected")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {STATE_TABS.map((tab) => (
          <button key={tab.key} onClick={() => updateFilter("state", tab.key)}
            className={clsx(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
              filters.state === tab.key
                ? "bg-brand text-gray-900"
                : "text-gray-500 hover:bg-gray-100"
            )}>
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder={t("loans.searchPlaceholder")}
          value={filters.search || ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-brand transition-colors" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : loans.length === 0 ? (
        <EmptyState icon={Coins} title={t("loans.noLoans")} description={t("loans.noLoansDescription")} />
      ) : (
        <div className="space-y-2">
          {loans.map((loan) => (
            <div key={loan.id}
              onClick={() => navigate(`/loans/${loan.id}`)}
              className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-sm transition-shadow cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-gray-900">{loan.reference}</span>
                    <span className={clsx(
                      "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                      STATE_UI[loan.workflow_state as WorkflowState]?.badgeClass || "bg-gray-100 text-gray-700"
                    )}>
                      {loan.state_label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium truncate">{loan.employee_name}</p>
                  <p className="text-xs text-gray-400">{loan.employee_matricule} · {loan.department_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-black text-gray-900">{loan.amount_display}</p>
                  {loan.submitted_at && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(loan.submitted_at).toLocaleDateString("fr-DZ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <select value={filters.page_size} onChange={(e) => updateFilter("page_size", Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600">
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
          <div className="flex items-center gap-2">
            <button onClick={() => updateFilter("page", (filters.page || 1) - 1)}
              disabled={!pagination.previous}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500 font-medium">
              Page {pagination.page} / {pagination.total_pages}
            </span>
            <button onClick={() => updateFilter("page", (filters.page || 1) + 1)}
              disabled={!pagination.next}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("loans.confirmDeleteTitle")}
        message={t("loans.confirmDeleteMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
