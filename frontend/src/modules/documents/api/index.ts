import apiClient from "@shared/api/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const DOCUMENTS_KEYS = {
  all:         () => ["documents"] as const,
  lists:       () => ["documents", "list"] as const,
  list:        (params?: Record<string, unknown>) => [...DOCUMENTS_KEYS.lists(), params] as const,
  details:     () => ["documents", "detail"] as const,
  detail:      (id: string) => [...DOCUMENTS_KEYS.details(), id] as const,
  categories:  () => ["documents", "categories"] as const,
};

export function useDocuments(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.list(params as Record<string, unknown>),
    queryFn: () =>
      apiClient
        .get<{ status: string; results?: any[] }>("/documents/", { params })
        .then((r) => r.data.results ?? []),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.detail(id),
    queryFn: () =>
      apiClient
        .get<{ status: string; data?: any }>(`/documents/${id}/`)
        .then((r) => r.data.data ?? r.data),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post("/documents/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.lists() }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/documents/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENTS_KEYS.lists() }),
  });
}

export function useDocumentCategories() {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.categories(),
    queryFn: () =>
      apiClient
        .get<{ status: string; data: string[] }>("/documents/categories/")
        .then((r) => r.data.data),
  });
}

export function useDownloadDocument() {
  return (url: string) => {
    window.open(url, "_blank");
  };
}
