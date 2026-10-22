import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Edit2, Printer, FileText, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Modal, Spinner } from "@shared/components/ui";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { Breadcrumb } from "@shared/components/ui/Breadcrumb";
import { useProviderInvoices } from "../hooks/useProviderInvoices";
import { providerInvoiceApi } from "../api/providerInvoices";
import { PROVIDER_INVOICE_STATUS_UI, PROVIDER_CATEGORY_OPTIONS, categoryLabel } from "../types/providerInvoice";
import type { ProviderInvoiceStatus, ProviderInvoice, ProviderInvoiceFilters } from "../types/providerInvoice";

export function ProviderInvoicesListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProviderInvoiceStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfInvoiceId, setPdfInvoiceId] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePreview = useCallback(async (id: string) => {
    setPdfInvoiceId(id);
    setPreviewOpen(true);
    setPdfLoading(true);
    try {
      const resp = await providerInvoiceApi.downloadPdf(id, "preview");
      const blob = resp.data as Blob;
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch {
      setPdfBlobUrl(null);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const handlePrintPDF = useCallback(() => {
    const frame = document.getElementById("pdf-preview-frame") as HTMLIFrameElement | null;
    if (frame?.contentWindow) {
      frame.contentWindow.print();
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    if (!pdfInvoiceId) return;
    try {
      const resp = await providerInvoiceApi.downloadPdf(pdfInvoiceId, "download");
      const blob = resp.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfInvoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  }, [pdfInvoiceId]);

  function closePreview() {
    setPreviewOpen(false);
    setPdfInvoiceId(null);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }

  const filters: ProviderInvoiceFilters = {};
  if (search) filters.search = search;
  if (partnerFilter) filters.partner = partnerFilter;
  if (categoryFilter) filters.category = categoryFilter;
  if (statusFilter) filters.status = statusFilter;
  if (dateFrom) filters.date_from = dateFrom;
  if (dateTo) filters.date_to = dateTo;
  filters.page = page;

  const { data: listRes, isLoading } = useProviderInvoices(filters);

  const invoices: ProviderInvoice[] = (listRes as any)?.results || [];
  const totalCount = (listRes as any)?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  const statusPills: [string, string][] = [
    ["", "Toutes"],
    ["draft", "Brouillons"],
    ["validated", "Validées"],
    ["paid", "Payées"],
    ["cancelled", "Annulées"],
  ];

  function resetPage() { setPage(1); }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR");
  }

  function formatPeriod(start: string | null, end: string | null): string {
    if (!start && !end) return "—";
    const s = start ? new Date(start).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";
    const e = end ? new Date(end).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
    return `${s} - ${e}`;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumb
        items={[
          { label: t("nav.careSupport") },
          { label: t("nav.providerInvoices") },
        ]}
      />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1a1917" }}>{t("nav.providerInvoices")}</h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#8a8882" }}>Gestion des factures des prestataires</p>
        </div>
        <RoleGuard permission="coverage.create">
          <button
            onClick={() => navigate("/medical-coverage/invoices/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "#ffda2d", color: "#1a1917" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle facture prestataire
          </button>
        </RoleGuard>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
        <div className="p-4 flex flex-wrap items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8a8882" }} />
            <input
              type="text"
              placeholder="Rechercher par n° facture ou prestataire..."
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border-0"
              style={{ background: "#f5f4f0", color: "#1a1917" }}
            />
          </div>

          <select
            value={partnerFilter}
            onChange={e => { setPartnerFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
          >
            <option value="">Tous les prestataires</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); resetPage(); }}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
          >
            <option value="">Toutes catégories</option>
            {PROVIDER_CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); resetPage(); }}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent", width: 150 }}
            placeholder="Date début"
          />

          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); resetPage(); }}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent", width: 150 }}
            placeholder="Date fin"
          />

          <div className="flex gap-1">
            {statusPills.map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setStatusFilter(val as ProviderInvoiceStatus | ""); resetPage(); }}
                className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold transition-all")}
                style={{
                  background: statusFilter === val ? "#ffda2d" : "transparent",
                  color: statusFilter === val ? "#1a1917" : "#8a8882",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#d4d2cc" }} />
            <p className="font-bold" style={{ color: "#8a8882" }}>Aucune facture trouvée</p>
            <p className="text-sm mt-1" style={{ color: "#b0aea6" }}>Créez une nouvelle facture pour commencer.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  {["N° facture", "Prestataire", "Catégorie", "Date facture", "Période", "Statut", "Montant total", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: ProviderInvoice) => {
                  const statusUI = PROVIDER_INVOICE_STATUS_UI[inv.status];
                  return (
                    <tr
                      key={inv.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm" style={{ color: "#1a1917" }}>{inv.invoice_number || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: "#1a1917" }}>{inv.partner_name}</td>
                      <td className="px-4 py-3">
                        {inv.category && (
                          <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                            {categoryLabel(inv.category)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{formatDate(inv.invoice_date)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{formatPeriod(inv.period_start, inv.period_end)}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ background: statusUI?.bg, color: statusUI?.color }}
                        >
                          {inv.status_label || statusUI?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: "#1a1917" }}>{inv.total_amount.toLocaleString()} DZD</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/medical-coverage/invoices/${inv.id}`); }}
                            className="p-1.5 rounded-xl transition-colors"
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          >
                            <Eye className="w-4 h-4" style={{ color: "#3b82f6" }} />
                          </button>
                          <RoleGuard permission="coverage.update">
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/medical-coverage/invoices/${inv.id}/edit`); }}
                              className="p-1.5 rounded-xl transition-colors"
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                              <Edit2 className="w-4 h-4" style={{ color: "#8a8882" }} />
                            </button>
                          </RoleGuard>
                          <RoleGuard permission="coverage.print_voucher">
                            <button
                              onClick={e => { e.stopPropagation(); handlePreview(inv.id); }}
                              className="p-1.5 rounded-xl transition-colors"
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              title="Aperçu / Imprimer"
                            >
                              <Printer className="w-4 h-4" style={{ color: "#8a8882" }} />
                            </button>
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
            <span className="text-sm" style={{ color: "#8a8882" }}>Page {page} / {totalPages} ({totalCount} résultat(s))</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30"
                style={{ background: "#f5f4f0", color: "#1a1917" }}
              >
                <ChevronLeft className="w-4 h-4 inline mr-1" />
                Précédent
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30"
                style={{ background: "#f5f4f0", color: "#1a1917" }}
              >
                Suivant
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
      <Modal
        open={previewOpen}
        onClose={closePreview}
        title={`Facture ${pdfInvoiceId ? `#${pdfInvoiceId}` : ""}`}
        size="full"
        footer={
          <div className="flex items-center gap-2">
            <button
              onClick={closePreview}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "#f5f4f0", color: "#1a1917" }}
            >
              Fermer
            </button>
            <div className="flex-1" />
            <RoleGuard permission="coverage.view">
              <button
                onClick={handleExportPDF}
                disabled={!pdfBlobUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: "#f5f4f0", color: "#1a1917" }}
              >
                <Download className="w-4 h-4" />
                Exporter PDF
              </button>
            </RoleGuard>
            <RoleGuard permission="coverage.print_voucher">
              <button
                onClick={handlePrintPDF}
                disabled={!pdfBlobUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: "#ffda2d", color: "#1a1917" }}
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </RoleGuard>
          </div>
        }
      >
        {pdfLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8a8882" }} />
          </div>
        ) : pdfBlobUrl ? (
          <iframe
            id="pdf-preview-frame"
            src={pdfBlobUrl}
            className="w-full border-0 rounded-xl"
            style={{ height: "70vh", background: "#f5f4f0" }}
            title="Aperçu PDF"
          />
        ) : (
          <div className="text-center py-12">
            <p className="font-bold" style={{ color: "#8a8882" }}>Impossible de charger l'aperçu</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
