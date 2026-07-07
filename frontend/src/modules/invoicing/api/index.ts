import apiClient from "@shared/api/apiClient";
import type {
  Invoice, InvoiceCreatePayload, InvoiceFilters,
  InvoiceStatistics, AvailableVoucher, InvoiceAttachment,
} from "../types";

function clean(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== null && v !== undefined));
}

export const invoicingApi = {
  list(filters: InvoiceFilters = {}) {
    return apiClient.get<{ status: string; count: number; results: Invoice[] }>("/invoicing/invoices/", { params: clean(filters as any) });
  },

  get(id: string) {
    return apiClient.get<{ status: string; data: Invoice }>(`/invoicing/invoices/${id}/`);
  },

  create(payload: InvoiceCreatePayload) {
    return apiClient.post<{ status: string; data: Invoice }>("/invoicing/invoices/", payload);
  },

  update(id: string, payload: Partial<InvoiceCreatePayload>) {
    return apiClient.patch<{ status: string; data: Invoice }>(`/invoicing/invoices/${id}/`, payload);
  },

  delete(id: string) {
    return apiClient.delete(`/invoicing/invoices/${id}/`);
  },

  transition(id: string, action: "validate" | "pay" | "cancel", notes?: string) {
    return apiClient.post<{ status: string; data: Invoice }>(`/invoicing/invoices/${id}/transition/`, { action, notes });
  },

  availableVouchers(params: {
    partner_id: string; month: number; year: number;
    period_start?: string; period_end?: string;
    employee_id?: string; beneficiary_id?: string;
  }) {
    return apiClient.get<{ status: string; count: number; data: AvailableVoucher[] }>("/invoicing/invoices/available_vouchers/", {
      params: clean(params as any),
    });
  },

  statistics() {
    return apiClient.get<{ status: string; data: InvoiceStatistics }>("/invoicing/invoices/statistics/");
  },

  uploadAttachment(id: string, file: File, description?: string) {
    const form = new FormData();
    form.append("file", file);
    if (description) form.append("description", description);
    return apiClient.post<{ status: string; data: InvoiceAttachment }>(`/invoicing/invoices/${id}/upload_attachment/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteAttachment(id: string, attachmentId: string) {
    return apiClient.delete(`/invoicing/invoices/${id}/delete_attachment/`, {
      params: { attachment_id: attachmentId },
    });
  },
};
