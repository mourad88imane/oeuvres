import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Search, Loader2, Plus, X, Trash2, CheckSquare, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Breadcrumb } from "@shared/components/ui/Breadcrumb";
import apiClient from "@shared/api/apiClient";
import { PROVIDER_CATEGORY_OPTIONS } from "../types/providerInvoice";
import { VOUCHER_STATUS_UI } from "../types";

interface AvailableVoucher {
  id: string;
  request_number: string;
  employee_name: string;
  employee_matricule: string;
  beneficiary_name: string | null;
  category: string;
  category_label: string;
  partner_name: string | null;
  partner_code: string | null;
  coverage_date: string;
  validation_date: string | null;
  workflow_state: string;
}

interface InvoiceLine {
  voucher: AvailableVoucher;
  amount: number;
  observation: string;
}

export function ProviderInvoiceCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const isEdit = !!id;

  const [category, setCategory] = useState("");
  const [provider, setProvider] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [providers, setProviders] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");

  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AvailableVoucher[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    setPageLoading(true);
    apiClient.get(`/invoicing/invoices/${id}/`)
      .then((res: any) => {
        const inv = res.data?.data || res.data;
        setCategory(inv.category || "");
        setProvider(inv.partner || "");
        setPeriodFrom(inv.period_start || "");
        setPeriodTo(inv.period_end || "");
        setInvoiceNumber(inv.invoice_number || "");
        setInvoiceDate(inv.invoice_date || "");
        setDueDate(inv.due_date || "");
        setNotes(inv.notes || "");
        if (inv.partner_name) setProviderSearch(inv.partner_name);
        const loadedLines: InvoiceLine[] = (inv.coverage_lines || []).map((cl: any) => ({
          voucher: {
            id: cl.coverage_request,
            request_number: cl.request_number,
            employee_name: cl.employee_name,
            employee_matricule: cl.employee_matricule,
            beneficiary_name: cl.beneficiary_name,
            category: cl.category,
            category_label: "",
            partner_name: inv.partner_name,
            partner_code: inv.partner_code,
            coverage_date: cl.coverage_date,
            validation_date: null,
            workflow_state: cl.workflow_state,
          },
          amount: parseFloat(cl.amount) || 0,
          observation: cl.notes || "",
        }));
        setLines(loadedLines);
      })
      .catch(() => navigate("/medical-coverage/invoices"))
      .finally(() => setPageLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    setSaveError("");
    if (lines.length === 0) { setSaveError("Ajoutez au moins un bon avant d'enregistrer."); return; }
    if (lines.some(l => !l.amount || l.amount <= 0)) { setSaveError("Tous les bons doivent avoir un montant supérieur à 0."); return; }
    setSaving(true);
    try {
      const month = new Date(periodFrom).getMonth() + 1;
      const year = new Date(periodFrom).getFullYear();
      const body: any = {
        partner: provider,
        category,
        month,
        year,
        period_start: periodFrom,
        period_end: periodTo,
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate || undefined,
        due_date: dueDate || undefined,
        notes: notes || undefined,
        coverage_request_lines: lines.map(l => ({
          coverage_request: l.voucher.id,
          amount: l.amount,
          notes: l.observation,
        })),
      };
      if (isEdit) {
        await apiClient.patch(`/invoicing/invoices/${id}/`, body);
      } else {
        await apiClient.post("/invoicing/invoices/", body);
      }
      navigate("/medical-coverage/invoices");
    } catch (err: any) {
      const data = err?.response?.data;
      const nonFieldMsg = data?.errors?.non_field_errors?.[0];
      const msg = nonFieldMsg || data?.message || data?.[0] || "Erreur lors de l'enregistrement.";
      setSaveError(typeof msg === "string" ? msg : "Erreur lors de l'enregistrement.");
      if (data?.code === "DUPLICATE_INVOICE" && data?.errors?.existing_invoice_id) {
        setTimeout(() => navigate(`/medical-coverage/invoices/${data.errors.existing_invoice_id}`), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const lineIds = new Set(lines.map(l => l.voucher.id));

  useEffect(() => {
    if (!category) { setProviders([]); return; }
    if (!isEdit) { setProvider(""); setProviderSearch(""); setLines([]); }
    setLoadingProviders(true);
    apiClient
      .get("/conventions/partners/", { params: { category, is_active: true, page_size: 200 } })
      .then(res => {
        const data = (res as any).data?.results || (res as any).data || [];
        setProviders(Array.isArray(data) ? data : []);
      })
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));
  }, [category, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    setLines([]);
    if (!category || !provider || !periodFrom || !periodTo) return;

    const month = new Date(periodFrom).getMonth() + 1;
    const year = new Date(periodFrom).getFullYear();

    setLoadingVouchers(true);
    apiClient
      .get("/invoicing/invoices/available_vouchers/", {
        params: {
          partner_id: provider,
          category,
          month,
          year,
          period_start: periodFrom,
          period_end: periodTo,
        },
      })
      .then(res => {
        const data = (res as any).data?.data || (res as any).data?.results || [];
        const vouchers: AvailableVoucher[] = Array.isArray(data) ? data : [];
        setLines(vouchers.map(v => ({ voucher: v, amount: 0, observation: "" })));
      })
      .catch(() => setLines([]))
      .finally(() => setLoadingVouchers(false));
  }, [category, provider, periodFrom, periodTo, isEdit]);

  const filteredProviders = providers.filter(p =>
    !providerSearch || p.name.toLowerCase().includes(providerSearch.toLowerCase()) || p.code.toLowerCase().includes(providerSearch.toLowerCase())
  );

  const updateAmount = (id: string, amount: number) => {
    setLines(prev => prev.map(l => l.voucher.id === id ? { ...l, amount } : l));
  };

  const updateObservation = (id: string, observation: string) => {
    setLines(prev => prev.map(l => l.voucher.id === id ? { ...l, observation } : l));
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.voucher.id !== id));
  };

  const totalVouchers = lines.length;
  const totalAmount = lines.reduce((sum, l) => sum + (l.amount || 0), 0);

  const doSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await apiClient.get("/invoicing/invoices/search_vouchers/", {
        params: { q: searchQuery.trim(), partner_id: provider },
      });
      const data = (res as any).data?.data || [];
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, provider]);

  useEffect(() => {
    if (!showAddDialog) return;
    const timer = setTimeout(() => { if (searchQuery.trim()) doSearch(); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showAddDialog, doSearch]);

  const addVoucherToLines = (voucher: AvailableVoucher) => {
    setLines(prev => {
      if (prev.some(l => l.voucher.id === voucher.id)) return prev;
      return [...prev, { voucher, amount: 0, observation: "" }];
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { label: t("nav.careSupport") },
          { label: t("nav.providerInvoices"), href: "/medical-coverage/invoices" },
          { label: isEdit ? "Modifier la facture" : "Nouvelle facture" },
        ]}
      />

      <button
        onClick={() => navigate("/medical-coverage/invoices")}
        className="flex items-center gap-2 text-sm font-bold mt-2 mb-6 transition-colors"
        style={{ color: "#8a8882" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#1a1917"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#8a8882"; }}
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux factures
      </button>

      {pageLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-sm font-medium" style={{ color: "#8a8882" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de la facture...
        </div>
      ) : (<>
      <div className="rounded-2xl p-6" style={{ background: "#fff" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#ffda2d" }}>
            <FileText className="w-5 h-5" style={{ color: "#1a1917" }} />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: "#1a1917" }}>{isEdit ? "Modifier la facture prestataire" : "Nouvelle facture prestataire"}</h1>
            <p className="text-sm font-medium mt-0.5" style={{ color: "#8a8882" }}>{isEdit ? "Modifiez les bons et montants ci-dessous" : "Sélectionnez le prestataire et la période pour charger les bons disponibles"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Catégorie de couverture <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
            >
              <option value="">Sélectionner une catégorie</option>
              {PROVIDER_CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Prestataire <span className="text-red-500">*</span>
            </label>
            {!category ? (
              <div className="w-full px-4 py-2.5 rounded-xl text-sm" style={{ background: "#f5f4f0", color: "#b0aea6" }}>
                Sélectionnez d'abord une catégorie
              </div>
            ) : loadingProviders ? (
              <div className="w-full px-4 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: "#f5f4f0", color: "#8a8882" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des prestataires...
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8a8882" }} />
                <input
                  type="text"
                  value={providerSearch}
                  onChange={e => { setProviderSearch(e.target.value); setProvider(""); }}
                  placeholder="Rechercher un prestataire..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm mb-1.5"
                  style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                />
                <div className="max-h-48 overflow-y-auto rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                  {filteredProviders.length === 0 ? (
                    <div className="px-4 py-3 text-sm" style={{ color: "#8a8882" }}>Aucun prestataire trouvé</div>
                  ) : (
                    filteredProviders.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProvider(p.id); setProviderSearch(`${p.code} — ${p.name}`); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors"
                        style={{
                          color: "#1a1917",
                          background: provider === p.id ? "rgba(255,218,45,0.12)" : "transparent",
                          borderBottom: "1px solid rgba(0,0,0,0.03)",
                        }}
                        onMouseEnter={e => { if (provider !== p.id) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
                        onMouseLeave={e => { if (provider !== p.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <span className="font-bold">[{p.code}]</span> {p.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Période du <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={periodFrom}
              onChange={e => setPeriodFrom(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Période au <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={periodTo}
              onChange={e => setPeriodTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              N° facture
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              placeholder="Ex: FACT-2026-..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Date facture
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Date d'échéance
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>
              Notes / Observations
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              placeholder="Optionnelle"
              rows={2}
            />
          </div>
        </div>

        {category && provider && periodFrom && periodTo && (
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: "#8a8882" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>Bons de prise en charge</h2>
                {lines.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#ffda2d", color: "#1a1917" }}>
                    {lines.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                style={{ background: "#1a1917", color: "#fff" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#4d4b46"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1a1917"; }}
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un bon
              </button>
            </div>

            {loadingVouchers ? (
              <div className="flex items-center justify-center py-8 gap-2 text-sm font-medium" style={{ color: "#8a8882" }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement des bons...
              </div>
            ) : lines.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: "#d4d2cc" }} />
                <p className="text-sm font-bold" style={{ color: "#8a8882" }}>Aucun bon disponible</p>
                <p className="text-xs mt-1" style={{ color: "#b0aea6" }}>Aucun bon validé trouvé pour ce prestataire et cette période.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", background: "#faf9f6" }}>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>N° bon</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Employé</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Bénéficiaire</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Catégorie</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Prestataire</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Date</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Montant facturé</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Observation</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(l => {
                      const statusUI = VOUCHER_STATUS_UI[l.voucher.workflow_state as keyof typeof VOUCHER_STATUS_UI];
                      return (
                        <tr key={l.voucher.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                          <td className="px-4 py-3">
                            <span className="font-bold text-sm" style={{ color: "#1a1917" }}>{l.voucher.request_number}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium" style={{ color: "#1a1917" }}>{l.voucher.employee_name}</div>
                            <div className="text-xs" style={{ color: "#b0aea6" }}>{l.voucher.employee_matricule}</div>
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{l.voucher.beneficiary_name || "—"}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{l.voucher.category_label}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{l.voucher.partner_name || "—"}</td>
                          <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>
                            {new Date(l.voucher.coverage_date).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: statusUI?.bg, color: statusUI?.color }}>
                              {statusUI?.label || l.voucher.workflow_state}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.amount || ""}
                              onChange={e => updateAmount(l.voucher.id, parseFloat(e.target.value) || 0)}
                              className="w-28 px-2.5 py-1.5 rounded-lg text-sm font-medium text-right"
                              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={l.observation}
                              onChange={e => updateObservation(l.voucher.id, e.target.value)}
                              className="w-36 px-2.5 py-1.5 rounded-lg text-sm"
                              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                              placeholder="Optionnelle"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeLine(l.voucher.id)}
                              className="p-1 rounded-lg transition-colors"
                              style={{ color: "#b0aea6" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#dc2626"; (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.08)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#b0aea6"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {lines.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-6 p-4 rounded-xl" style={{ background: "#faf9f6" }}>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium" style={{ color: "#8a8882" }}>Nombre de bons :</span>
                    <span className="font-bold ml-2" style={{ color: "#1a1917" }}>{totalVouchers}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium" style={{ color: "#8a8882" }}>Montant total :</span>
                    <span className="font-bold ml-2 text-base" style={{ color: "#1a1917" }}>{totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {saveError && <span className="text-xs font-medium" style={{ color: "#dc2626" }}>{saveError}</span>}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                    style={{ background: "#ffda2d", color: "#1a1917" }}
                    onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = "#f0cc20"; }}
                    onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = "#ffda2d"; }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Enregistrement..." : "Enregistrer le brouillon"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setShowAddDialog(false); setSearchQuery(""); setSearchResults([]); }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
            style={{ background: "#fff" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: "#1a1917" }}>Ajouter un bon</h3>
              <button
                onClick={() => { setShowAddDialog(false); setSearchQuery(""); setSearchResults([]); }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "#8a8882" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8a8882" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par n° bon, employé, bénéficiaire..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm font-medium" style={{ color: "#8a8882" }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recherche...
                </div>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 mx-auto mb-2" style={{ color: "#d4d2cc" }} />
                  <p className="text-sm font-medium" style={{ color: "#8a8882" }}>Aucun résultat</p>
                </div>
              ) : !searchQuery.trim() ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "#b0aea6" }}>Saisissez un terme de recherche pour trouver des bons</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.filter(v => !lineIds.has(v.id)).map(v => {
                    const statusUI = VOUCHER_STATUS_UI[v.workflow_state as keyof typeof VOUCHER_STATUS_UI];
                    return (
                      <button
                        key={v.id}
                        onClick={() => addVoucherToLines(v)}
                        className="w-full text-left p-3 rounded-xl transition-colors flex items-center justify-between gap-3"
                        style={{ border: "1px solid rgba(0,0,0,0.04)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,218,45,0.08)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm" style={{ color: "#1a1917" }}>{v.request_number}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-lg font-bold" style={{ background: statusUI?.bg, color: statusUI?.color }}>
                              {statusUI?.label || v.workflow_state}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: "#5a5852" }}>
                            {v.employee_name} ({v.employee_matricule})
                            {v.beneficiary_name ? ` → ${v.beneficiary_name}` : ""}
                          </div>
                          <div className="text-xs" style={{ color: "#b0aea6" }}>
                            {v.category_label} — {v.partner_name || ""} — {new Date(v.coverage_date).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 flex-shrink-0" style={{ color: "#16a34a" }} />
                      </button>
                    );
                  })}
                  {searchResults.filter(v => lineIds.has(v.id)).length > 0 && (
                    <>
                      <div className="text-xs font-bold px-1 pt-3 pb-1 uppercase tracking-wider" style={{ color: "#b0aea6" }}>Déjà ajoutés</div>
                      {searchResults.filter(v => lineIds.has(v.id)).map(v => (
                        <div
                          key={v.id}
                          className="w-full text-left p-3 rounded-xl flex items-center gap-3 opacity-50"
                          style={{ border: "1px solid rgba(0,0,0,0.04)" }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-sm" style={{ color: "#1a1917" }}>{v.request_number}</span>
                            </div>
                            <div className="text-xs" style={{ color: "#5a5852" }}>
                              {v.employee_name} ({v.employee_matricule})
                            </div>
                          </div>
                          <CheckSquare className="w-4 h-4 flex-shrink-0" style={{ color: "#8a8882" }} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 flex justify-end" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
              <button
                onClick={() => { setShowAddDialog(false); setSearchQuery(""); setSearchResults([]); }}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                style={{ background: "#f5f4f0", color: "#5a5852" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#e8e6e0"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f5f4f0"; }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
