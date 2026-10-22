import apiClient from "@shared/api/apiClient";
import type {
  EmployeeEligibilityResponse,
  MedicalCoverageRequest,
  MedicalCoverageRequestCreatePayload,
  RequestStatistics,
  RequestStatus,
} from "../types/request";

const clean = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));

export const coverageRequestApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiClient.get<{ status: string; pagination: any; results: MedicalCoverageRequest[] }>(
      "/medical-coverage/requests/", { params: clean(params) }
    ),

  get: (id: string) =>
    apiClient.get<{ status: string; data: MedicalCoverageRequest }>(
      `/medical-coverage/requests/${id}/`
    ),

  create: (data: MedicalCoverageRequestCreatePayload) =>
    apiClient.post<{ status: string; data: MedicalCoverageRequest }>(
      "/medical-coverage/requests/", data
    ),

  update: (id: string, data: Partial<MedicalCoverageRequestCreatePayload>) =>
    apiClient.put<{ status: string; data: MedicalCoverageRequest }>(
      `/medical-coverage/requests/${id}/`, data
    ),

  delete: (id: string) =>
    apiClient.delete(`/medical-coverage/requests/${id}/`),

  transition: (id: string, to_state: RequestStatus, reason?: string) =>
    apiClient.post<{ status: string; data: MedicalCoverageRequest }>(
      `/medical-coverage/requests/${id}/transition/`, { to_state, reason }
    ),

  availableTransitions: (id: string) =>
    apiClient.get<{ status: string; data: any[] }>(
      `/medical-coverage/requests/${id}/available_transitions/`
    ),

  statistics: (params?: { category?: string }) =>
    apiClient.get<{ status: string; data: RequestStatistics }>(
      "/medical-coverage/requests/statistics/", { params }
    ),

  getEmployeeEligibility: (employeeId: string, category: string, beneficiaryId?: string) =>
    apiClient.get<{ status: string; data: EmployeeEligibilityResponse }>(
      "/medical-coverage/requests/employee_eligibility/",
      { params: { employee_id: employeeId, category, ...(beneficiaryId ? { beneficiary_id: beneficiaryId } : {}) } }
    ),

  downloadPdf: (id: string, mode: "preview" | "download" = "download") =>
    apiClient.get(`/medical-coverage/requests/${id}/pdf/`, {
      params: { mode },
      responseType: "blob",
    }),

  markConsumed: (id: string) =>
    apiClient.post(`/medical-coverage/requests/${id}/mark_consumed/`),

  workflowLog: (id: string) =>
    apiClient.get<{ status: string; count: number; data: any[] }>(
      `/medical-coverage/requests/${id}/workflow_log/`
    ),
};
