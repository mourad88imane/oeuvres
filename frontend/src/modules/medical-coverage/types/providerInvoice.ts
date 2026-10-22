export type ProviderInvoiceStatus = "draft" | "validated" | "paid" | "cancelled";

export interface ProviderInvoice {
  id: string;
  reference: string;
  invoice_number: string;
  partner: string;
  partner_name: string;
  partner_code: string;
  partner_category: string;
  convention: string | null;
  convention_reference: string | null;
  convention_title: string | null;
  category: string;
  category_label: string;
  month: number;
  year: number;
  due_date: string | null;
  invoice_date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: ProviderInvoiceStatus;
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
  created_at: string;
  updated_at: string;
  created_by_name: string;
}

export interface ProviderInvoiceFilters {
  search?: string;
  partner?: string;
  category?: string;
  status?: ProviderInvoiceStatus | "";
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const PROVIDER_INVOICE_STATUS_UI: Record<ProviderInvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Brouillon",    color: "#92400e", bg: "#fef3c7" },
  validated: { label: "Validée",      color: "#166534", bg: "#dcfce7" },
  paid:      { label: "Payée",        color: "#1e40af", bg: "#dbeafe" },
  cancelled: { label: "Annulée",      color: "#991b1b", bg: "#fee2e2" },
};

export const PROVIDER_CATEGORY_OPTIONS = [
  { value: "medical_analysis_lab",   label: "Analyse Médicale" },
  { value: "medical_imaging_center", label: "Imagerie Médicale" },
  { value: "medical_center",         label: "Centre Médical" },
];

export interface ProviderInvoiceStatistics {
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

export function categoryLabel(value: string): string {
  const opt = PROVIDER_CATEGORY_OPTIONS.find(o => o.value === value);
  return opt?.label || value;
}
