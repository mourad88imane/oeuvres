export interface MedicalCoverageType {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  waiting_period_months: number;
  max_per_year: number;
  requires_provider: boolean;
  color: string;
  icon: string;
}

export interface MedicalProvider {
  id: string;
  name: string;
  type: string;
  coverage_types: string[];
  address: string;
  phone: string;
  email: string;
  city: string;
  is_active: boolean;
}

export type VoucherStatus = "draft" | "submitted" | "pending_approval" | "pending_director_approval" | "approved" | "rejected" | "cancelled" | "consumed";

export interface MedicalCoverageVoucher {
  id: string;
  reference: string;
  coverage_type: string;
  coverage_type_name: string;
  coverage_type_code: string;
  coverage_type_color: string;
  coverage_type_info: MedicalCoverageType;
  employee: string;
  employee_name: string;
  employee_matricule: string;
  department_name: string;
  beneficiary_type: "employee" | "dependent";
  beneficiary: string | null;
  beneficiary_name: string | null;
  provider: string | null;
  provider_name: string;
  request_date: string;
  expected_date: string | null;
  workflow_state: VoucherStatus;
  state_label: string;
  observations: string;
  rejection_reason: string;
  next_eligible_date: string | null;
  voucher_number: string | null;
  consumed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  available_transitions?: AvailableTransition[];
}

export interface AvailableTransition {
  to_state: VoucherStatus;
  state_label: string;
  label: string;
  can_execute: boolean;
  blocked_reason: string;
  requires_reason: boolean;
  severity: string;
}

export interface WorkflowLogEntry {
  id: string;
  from_state: string;
  to_state: string;
  transition_name: string;
  actor_email: string;
  reason: string;
  timestamp: string;
}

export interface MedicalCoverageCreatePayload {
  coverage_type: string;
  employee: string;
  beneficiary_type: "employee" | "dependent";
  beneficiary?: string;
  provider?: string;
  request_date: string;
  expected_date?: string;
  observations?: string;
}

export interface EmployeeInfo {
  id: string;
  matricule: string;
  full_name: string;
  department: string;
  position: string;
  status: string;
  marital_status?: string;
  marital_status_display?: string;
}

export interface CoverageSummary {
  total_vouchers: number;
  last_voucher_reference: string | null;
  last_voucher_date: string | null;
  last_voucher_type: string | null;
  last_voucher_provider: string | null;
  count_last_3_months: number;
  count_current_year: number;
}

export interface DependentSummary {
  id: string;
  full_name: string;
  relationship: string;
  relationship_display: string;
  last_voucher_date: string | null;
  last_voucher_reference: string | null;
  count_last_3_months: number;
}

export interface EmployeeEligibility {
  is_eligible: boolean | null;
  messages: string[];
  next_eligible_date: string | null;
  last_voucher_date: string | null;
  last_voucher_reference: string | null;
  count_last_3_months: number;
  count_current_year: number;
  remaining: number;
}

export interface EmployeeInfoResponse {
  employee: EmployeeInfo;
  summary: CoverageSummary;
  dependents: DependentSummary[];
  eligibility: EmployeeEligibility | null;
  dependent_eligibility: { beneficiary_id: string; result: any }[];
}

export interface CoverageStatistics {
  total: number;
  consumed: number;
  approved: number;
  rejected: number;
  by_status: Record<string, number>;
  by_type: { coverage_type__code: string; coverage_type__name: string; count: number }[];
  most_used_type: { coverage_type__code: string; coverage_type__name: string; count: number } | null;
  monthly_stats: { month: number; count: number }[];
  top_employees: { employee__first_name: string; employee__last_name: string; employee__matricule: string; count: number }[];
  top_dependents: { beneficiary__first_name: string; beneficiary__last_name: string; count: number }[];
}

export interface MedicalCoverageFilters {
  coverage_type?: string;
  employee?: string;
  status?: VoucherStatus | "";
  beneficiary_type?: "" | "employee" | "dependent";
  date_from?: string;
  date_to?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const VOUCHER_STATUS_UI: Record<VoucherStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Brouillon",                  color: "#6b6963", bg: "rgba(138,136,130,0.1)" },
  submitted: { label: "Soumise",                    color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  pending_approval: { label: "En attente d'approbation", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  pending_director_approval: { label: "En attente du directeur", color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  approved:  { label: "Approuvée",                  color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
  rejected:  { label: "Rejetée",                    color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  cancelled: { label: "Annulée",                    color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
  consumed:  { label: "Consommée",                  color: "#9333ea", bg: "rgba(147,51,234,0.1)" },
};
