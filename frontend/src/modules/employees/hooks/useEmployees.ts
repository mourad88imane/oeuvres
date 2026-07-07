/**
 * EMPLOYEE HOOKS — TanStack Query
 * Toutes les opérations serveur passent par ces hooks.
 * Cache automatique, invalidation, optimistic updates.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeApi, beneficiaryApi, departmentApi } from "../api";
import type {
  EmployeeFilters, EmployeeCreatePayload,
  EmployeeUpdatePayload, BeneficiaryCreatePayload, BusinessHistoryRecord,
} from "../types";

// ── Clés de cache ──────────────────────────────────────────
export const EMPLOYEE_KEYS = {
  all:        ["employees"] as const,
  lists:      () => [...EMPLOYEE_KEYS.all, "list"] as const,
  list:       (f: EmployeeFilters) => [...EMPLOYEE_KEYS.lists(), f] as const,
  detail:     (id: string) => [...EMPLOYEE_KEYS.all, "detail", id] as const,
  history:    (id: string) => [...EMPLOYEE_KEYS.all, "history", id] as const,
  businessHistory: (id: string) => [...EMPLOYEE_KEYS.all, "business-history", id] as const,
  statistics: () => [...EMPLOYEE_KEYS.all, "statistics"] as const,
  beneficiaries: (employeeId: string) => ["beneficiaries", employeeId] as const,
  departments: () => ["departments"] as const,
};

// ═══════════════════════════════════════════════════════
// QUERY HOOKS (lecture)
// ═══════════════════════════════════════════════════════

/** Liste paginée et filtrée des employés. */
export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.list(filters),
    queryFn:  () => employeeApi.list(filters).then((r) => r.data),
    placeholderData: (prev) => prev,  // Garde l'ancienne page pendant le chargement
  });
}

/** Détail complet d'un employé. */
export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.detail(id!),
    queryFn:  () => employeeApi.get(id!).then((r) => r.data.data),
    enabled:  !!id,
  });
}

/** Historique technique (audit log). */
export function useEmployeeHistory(id: string | null) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.history(id!),
    queryFn:  () => employeeApi.getHistory(id!).then((r) => r.data),
    enabled:  !!id,
    staleTime: 0,
  });
}

/** Historique métier (prestations, prêts, couvertures médicales). */
export function useEmployeeBusinessHistory(id: string | null) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.businessHistory(id!),
    queryFn:  () => employeeApi.getBusinessHistory(id!).then((r) => r.data),
    enabled:  !!id,
    staleTime: 1000 * 30,
  });
}

/** Statistiques agrégées. */
export function useEmployeeStatistics() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.statistics(),
    queryFn:  () => employeeApi.getStatistics().then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,  // 5 minutes
  });
}

/** Ayants droit d'un employé. */
export function useBeneficiaries(employeeId: string | null) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.beneficiaries(employeeId!),
    queryFn:  () => beneficiaryApi.list(employeeId!).then((r) => r.data),
    enabled:  !!employeeId,
  });
}

/** Liste des départements pour les selects. */
export function useDepartments(params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: [...EMPLOYEE_KEYS.departments(), params],
    queryFn:  () =>
      departmentApi.list(params ?? { is_active: true }).then((r) => r.data),
    staleTime: 1000 * 60 * 10,  // 10 min (données stables)
  });
}

// ═══════════════════════════════════════════════════════
// MUTATION HOOKS (écriture)
// ═══════════════════════════════════════════════════════

/** Créer un employé. */
export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeCreatePayload) =>
      employeeApi.create(data).then((r) => r.data.data),
    onSuccess: () => {
      // Invalider toutes les listes pour forcer le rechargement
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.statistics() });
    },
  });
}

/** Modifier un employé. */
export function useUpdateEmployee(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeeUpdatePayload) =>
      employeeApi.update(id, data).then((r) => r.data.data),
    onSuccess: (updatedEmployee) => {
      // Mise à jour optimiste du cache
      qc.setQueryData(EMPLOYEE_KEYS.detail(id), updatedEmployee);
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
    },
  });
}

/** Supprimer un employé. */
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: EMPLOYEE_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.statistics() });
    },
  });
}

/** Upload photo. */
export function useUploadPhoto(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      employeeApi.uploadPhoto(employeeId, file).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
    },
  });
}

/** Supprimer photo. */
export function useDeletePhoto(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => employeeApi.deletePhoto(employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
    },
  });
}

/** Changer le statut. */
export function useChangeStatus(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      employeeApi.changeStatus(employeeId, status, reason).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.statistics() });
    },
  });
}

/** Créer un ayant droit. */
export function useCreateBeneficiary(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BeneficiaryCreatePayload) =>
      beneficiaryApi.create(employeeId, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.beneficiaries(employeeId) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
    },
  });
}

/** Modifier un ayant droit. */
export function useUpdateBeneficiary(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BeneficiaryCreatePayload> }) =>
      beneficiaryApi.update(employeeId, id, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.beneficiaries(employeeId) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
    },
  });
}

/** Supprimer un ayant droit. */
export function useDeleteBeneficiary(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beneficiaryApi.delete(employeeId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.beneficiaries(employeeId) });
      qc.invalidateQueries({ queryKey: EMPLOYEE_KEYS.detail(employeeId) });
    },
  });
}

/** Export CSV. */
export function useExportEmployees() {
  return useMutation({
    mutationFn: async (filters: EmployeeFilters) => {
      const resp = await employeeApi.exportCsv(filters);
      const url  = URL.createObjectURL(new Blob([resp.data]));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `employes-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
