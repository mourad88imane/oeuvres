import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicingApi } from "../api";
import type { InvoiceFilters, InvoiceCreatePayload } from "../types";

export const INVOICE_KEYS = {
  all: ["invoices"] as const,
  lists: () => [...INVOICE_KEYS.all, "list"] as const,
  list: (f: InvoiceFilters) => [...INVOICE_KEYS.lists(), f] as const,
  detail: (id: string) => [...INVOICE_KEYS.all, "detail", id] as const,
  statistics: () => [...INVOICE_KEYS.all, "statistics"] as const,
};

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: INVOICE_KEYS.list(filters),
    queryFn: () => invoicingApi.list(filters).then((r) => r.data),
    placeholderData: (prev: any) => prev,
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id!),
    queryFn: () => invoicingApi.get(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useInvoiceStatistics() {
  return useQuery({
    queryKey: INVOICE_KEYS.statistics(),
    queryFn: () => invoicingApi.statistics().then((r) => r.data.data),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InvoiceCreatePayload) =>
      invoicingApi.create(payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.statistics() });
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      invoicingApi.update(id, payload).then((r) => r.data.data),
    onSuccess: (_data: any, vars: any) => {
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.detail(vars.id) });
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.statistics() });
    },
  });
}

export function useTransitionInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: "validate" | "pay" | "cancel"; notes?: string }) =>
      invoicingApi.transition(id, action, notes).then((r) => r.data.data),
    onSuccess: (_data: any, vars: any) => {
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.detail(vars.id) });
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.statistics() });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoicingApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.lists() });
      qc.invalidateQueries({ queryKey: INVOICE_KEYS.statistics() });
    },
  });
}
