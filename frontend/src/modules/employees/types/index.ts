/**
 * ============================================================
 * EMPLOYEE TYPES — Interfaces TypeScript complètes
 * ============================================================
 * Mirroir des modèles Django pour la sécurité de type.
 */

// ── Enums ──────────────────────────────────────────────────
export type EmployeeStatus   = "active" | "inactive" | "retired" | "suspended" | "deceased";
export type EmployeeGender   = "M" | "F";
export type MaritalStatus    = "single" | "married" | "divorced" | "widowed";
export type ContractType     = "cdi" | "cdd" | "stage" | "part_time" | "consultant";
export type BeneficiaryRelationship = "spouse" | "child" | "parent" | "sibling" | "other";

// ── Département ───────────────────────────────────────────
export interface DepartmentListItem {
  id: string;
  code: string;
  name: string;
  full_path: string;
  employee_count: number;
  is_active: boolean;
}

export interface Department extends DepartmentListItem {
  description: string;
  parent: string | null;
  parent_name: string | null;
  manager: string | null;
  manager_name: string | null;
  budget_annual: number | null;
  cost_center: string;
  location: string;
  children_count: number;
  created_at: string;
  updated_at: string;
}

// ── Ayant droit ───────────────────────────────────────────
export interface Beneficiary {
  id: string;
  employee: string;
  employee_name: string;
  full_name: string;
  first_name: string;
  last_name: string;
  first_name_ar: string;
  last_name_ar: string;
  gender: EmployeeGender;
  date_of_birth: string;
  age: number | null;
  national_id: string;
  relationship: BeneficiaryRelationship;
  relationship_display: string;
  is_eligible: boolean;
  ineligibility_reason: string;
  is_student: boolean;
  is_handicapped: boolean;
  school_name: string;
  school_year: string;
  spouse_is_employed: boolean | null;
  spouse_employer: string;
  birth_certificate_uploaded: boolean;
  marriage_certificate_uploaded: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Employé — liste ───────────────────────────────────────
export interface EmployeeListItem {
  id: string;
  matricule: string;
  full_name: string;
  first_name: string;
  last_name: string;
  gender: EmployeeGender;
  gender_display: string;
  photo_url: string | null;
  job_title: string;
  grade: string;
  grade_level: number | null;
  category: string;
  department: string;
  department_name: string;
  department_code: string;
  status: EmployeeStatus;
  status_display: string;
  contract_type: ContractType;
  contract_display: string;
  date_hired: string;
  seniority_years: number | null;
  seniority_label: string;
  date_of_birth: string;
  age: number | null;
  phone: string;
  email_professional: string;
  beneficiaries_count: number;
  bureau: string | null;
  bureau_name: string | null;
  bureau_code: string | null;
  function: string | null;
  function_name: string | null;
  grade_ref: string | null;
  grade_ref_name: string | null;
  grade_ref_level: number | null;
}

// ── Employé — détail complet ──────────────────────────────
export interface Employee extends EmployeeListItem {
  first_name_ar: string;
  last_name_ar: string;
  place_of_birth: string;
  marital_status: MaritalStatus;
  marital_display: string;
  nationality: string;
  national_id: string;
  national_id_expiry: string | null;
  cin_expired: boolean;
  social_security_number: string;
  tax_id: string;
  phone_secondary: string;
  email_personal: string;
  address: string;
  city: string;
  wilaya: string;
  department_info: DepartmentListItem;
  manager: string | null;
  manager_name: string | null;
  date_end: string | null;
  date_retired: string | null;
  date_promoted: string | null;
  base_salary: number | null;
  bank_account: string;
  education_level: string;
  education_field: string;
  competencies: string[];
  scoring_profile: Record<string, unknown>;
  metadata: Record<string, unknown>;
  notes: string;
  beneficiaries: Beneficiary[];
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  bureau: string | null;
  bureau_name: string | null;
  bureau_code: string | null;
  function: string | null;
  function_name: string | null;
  grade_ref: string | null;
  grade_ref_name: string | null;
  grade_ref_level: number | null;
}

// ── Formulaires ───────────────────────────────────────────
export interface EmployeeCreatePayload {
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  gender: EmployeeGender;
  date_of_birth: string;
  place_of_birth?: string;
  marital_status?: MaritalStatus;
  nationality?: string;
  national_id?: string;
  national_id_expiry?: string;
  social_security_number?: string;
  tax_id?: string;
  phone?: string;
  phone_secondary?: string;
  email_personal?: string;
  email_professional?: string;
  address?: string;
  city?: string;
  wilaya?: string;
  department: string;
  job_title: string;
  grade?: string;
  grade_level?: number;
  category?: string;
  contract_type: ContractType;
  manager?: string;
  date_hired: string;
  date_end?: string;
  status?: EmployeeStatus;
  base_salary?: number;
  bank_account?: string;
  education_level?: string;
  education_field?: string;
  competencies?: string[];
  notes?: string;
  bureau?: string;
  function?: string;
  grade_ref?: string;
}

export type EmployeeUpdatePayload = Partial<EmployeeCreatePayload>;

export interface BeneficiaryCreatePayload {
  first_name: string;
  last_name: string;
  gender: EmployeeGender;
  date_of_birth: string;
  relationship: BeneficiaryRelationship;
  national_id?: string;
  is_student?: boolean;
  is_handicapped?: boolean;
  school_name?: string;
  school_year?: string;
  spouse_is_employed?: boolean;
  spouse_employer?: string;
  birth_certificate_uploaded?: boolean;
  marriage_certificate_uploaded?: boolean;
  notes?: string;
}

// ── Réponses API ──────────────────────────────────────────
export interface PaginatedResponse<T> {
  status: string;
  pagination: {
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
    next: string | null;
    previous: string | null;
  };
  results: T[];
}

export interface EmployeeStatistics {
  total: number;
  active_count: number;
  retired_count: number;
  new_this_year: number;
  avg_seniority_years: number;
  by_status: { status: string; count: number }[];
  by_department: { department__name: string; department__code: string; count: number }[];
  by_contract_type: { contract_type: string; count: number }[];
  by_gender: { gender: string; count: number }[];
}

// ── Filtres ───────────────────────────────────────────────
export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus | "";
  department?: string;
  contract_type?: ContractType | "";
  gender?: EmployeeGender | "";
  min_age?: number | "";
  max_age?: number | "";
  min_seniority?: number | "";
  grade_level?: number | "";
  ordering?: string;
  page?: number;
  page_size?: number;
}

// ── Historique ────────────────────────────────────────────
export interface HistoryRecord {
  history_id: number;
  history_date: string;
  history_type: "+" | "~" | "-";
  history_user: { id: string; name: string; email: string } | null;
  changed_fields: { field: string; old: string | null; new: string | null }[];
}

export interface BusinessHistoryRecord {
  id: string;
  date: string;
  type: "benefit" | "loan" | "medical_voucher" | "medical_request";
  type_label: string;
  reference: string;
  beneficiary: string;
  status: string;
  requested_by: string;
  updated_at: string;
}
