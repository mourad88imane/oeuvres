/**
 * PAYMENTS PAGE — Liste des paiements avec actions
 */
import { useState, useCallback } from "react";
import { Wallet, Search, Download, RefreshCw, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePayments, useExportPayments, useActiveFiscalYear } from "../api/index";
import { PaymentStatusBadge, PaymentActions } from "../components/FinanceComponents";
import { EmptyState, Spinner, Modal } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { fmtDZD, fmtDate } from "../utils/formatters";
import type { PaymentFilters, Payment } from "../types";

export function PaymentsPage() {
  const { t } = useTranslation();
  const [filters,   setFilters]   = useState<PaymentFilters>({ page: 1, page_size: 25, ordering: "-created_at" });
  const [showFilters, setShowFilters] = useState(false);
  const [selected,  setSelected]  = useState<Payment | null>(null);

  const { data, isLoading, refetch, isFetching } = usePayments(filters);
  useActiveFiscalYear();
  const exportMut = useExportPayments();

  const payments   = data?.results   ?? [];
  const pagination = data?.pagination;

  const upd = useCallback((key: keyof PaymentFilters, val: unknown) => {
    setFilters(p => ({ ...p, [key]: val, page: key !== "page" ? 1 : val as number }));
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("finance.payments")}</h1>
          <p className="text-gray-500 text-sm">{t("finance.paymentsCount", { count: pagination?.count ?? 0 })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <RoleGuard permission="finance.export">
            <button onClick={() => exportMut.mutate(filters)} disabled={exportMut.isPending}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <Download className="w-4 h-4" />{t("finance.exportExcel")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={t("finance.searchPayments")}
              value={filters.search ?? ""} onChange={e => upd("search", e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${showFilters ? "border-brand bg-blue-50 text-brand" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <SlidersHorizontal className="w-4 h-4" />{t("common.filter")}
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            {[
              { key:"status", label:t("finance.status"), opts:[["",t("common.all")],["pending",t("finance.statusPending")],["approved",t("finance.statusApproved")],["paid",t("finance.paid")],["cancelled",t("finance.cancelled")]] },
              { key:"ordering", label:t("common.sortBy"), opts:[["-created_at",t("finance.sortNewest")],["-amount",t("finance.sortAmountDesc")],["amount",t("finance.sortAmountAsc")]] },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <select value={(filters as Record<string, unknown>)[key] as string ?? ""}
                  onChange={e => upd(key as keyof PaymentFilters, e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
                  {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t("finance.aiAnomalies")}</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-2">
                <input type="checkbox" checked={!!filters.anomaly_only}
                  onChange={e => upd("anomaly_only", e.target.checked)}
                  className="w-4 h-4 rounded accent-brand" />
                {t("finance.anomaliesOnly")}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : payments.length === 0 ? (
          <EmptyState icon={Wallet} title={t("finance.noPayments")} description={t("finance.noPaymentsMatch")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[t("finance.reference"),t("finance.employee"),t("finance.benefit"),t("finance.amount"),t("finance.status"),t("finance.mode"),t("finance.date"),t("common.actions")].map((h, i) => (
                    <th key={h} className={`text-left px-4 py-3 font-semibold text-gray-700 ${i > 3 && i < 6 ? "hidden md:table-cell" : ""} ${i === 6 ? "hidden lg:table-cell" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-xs text-gray-800">{p.reference}</p>
                        {p.anomaly_flag && <span className="text-xs text-amber-600">⚠ {t("finance.anomaly")}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.employee_name}</p>
                      <p className="text-xs text-gray-500">{p.employee_matricule}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{p.benefit_type_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.benefit_ref}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{fmtDZD(p.amount)}</p>
                        {p.fees > 0 && <p className="text-xs text-gray-400">{t("finance.fee")} : {fmtDZD(p.fees)}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><PaymentStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-gray-600">{p.method_display}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {p.executed_date ? fmtDate(p.executed_date) : fmtDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setSelected(p)}
                          className="text-xs text-brand hover:underline">{t("finance.view")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">{t("finance.results", { count: pagination.count })}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => upd("page",(filters.page??1)-1)} disabled={!pagination.previous}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
              <span className="px-3 py-1.5 text-sm text-brand font-medium">{pagination.page} / {pagination.total_pages}</span>
              <button onClick={() => upd("page",(filters.page??1)+1)} disabled={!pagination.next}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Payment detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`${t("finance.payment")} — ${selected?.reference}`} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                [t("finance.employee"),    selected.employee_name],
                [t("finance.matricule"),   selected.employee_matricule],
                [t("finance.benefit"),     selected.benefit_type_name],
                [t("finance.benefitRef"),  selected.benefit_ref],
                [t("finance.amount"),      fmtDZD(selected.amount)],
                [t("finance.mode"),        selected.method_display],
                [t("finance.budgetCode"),  selected.budget_code || "—"],
                [t("finance.fiscalYear"),  selected.fiscal_year_label],
                [t("finance.bankReference"),selected.bank_reference || "—"],
                [t("finance.executionDate"), fmtDate(selected.executed_date)],
              ].map(([l,v]) => (
                <div key={l} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400">{l}</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{v}</p>
                </div>
              ))}
            </div>
            <PaymentStatusBadge status={selected.status} />
            <PaymentActions payment={selected} onUpdate={() => { refetch(); setSelected(null); }} />
          </div>
        )}
      </Modal>
    </div>
  );
}
