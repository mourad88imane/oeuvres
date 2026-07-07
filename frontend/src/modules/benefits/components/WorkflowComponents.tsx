/**
 * WORKFLOW COMPONENTS
 * WorkflowBadge, WorkflowTimeline, WorkflowActions, WorkflowLog
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, Send, FileCheck, Banknote,
  XCircle, PauseCircle, Ban, ChevronRight, AlertTriangle, Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import type { WorkflowState, WorkflowLog, AvailableTransition, Benefit } from "../types";
import { STATE_UI, WORKFLOW_ORDER } from "../types";
import { Modal } from "@shared/components/ui/index";
import { useTransition } from "../hooks/useBenefits";
import { useForm } from "react-hook-form";

// ── Icônes par état ────────────────────────────────────────
const STATE_ICONS: Record<WorkflowState, React.ElementType> = {
  draft:        Clock,
  submitted:    Send,
  under_review: FileCheck,
  on_hold:      PauseCircle,
  pending_director_approval: AlertTriangle,
  validated:    CheckCircle2,
  paid:         Banknote,
  rejected:     XCircle,
  cancelled:    Ban,
};

// ═══════════════════════════════════════════════════════════
// WORKFLOW BADGE
// ═══════════════════════════════════════════════════════════
interface WorkflowBadgeProps {
  state: WorkflowState;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function WorkflowBadge({ state, size = "sm", showIcon = true }: WorkflowBadgeProps) {
  const cfg  = STATE_UI[state];
  const Icon = STATE_ICONS[state];
  const sz   = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full font-medium", cfg.badgeClass, sz)}>
      {showIcon && <Icon className="w-3 h-3 shrink-0" />}
      {cfg.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW TIMELINE
// ═══════════════════════════════════════════════════════════
interface WorkflowTimelineProps {
  benefit: Benefit;
  compact?: boolean;
}

export function WorkflowTimeline({ benefit, compact = false }: WorkflowTimelineProps) {
  const { t } = useTranslation();
  const currentIdx  = WORKFLOW_ORDER.indexOf(benefit.workflow_state as WorkflowState);
  const isRejected  = benefit.workflow_state === "rejected";
  const isCancelled = benefit.workflow_state === "cancelled";
  const isOnHold    = benefit.workflow_state === "on_hold";
  const isPendingDirectorApproval = benefit.workflow_state === "pending_director_approval";

  const dateMap: Partial<Record<WorkflowState, string | null>> = {
    draft:        benefit.created_at,
    submitted:    benefit.submitted_at,
    under_review: benefit.last_transition_at,
    pending_director_approval: benefit.last_transition_at,
    validated:    benefit.validated_at,
    paid:         benefit.paid_at,
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {WORKFLOW_ORDER.map((state, i) => {
          const done    = i <= currentIdx && !isRejected && !isCancelled;
          const current = state === benefit.workflow_state;
          const Icon    = STATE_ICONS[state];
          return (
            <div key={state} className="flex items-center gap-1">
              <div className={clsx(
                "w-6 h-6 rounded-full flex items-center justify-center",
                done    ? "bg-green-500"  : current ? "bg-brand" : "bg-gray-200",
              )}>
                <Icon className={clsx("w-3 h-3", done || current ? "text-white" : "text-gray-400")} />
              </div>
              {i < WORKFLOW_ORDER.length - 1 && (
                <div className={clsx("h-0.5 w-6", done && i < currentIdx ? "bg-green-400" : "bg-gray-200")} />
              )}
            </div>
          );
        })}
        {(isRejected || isCancelled || isOnHold || isPendingDirectorApproval) && (
          <WorkflowBadge state={benefit.workflow_state as WorkflowState} size="sm" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        {WORKFLOW_ORDER.map((state, i) => {
          const stateLabel = STATE_UI[state].label;
          const done       = i < currentIdx && !isRejected && !isCancelled;
          const current    = state === benefit.workflow_state;
          const pending    = i > currentIdx || isRejected || isCancelled;
          const Icon       = STATE_ICONS[state];
          const dateStr    = dateMap[state];

          return (
            <div key={state} className="flex flex-col items-center flex-1">
              <div className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0 transition-all",
                done    ? "bg-green-500 border-green-500" : "",
                current && !isRejected && !isCancelled ? "bg-brand border-brand shadow-lg shadow-blue-200" : "",
                current && isRejected  ? "bg-red-500 border-red-500" : "",
                current && isCancelled ? "bg-gray-400 border-gray-400" : "",
                pending ? "bg-white border-gray-200" : "",
              )}>
                <Icon className={clsx(
                  "w-4 h-4",
                  done || (current && !isRejected && !isCancelled) ? "text-white" : "",
                  current && isRejected  ? "text-white" : "",
                  current && isCancelled ? "text-white" : "",
                  pending ? "text-gray-300" : "",
                )} />
              </div>
              <p className={clsx(
                "text-xs mt-1.5 text-center font-medium",
                done    ? "text-green-700" : "",
                current && !isRejected && !isCancelled ? "text-brand" : "",
                current && isRejected   ? "text-red-600"  : "",
                current && isCancelled  ? "text-gray-500" : "",
                pending ? "text-gray-400" : "",
              )}>
                {stateLabel}
              </p>
              {dateStr && (done || current) && (
                <p className="text-xs text-gray-400 hidden sm:block text-center">
                  {new Date(dateStr).toLocaleDateString("fr-DZ", { day:"2-digit", month:"short" })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Ligne de connexion */}
      <div className="relative flex items-center px-4" style={{ height: "2px" }}>
        <div className="absolute inset-0 bg-gray-200 rounded" />
        <div
          className="absolute left-0 bg-gradient-to-r from-green-400 to-brand rounded transition-all"
          style={{
            height: "100%",
            width: isRejected || isCancelled
              ? `${((currentIdx) / (WORKFLOW_ORDER.length - 1)) * 100}%`
              : `${(Math.max(0, currentIdx) / (WORKFLOW_ORDER.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Indicateurs spéciaux */}
      {(isRejected || isCancelled || isOnHold || isPendingDirectorApproval) && (
        <div className={clsx(
          "mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          isRejected  ? "bg-red-50 text-red-700" : "",
          isCancelled ? "bg-gray-50 text-gray-600" : "",
          isOnHold    ? "bg-amber-50 text-amber-700" : "",
          isPendingDirectorApproval ? "bg-pink-50 text-pink-700 border border-pink-200" : "",
        )}>
          {isRejected && <><XCircle className="w-4 h-4 shrink-0" />{t("benefits.rejected")} — {benefit.rejection_reason || t("common.noData")}</>}
          {isCancelled && <><Ban className="w-4 h-4 shrink-0" />{t("benefits.cancelled")}</>}
          {isOnHold && <><PauseCircle className="w-4 h-4 shrink-0" />{t("benefits.pending")} — {benefit.last_transition_reason || ""}</>}
          {isPendingDirectorApproval && <><AlertTriangle className="w-4 h-4 shrink-0" />{t("benefits.pendingDirectorApproval")}</>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW ACTIONS — Boutons de transition contextuels
// ═══════════════════════════════════════════════════════════
interface WorkflowActionsProps {
  benefit: Benefit;
  onSuccess?: () => void;
  transitionMutation?: UseMutationResult<unknown, Error, Record<string, unknown>>;
}

const TRANSITION_STYLE: Record<string, string> = {
  submitted:    "bg-blue-600 hover:bg-blue-700 text-white",
  under_review: "bg-purple-600 hover:bg-purple-700 text-white",
  pending_director_approval: "bg-pink-600 hover:bg-pink-700 text-white",
  validated:    "bg-emerald-600 hover:bg-emerald-700 text-white",
  paid:         "bg-green-600 hover:bg-green-700 text-white",
  on_hold:      "bg-amber-500 hover:bg-amber-600 text-white",
  rejected:     "bg-red-100 hover:bg-red-200 text-red-700 border border-red-200",
  cancelled:    "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200",
  submitted_re: "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200",
};

interface TransitionFormData {
  reason: string;
  approved_amount: string;
  payment_reference: string;
  paid_amount: string;
  comment: string;
}

export function WorkflowActions({ benefit, onSuccess, transitionMutation }: WorkflowActionsProps) {
  const { t } = useTranslation();
  const [selectedTransition, setSelectedTransition] = useState<AvailableTransition | null>(null);
  const internalMutation = useTransition(benefit.id);
  const mutation = transitionMutation ?? internalMutation;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TransitionFormData>();

  const transitions = benefit.available_transitions ?? [];
  if (transitions.length === 0) return null;

  const openModal = (t: AvailableTransition) => {
    setSelectedTransition(t);
    reset();
  };

  const handleConfirm = handleSubmit(async (data) => {
    if (!selectedTransition) return;
    const payload: Record<string, unknown> = { to_state: selectedTransition.to_state };
    if (data.reason)            payload.reason            = data.reason;
    if (data.approved_amount)   payload.approved_amount   = parseFloat(data.approved_amount);
    if (data.payment_reference) payload.payment_reference = data.payment_reference;
    if (data.paid_amount)       payload.paid_amount       = parseFloat(data.paid_amount);
    if (data.comment)           payload.comment           = data.comment;

    await mutation.mutateAsync(payload as Parameters<typeof mutation.mutateAsync>[0]);
    setSelectedTransition(null);
    onSuccess?.();
  });

  const needsApprovedAmount  = selectedTransition?.to_state === "validated";
  const needsPaymentRef      = selectedTransition?.to_state === "paid";
  const needsReason          = selectedTransition?.requires_reason;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((tran) => {
          const styleKey = tran.to_state === "submitted" && benefit.workflow_state === "on_hold"
            ? "submitted_re" : tran.to_state;
          const btnStyle = TRANSITION_STYLE[styleKey] ?? "bg-gray-100 text-gray-700";
          return (
            <button
              key={tran.to_state}
              onClick={() => openModal(tran)}
              disabled={!tran.can_execute}
              title={!tran.can_execute ? tran.blocked_reason : ""}
              className={clsx(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                btnStyle,
              )}
            >
              {tran.label}
              {tran.severity === "CRITICAL" && <AlertTriangle className="w-3.5 h-3.5" />}
              {!tran.can_execute && <span className="text-xs opacity-70">({tran.blocked_reason})</span>}
            </button>
          );
        })}
      </div>

      {/* Modal de confirmation */}
      <Modal
        open={!!selectedTransition}
        onClose={() => setSelectedTransition(null)}
        title={selectedTransition?.label ?? ""}
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setSelectedTransition(null)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              {t("common.cancel")}
            </button>
            <button type="button" onClick={handleConfirm}
              disabled={mutation.isPending}
              className={clsx(
                "flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-medium transition-colors",
                selectedTransition?.severity === "CRITICAL"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-brand hover:bg-brand-light text-white",
                "disabled:opacity-60",
              )}>
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("common.confirm")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Alerte critique */}
          {selectedTransition?.severity === "CRITICAL" && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {t("common.warning")}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600">
            {t("workflow.confirmTransition")} —{" "}
            <WorkflowBadge state={benefit.workflow_state as WorkflowState} size="sm" />
            {" → "}
            <WorkflowBadge state={selectedTransition?.to_state as WorkflowState} size="sm" />
          </p>

          {/* Montant approuvé (validation) */}
          {needsApprovedAmount && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t("benefits.grantedAmount")} (DZD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" step="0.01" min="0"
                {...register("approved_amount", { required: t("validation.amountRequired") })}
                defaultValue={String(benefit.requested_amount)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={`${t("benefits.requestedAmount")} : ${benefit.requested_amount?.toLocaleString("fr-DZ")} DZD`}
              />
              {errors.approved_amount && <p className="text-xs text-red-500 mt-1">{errors.approved_amount.message}</p>}
            </div>
          )}

          {/* Référence paiement */}
          {needsPaymentRef && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {t("finance.bankReference")} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("payment_reference", { required: t("validation.required") })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex : VIR-2024-00123"
                />
                {errors.payment_reference && <p className="text-xs text-red-500 mt-1">{errors.payment_reference.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {t("finance.amount")} (DZD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" step="0.01" min="0"
                  {...register("paid_amount")}
                  defaultValue={String(benefit.approved_amount ?? benefit.requested_amount)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}

          {/* Motif */}
          {needsReason && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t("common.notes")} <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register("reason", { required: t("validation.required") })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={t("common.description")}
              />
              {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
            </div>
          )}

          {/* Commentaire optionnel */}
          <div>
            <label className="text-sm text-gray-500 block mb-1">{t("common.comment")}</label>
            <textarea
              {...register("comment")}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
              placeholder={t("common.notes")}
            />
          </div>

          {/* Erreur API */}
          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || t("workflow.transitionError")}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW LOG TIMELINE
// ═══════════════════════════════════════════════════════════
interface WorkflowLogTimelineProps {
  logs: WorkflowLog[];
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      "bg-gray-100 text-gray-600",
  MEDIUM:   "bg-amber-100 text-amber-700",
  HIGH:     "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export function WorkflowLogTimeline({ logs }: WorkflowLogTimelineProps) {
  const { t } = useTranslation();

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 italic text-center py-8">{t("common.noResults")}</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="space-y-4">
        {logs.map((log, i) => {
          const ToIcon   = STATE_ICONS[log.to_state   as WorkflowState] ?? Clock;
          const toCfg    = STATE_UI[log.to_state   as WorkflowState];

          return (
            <div key={log.id} className="flex gap-4 relative">
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm",
                log.is_reversal ? "bg-red-100" : i === logs.length - 1 ? "bg-brand" : "bg-green-100",
              )}>
                <ToIcon className={clsx(
                  "w-4 h-4",
                  log.is_reversal ? "text-red-500" : i === logs.length - 1 ? "text-white" : "text-green-600",
                )} />
              </div>

              <div className="flex-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* Transition */}
                  <span className="font-semibold text-sm text-gray-800">{log.transition_name}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", toCfg?.badgeClass)}>
                    {log.to_state_label}
                  </span>
                  {log.is_reversal && (
                    <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{t("workflow.sendBack")}</span>
                  )}
                  <span className={clsx("text-xs px-1.5 py-0.5 rounded ml-auto", SEVERITY_COLOR[log.severity])}>
                    {log.severity}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {log.actor_email && <span>👤 {log.actor_email} ({log.actor_role})</span>}
                  {log.duration_label !== "—" && (
                    <span>⏱ {t("common.info")} : {log.duration_label}</span>
                  )}
                  <span className="ml-auto">
                    {new Date(log.timestamp).toLocaleString("fr-DZ", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>

                {log.reason && (
                  <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
                    « {log.reason} »
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
