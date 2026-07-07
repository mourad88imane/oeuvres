/**
 * EMPLOYEE API — Toutes les fonctions d'appel API
 */
import apiClient from "@shared/api/apiClient";
import type {
  Employee, EmployeeListItem, EmployeeCreatePayload, EmployeeUpdatePayload,
  EmployeeFilters, EmployeeStatistics, Beneficiary, BeneficiaryCreatePayload,
  PaginatedResponse, HistoryRecord, BusinessHistoryRecord,
} from "../types";

// ── Nettoyage des filtres (supprime les valeurs vides) ───
const cleanParams = (filters: EmployeeFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null));

// ═══════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════
export const employeeApi = {

  list: (filters: EmployeeFilters = {}) =>
    apiClient.get<PaginatedResponse<EmployeeListItem>>(
      "/employees/", { params: cleanParams(filters) }
    ),

  get: (id: string) =>
    apiClient.get<{ status: string; data: Employee }>(`/employees/${id}/`),

  create: (data: EmployeeCreatePayload) =>
    apiClient.post<{ status: string; data: Employee }>("/employees/", data),

  update: (id: string, data: EmployeeUpdatePayload) =>
    apiClient.patch<{ status: string; data: Employee }>(`/employees/${id}/`, data),

  delete: (id: string) =>
    apiClient.delete(`/employees/${id}/`),

  // ── Photo ────────────────────────────────────────────
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return apiClient.post<{ status: string; data: { photo_url: string } }>(
      `/employees/${id}/photo/`, form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  deletePhoto: (id: string) =>
    apiClient.delete(`/employees/${id}/photo/`),

  // ── Actions ──────────────────────────────────────────
  changeStatus: (id: string, status: string, reason?: string) =>
    apiClient.post(`/employees/${id}/change-status/`, { status, reason }),

  // ── Historique technique ─────────────────────────────
  getHistory: (id: string) =>
    apiClient.get<{ status: string; count: number; data: HistoryRecord[] }>(
      `/employees/${id}/history/`
    ),

  // ── Historique métier ────────────────────────────────
  getBusinessHistory: (id: string) =>
    apiClient.get<{ status: string; count: number; data: BusinessHistoryRecord[] }>(
      `/employees/${id}/business-history/`
    ),

  // ── Statistiques ─────────────────────────────────────
  getStatistics: () =>
    apiClient.get<{ status: string; data: EmployeeStatistics }>("/employees/statistics/"),

  // ── Export CSV ───────────────────────────────────────
  exportCsv: (filters: EmployeeFilters = {}) =>
    apiClient.get("/employees/export/", {
      params: cleanParams(filters),
      responseType: "blob",
    }),
};

// ═══════════════════════════════════════════════════════
// BENEFICIARIES
// ═══════════════════════════════════════════════════════
export const beneficiaryApi = {

  list: (employeeId: string) =>
    apiClient.get<{ status: string; data: Beneficiary[]; count: number }>(
      `/employees/${employeeId}/beneficiaries/`
    ),

  create: (employeeId: string, data: BeneficiaryCreatePayload) =>
    apiClient.post<{ status: string; data: Beneficiary }>(
      `/employees/${employeeId}/beneficiaries/`, data
    ),

  update: (employeeId: string, id: string, data: Partial<BeneficiaryCreatePayload>) =>
    apiClient.patch<{ status: string; data: Beneficiary }>(
      `/employees/${employeeId}/beneficiaries/${id}/`, data
    ),

  delete: (employeeId: string, id: string) =>
    apiClient.delete(`/employees/${employeeId}/beneficiaries/${id}/`),
};

// ═══════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════
export const departmentApi = {

  list: (params?: { is_active?: boolean; search?: string }) =>
    apiClient.get("/departments/", { params }),

  tree: () =>
    apiClient.get("/departments/tree/"),

  create: (data: Record<string, unknown>) =>
    apiClient.post("/departments/", data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/departments/${id}/`, data),

  delete: (id: string) =>
    apiClient.delete(`/departments/${id}/`),
};
