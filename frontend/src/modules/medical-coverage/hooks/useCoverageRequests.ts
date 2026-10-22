import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { coverageRequestApi } from "../api/requests";
import type {
  MedicalCoverageRequestCreatePayload,
  RequestStatus,
} from "../types/request";

export const REQUEST_KEYS = {
  all:        ["coverage-requests"] as const,
  lists:      () => [...REQUEST_KEYS.all, "list"] as const,
  list:       (f: Record<string, unknown>) => [...REQUEST_KEYS.lists(), f] as const,
  detail:     (id: string) => [...REQUEST_KEYS.all, "detail", id] as const,
  statistics: () => [...REQUEST_KEYS.all, "statistics"] as const,
};

export function useCoverageRequests(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: REQUEST_KEYS.list(params),
    queryFn: () => coverageRequestApi.list(params).then(r => r.data),
    placeholderData: (prev) => prev,
  });
}

export function useCoverageRequest(id: string | null) {
  return useQuery({
    queryKey: REQUEST_KEYS.detail(id!),
    queryFn: () => coverageRequestApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });
}

export function useCreateCoverageRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicalCoverageRequestCreatePayload) =>
      coverageRequestApi.create(data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.lists() });
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.statistics() });
    },
  });
}

export function useUpdateCoverageRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MedicalCoverageRequestCreatePayload>) =>
      coverageRequestApi.update(id, data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.lists() });
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.statistics() });
    },
  });
}

export function useDeleteCoverageRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => coverageRequestApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.lists() });
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.statistics() });
    },
  });
}

export function useAvailableTransitions(id: string | null) {
  return useQuery({
    queryKey: [...REQUEST_KEYS.detail(id!), "available_transitions"],
    queryFn:  () => coverageRequestApi.availableTransitions(id!).then(r => r.data.data),
    enabled:  !!id,
    staleTime: 0,
  });
}

export function useTransitionCoverageRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ to_state, reason }: { to_state: RequestStatus; reason?: string }) =>
      coverageRequestApi.transition(id, to_state, reason).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.lists() });
      qc.invalidateQueries({ queryKey: REQUEST_KEYS.statistics() });
    },
  });
}

export function useCoverageRequestStatistics(params?: { category?: string }) {
  return useQuery({
    queryKey: [...REQUEST_KEYS.statistics(), params],
    queryFn: () => coverageRequestApi.statistics(params).then(r => r.data.data),
    staleTime: 1000 * 60 * 2,
  });
}
