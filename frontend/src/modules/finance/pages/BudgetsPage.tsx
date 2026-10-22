/**
 * BUDGETS PAGE — Budgets et rapport de consommation
 */
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Download, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBudgets, useConsumptionReport, useActiveFiscalYear, useApproveBudget } from "../api/index";
import { financeApi } from "../api/index";
import { BudgetCard } from "../components/FinanceComponents";
import { EmptyState, Spinner } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { fmtDZD, fmtPct } from "../utils/formatters";
import type { BudgetFilters } from "../types";

export function BudgetsPage() {
  const { t } = useTranslation();
  const [filters] = useState<BudgetFilters>({});
  const { data: activeFY }    = useActiveFiscalYear();
  const fyId = activeFY?.id;

  const { data: budgetsData, isLoading, refetch } = useBudgets(
    fyId ? { ...filters, fiscal_year: fyId } : filters
  );
  const { data: reportData } = useConsumptionReport(fyId ?? null);
  const approveMut = useApproveBudget();

  const budgets = budgetsData?.results ?? [];
  const report  = (reportData as { data?: unknown[] })?.data ?? [];

  // Totaux pour le pie chart
  const totals = report.reduce((acc: { allocated: number; paid: number; available: number }, b: unknown) => {
    const item = b as { allocated: number; paid: number; available: number };
    return {
      allocated: acc.allocated + item.allocated,
      paid:      acc.paid      + item.paid,
      available: acc.available + item.available,
    };
  }, { allocated: 0, paid: 0, available: 0 });

  const pieData = [
    { name: "Payé",       value: totals.paid,      color: "#10B981" },
    { name: "Disponible", value: Math.max(0, totals.available), color: "#E5E7EB" },
  ].filter(d => d.value > 0);

  const handleExport = async () => {
    if (!fyId) return;
    const r = await financeApi.exportBudgets(fyId);
    const url = URL.createObjectURL(new Blob([r.data]));
    const a = document.createElement("a");
    a.href = url; a.download = "budgets.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("finance.budgets")}</h1>
          <p className="text-gray-500 text-sm">{t("finance.budgetsCount", { count: budgets.length })}{activeFY ? ` — ${t("finance.fiscalYear")} ${activeFY.year}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          {fyId && (
            <RoleGuard permission="finance.export">
              <button onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Download className="w-4 h-4" />{t("finance.exportExcel")}
              </button>
            </RoleGuard>
          )}
        </div>
      </div>

      {/* Summary + Pie */}
      {report.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Stats globales */}
          <div className="xl:col-span-2 card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("finance.budgetSummary")}</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: t("finance.totalAllocated"), value: fmtDZD(totals.allocated, true), color: "text-brand" },
                { label: t("finance.totalSpent"),     value: fmtDZD(totals.paid, true),      color: "text-green-700" },
                { label: t("finance.totalAvailable"), value: fmtDZD(totals.available, true), color: totals.available < 0 ? "text-red-600" : "text-emerald-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {/* Top consommateurs */}
            <div className="space-y-2">
              {(report as Array<{ code: string; label: string; benefit_type: string; consumption_rate: number; allocated: number; paid: number; is_alert: boolean; is_overrun: boolean }>)
                .sort((a, b) => b.consumption_rate - a.consumption_rate)
                .slice(0, 5)
                .map(b => (
                  <div key={b.code} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 truncate">{b.code}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-700 truncate max-w-[120px]">{b.benefit_type || b.label}</span>
                        <span className={`font-semibold ${b.consumption_rate >= 100 ? "text-red-600" : b.consumption_rate >= 80 ? "text-amber-600" : "text-green-600"}`}>
                          {fmtPct(b.consumption_rate)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${b.is_overrun ? "bg-red-500" : b.is_alert ? "bg-amber-400" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(b.consumption_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right">{fmtDZD(b.paid, true)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Pie */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("finance.budgetBreakdown")}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                  dataKey="value" paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtDZD(v)} contentStyle={{ borderRadius: "8px", fontSize:"12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-medium text-gray-800">{fmtDZD(d.value, true)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Budget cards grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : budgets.length === 0 ? (
        <EmptyState icon={TrendingUp} title={t("finance.noBudgets")} description={t("finance.noBudgetsDescription")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map(b => (
            <BudgetCard key={b.id} budget={b} onApprove={(id) => approveMut.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
