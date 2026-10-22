import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Search, Building2, FileText, Layers, X, Trash2, User, Plus } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@shared/components/ui";
import apiClient from "@shared/api/apiClient";
import { useCreateInvoice } from "../hooks/useInvoices";
import { invoicingApi } from "../api";
import { MONTHS, CATEGORY_OPTIONS } from "../types";
import type { AvailableVoucher } from "../types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const MONTH_LIST = Array.from({ length: 12 }, (_, i) => i + 1);

interface PartnerInfo {
  id: string;
  name: string;
  code: string;
  category: string;
  type_display: string;
  email: string;
  phone: string;
  city: string;
  wilaya: string;
  contact_name?: string;
}

interface ConventionItem {
  id: string;
  reference: string;
  title: string;
  partner: string;
  partner_name: string;
}

let groupIdCounter = 0;
function nextGroupId() { return ++groupIdCounter; }

interface VoucherGroup {
  groupId: number;
  employeeId: string;
  employeeName: string;
  employeeMatricule: string;
  beneficiaryType: "employee" | "dependent";
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  vouchers: (AvailableVoucher & { amount: number; quantity: number; unit_price: number | null })[];
  loading: boolean;
  loaded: boolean;
}

const CATEGORY_COLUMNS: Record<string, { key: string; label: string }[]> = {
  medical_analysis_lab: [
    { key: "reference", label: "Bon" },
    { key: "employee", label: "Employé" },
    { key: "beneficiary", label: "Bénéficiaire" },
    { key: "nature", label: "Nature des analyses" },
    { key: "date", label: "Date" },
    { key: "approved_amount", label: "Montant autorisé" },
    { key: "amount", label: "Montant facturé" },
  ],
  medical_imaging_center: [
    { key: "reference", label: "Bon" },
    { key: "employee", label: "Employé" },
    { key: "beneficiary", label: "Bénéficiaire" },
    { key: "nature", label: "Nature de l'examen" },
    { key: "date", label: "Date" },
    { key: "approved_amount", label: "Montant autorisé" },
    { key: "amount", label: "Montant facturé" },
  ],
  medical_center: [
    { key: "reference", label: "Bon" },
    { key: "employee", label: "Employé" },
    { key: "beneficiary", label: "Bénéficiaire" },
    { key: "quantity", label: "Quantité" },
    { key: "unit_price", label: "Prix unitaire" },
    { key: "total", label: "Total" },
    { key: "approved_amount", label: "Montant autorisé" },
    { key: "amount", label: "Montant facturé" },
  ],
};

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateInvoice();

  const [current, setCurrent] = useState(0);
  const [category, setCategory] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [conventionId, setConventionId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [partnerSearch, setPartnerSearch] = useState("");
  const [partners, setPartners] = useState<PartnerInfo[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerInfo | null>(null);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [conventions, setConventions] = useState<ConventionItem[]>([]);
  const [loadingConventions, setLoadingConventions] = useState(false);
  const [voucherGroups, setVoucherGroups] = useState<VoucherGroup[]>([]);
  const [createdRef, setCreatedRef] = useState("");
  const [createdId, setCreatedId] = useState("");

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeResults, setEmployeeResults] = useState<{ id: string; full_name: string; matricule: string }[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; full_name: string; matricule: string } | null>(null);
  const [beneficiaryType, setBeneficiaryType] = useState<"employee" | "dependent">("employee");
  const [dependents, setDependents] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedDependent, setSelectedDependent] = useState<{ id: string; full_name: string } | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);

  const steps = ["Catégorie", "Prestataire", "Convention", "Infos", "Bons"];

  useEffect(() => {
    if (!partnerSearch.trim() || !category) { setPartners([]); return; }
    const timer = setTimeout(async () => {
      setLoadingPartners(true);
      try {
        const res = await apiClient.get("/conventions/partners/", {
          params: { search: partnerSearch, is_active: true, category, has_active_convention: true },
        });
        const data = (res as any).data?.data || (res as any).data?.results || (res as any).data || [];
        setPartners(Array.isArray(data) ? data : []);
      } catch { setPartners([]); }
      setLoadingPartners(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [partnerSearch, category]);

  useEffect(() => {
    if (!partnerId) { setConventions([]); return; }
    const timer = setTimeout(async () => {
      setLoadingConventions(true);
      try {
        const res = await apiClient.get("/conventions/conventions/", {
          params: { partner: partnerId, status: "active" },
        });
        const data = (res as any).data?.data || (res as any).data?.results || (res as any).data || [];
        setConventions(Array.isArray(data) ? data : []);
      } catch { setConventions([]); }
      setLoadingConventions(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [partnerId]);

  useEffect(() => {
    if (!employeeSearch.trim()) { setEmployeeResults([]); return; }
    const timer = setTimeout(async () => {
      setLoadingEmployees(true);
      try {
        const res = await apiClient.get("/employees/", {
          params: { search: employeeSearch, is_active: true, page_size: 10 },
        });
        const raw = (res as any).data?.results || (res as any).data?.data || (res as any).data || [];
        setEmployeeResults(Array.isArray(raw) ? raw.map((e: any) => ({ id: e.id, full_name: e.full_name, matricule: e.matricule })) : []);
      } catch { setEmployeeResults([]); }
      setLoadingEmployees(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch]);

  useEffect(() => {
    if (!selectedEmployee || beneficiaryType !== "dependent") { setDependents([]); setSelectedDependent(null); return; }
    (async () => {
      try {
        const res = await apiClient.get(`/employees/${selectedEmployee.id}/beneficiaries/`);
        const raw = (res as any).data?.data || (res as any).data || [];
        setDependents(Array.isArray(raw) ? raw.map((d: any) => ({ id: d.id, full_name: d.full_name })) : []);
      } catch { setDependents([]); }
    })();
  }, [selectedEmployee, beneficiaryType]);

  const loadVouchersForEmployee = async (
    groupId: number, employeeId: string, beneficiaryId: string | null
  ) => {
    if (!partnerId) return;
    setVoucherGroups(prev => prev.map(g => g.groupId === groupId ? { ...g, loading: true } : g));
    try {
      const params: {
        partner_id: string; month: number; year: number;
        period_start?: string; period_end?: string;
        employee_id?: string; beneficiary_id?: string;
      } = { partner_id: partnerId, month, year };
      if (periodStart) params.period_start = periodStart;
      if (periodEnd) params.period_end = periodEnd;
      params.employee_id = employeeId;
      if (beneficiaryId) params.beneficiary_id = beneficiaryId;
      const res = await invoicingApi.availableVouchers(params);
      const items: (AvailableVoucher & { amount: number; quantity: number; unit_price: number | null })[] =
        ((res as any).data?.data || (res as any).data || []).map((v: AvailableVoucher) => ({
          ...v,
          amount: v.approved_amount ?? 0,
          quantity: 1,
          unit_price: v.approved_amount ?? null,
        }));
      setVoucherGroups(prev => prev.map(g =>
        g.groupId === groupId ? { ...g, vouchers: items, loading: false, loaded: true } : g
      ));
    } catch {
      setVoucherGroups(prev => prev.map(g =>
        g.groupId === groupId ? { ...g, vouchers: [], loading: false, loaded: true } : g
      ));
    }
  };

  const addEmployeeGroup = () => {
    if (!selectedEmployee) return;
    const gid = nextGroupId();
    const newGroup: VoucherGroup = {
      groupId: gid,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.full_name,
      employeeMatricule: selectedEmployee.matricule,
      beneficiaryType,
      beneficiaryId: selectedDependent?.id ?? null,
      beneficiaryName: selectedDependent?.full_name ?? null,
      vouchers: [],
      loading: false,
      loaded: false,
    };
    setVoucherGroups(prev => [...prev, newGroup]);
    setActiveGroupId(gid);
    setSelectedEmployee(null);
    setEmployeeSearch("");
    setEmployeeResults([]);
    setBeneficiaryType("employee");
    setSelectedDependent(null);
    setDependents([]);
    const eid = newGroup.employeeId;
    const bid = newGroup.beneficiaryId;
    setTimeout(() => loadVouchersForEmployee(gid, eid, bid), 0);
  };

  const removeGroup = (groupId: number) => {
    setVoucherGroups(prev => prev.filter(g => g.groupId !== groupId));
    if (activeGroupId === groupId) setActiveGroupId(null);
  };

  const removeVoucherFromGroup = (groupId: number, voucherIdx: number) => {
    setVoucherGroups(prev => prev.map(g =>
      g.groupId === groupId
        ? { ...g, vouchers: g.vouchers.filter((_, i) => i !== voucherIdx) }
        : g
    ));
  };

  const updateVoucherAmount = (groupId: number, voucherIdx: number, amount: number) => {
    setVoucherGroups(prev => prev.map(g =>
      g.groupId === groupId
        ? { ...g, vouchers: g.vouchers.map((v, i) => i === voucherIdx ? { ...v, amount } : v) }
        : g
    ));
  };

  const updateVoucherQuantity = (groupId: number, voucherIdx: number, quantity: number) => {
    setVoucherGroups(prev => prev.map(g => {
      if (g.groupId !== groupId) return g;
      const vouchers = g.vouchers.map((v, i) => {
        if (i !== voucherIdx) return v;
        const q = Math.max(1, quantity);
        const amount = v.unit_price ? q * v.unit_price : v.amount;
        return { ...v, quantity: q, amount };
      });
      return { ...g, vouchers };
    }));
  };

  const updateVoucherUnitPrice = (groupId: number, voucherIdx: number, unitPrice: number) => {
    setVoucherGroups(prev => prev.map(g => {
      if (g.groupId !== groupId) return g;
      const vouchers = g.vouchers.map((v, i) => {
        if (i !== voucherIdx) return v;
        const up = Math.max(0, unitPrice);
        const amount = v.quantity * up;
        return { ...v, unit_price: up, amount };
      });
      return { ...g, vouchers };
    }));
  };

  const allVouchers = voucherGroups.flatMap(g => g.vouchers);

  const selectPartner = (p: PartnerInfo) => {
    setPartnerId(p.id);
    setPartnerName(p.name);
    setSelectedPartner(p);
    setPartnerSearch(p.name);
    setPartners([]);
  };

  const canNext = () => {
    if (current === 0) return !!category;
    if (current === 1) return !!partnerId;
    if (current === 2) return true;
    if (current === 3) return true;
    if (current === 4) return allVouchers.length > 0 && allVouchers.some(v => v.amount > 0);
    return true;
  };

  const totalAmount = allVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
  const lineCount = allVouchers.filter(v => v.amount > 0).length;

  const handleSubmit = async () => {
    const coverage_request_lines = voucherGroups.flatMap(g =>
      g.vouchers.filter(v => v.amount > 0).map(v => ({
        coverage_request: v.id,
        amount: v.amount,
        notes: "",
      }))
    );
    if (coverage_request_lines.length === 0) return;

    try {
      const result = await createMutation.mutateAsync({
        partner: partnerId,
        category: category || undefined,
        convention: conventionId || undefined,
        month, year,
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        due_date: dueDate || undefined,
        notes,
        coverage_request_lines,
      });
      setCreatedRef(result.reference);
      setCreatedId(result.id);
      setCurrent(5);
    } catch {}
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button onClick={() => navigate("/invoicing")} className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: "#8a8882" }}>
        <ArrowLeft className="w-4 h-4" /> Retour aux factures
      </button>

      <div className="flex items-center gap-4 mb-6 overflow-x-auto">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all")}
              style={{
                background: i < current ? "#86efac" : i === current ? "#ffda2d" : "#f5f4f0",
                color: i < current ? "#14532d" : i === current ? "#1a1917" : "#b0aea6",
              }}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={clsx("text-sm font-bold hidden sm:inline")}
              style={{ color: i === current ? "#1a1917" : "#b0aea6" }}
            >{label}</span>
            {i < steps.length - 1 && <div className="w-8 h-px mx-1" style={{ background: "#e5e3dd" }} />}
          </div>
        ))}
      </div>

      {current === 0 && (
        <div className="rounded-2xl p-6" style={{ background: "#fff" }}>
          <h2 className="text-lg font-black mb-1" style={{ color: "#1a1917" }}>Étape 1 : Catégorie de prestataire</h2>
          <p className="text-sm mb-4" style={{ color: "#8a8882" }}>Sélectionnez la catégorie du prestataire à facturer.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CATEGORY_OPTIONS.map(c => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setPartnerId(""); setPartnerName(""); setSelectedPartner(null); setPartnerSearch(""); setConventionId(""); }}
                className="relative flex flex-col items-center gap-3 p-6 rounded-2xl text-center transition-all"
                style={{
                  background: category === c.value ? "#fef9e7" : "#f5f4f0",
                  border: category === c.value ? "2px solid #ffda2d" : "2px solid transparent",
                  color: "#1a1917",
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: category === c.value ? "#ffda2d" : "#e5e3dd" }}>
                  <Layers className="w-6 h-6" style={{ color: category === c.value ? "#1a1917" : "#8a8882" }} />
                </div>
                <span className="font-bold">{c.label}</span>
                {category === c.value && <Check className="w-5 h-5 absolute top-3 right-3" style={{ color: "#14532d" }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {current === 1 && (
        <div className="rounded-2xl p-6" style={{ background: "#fff" }}>
          <h2 className="text-lg font-black mb-1" style={{ color: "#1a1917" }}>Étape 2 : Sélection du prestataire</h2>
          <p className="text-sm mb-4" style={{ color: "#8a8882" }}>Choisissez le prestataire et la période de facturation.</p>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Prestataire *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8a8882" }} />
              <input
                type="text"
                placeholder="Rechercher un prestataire..."
                value={partnerSearch}
                onChange={e => { setPartnerSearch(e.target.value); setPartnerId(""); setPartnerName(""); setSelectedPartner(null); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              />
            </div>
            {loadingPartners && <Spinner />}
            {partners.length > 0 && !partnerId && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid #e5e3dd" }}>
                {partners.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPartner(p)}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#f5f4f0] flex items-center justify-between"
                    style={{ color: "#1a1917", borderBottom: "1px solid #f5f4f0" }}
                  >
                    <div>
                      <Building2 className="w-3.5 h-3.5 inline mr-2" style={{ color: "#8a8882" }} />
                      {p.name} <span className="text-xs" style={{ color: "#8a8882" }}>({p.code})</span>
                    </div>
                    <span className="text-sm px-3 py-1 rounded-lg font-bold" style={{ background: "#86efac", color: "#14532d" }}>
                      {p.city || "—"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPartner && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 rounded-xl p-4" style={{ background: "#f5f4f0" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Contact</p>
                <p className="font-medium mt-1" style={{ color: "#1a1917" }}>{selectedPartner.contact_name || "—"}</p>
                <p className="text-sm" style={{ color: "#5a5852" }}>{selectedPartner.email || "—"} · {selectedPartner.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Adresse</p>
                <p className="font-medium mt-1" style={{ color: "#1a1917" }}>{selectedPartner.city || "—"}</p>
                <p className="text-sm" style={{ color: "#5a5852" }}>{selectedPartner.wilaya || "—"}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Mois *</label>
              <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              >
                {MONTH_LIST.map(m => (
                  <option key={m} value={m}>{MONTHS[m]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Année *</label>
              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {current === 2 && (
        <div className="rounded-2xl p-6" style={{ background: "#fff" }}>
          <h2 className="text-lg font-black mb-1" style={{ color: "#1a1917" }}>Étape 3 : Convention</h2>
          <p className="text-sm mb-4" style={{ color: "#8a8882" }}>Sélectionnez la convention liée à cette facture (optionnel).</p>

          {loadingConventions ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : conventions.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ background: "#f5f4f0" }}>
              <p className="font-medium" style={{ color: "#8a8882" }}>Aucune convention active trouvée pour ce prestataire.</p>
              <p className="text-sm mt-1" style={{ color: "#b0aea6" }}>Vous pouvez passer cette étape.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {conventions.map(cn => (
                <button
                  key={cn.id}
                  onClick={() => setConventionId(cn.id === conventionId ? "" : cn.id)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between"
                  style={{
                    background: conventionId === cn.id ? "#fef9e7" : "#f5f4f0",
                    border: conventionId === cn.id ? "1px solid #ffda2d" : "1px solid transparent",
                    color: "#1a1917",
                  }}
                >
                  <div>
                    <span className="font-bold">{cn.reference}</span>
                    <span className="ml-2" style={{ color: "#5a5852" }}>{cn.title}</span>
                  </div>
                  {conventionId === cn.id && <Check className="w-4 h-4" style={{ color: "#14532d" }} />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setConventionId("")}
            className="mt-3 text-xs font-medium" style={{ color: conventionId ? "#92400e" : "#8a8882" }}
          >
            {conventionId ? "Effacer la sélection" : "Aucune convention sélectionnée"}
          </button>
        </div>
      )}

      {current === 3 && (
        <div className="rounded-2xl p-6" style={{ background: "#fff" }}>
          <h2 className="text-lg font-black mb-1" style={{ color: "#1a1917" }}>Étape 4 : Informations générales</h2>
          <p className="text-sm mb-4" style={{ color: "#8a8882" }}>Saisissez les informations de la facture fournisseur.</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>N° facture fournisseur</label>
              <input
                type="text"
                placeholder="Ex: FAC-2024-001"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Date facture</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Période du</label>
              <input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Période au</label>
              <input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Date d'échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5" style={{ color: "#5a5852" }}>Observations</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes ou observations concernant cette facture..."
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
            />
          </div>
        </div>
      )}

      {current === 4 && (
        <div className="rounded-2xl p-6" style={{ background: "#fff" }}>
          <h2 className="text-lg font-black mb-1" style={{ color: "#1a1917" }}>Étape 5 : Bons de prise en charge</h2>
          <p className="text-sm mb-4" style={{ color: "#8a8882" }}>
            {partnerName} — {MONTHS[month]} {year}
            {periodStart && periodEnd && ` (du ${new Date(periodStart).toLocaleDateString("fr-FR")} au ${new Date(periodEnd).toLocaleDateString("fr-FR")})`}
          </p>

          {/* Employee search & add section */}
          <div className="mb-6 rounded-xl p-4" style={{ background: "#f5f4f0" }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: "#1a1917" }}>
              <User className="w-4 h-4 inline mr-1.5" />
              Ajouter un employé / bénéficiaire
            </h3>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8a8882" }} />
              <input
                type="text"
                placeholder="Rechercher un employé (matricule, nom)..."
                value={employeeSearch}
                onChange={e => { setEmployeeSearch(e.target.value); setSelectedEmployee(null); setBeneficiaryType("employee"); setSelectedDependent(null); }}
                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                style={{ background: "#fff", color: "#1a1917", border: "1px solid #e5e3dd" }}
              />
              {loadingEmployees && <Spinner />}
            </div>
            {employeeResults.length > 0 && !selectedEmployee && (
              <div className="mb-3 rounded-xl overflow-hidden" style={{ border: "1px solid #e5e3dd", background: "#fff" }}>
                {employeeResults.map(e => (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedEmployee(e); setEmployeeSearch(e.full_name); setEmployeeResults([]); }}
                    className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-[#f5f4f0] flex items-center justify-between"
                    style={{ borderBottom: "1px solid #f5f4f0", color: "#1a1917" }}
                  >
                    <span>{e.full_name} <span className="text-xs" style={{ color: "#8a8882" }}>({e.matricule})</span></span>
                  </button>
                ))}
              </div>
            )}
            {selectedEmployee && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color: "#1a1917" }}>{selectedEmployee.full_name}</span>
                  <span className="text-xs" style={{ color: "#8a8882" }}>({selectedEmployee.matricule})</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => { setBeneficiaryType("employee"); setSelectedDependent(null); }}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: beneficiaryType === "employee" ? "#ffda2d" : "#e5e3dd",
                      color: "#1a1917",
                    }}
                  >Employé</button>
                  <button
                    onClick={() => setBeneficiaryType("dependent")}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: beneficiaryType === "dependent" ? "#ffda2d" : "#e5e3dd",
                      color: "#1a1917",
                    }}
                  >Ayant droit</button>
                </div>
                {beneficiaryType === "dependent" && (
                  <select
                    value={selectedDependent?.id || ""}
                    onChange={e => {
                      const dep = dependents.find(d => d.id === e.target.value);
                      setSelectedDependent(dep || null);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-sm mb-2"
                    style={{ background: "#fff", color: "#1a1917", border: "1px solid #e5e3dd" }}
                  >
                    <option value="">Sélectionner un ayant droit</option>
                    {dependents.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={addEmployeeGroup}
                  disabled={beneficiaryType === "dependent" && !selectedDependent}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background: "#ffda2d", color: "#1a1917" }}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter et charger les bons
                </button>
              </div>
            )}
          </div>

          {/* Existing groups */}
          {voucherGroups.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#d4d2cc" }} />
              <p className="font-bold" style={{ color: "#8a8882" }}>Aucun bon sélectionné</p>
              <p className="text-sm mt-1" style={{ color: "#b0aea6" }}>Recherchez un employé ci-dessus pour ajouter ses bons de prise en charge.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {voucherGroups.map(group => {
                const cols = CATEGORY_COLUMNS[category] || CATEGORY_COLUMNS.medical_analysis_lab;
                return (
                  <div key={group.groupId} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e3dd" }}>
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#f5f4f0" }}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" style={{ color: "#8a8882" }} />
                        <span className="text-sm font-bold" style={{ color: "#1a1917" }}>{group.employeeName}</span>
                        <span className="text-xs" style={{ color: "#8a8882" }}>({group.employeeMatricule})</span>
                        <span className="text-sm px-2.5 py-1 rounded font-bold" style={{ background: "#86efac", color: "#14532d" }}>
                          {group.beneficiaryName || group.employeeName}
                        </span>
                        <span className="text-xs" style={{ color: "#8a8882" }}>— {group.vouchers.length} bon(s)</span>
                      </div>
                      <button
                        onClick={() => removeGroup(group.groupId)}
                        className="p-1 rounded-lg hover:bg-[#e5e3dd] transition-all"
                      >
                        <X className="w-4 h-4" style={{ color: "#991b1b" }} />
                      </button>
                    </div>
                    {group.loading ? (
                      <div className="flex justify-center py-8"><Spinner /></div>
                    ) : group.loaded && group.vouchers.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm font-bold" style={{ color: "#8a8882" }}>Aucun bon disponible pour cet employé</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                              {cols.map(col => (
                                <th key={col.key} className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>{col.label}</th>
                              ))}
                              <th className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-center" style={{ color: "#8a8882" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.vouchers.map((v, idx) => (
                              <tr key={v.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                {cols.map(col => (
                                  <td key={col.key} className="px-3 py-2 text-sm" style={{ color: "#5a5852" }}>
                                    {col.key === "reference" && <span className="font-bold" style={{ color: "#1a1917" }}>{v.reference}</span>}
                                    {col.key === "employee" && <>{v.employee_name} <span className="text-xs" style={{ color: "#8a8882" }}>({v.employee_matricule})</span></>}
                                    {col.key === "beneficiary" && (
                                      <>
                                        <span>{v.beneficiary_name || v.employee_name}</span>
                                        {v.beneficiary_relationship && (
                                          <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "#f5f4f0", color: "#8a8882" }}>
                                            {v.beneficiary_relationship}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {col.key === "nature" && <>{v.coverage_type_name}</>}
                                    {col.key === "date" && <>{new Date(v.request_date).toLocaleDateString("fr-FR")}</>}
                                    {col.key === "approved_amount" && (
                                      <span style={{ color: "#8a8882" }}>{v.approved_amount ? `${v.approved_amount.toLocaleString()} DZD` : "—"}</span>
                                    )}
                                    {col.key === "quantity" && (
                                      <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={group.vouchers[idx].quantity}
                                        onChange={e => updateVoucherQuantity(group.groupId, idx, parseInt(e.target.value) || 1)}
                                        className="w-20 px-2 py-1 rounded-lg text-sm font-bold text-center"
                                        style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                                      />
                                    )}
                                    {col.key === "unit_price" && (
                                      <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={group.vouchers[idx].unit_price ?? ""}
                                        onChange={e => updateVoucherUnitPrice(group.groupId, idx, parseFloat(e.target.value) || 0)}
                                        className="w-28 px-2 py-1 rounded-lg text-sm font-bold text-right"
                                        style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                                      />
                                    )}
                                    {col.key === "total" && (
                                      <span className="font-bold" style={{ color: "#1a1917" }}>
                                        {((group.vouchers[idx].quantity || 1) * (group.vouchers[idx].unit_price || 0)).toLocaleString()} DZD
                                      </span>
                                    )}
                                    {col.key === "amount" && category !== "medical_center" && (
                                      <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={group.vouchers[idx].amount || ""}
                                        onChange={e => updateVoucherAmount(group.groupId, idx, parseFloat(e.target.value) || 0)}
                                        className="w-28 px-2 py-1 rounded-lg text-sm font-bold text-right"
                                        style={{ background: "#f5f4f0", color: "#1a1917", border: "1px solid transparent" }}
                                      />
                                    )}
                                    {col.key === "amount" && category === "medical_center" && (
                                      <span className="font-bold" style={{ color: "#1a1917" }}>
                                        {group.vouchers[idx].amount.toLocaleString()} DZD
                                      </span>
                                    )}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => removeVoucherFromGroup(group.groupId, idx)}
                                    className="p-1.5 rounded-lg hover:bg-[#fee2e2] transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" style={{ color: "#991b1b" }} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {allVouchers.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-4 mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                <div>
                  <span className="text-sm" style={{ color: "#5a5852" }}>
                    {lineCount} ligne(s) sur {allVouchers.length} bon(s) — {voucherGroups.length} employé(s)
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Montant total</p>
                  <p className="text-lg font-black" style={{ color: "#1a1917" }}>{totalAmount.toLocaleString()} DZD</p>
                </div>
              </div>

              {lineCount > 0 && (
                <div className="mt-4 rounded-xl p-4" style={{ background: "#f5f4f0" }}>
                  <h3 className="font-bold mb-3" style={{ color: "#1a1917" }}>Récapitulatif</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Bons</p>
                      <p className="text-lg font-black" style={{ color: "#1a1917" }}>{lineCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Montant TTC</p>
                      <p className="text-lg font-black" style={{ color: "#1a1917" }}>{totalAmount.toLocaleString()} DZD</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Pris en charge</p>
                      <p className="text-lg font-black" style={{ color: "#14532d" }}>{totalAmount.toLocaleString()} DZD</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Restant bénéficiaire</p>
                      <p className="text-lg font-black" style={{ color: "#92400e" }}>0 DZD</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {createMutation.isError && (
            <div className="mt-4 p-3 rounded-xl text-sm font-bold" style={{ background: "#fee2e2", color: "#991b1b" }}>
              {(createMutation.error as any)?.response?.data?.message
                || (createMutation.error as any)?.message
                || "Erreur lors de la création de la facture"}
            </div>
          )}
        </div>
      )}

      {current === 5 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "#fff" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#86efac" }}>
            <Check className="w-8 h-8" style={{ color: "#14532d" }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: "#1a1917" }}>Facture créée avec succès</h2>
          <p className="text-lg font-bold mb-1" style={{ color: "#ffda2d" }}>{createdRef}</p>
          <p className="text-sm mb-6" style={{ color: "#8a8882" }}>
            {lineCount} ligne(s) — {totalAmount.toLocaleString()} DZD
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate(`/invoicing/${createdId}`)}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold"
              style={{ background: "#ffda2d", color: "#1a1917" }}
            >Voir la facture</button>
            <button
              onClick={() => navigate("/invoicing")}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold"
              style={{ background: "#f5f4f0", color: "#1a1917" }}
            >Retour à la liste</button>
          </div>
        </div>
      )}

      {current < 5 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => current === 0 ? navigate("/invoicing") : setCurrent(c => c - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
            style={{ background: "#f5f4f0", color: "#1a1917" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {current === 0 ? "Annuler" : "Précédent"}
          </button>
          <button
            onClick={() => current === 4 ? handleSubmit() : setCurrent(c => c + 1)}
            disabled={!canNext() || createMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: "#ffda2d", color: "#1a1917" }}
          >
            {current === 4 ? (createMutation.isPending ? "Création..." : "Créer la facture") : "Suivant"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}