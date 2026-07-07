import apiClient from "@shared/api/apiClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginatedResponse } from "@modules/employees/types";
import type {
  Partner, PartnerListItem,
  Convention, ConventionListItem,
  ConventionDocument, ConventionAlert,
  ConventionDashboard, ConventionFilters,
} from "../types";

const clean = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null));

export const conventionsApi = {
  // Dashboard
  getDashboard: () =>
    apiClient.get<ConventionDashboard>("/conventions/conventions/dashboard/"),

  // Partners
  listPartners: (params: Record<string, unknown> = {}) =>
    apiClient.get<PaginatedResponse<PartnerListItem>>("/conventions/partners/", { params: clean(params) }),
  getPartner: (id: string) =>
    apiClient.get<Partner>(`/conventions/partners/${id}/`),
  createPartner: (data: Record<string, unknown>) =>
    apiClient.post("/conventions/partners/", data),
  updatePartner: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/conventions/partners/${id}/`, data),
  deletePartner: (id: string) =>
    apiClient.delete(`/conventions/partners/${id}/`),

  // Conventions
  listConventions: (filters: ConventionFilters = {}) =>
    apiClient.get<PaginatedResponse<ConventionListItem>>("/conventions/conventions/", { params: clean(filters as Record<string, unknown>) }),
  getConvention: (id: string) =>
    apiClient.get<Convention>(`/conventions/conventions/${id}/`),
  createConvention: (data: Record<string, unknown>) =>
    apiClient.post("/conventions/conventions/", data),
  updateConvention: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/conventions/conventions/${id}/`, data),
  renewConvention: (id: string, data: { new_end_date: string; new_amount?: number | null; notes?: string }) =>
    apiClient.post(`/conventions/conventions/${id}/renew/`, data),
  terminateConvention: (id: string, data: { terminated_date?: string; reason?: string }) =>
    apiClient.post(`/conventions/conventions/${id}/terminate/`, data),
  markExpired: (id: string) =>
    apiClient.post(`/conventions/conventions/${id}/mark_expired/`),
  uploadDocument: (id: string, formData: FormData) =>
    apiClient.post(`/conventions/conventions/${id}/upload_document/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Documents
  listDocuments: (params: Record<string, unknown> = {}) =>
    apiClient.get<PaginatedResponse<ConventionDocument>>("/conventions/documents/", { params: clean(params) }),

  // Alerts
  listAlerts: (params: Record<string, unknown> = {}) =>
    apiClient.get<PaginatedResponse<ConventionAlert>>("/conventions/alerts/", { params: clean(params) }),
  resolveAlert: (id: string) =>
    apiClient.post(`/conventions/alerts/${id}/resolve/`),
  markAllAlertsRead: () =>
    apiClient.post("/conventions/alerts/mark-all-read/"),
};

export const CONVENTION_KEYS = {
  dashboard:     () => ["conventions", "dashboard"] as const,
  partners:      (p?: Record<string, unknown>) => ["conventions", "partners", p] as const,
  partner:       (id: string) => ["conventions", "partners", id] as const,
  conventions:   (f?: ConventionFilters) => ["conventions", "conventions", f] as const,
  convention:    (id: string) => ["conventions", "conventions", id] as const,
  documents:     (p?: Record<string, unknown>) => ["conventions", "documents", p] as const,
  alerts:        (p?: Record<string, unknown>) => ["conventions", "alerts", p] as const,
};

export const useConventionDashboard = () =>
  useQuery({
    queryKey: CONVENTION_KEYS.dashboard(),
    queryFn: () => conventionsApi.getDashboard().then(r => r.data),
    staleTime: 1000 * 60 * 3,
  });

export const usePartners = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: CONVENTION_KEYS.partners(params),
    queryFn: () => conventionsApi.listPartners(params).then(r => r.data),
    placeholderData: p => p,
  });

export const usePartner = (id: string | null) =>
  useQuery({
    queryKey: CONVENTION_KEYS.partner(id!),
    queryFn: () => conventionsApi.getPartner(id!).then(r => r.data),
    enabled: !!id,
  });

export const useCreatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => conventionsApi.createPartner(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conventions", "partners"] }),
  });
};

export const useUpdatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => conventionsApi.updatePartner(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conventions", "partners"] }),
  });
};

export const useDeletePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conventionsApi.deletePartner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conventions", "partners"] }),
  });
};

export const useConventions = (filters: ConventionFilters = {}) =>
  useQuery({
    queryKey: CONVENTION_KEYS.conventions(filters),
    queryFn: () => conventionsApi.listConventions(filters).then(r => r.data),
    placeholderData: p => p,
  });

export const useConvention = (id: string | null) =>
  useQuery({
    queryKey: CONVENTION_KEYS.convention(id!),
    queryFn: () => conventionsApi.getConvention(id!).then(r => r.data),
    enabled: !!id,
  });

export const useCreateConvention = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => conventionsApi.createConvention(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conventions", "conventions"] });
      qc.invalidateQueries({ queryKey: CONVENTION_KEYS.dashboard() });
    },
  });
};

export const useUpdateConvention = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => conventionsApi.updateConvention(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conventions", "conventions"] });
      qc.invalidateQueries({ queryKey: CONVENTION_KEYS.dashboard() });
    },
  });
};

export const useRenewConvention = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; new_end_date: string; new_amount?: number | null; notes?: string }) =>
      conventionsApi.renewConvention(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conventions", "conventions"] });
      qc.invalidateQueries({ queryKey: CONVENTION_KEYS.dashboard() });
    },
  });
};

export const useTerminateConvention = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; terminated_date?: string; reason?: string }) =>
      conventionsApi.terminateConvention(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conventions", "conventions"] });
      qc.invalidateQueries({ queryKey: CONVENTION_KEYS.dashboard() });
    },
  });
};

export const useConventionAlerts = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: CONVENTION_KEYS.alerts(params),
    queryFn: () => conventionsApi.listAlerts(params).then(r => r.data),
    staleTime: 0,
  });

export const useResolveAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conventionsApi.resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conventions", "alerts"] }),
  });
};

export const useConventionDocuments = (params: Record<string, unknown> = {}) =>
  useQuery({
    queryKey: CONVENTION_KEYS.documents(params),
    queryFn: () => conventionsApi.listDocuments(params).then(r => r.data),
    placeholderData: p => p,
  });
