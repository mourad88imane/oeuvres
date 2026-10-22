export type ConventionStatus = "draft" | "active" | "expiring_soon" | "expired" | "terminated" | "renewed";
export type RenewalMode = "auto" | "manual" | "none";
export type PartnerType =
  | "hospital" | "clinic" | "pharmacy" | "lab"
  | "school" | "university" | "training"
  | "transport" | "insurance" | "bank" | "supplier" | "other";
export type DocType = "contract" | "addendum" | "annex" | "proof" | "report" | "other";
export type AlertType =
  | "expiry_warning" | "expiry_critical" | "renewal_reminder"
  | "document_missing" | "status_change" | "auto_renewed" | "ai_insight";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface Partner {
  id:                  string;
  code:                string;
  name:                string;
  type:                PartnerType;
  type_display:        string;
  category:            PartnerCategory;
  category_display:    string;
  gps_coordinates:     string;
  description:         string;
  is_active:           boolean;
  legal_form:          string;
  registration_number: string;
  tax_id:              string;
  rc_number:           string;
  email:               string;
  phone:               string;
  website:             string;
  address:             string;
  city:                string;
  wilaya:              string;
  postal_code:         string;
  contact_name:        string;
  contact_phone:       string;
  contact_email:       string;
  notes:               string;
  metadata:            Record<string, unknown>;
  conventions:         PartnerConvention[];
  created_at:          string;
  updated_at:          string;
  created_by_name:     string | null;
}

export interface PartnerListItem {
  id:               string;
  code:             string;
  name:             string;
  type:             PartnerType;
  type_display:     string;
  category:         PartnerCategory;
  category_display: string;
  is_active:        boolean;
  city:             string;
  wilaya:           string;
  wilaya_display:   string;
  email:            string;
  phone:            string;
  contact_name:     string;
  created_at:       string;
}

export interface PartnerConvention {
  id:               string;
  reference:        string;
  title:            string;
  status:           ConventionStatus;
  status_display:   string;
  start_date:       string;
  end_date:         string;
  amount:           number | null;
}

export interface Convention {
  id:                 string;
  reference:          string;
  partner:            string;
  partner_name:       string;
  partner_code:       string;
  title:              string;
  description:        string;
  status:             ConventionStatus;
  status_display:     string;
  renewal_mode:       RenewalMode;
  renewal_mode_display: string;
  renewal_notice_days: number;
  start_date:         string;
  end_date:           string;
  signed_date:        string | null;
  terminated_date:    string | null;
  renewed_at:         string | null;
  amount:             number | null;
  auto_renewal_days:  number;
  requires_attachments: boolean;
  days_until_expiry:  number;
  duration_display:   string;
  is_expired:         boolean;
  is_expiring_soon:   boolean;
  is_active:          boolean;
  ai_metadata:        Record<string, unknown>;
  analytics_data:     Record<string, unknown>;
  created_at:         string;
  updated_at:         string;
  created_by_name:    string | null;
}

export interface ConventionListItem {
  id:               string;
  reference:        string;
  partner:          string;
  partner_name:     string;
  partner_code:     string;
  title:            string;
  status:           ConventionStatus;
  status_display:   string;
  start_date:       string;
  end_date:         string;
  amount:           number | null;
  days_until_expiry: number;
  duration_display: string;
  renewal_mode:     RenewalMode;
  created_at:       string;
}

export interface ConventionDocument {
  id:              string;
  convention:      string;
  doc_type:        DocType;
  doc_type_display: string;
  file:            string;
  file_url:        string | null;
  original_name:   string;
  description:     string;
  file_size:       number;
  mime_type:       string;
  created_at:      string;
  updated_at:      string;
  created_by_name: string | null;
}

export interface ConventionAlert {
  id:                 string;
  convention:         string;
  convention_reference: string;
  convention_title:   string;
  alert_type:         AlertType;
  alert_type_display: string;
  severity:           AlertSeverity;
  severity_display:   string;
  title:              string;
  message:            string;
  is_read:            boolean;
  is_resolved:        boolean;
  resolved_at:        string | null;
  ai_generated:       boolean;
  ai_confidence:      number | null;
  metadata:           Record<string, unknown>;
  created_at:         string;
}

export interface ConventionDashboard {
  total:         number;
  active:        number;
  expiring_soon: number;
  expired:       number;
  draft:         number;
  terminated:    number;
}

export const CONVENTION_STATUS_UI: Record<ConventionStatus, { label: string; badgeClass: string }> = {
  draft:         { label: "Brouillon",         badgeClass: "bg-gray-100 text-gray-600" },
  active:        { label: "Active",            badgeClass: "bg-green-100 text-green-700" },
  expiring_soon: { label: "Expiration proche", badgeClass: "bg-amber-100 text-amber-700" },
  expired:       { label: "Expirée",           badgeClass: "bg-red-100 text-red-700" },
  terminated:    { label: "Résiliée",          badgeClass: "bg-gray-100 text-gray-500" },
  renewed:       { label: "Renouvelée",        badgeClass: "bg-blue-100 text-blue-700" },
};

export const ALERT_SEVERITY_UI: Record<AlertSeverity, { badgeClass: string; icon: string }> = {
  low:      { badgeClass: "bg-blue-100 text-blue-700",   icon: "ℹ️" },
  medium:   { badgeClass: "bg-amber-100 text-amber-700", icon: "⚠️" },
  high:     { badgeClass: "bg-orange-100 text-orange-700", icon: "🔥" },
  critical: { badgeClass: "bg-red-100 text-red-700",     icon: "🚨" },
};

export type PartnerCategory =
  | "medical_analysis_lab" | "medical_center" | "medical_imaging_center" | "";

export const PARTNER_CATEGORY_UI: Record<string, string> = {
  medical_analysis_lab:    "Laboratoire d'analyses médicales",
  medical_center:          "Centre médical",
  medical_imaging_center:  "Centre d'imagerie médicale",
};

export const PARTNER_TYPE_UI: Record<PartnerType, string> = {
  hospital:   "Établissement hospitalier",
  clinic:     "Clinique",
  pharmacy:   "Pharmacie",
  lab:        "Laboratoire d'analyses",
  school:     "Établissement scolaire",
  university: "Université",
  training:   "Centre de formation",
  transport:  "Transport",
  insurance:  "Assureur",
  bank:       "Banque",
  supplier:   "Fournisseur",
  other:      "Autre",
};

export interface ConventionFilters {
  search?:       string;
  status?:       ConventionStatus | "";
  partner_id?:   string;
  date_from?:    string;
  date_to?:      string;
  expiring_soon?: boolean;
  expired?:      boolean;
  ordering?:     string;
  page?:         number;
  page_size?:    number;
}
