import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, CheckCircle, BarChart3, DollarSign, CreditCard, TrendingUp, Download } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@shared/components/ui";
import { exportToExcel } from "@shared/utils/exportExcel";
import { useInvoices, useInvoiceStatistics } from "../hooks/useInvoices";
import { INVOICE_STATUS_UI, formatMonthYear, CATEGORY_OPTIONS, categoryLabel } from "../types";
import type { InvoiceStatus, InvoiceFilters, Invoice } from "../types";

export function InvoicesListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters: InvoiceFilters = {};
  if (statusFilter) filters.status = statusFilter as InvoiceStatus;
  if (categoryFilter) filters.category = categoryFilter;
  if (search) filters.search = search;
  filters.page = page;

  const { data: listRes, isLoading } = useInvoices(filters);
  const { data: stats } = useInvoiceStatistics();

  const invoices: Invoice[] = (listRes as any)?.results || [];
  const totalCount = (listRes as any)?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#1a1917" }}>Facturation Prestataires</h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#8a8882" }}>Gestion des factures mensuelles des prestataires</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const rows = invoices.map((inv: Invoice) => ({
                Référence: inv.reference,
                Prestataire: inv.partner_name,
                Catégorie: categoryLabel(inv.category || ""),
                Mois: formatMonthYear(inv.month, inv.year),
                "N° facture": inv.invoice_number || "",
                "Montant TTC": inv.total_amount,
                Lignes: inv.line_count,
                Statut: inv.status_label,
                "Date création": new Date(inv.created_at).toLocaleDateString("fr-FR"),
              }));
              exportToExcel(rows, [
                { header: "Référence", key: "Référence", width: 20 },
                { header: "Prestataire", key: "Prestataire", width: 30 },
                { header: "Catégorie", key: "Catégorie", width: 18 },
                { header: "Mois", key: "Mois", width: 14 },
                { header: "N° facture", key: "N° facture", width: 18 },
                { header: "Montant TTC", key: "Montant TTC", width: 16 },
                { header: "Lignes", key: "Lignes", width: 10 },
                { header: "Statut", key: "Statut", width: 14 },
                { header: "Date création", key: "Date création", width: 16 },
              ], `factures_${new Date().toISOString().slice(0, 10)}`);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "#f5f4f0", color: "#1a1917" }}
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={() => navigate("/invoicing/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "#ffda2d", color: "#1a1917" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        {[
          { label: "Total factures", value: stats?.total ?? 0, color: "#3b82f6", bg: "#eff6ff", icon: FileText },
          { label: "Brouillons", value: stats?.draft ?? 0, color: "#92400e", bg: "#fef3c7", icon: FileText },
          { label: "Validées", value: stats?.validated ?? 0, color: "#166534", bg: "#dcfce7", icon: CheckCircle },
          { label: "Montant total", value: `${(stats?.total_amount ?? 0).toLocaleString()} DZD`, color: "#1e40af", bg: "#dbeafe", icon: DollarSign },
          { label: "Moyenne/facture", value: `${stats?.total && stats.total > 0 ? Math.round((stats?.total_amount ?? 0) / stats.total).toLocaleString() : 0} DZD`, color: "#7c3aed", bg: "#f5f3ff", icon: TrendingUp },
        ].map((card, i) => (
          <div key={i} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: card.bg }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.color, color: "#fff" }}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: card.color }}>{card.label}</p>
              <p className="text-lg font-black" style={{ color: "#1a1917" }}>{typeof card.value === "number" ? card.value : card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#fff" }}>
          <BarChart3 className="w-5 h-5" style={{ color: "#8a8882" }} />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#8a8882" }}>État des bons</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {[
                { label: "consommés", value: (stats as any)?.voucher_stats?.consumed ?? 0, color: "#16a34a" },
                { label: "facturés", value: (stats as any)?.voucher_stats?.invoiced ?? 0, color: "#2563eb" },
                { label: "disponibles", value: (stats as any)?.voucher_stats?.approved ?? 0, color: "#d97706" },
              ].map((v, i) => (
                <span key={i} className="text-sm"><span className="font-bold" style={{ color: v.color }}>{v.value}</span> <span style={{ color: "#8a8882" }}>{v.label}</span></span>
              ))}
            </div>
            <p className="text-xs mt-1 font-medium" style={{ color: "#8a8882" }}>
              Total consommés: <span className="font-bold" style={{ color: "#16a34a" }}>{(stats as any)?.voucher_stats?.consumed ?? 0}</span>
            </p>
          </div>
        </div>
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "#fff" }}>
          <CreditCard className="w-5 h-5" style={{ color: "#8a8882" }} />
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#8a8882" }}>Montants</p>
            <div className="flex gap-4">
              <span className="text-sm"><span className="font-bold" style={{ color: "#1e40af" }}>{(stats?.paid_amount ?? 0).toLocaleString()} DZD</span> <span style={{ color: "#8a8882" }}>payé</span></span>
              <span className="text-sm"><span className="font-bold" style={{ color: "#166534" }}>{(stats?.validated_amount ?? 0).toLocaleString()} DZD</span> <span style={{ color: "#8a8882" }}>validé</span></span>
            </div>
          </div>
        </div>
      </div>

      {(stats as any)?.top_employees?.length > 0 && (
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#fff" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "#8a8882" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Top employés consommateurs</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {((stats as any).top_employees as Array<{name: string; matricule: string; total: number; count: number}>).slice(0, 5).map((e: any, i: number) => (
              <div key={e.matricule} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#f5f4f0" }}>
                <span className="text-xs font-bold" style={{ color: "#8a8882" }}>#{i + 1}</span>
                <span className="text-sm font-medium" style={{ color: "#1a1917" }}>{e.name}</span>
                <span className="text-xs font-bold" style={{ color: "#1e40af" }}>{e.total.toLocaleString()} DZD</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
        <div className="p-4 flex flex-wrap items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8a8882" }} />
            <input
              type="text"
              placeholder="Rechercher par référence, prestataire ou n° facture..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm border-0"
              style={{ background: "#f5f4f0", color: "#1a1917" }}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl text-sm"
            style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
          >
            <option value="">Toutes catégories</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {([["", "Toutes"], ["draft", "Brouillons"], ["validated", "Validées"], ["paid", "Payées"], ["cancelled", "Annulées"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setStatusFilter(val as InvoiceStatus | ""); setPage(1); }}
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
                  {["Référence", "Prestataire", "Catégorie", "Période", "N° facture", "Montant TTC", "Lignes", "Statut", "Créée le"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: Invoice) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoicing/${inv.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-sm" style={{ color: "#1a1917" }}>{inv.reference}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#1a1917" }}>{inv.partner_name}</td>
                    <td className="px-4 py-3">
                      {inv.category && (
                        <span className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                          {categoryLabel(inv.category)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{formatMonthYear(inv.month, inv.year)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{inv.invoice_number || "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: "#1a1917" }}>{inv.total_amount.toLocaleString()} DZD</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{inv.line_count}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: INVOICE_STATUS_UI[inv.status]?.bg, color: INVOICE_STATUS_UI[inv.status]?.color }}
                      >
                        {inv.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
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
              >Précédent</button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30"
                style={{ background: "#f5f4f0", color: "#1a1917" }}
              >Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}