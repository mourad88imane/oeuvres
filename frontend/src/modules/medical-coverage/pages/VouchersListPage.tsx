import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ChevronLeft, ChevronRight, Eye, Printer, Download,
} from "lucide-react";
import { coverageRequestApi } from "../api/requests";
import { CONSUMPTION_STATUS_UI, INVOICE_STATUS_UI, statusLabel } from "../types/request";
import type { MedicalCoverageRequest, ConsumptionStatus, InvoiceStatus } from "../types/request";

const PAGE_SIZE = 25;

export function VouchersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["coverage-requests", "approved", "vouchers-page"],
    queryFn: async () => {
      const [v, p] = await Promise.all([
        coverageRequestApi.list({ status: "validated", page_size: 500 }).then(r => r.data),
        coverageRequestApi.list({ status: "printed", page_size: 500 }).then(r => r.data),
      ]);
      return [...(v.results ?? []), ...(p.results ?? [])] as MedicalCoverageRequest[];
    },
    placeholderData: prev => prev,
  });

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(r =>
        (r.voucher_number ?? "").toLowerCase().includes(s) ||
        r.request_number.toLowerCase().includes(s) ||
        r.employee_name.toLowerCase().includes(s) ||
        r.employee_matricule.toLowerCase().includes(s) ||
        (r.beneficiary_name ?? "").toLowerCase().includes(s) ||
        r.partner_name.toLowerCase().includes(s)
      );
    }
    items.sort((a, b) => (b.validation_date ?? b.coverage_date).localeCompare(a.validation_date ?? a.coverage_date));
    return items;
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePageChange = (n: number) => {
    if (n >= 1 && n <= totalPages) setPage(n);
  };

  const consumptionStatusStyle = (status: ConsumptionStatus) =>
    CONSUMPTION_STATUS_UI[status] || CONSUMPTION_STATUS_UI.not_consumed;

  const invoiceStatusStyle = (status: InvoiceStatus) =>
    INVOICE_STATUS_UI[status] || INVOICE_STATUS_UI.not_invoiced;

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "#1a1917" }}>Bons de prise en charge</h1>
          <p className="text-xs font-medium" style={{ color: "#8a8882" }}>
            Demandes approuvées — {filtered.length} bon{(filtered.length > 1 ? "s" : "")}
          </p>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none font-medium"
            style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#ffda2d] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <p className="text-sm font-bold" style={{ color: "#8a8882" }}>
              {search ? "Aucun résultat" : "Aucun bon approuvé"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>N° Bon</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>N° Demande</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Employé</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Bénéficiaire</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Catégorie</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Prestataire</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Date validation</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Consommation</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Facturation</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(r => (
                  <tr key={`r-${r.id}`} className="cursor-pointer" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    onClick={() => navigate(`/medical-coverage/requests/${r.id}`)}
                  >
                    <td className="py-3 font-bold" style={{ color: "#1a1917" }}>
                      {r.voucher_number || "—"}
                    </td>
                    <td className="py-3 font-bold" style={{ color: "#1a1917" }}>{r.request_number}</td>
                    <td className="py-3">
                      <div>
                        <p className="font-bold" style={{ color: "#1a1917" }}>{r.employee_name}</p>
                        <p className="text-xs font-medium" style={{ color: "#8a8882" }}>{r.employee_matricule}</p>
                      </div>
                    </td>
                    <td className="py-3 font-medium" style={{ color: "#4d4b46" }}>
                      {r.beneficiary_name || r.employee_name}
                    </td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold"
                        style={{ background: "rgba(255,218,45,0.1)", color: "#4d4b46" }}>
                        {r.category_display}
                      </span>
                    </td>
                    <td className="py-3 font-medium" style={{ color: "#4d4b46" }}>{r.partner_name}</td>
                    <td className="py-3 font-medium" style={{ color: "#4d4b46" }}>{r.validation_date || r.coverage_date}</td>
                    <td className="py-3">
                      <span className="inline-block px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-wider"
                        style={{ color: consumptionStatusStyle(r.consumption_status).color, background: consumptionStatusStyle(r.consumption_status).bg }}>
                        {statusLabel(t, consumptionStatusStyle(r.consumption_status))}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-block px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-wider"
                        style={{ color: invoiceStatusStyle(r.invoice_status).color, background: invoiceStatusStyle(r.invoice_status).bg }}>
                        {statusLabel(t, invoiceStatusStyle(r.invoice_status))}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/medical-coverage/requests/${r.id}`); }}
                          className="p-1.5 rounded-xl transition-colors"
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <Eye className="w-4 h-4" style={{ color: "#8a8882" }} />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const resp = await coverageRequestApi.downloadPdf(r.id, "preview");
                              const url = URL.createObjectURL(resp.data as Blob);
                              window.open(url, "_blank");
                            } catch { /* ignore */ }
                          }}
                          className="p-1.5 rounded-xl transition-colors"
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <Printer className="w-4 h-4" style={{ color: "#8a8882" }} />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const resp = await coverageRequestApi.downloadPdf(r.id);
                              const url = URL.createObjectURL(resp.data);
                              const a = document.createElement('a');
                              a.href = url; a.download = `bon-${r.voucher_number || r.id}.pdf`;
                              document.body.appendChild(a); a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch { /* ignore */ }
                          }}
                          className="p-1.5 rounded-xl transition-colors"
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <Download className="w-4 h-4" style={{ color: "#8a8882" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
            <span className="text-xs font-medium" style={{ color: "#8a8882" }}>
              Page {page} sur {totalPages} ({filtered.length} résultat{(filtered.length > 1 ? "s" : "")})
            </span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}
                className="p-1.5 rounded-xl transition-colors disabled:opacity-30" style={{ background: "#f3f2ee" }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}
                className="p-1.5 rounded-xl transition-colors disabled:opacity-30" style={{ background: "#f3f2ee" }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
