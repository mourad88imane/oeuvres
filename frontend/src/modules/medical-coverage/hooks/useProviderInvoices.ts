import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { providerInvoiceApi } from "../api/providerInvoices";
import type { ProviderInvoiceFilters } from "../types/providerInvoice";

export const PROVIDER_INVOICE_KEYS = {
  all:   ["provider-invoices"] as const,
  lists: () => [...PROVIDER_INVOICE_KEYS.all, "list"] as const,
  list:  (f: ProviderInvoiceFilters) => [...PROVIDER_INVOICE_KEYS.lists(), f] as const,
  detail: (id: string) => [...PROVIDER_INVOICE_KEYS.all, "detail", id] as const,
  statistics: () => [...PROVIDER_INVOICE_KEYS.all, "statistics"] as const,
};

export function useProviderInvoices(filters: ProviderInvoiceFilters = {}) {
  return useQuery({
    queryKey: PROVIDER_INVOICE_KEYS.list(filters),
    queryFn: () => providerInvoiceApi.list(filters).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });
}

export function useCreateProviderInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      providerInvoiceApi.create(payload).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROVIDER_INVOICE_KEYS.lists() });
    },
  });
}
