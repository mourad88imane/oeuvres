import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Coins, AlertTriangle, FileText, MessageSquare, Activity, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { useLoan, useDeleteLoan, useWorkflowLog, useTransition } from "../hooks/useLoans";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { Spinner, ConfirmDialog, EmptyState } from "@shared/components/ui/index";
import { WorkflowTimeline, WorkflowBadge, WorkflowActions } from "@modules/benefits/components/WorkflowComponents";
import { AttachmentManager } from "@modules/benefits/components/AttachmentManager";
import { CommentsSection } from "@modules/benefits/components/CommentsSection";
import type { WorkflowState } from "../types";

const TABS: { id: string; labelKey: string }[] = [
  { id: "overview",    labelKey: "loans.tabOverview" },
  { id: "attachments", labelKey: "loans.tabAttachments" },
  { id: "comments",    labelKey: "loans.tabComments" },
  { id: "history",     labelKey: "loans.tabHistory" },
];

export function LoanDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showDelete, setShowDelete] = useState(false);
  const deleteMutation = useDeleteLoan();
  const { data: loan, isLoading } = useLoan(id ?? null);
  const loanTransition = useTransition(id ?? "");

  if (isLoading) return (
    <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  );

  if (!loan) return (
    <EmptyState icon={Coins} title={t("loans.notFound")} description={t("loans.notFoundDescription")} />
  );

  const handleRefresh = () => window.location.reload();

  return (
    <div className="space-y-5 animate-fade-in">
      <button onClick={() => navigate("/loans")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t("loans.backToList")}
      </button>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shrink-0">
              <Coins className="w-7 h-7 text-gray-900" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-gray-900">{loan.reference}</h1>
                <WorkflowBadge state={loan.workflow_state as WorkflowState} size="md" />
              </div>
              <p className="text-sm text-gray-500 font-medium">
                {loan.employee_name} · {loan.employee_matricule}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleGuard roles={["admin"]}>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" /> {t("common.delete")}
              </button>
            </RoleGuard>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-3 rounded-xl bg-gray-50">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("loans.amountRequested")}</p>
            <p className="text-lg font-black text-gray-900 mt-0.5">{loan.amount_display}</p>
          </div>
          {loan.approved_amount && (
            <div className="p-3 rounded-xl bg-emerald-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">{t("loans.amountApproved")}</p>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{loan.approved_amount.toLocaleString()} DZD</p>
            </div>
          )}
          {loan.instalment_display && loan.instalment_display !== "—" && (
            <div className="p-3 rounded-xl bg-blue-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">{t("loans.monthlyInstalments")}</p>
              <p className="text-sm font-black text-blue-700 mt-0.5">{loan.instalment_display}</p>
            </div>
          )}
          {loan.submitted_at && (
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t("loans.submittedOn")}</p>
              <p className="text-sm font-bold text-gray-700 mt-0.5">
                {new Date(loan.submitted_at).toLocaleDateString("fr-DZ")}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <p className="text-sm font-bold text-gray-700 mb-1">{t("loans.reason")}</p>
          <p className="text-sm text-gray-600">{loan.reason}</p>
        </div>
        {loan.description && (
          <div className="mt-3">
            <p className="text-sm font-bold text-gray-700 mb-1">{t("loans.description")}</p>
            <p className="text-sm text-gray-600">{loan.description}</p>
          </div>
        )}

        <div className="mt-6">
          <WorkflowTimeline benefit={loan as any} />
        </div>

        <div className="mt-6">
          <WorkflowActions benefit={loan as any} onSuccess={handleRefresh} transitionMutation={loanTransition} />
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id: tabId, labelKey }) => (
          <button key={tabId} onClick={() => setActiveTab(tabId)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px",
              activeTab === tabId
                ? "text-brand border-brand bg-blue-50"
                : "text-gray-500 border-transparent hover:text-gray-700"
            )}>
            {t(labelKey)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-3">
          {loan.validated_by_name && (
            <DetailRow label={t("loans.validatedBy")} value={loan.validated_by_name} />
          )}
          {loan.paid_by_name && (
            <DetailRow label={t("loans.paidBy")} value={loan.paid_by_name} />
          )}
          {loan.payment_reference && (
            <DetailRow label={t("loans.paymentRef")} value={loan.payment_reference} mono />
          )}
          {loan.rejection_reason && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{loan.rejection_reason}</p>
            </div>
          )}
          <DetailRow label={t("loans.createdBy")} value={loan.created_by_name} />
          <DetailRow label={t("loans.lastModified")}
            value={new Date(loan.updated_at).toLocaleDateString("fr-DZ")} />
        </div>
      )}

      {activeTab === "attachments" && (
        <AttachmentManager
          benefitId={id!}
          attachments={loan.attachments as any[]}
        />
      )}

      {activeTab === "comments" && (
        <CommentsSection
          benefitId={id!}
          comments={loan.comments as any[]}
        />
      )}

      {activeTab === "history" && (
        <WorkflowLogSection loanId={id!} />
      )}

      <ConfirmDialog
        open={showDelete}
        title={t("loans.confirmDeleteTitle")}
        message={t("loans.confirmDeleteMessage")}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          deleteMutation.mutate(id!, { onSuccess: () => navigate("/loans") });
          setShowDelete(false);
        }}
        onClose={() => setShowDelete(false)}
      />
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function WorkflowLogSection({ loanId }: { loanId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useWorkflowLog(loanId);

  if (isLoading) return <Spinner size="md" />;
  if (!data?.data?.length) return (
    <EmptyState icon={Activity} title={t("loans.noHistory")} description={t("loans.noHistoryDescription")} />
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
      {data.data.map((entry: any) => (
        <div key={entry.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-gray-400" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">{entry.transition_name}</span>
              <span className="text-xs text-gray-400">
                {new Date(entry.timestamp).toLocaleString("fr-DZ")}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.actor_email} ({entry.actor_role})
            </p>
            {entry.reason && <p className="text-xs text-gray-500 mt-1">{entry.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
