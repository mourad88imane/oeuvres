/**
 * BENEFITS LIST PAGE
 */
import { useState, useCallback } from "react";
import { Gift, Plus, Search, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBenefits, useBenefitStatistics, useCreateBenefit, useDeleteBenefit } from "../hooks/useBenefits";
import { WorkflowBadge, WorkflowTimeline } from "../components/WorkflowComponents";
import { BenefitForm }  from "../components/BenefitForm";
import { Modal, ConfirmDialog, EmptyState, Spinner } from "@shared/components/ui/index";
import { RoleGuard }    from "@shared/components/layout/ProtectedRoute";
import { PRIORITY_UI, CATEGORY_UI } from "../types";
import type { BenefitFilters, WorkflowState, BenefitCreatePayload, BenefitListItem } from "../types";

export function BenefitsPage() {
  const { t } = useTranslation();
  const ALL_TABS = [
    { state:"all",          label: t("common.all") },
    { state:"draft",        label: t("conventions.draft") },
    { state:"submitted",    label: t("benefits.submitted") },
    { state:"under_review", label: t("benefits.underReview") },
    { state:"on_hold",      label: t("benefits.pending") },
    { state:"validated",    label: t("benefits.approved") },
    { state:"paid",         label: t("benefits.paid") },
    { state:"rejected",     label: t("benefits.rejected") },
  ];
  const navigate   = useNavigate();
  const [filters,  setFilters]  = useState<BenefitFilters>({ page:1, page_size:20, ordering:"-created_at" });
  const [tab,      setTab]      = useState<string>("all");
  const [showCreate, setShowCreate]  = useState(false);
  const [deleteId,   setDeleteId]    = useState<string|null>(null);

  const { data, isLoading, refetch, isFetching } = useBenefits(filters);
  const { data: stats } = useBenefitStatistics();
  const createM = useCreateBenefit();
  const deleteM = useDeleteBenefit();

  const benefits   = data?.results   ?? [];
  const pagination = data?.pagination;

  const upd = useCallback((key: keyof BenefitFilters, val: unknown) => {
    setFilters(p => ({ ...p, [key]: val, page: key !== "page" ? 1 : val as number }));
  }, []);

  const switchTab = (t: string) => { setTab(t); upd("state", t === "all" ? "" : t); };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("benefits.title")}</h1>
          <p className="text-gray-500 text-sm">{pagination?.count != null ? t("common.totalItems", { count: pagination.count }) : "—"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <RoleGuard permission="benefit.create">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
              <Plus className="w-4 h-4" />{t("benefits.add")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("benefits.pending"), value: stats.pending_count,  color:"text-blue-600"  },
            { label: t("benefits.paid"),    value: stats.paid_count,     color:"text-green-600" },
            { label: t("benefits.rejected"),value: stats.rejected_count, color:"text-red-600"   },
            { label: t("ai.anomalies.title"),value:stats.anomaly_count,  color:"text-amber-600" },
          ].map(({ label,value,color }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ALL_TABS.map(({ state, label }) => {
          const cnt = state === "all" ? (stats?.total ?? 0) : (stats?.by_state[state] ?? 0);
          return (
            <button key={state} onClick={() => switchTab(state)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                tab === state ? "bg-brand text-white border-brand" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}>
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === state ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder={t("benefits.searchPlaceholder")}
          value={filters.search ?? ""} onChange={e => upd("search", e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : benefits.length === 0 ? (
          <EmptyState icon={Gift} title={t("benefits.noBenefits")} description={t("common.noResults")}
            action={<RoleGuard permission="benefit.create"><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm"><Plus className="w-4 h-4" />{t("common.create")}</button></RoleGuard>}
          />
        ) : (
          benefits.map(b => <BenefitCard key={b.id} benefit={b} onClick={() => navigate(`/benefits/${b.id}`)} />)
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => upd("page",(filters.page??1)-1)} disabled={!pagination.previous} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-3 py-1.5 text-sm text-brand font-medium">{pagination.page} / {pagination.total_pages}</span>
          <button onClick={() => upd("page",(filters.page??1)+1)} disabled={!pagination.next} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modals */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("benefits.add")} size="xl">
        <BenefitForm mode="create"
          onSubmit={async (d: BenefitCreatePayload) => { await createM.mutateAsync(d); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)} isLoading={createM.isPending} />
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deleteM.mutateAsync(deleteId); setDeleteId(null); }}}
        title={t("common.delete")} message={t("common.areYouSure", { action: t("common.delete").toLowerCase() })} confirmLabel={t("common.delete")} loading={deleteM.isPending} />
    </div>
  );
}

function BenefitCard({ benefit, onClick }: { benefit: BenefitListItem; onClick: () => void }) {
  const { t } = useTranslation();
  const cat = CATEGORY_UI[benefit.benefit_category];
  const pri = PRIORITY_UI[benefit.priority];
  return (
    <div className={`card p-4 hover:shadow-md transition-all cursor-pointer border-l-4 ${
      benefit.workflow_state === "rejected" ? "border-l-red-400" :
      benefit.workflow_state === "paid"     ? "border-l-green-400" :
      benefit.workflow_state === "validated"? "border-l-emerald-400" :
      benefit.workflow_state === "on_hold"  ? "border-l-amber-400" : "border-l-transparent"
    }`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl shrink-0">{cat?.icon ?? "📋"}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-mono text-xs text-gray-500">{benefit.reference}</span>
            <WorkflowBadge state={benefit.workflow_state as WorkflowState} />
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${pri.badgeClass}`}>{pri.label}</span>
            {benefit.ai_anomaly_flag && <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />{t("common.status")}</span>}
            {benefit.is_overdue && <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{t("common.warning")}</span>}
          </div>
          <p className="font-medium text-gray-900 truncate">{benefit.title}</p>
          <p className="text-xs text-gray-500">{benefit.employee_name} · {benefit.benefit_type_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-gray-900">{benefit.amount_display}</p>
          {benefit.processing_days != null && <p className="text-xs text-gray-400">{benefit.processing_days}j</p>}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100">
        <WorkflowTimeline benefit={benefit as any} compact />
      </div>
    </div>
  );
}
