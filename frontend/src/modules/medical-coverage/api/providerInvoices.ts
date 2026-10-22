import apiClient from "@shared/api/apiClient";
import type { ProviderInvoiceFilters, ProviderInvoiceStatistics } from "../types/providerInvoice";

export const providerInvoiceApi = {
  list(filters: ProviderInvoiceFilters = {}) {
    const params: Record<string, unknown> = {};
    if (filters.search) params.search = filters.search;
    if (filters.partner) params.partner = filters.partner;
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.page) params.page = filters.page;
    if (filters.page_size) params.page_size = filters.page_size;
    return apiClient.get("/invoicing/invoices/", { params });
  },

  get(id: string) {
    return apiClient.get(`/invoicing/invoices/${id}/`);
  },

  create(payload: Record<string, unknown>) {
    return apiClient.post("/invoicing/invoices/", payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return apiClient.patch(`/invoicing/invoices/${id}/`, payload);
  },

  delete(id: string) {
    return apiClient.delete(`/invoicing/invoices/${id}/`);
  },

  downloadPdf(id: string, mode: "preview" | "download" = "download") {
    return apiClient.get(`/invoicing/invoices/${id}/pdf/`, {
      params: { mode },
      responseType: "blob",
    });
  },

  statistics() {
    return apiClient.get<{ status: string; data: ProviderInvoiceStatistics }>("/invoicing/invoices/statistics/");
  },
};
