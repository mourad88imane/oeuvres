export type RequestCategory = "analysis" | "imaging" | "center";
export type RequestStatus = "draft" | "submitted" | "pending_approval" | "pending_manager_approval" | "pending_director_approval" | "validated" | "rejected" | "printed" | "closed" | "cancelled";

export type UserRequestStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

export const BACKEND_TO_USER_STATUS: Record<RequestStatus, UserRequestStatus> = {
  draft: "draft",
  submitted: "pending",
  pending_approval: "pending",
  pending_manager_approval: "pending",
  pending_director_approval: "pending",
  validated: "approved",
  rejected: "rejected",
  printed: "approved",
  closed: "cancelled",
  cancelled: "cancelled",
};

export const USER_STATUS_UI: Record<UserRequestStatus, { labelKey: string; label: string; color: string; bg: string }> = {
  draft:    { labelKey: "requestStatus.draft",    label: "Brouillon",   color: "#6b6963", bg: "rgba(138,136,130,0.1)" },
  pending:  { labelKey: "requestStatus.pending",  label: "En attente",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  approved: { labelKey: "requestStatus.approved", label: "Approuvée",   color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  rejected: { labelKey: "requestStatus.rejected", label: "Rejetée",     color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  cancelled:{ labelKey: "requestStatus.cancelled", label: "Annulée",     color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
};

export type ConsumptionStatus = "not_consumed" | "consumed";
export type InvoiceStatus = "not_invoiced" | "invoiced" | "paid";

export const CONSUMPTION_STATUS_UI: Record<ConsumptionStatus, { labelKey: string; label: string; color: string; bg: string }> = {
  not_consumed: { labelKey: "requestStatus.notConsumed", label: "Non consommé", color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
  consumed:     { labelKey: "requestStatus.consumed",    label: "Consommé",     color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
};

export const INVOICE_STATUS_UI: Record<InvoiceStatus, { labelKey: string; label: string; color: string; bg: string }> = {
  not_invoiced: { labelKey: "requestStatus.notInvoiced", label: "Non facturé", color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
  invoiced:     { labelKey: "requestStatus.invoiced",    label: "Facturé",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  paid:         { labelKey: "requestStatus.paid",        label: "Payé",        color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
};

export interface MedicalCoverageRequest {
  id: string;
  request_number: string;
  category: RequestCategory;
  category_display: string;
  partner: string;
  partner_name: string;
  employee: string;
  employee_name: string;
  employee_matricule: string;
  beneficiary: string | null;
  beneficiary_name: string | null;
  coverage_date: string;
  validation_date: string | null;
  observation: string;
  workflow_state: RequestStatus;
  state_label: string;
  voucher_number: string | null;
  consumption_status: ConsumptionStatus;
  invoice_status: InvoiceStatus;
  consumed_at: string | null;
  created_at: string;
  created_by_name: string;
  available_transitions?: AvailableTransition[];
}

export interface AvailableTransition {
  to_state: RequestStatus;
  state_label: string;
  label: string;
  can_execute: boolean;
  blocked_reason: string;
  requires_reason: boolean;
  severity: string;
}

export interface MedicalCoverageRequestCreatePayload {
  category: RequestCategory;
  partner: string;
  employee: string;
  beneficiary?: string;
  coverage_date: string;
  observation?: string;
}

export interface RequestStatistics {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  by_partner: { partner__name: string; partner__id: string; count: number }[];
  by_month: { month: number; count: number }[];
}

export const REQUEST_STATUS_UI: Record<RequestStatus, { labelKey: string; label: string; color: string; bg: string }> = {
  draft:              { labelKey: "requestStatus.draft",                  label: "Brouillon",                  color: "#6b6963", bg: "rgba(138,136,130,0.1)" },
  submitted:          { labelKey: "requestStatus.submitted",              label: "Soumise",                    color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  pending_approval:   { labelKey: "requestStatus.pendingApproval",        label: "En attente d'approbation",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  pending_manager_approval: { labelKey: "requestStatus.pendingManager",   label: "En attente du chef de service", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  pending_director_approval: { labelKey: "requestStatus.pendingDirector", label: "En attente du directeur", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  validated:          { labelKey: "requestStatus.approved",               label: "Validée",                    color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  rejected:           { labelKey: "requestStatus.rejected",               label: "Rejetée",                    color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  printed:            { labelKey: "requestStatus.printed",                label: "Imprimée",                   color: "#9333ea", bg: "rgba(147,51,234,0.1)" },
  closed:             { labelKey: "requestStatus.closed",                 label: "Clôturée",                   color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
  cancelled:          { labelKey: "requestStatus.cancelled",              label: "Annulée",                    color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
};

export type EligibilityStatus = "APPROVED" | "PENDING_MANAGER_APPROVAL" | "NOT_ELIGIBLE" | "PENDING_EXCEPTIONAL_VALIDATION";

export interface EmployeeEligibilityInfo {
  id: string;
  matricule: string;
  full_name: string;
  department: string;
  position: string;
  marital_status: string;
  marital_status_display: string;
}

export interface BeneficiaryEligibilityInfo {
  id: string;
  full_name: string;
  relationship: string;
  relationship_display: string;
  is_eligible: boolean;
}

export interface VoucherSummary {
  total_vouchers: number;
  last_voucher_reference: string | null;
  last_voucher_date: string | null;
  last_voucher_type: string | null;
  last_voucher_provider: string | null;
  count_last_3_months: number;
  count_current_year: number;
}

export interface VoucherEligibility {
  is_eligible: boolean;
  messages: string[];
  next_eligible_date: string | null;
  last_voucher_date: string | null;
  last_voucher_reference: string | null;
  count_last_3_months: number;
  count_current_year: number;
  remaining: number;
}

export interface RequestHistoryItem {
  id: string;
  request_number: string;
  coverage_date: string;
  workflow_state: string;
  category_display: string;
  partner_name: string;
  beneficiary_name: string | null;
}

export interface EmployeeEligibilityResponse {
  status: EligibilityStatus;
  reason: string;
  employee: EmployeeEligibilityInfo;
  beneficiaries: BeneficiaryEligibilityInfo[];
  count_employee_requests: number;
  count_beneficiary_requests: number;
  total_requests_last_period: number;
  restriction_period_months: number;
  last_request: {
    id: string;
    request_number: string;
    coverage_date: string;
    workflow_state: string;
    category_display: string;
    partner_name: string;
    beneficiary_name: string | null;
  } | null;
  request_history: RequestHistoryItem[];
  voucher_summary: VoucherSummary | null;
  voucher_eligibility: VoucherEligibility | null;
}

export const ELIGIBILITY_UI: Record<EligibilityStatus, { labelKey: string; label: string; color: string; bg: string }> = {
  APPROVED: { labelKey: "eligibility.approved", label: "Éligible", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  PENDING_MANAGER_APPROVAL: { labelKey: "eligibility.pendingManager", label: "En attente de validation", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  NOT_ELIGIBLE: { labelKey: "eligibility.notEligible", label: "Non éligible", color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  PENDING_EXCEPTIONAL_VALIDATION: { labelKey: "eligibility.exceptionnalValidation", label: "Validation exceptionnelle requise", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
};

export interface WorkflowLogEntry {
  id: string;
  from_state: string;
  to_state: string;
  transition_name: string;
  actor_email: string;
  reason: string;
  timestamp: string;
}

import type { TFunction } from "i18next";

// Helper : résout le libellé via i18n avec fallback sur le label français codé en dur
export function statusLabel(
  t: TFunction,
  ui: { labelKey: string; label: string }
): string {
  const translated = t(ui.labelKey) as string;
  return translated && translated !== ui.labelKey ? translated : ui.label;
}

export const REQUEST_WORKFLOW_ORDER: RequestStatus[] = [
  "draft", "submitted", "pending_approval", "pending_manager_approval", "pending_director_approval", "validated", "printed", "closed", "cancelled",
];
