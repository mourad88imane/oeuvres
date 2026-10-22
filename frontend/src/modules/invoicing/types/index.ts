export type InvoiceStatus = "draft" | "validated" | "paid" | "cancelled";

export type InvoiceAction = "validate" | "pay" | "cancel";

export interface InvoiceLine {
  id: string;
  invoice: string;
  voucher: string;
  amount: number;
  quantity: number;
  unit_price: number | null;
  notes: string;
  voucher_reference: string;
  voucher_employee_name: string;
  voucher_employee_matricule: string;
  voucher_beneficiary_name: string | null;
  voucher_beneficiary_type: string | null;
  voucher_coverage_type: string;
  voucher_coverage_type_code: string;
  voucher_request_date: string;
  voucher_approved_amount: number | null;
  voucher_workflow_state: string;
  created_at: string;
}

export interface VoucherConsumption {
  id: string;
  invoice: string;
  voucher: string;
  amount: number;
  consumed_at: string;
  consumed_by: string | null;
  consumed_by_name: string | null;
  notes: string;
  created_at: string;
}

export interface InvoiceStatusHistoryEntry {
  id: string;
  invoice: string;
  status_from: string;
  status_to: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  notes: string;
}

export interface InvoiceAttachment {
  id: string;
  invoice: string;
  file: string;
  file_url: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  description: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
}

export interface Invoice {
  id: string;
  reference: string;
  invoice_number: string;
  invoice_date: string | null;
  period_start: string | null;
  period_end: string | null;
  partner: string;
  partner_name: string;
  partner_code: string;
  partner_category: string | null;
  convention: string | null;
  convention_reference: string | null;
  convention_title: string | null;
  category: string;
  category_label: string;
  month: number;
  year: number;
  due_date: string | null;
  status: InvoiceStatus;
  status_label: string;
  total_amount: number;
  total_covered_amount: number;
  total_beneficiary_payment: number;
  notes: string;
  line_count: number;
  validated_at: string | null;
  validated_by: string | null;
  validated_by_name: string | null;
  paid_at: string | null;
  paid_by: string | null;
  lines: InvoiceLine[];
  consumptions: VoucherConsumption[];
  status_history: InvoiceStatusHistoryEntry[];
  attachments: InvoiceAttachment[];
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
}

export interface InvoiceCreatePayload {
  partner: string;
  convention?: string;
  category?: string;
  month: number;
  year: number;
  invoice_number?: string;
  invoice_date?: string;
  period_start?: string;
  period_end?: string;
  due_date?: string;
  notes?: string;
  total_covered_amount?: number;
  coverage_request_lines: { coverage_request: string; amount: number; notes?: string }[];
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  partner?: string;
  category?: string;
  year?: number;
  month?: number;
  period_start?: string;
  period_end?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  employee?: string;
  beneficiary?: string;
  ordering?: string;
  page?: number;
}

export interface InvoiceStatistics {
  total: number;
  draft: number;
  validated: number;
  paid: number;
  cancelled: number;
  total_amount: number;
  paid_amount: number;
  validated_amount: number;
  by_partner: { partner__name: string; partner__id: string; count: number; amount: number }[];
  by_month: { month: number; count: number; amount: number }[];
  by_category: { category: string; count: number; amount: number }[];
  voucher_stats: { consumed: number; invoiced: number; approved: number };
  top_employees: { name: string; matricule: string; total: number; count: number }[];
  top_beneficiaries: { name: string; total: number; count: number }[];
}

export interface AvailableVoucher {
  id: string;
  reference: string;
  employee_name: string;
  employee_matricule: string;
  beneficiary_name: string | null;
  beneficiary_type: string | null;
  beneficiary_relationship: string | null;
  coverage_type_name: string;
  coverage_type_code: string;
  examination: string;
  request_date: string;
  approved_amount: number | null;
  workflow_state: string;
}

export interface PartnerItem {
  id: string;
  name: string;
  code: string;
  category: string;
  type_display: string;
  email: string;
  phone: string;
  city: string;
  wilaya: string;
  contact_name: string;
}

export interface ConventionItem {
  id: string;
  reference: string;
  title: string;
  partner: string;
  partner_name: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
}

export const CATEGORY_OPTIONS = [
  { value: "medical_analysis_lab", label: "Analyse Médicale" },
  { value: "medical_imaging_center", label: "Imagerie Médicale" },
  { value: "medical_center", label: "Centre Médical" },
];

export const INVOICE_STATUS_UI: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Brouillon", color: "#92400e", bg: "#fef3c7" },
  validated: { label: "Validée", color: "#166534", bg: "#dcfce7" },
  paid: { label: "Payée", color: "#1e40af", bg: "#dbeafe" },
  cancelled: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
};

export const INVOICE_WORKFLOW_ORDER: InvoiceStatus[] = ["draft", "validated", "paid"];

export const MONTHS: Record<number, string> = {
  1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
  5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
  9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
};

export function formatMonthYear(m: number, y: number): string {
  return `${MONTHS[m] || m} ${y}`;
}

export function categoryLabel(value: string): string {
  const opt = CATEGORY_OPTIONS.find(o => o.value === value);
  return opt?.label || value;
}
