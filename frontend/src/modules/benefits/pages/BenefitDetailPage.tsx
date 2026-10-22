/**
 * BENEFIT DETAIL PAGE — Fiche complète prestation avec workflow
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Edit2, Trash2, Gift, FileText,
  Clock, MessageCircle, ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useBenefit, useBenefitWorkflowLog, useDeleteBenefit,
} from "../hooks/useBenefits";
import { WorkflowBadge, WorkflowTimeline, WorkflowActions, WorkflowLogTimeline } from "../components/WorkflowComponents";
import { AttachmentManager } from "../components/AttachmentManager";
import { CommentsSection }   from "../components/CommentsSection";
import { BenefitForm }       from "../components/BenefitForm";
import { Modal, ConfirmDialog, EmptyState, Spinner, Badge } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { PRIORITY_UI, CATEGORY_UI } from "../types";
import type { WorkflowState } from "../types";

type Tab = "overview" | "attachments" | "comments" | "history";

export function BenefitDetailPage() {
  const { t } = useTranslation();
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab,        setTab]        = useState<Tab>("overview");
  const [showEdit,   setShowEdit]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const { data: benefit, isLoading } = useBenefit(id ?? null);
  const { data: logData }            = useBenefitWorkflowLog(id ?? null);
  const deleteMutation               = useDeleteBenefit();

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",     label: t("common.info"),       icon: Gift        },
    { id: "attachments",  label: t("benefits.attachments"),   icon: FileText    },
    { id: "comments",     label: t("common.comment"),    icon: MessageCircle},
    { id: "history",      label: t("employees.history"), icon: Clock       },
  ];

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!benefit)  return (
    <EmptyState icon={Gift} title={t("benefits.noBenefits")}
      action={<button onClick={() => navigate("/benefits")} className="btn-primary">{t("common.back")}</button>}
    />
  );

  const catCfg = CATEGORY_UI[benefit.benefit_type_info?.category as keyof typeof CATEGORY_UI];
  const priCfg = PRIORITY_UI[benefit.priority];

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id!);
    navigate("/benefits");
  };

  const attachCount  = benefit.attachments?.length ?? 0;
  const commentCount = benefit.comments?.length ?? 0;
  const logCount     = logData?.count ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/benefits")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("common.back")}
        </button>
        <div className="flex items-center gap-2">
          <RoleGuard permission="benefit.update">
            {["draft","on_hold"].includes(benefit.workflow_state) && (
              <button onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" />{t("common.edit")}
              </button>
            )}
          </RoleGuard>
          <RoleGuard permission="benefit.delete">
            {["draft","cancelled","rejected"].includes(benefit.workflow_state) && (
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />{t("common.delete")}
              </button>
            )}
          </RoleGuard>
        </div>
      </div>

      {/* ── Carte d'en-tête ─────────────────────────── */}
      <div className="card p-6 space-y-5">
        {/* Ligne 1: type + référence + badges */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl shrink-0">
            {catCfg?.icon ?? "📋"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {benefit.reference}
              </span>
              <WorkflowBadge state={benefit.workflow_state as WorkflowState} size="md" />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priCfg.badgeClass}`}>
                {priCfg.label}
              </span>
              {benefit.ai_anomaly_flag && (
                <Badge variant="warning">{t("ai.anomalies.title")}</Badge>
              )}
              {benefit.is_overdue && (
                <Badge variant="error">{t("common.warning")}</Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{benefit.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {benefit.benefit_type_info?.name} · {benefit.employee_name}
              {benefit.department_name && ` · ${benefit.department_name}`}
            </p>
          </div>
        </div>

        {/* Montants */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AmountChip label={t("benefits.requestedAmount")}  value={`${Number(benefit.requested_amount).toLocaleString("fr-DZ")} DZD`} />
          <AmountChip label={t("benefits.grantedAmount")}
            value={benefit.approved_amount ? `${Number(benefit.approved_amount).toLocaleString("fr-DZ")} DZD` : "—"}
            highlight={!!benefit.approved_amount}
          />
          <AmountChip label={t("finance.amount")}
            value={benefit.paid_amount ? `${Number(benefit.paid_amount).toLocaleString("fr-DZ")} DZD` : "—"}
            highlight={!!benefit.paid_amount} color="text-green-700"
          />
          <AmountChip
            label={t("common.info")}
            value={benefit.processing_days != null ? `${benefit.processing_days} ${t("common.status")}` : "—"}
          />
        </div>

        {/* Timeline workflow complète */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t("common.info")}
          </p>
          <WorkflowTimeline benefit={benefit} compact={false} />
        </div>

        {/* Actions workflow */}
        {(benefit.workflow_state !== "paid" && benefit.workflow_state !== "rejected") && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {t("common.actions")}
            </p>
            <WorkflowActions benefit={benefit} />
          </div>
        )}
      </div>

      {/* ── Onglets ──────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id: tabId, label, icon: Icon }) => {
          const badge = tabId === "attachments" ? attachCount
            : tabId === "comments" ? commentCount
            : tabId === "history"  ? logCount
            : 0;
          return (
            <button key={tabId} onClick={() => setTab(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === tabId
                  ? "text-brand border-brand bg-blue-50"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {badge > 0 && (
                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════
          TAB : APERÇU
      ════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Description */}
          {benefit.description && (
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("common.description")}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{benefit.description}</p>
            </div>
          )}

          {/* Infos employé */}
          <DetailSection title={t("benefits.employee")} icon={Gift}>
            <InfoRow label={t("employees.lastName")}   value={benefit.employee_name} />
            <InfoRow label={t("employees.matricule")}  value={benefit.employee_matricule} mono />
            <InfoRow label={t("employees.department")} value={benefit.department_name} />
          </DetailSection>

          {/* Infos demande */}
          <DetailSection title={t("benefits.detail")} icon={FileText}>
            <InfoRow label={t("benefits.benefitType")} value={benefit.benefit_type_info?.name ?? "—"} />
            <InfoRow label={t("conventions.type")}     value={catCfg?.label ?? "—"} />
            <InfoRow label={t("common.status")}        value={priCfg.label} />
            {benefit.due_date && <InfoRow label={t("conventions.startDate")} value={fmtDate(benefit.due_date)} />}
            {benefit.payment_method_display && <InfoRow label={t("finance.paymentMethod")} value={benefit.payment_method_display} />}
            {benefit.payment_reference && <InfoRow label={t("finance.bankReference")} value={benefit.payment_reference} mono />}
          </DetailSection>

          {/* Rejet */}
          {benefit.workflow_state === "rejected" && benefit.rejection_reason && (
            <div className="card p-5 border-l-4 border-l-red-400 bg-red-50 lg:col-span-2">
              <h3 className="text-sm font-semibold text-red-700 mb-1">{t("common.description")}</h3>
              <p className="text-sm text-red-600">{benefit.rejection_reason}</p>
            </div>
          )}

          {/* Dates */}
          <DetailSection title={t("employees.history")} icon={Clock}>
            <InfoRow label={t("common.createdAt")}         value={fmtDateTime(benefit.created_at)} />
            {benefit.submitted_at && <InfoRow label={t("benefits.submitted")} value={fmtDateTime(benefit.submitted_at)} />}
            {benefit.validated_at && <InfoRow label={t("benefits.approved")}  value={fmtDateTime(benefit.validated_at)} />}
            {benefit.paid_at      && <InfoRow label={t("benefits.paid")}      value={fmtDateTime(benefit.paid_at)} />}
            {benefit.rejected_at  && <InfoRow label={t("benefits.rejected")}  value={fmtDateTime(benefit.rejected_at)} />}
          </DetailSection>

          {/* Intervenants */}
          <DetailSection title={t("common.createdBy")} icon={ChevronRight}>
            <InfoRow label={t("common.createdBy")}       value={benefit.created_by_name ?? "—"} />
            {benefit.validated_by_name && <InfoRow label={t("common.createdBy")} value={benefit.validated_by_name} />}
            {benefit.paid_by_name      && <InfoRow label={t("common.createdBy")} value={benefit.paid_by_name} />}
          </DetailSection>

          {/* Notes internes */}
          {benefit.internal_notes && (
            <div className="card p-5 bg-amber-50 border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">{t("common.notes")}</h3>
              <p className="text-sm text-amber-700 whitespace-pre-wrap">{benefit.internal_notes}</p>
            </div>
          )}

          {/* Score AI */}
          {(benefit.ai_score != null || benefit.risk_score != null) && (
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("ai.anomalies.title")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {benefit.ai_score != null && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{benefit.ai_score.toFixed(1)}</p>
                    <p className="text-xs text-purple-600">{t("common.status")}</p>
                  </div>
                )}
                {benefit.risk_score != null && (
                  <div className={`rounded-lg p-3 text-center ${
                    benefit.risk_score > 70 ? "bg-red-50" :
                    benefit.risk_score > 40 ? "bg-amber-50" : "bg-green-50"
                  }`}>
                    <p className={`text-2xl font-bold ${
                      benefit.risk_score > 70 ? "text-red-700" :
                      benefit.risk_score > 40 ? "text-amber-700" : "text-green-700"
                    }`}>{benefit.risk_score.toFixed(0)}</p>
                    <p className="text-xs text-gray-600">{t("common.status")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB : PIÈCES JOINTES
      ════════════════════════════════════════════════ */}
      {tab === "attachments" && (
        <div className="card p-5">
          <AttachmentManager
            benefitId={id!}
            attachments={benefit.attachments ?? []}
            canUpload={benefit.workflow_state !== "paid" && benefit.workflow_state !== "rejected"}
            canDelete={benefit.workflow_state !== "paid" && benefit.workflow_state !== "rejected"}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB : COMMENTAIRES
      ════════════════════════════════════════════════ */}
      {tab === "comments" && (
        <div className="card p-5">
          <CommentsSection
            benefitId={id!}
            comments={benefit.comments ?? []}
            canComment={benefit.workflow_state !== "paid" && benefit.workflow_state !== "rejected"}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB : HISTORIQUE WORKFLOW
      ════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-4">
            {t("common.totalItems", { count: logCount })}
          </p>
          <WorkflowLogTimeline logs={logData?.data ?? []} />
        </div>
      )}

      {/* ── Modals ───────────────────────────────────── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t("common.edit")} size="xl">
        <BenefitForm mode="edit" initialData={benefit}
          onSubmit={async () => { setShowEdit(false); }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>

      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t("common.delete")}
        message={`${t("common.areYouSure", { action: t("common.delete").toLowerCase() })} ${benefit.reference} — ${t("common.warning")}.`}
        confirmLabel={t("common.delete")} loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ── Composants utilitaires ─────────────────────────────────
function DetailSection({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        <Icon className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-32">{label}</span>
      <span className={`text-sm text-gray-800 text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function AmountChip({ label, value, highlight, color }: {
  label: string; value: string; highlight?: boolean; color?: string;
}) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? "bg-brand/5 border border-brand/20" : "bg-gray-50"}`}>
      <p className={`text-lg font-bold ${color ?? (highlight ? "text-brand" : "text-gray-700")}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

const fmtDate     = (d: string) => d ? new Date(d).toLocaleDateString("fr-DZ", { day:"2-digit", month:"long",  year:"numeric" }) : "—";
const fmtDateTime = (d: string) => d ? new Date(d).toLocaleString("fr-DZ",     { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
