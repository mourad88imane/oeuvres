import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Save, Search, AlertTriangle, CheckCircle2,
  User, X, Printer, Eye, Loader2, Building2, Syringe,
  Scan, Stethoscope, Calendar, FileText, Clock, Users,
} from "lucide-react";
import { useToast } from "@shared/components/ui/index";
import { medicalCoverageApi } from "../api";
import type { MedicalCoverageCreatePayload, EmployeeInfoResponse, MedicalProvider } from "../types";
import { VOUCHER_STATUS_UI } from "../types";
import { employeeApi } from "@modules/employees/api";
import type { EmployeeListItem } from "@modules/employees/types";

interface Props {
  coverageType: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  analysis: Syringe,
  imaging: Scan,
  center: Stethoscope,
};

const TYPE_LABELS: Record<string, string> = {
  analysis: "Analyses Médicales",
  imaging: "Imagerie Médicale",
  center: "Centre Médical",
};

interface VoucherHistoryItem {
  id: string;
  reference: string;
  request_date: string;
  coverage_type_name: string;
  beneficiary_name: string | null;
  beneficiary_type: string;
  workflow_state: string;
  created_at: string;
}

export function MedicalCoverageFormPage({ coverageType }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfoResponse | null>(null);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [beneficiaryType, setBeneficiaryType] = useState<"employee" | "dependent">("employee");
  const [selectedDependent, setSelectedDependent] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [providerSearch, setProviderSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [voucherHistory, setVoucherHistory] = useState<VoucherHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Coverage types ──────────────────────────────────────
  const { data: typesData } = useQuery({
    queryKey: ["medicalCoverageTypes"],
    queryFn: () => medicalCoverageApi.listTypes().then(r => r.data),
  });
  const coverageTypes = Array.isArray(typesData) ? typesData : [];
  const ct = coverageTypes.find(c => c.code === coverageType);
  const TypeIcon = TYPE_ICONS[coverageType] || Syringe;

  // ── Providers ────────────────────────────────────────────
  const { data: providersData } = useQuery({
    queryKey: ["medicalCoverageProviders", coverageType, providerSearch],
    queryFn: () => medicalCoverageApi.listProviders({ coverage_type: coverageType, search: providerSearch }).then(r => r.data),
    enabled: !!coverageType,
  });
  const providers: MedicalProvider[] = providersData?.results ?? [];

  // ── Employee search ─────────────────────────────────────
  const { data: employeesData } = useQuery({
    queryKey: ["employees", "search", employeeSearch],
    queryFn: () => employeeApi.list({ search: employeeSearch, page_size: 10 }).then(r => r.data),
    enabled: employeeSearch.length >= 2,
  });

  // ── Employee info fetch ─────────────────────────────────
  useEffect(() => {
    if (selectedEmployee && ct) {
      medicalCoverageApi.getEmployeeInfo(selectedEmployee.id, coverageType).then(r => {
        setEmployeeInfo(r.data.data);
      }).catch(() => {});
    }
  }, [selectedEmployee, coverageType, ct]);

  // ── Voucher history fetch ───────────────────────────────
  const fetchHistory = async () => {
    if (!selectedEmployee) return;
    setHistoryLoading(true);
    try {
      const res = await medicalCoverageApi.list({
        employee: selectedEmployee.id,
        coverage_type: coverageType,
        page_size: 20,
        ordering: "-request_date",
      });
      setVoucherHistory(res.data?.results ?? []);
    } catch { }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (selectedEmployee) fetchHistory();
  }, [selectedEmployee, coverageType]);

  // ── Form schema ─────────────────────────────────────────
  const schema = z.object({
    request_date: z.string().min(1, "Date requise"),
    expected_date: z.string().optional(),
    observations: z.string().optional(),
  });

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      request_date: new Date().toISOString().slice(0, 10),
      expected_date: "",
      observations: "",
    },
  });

  // ── Create mutation ─────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: MedicalCoverageCreatePayload) => medicalCoverageApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["medicalCoverage"] });
      toast.success("Bon de prise en charge créé avec succès");
      navigate(`/medical-coverage/${coverageType}/${res.data.data.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.non_field_errors?.[0]
        || err?.response?.data?.message
        || err?.response?.data?.detail
        || "Erreur lors de la création";
      toast.error(msg);
    },
  });

  // ── Submit ──────────────────────────────────────────────
  const onSubmit = () => {
    if (!selectedEmployee) { toast.error("Veuillez sélectionner un employé"); return; }
    if (!ct) { toast.error("Type de couverture non trouvé"); return; }
    const payload: MedicalCoverageCreatePayload = {
      coverage_type: ct.id,
      employee: selectedEmployee.id,
      beneficiary_type: beneficiaryType,
      beneficiary: beneficiaryType === "dependent" ? selectedDependent || undefined : undefined,
      provider: selectedProvider || undefined,
      request_date: watch("request_date"),
      expected_date: watch("expected_date") || undefined,
      observations: watch("observations"),
    };
    createMutation.mutate(payload);
  };

  // ── Print handler ───────────────────────────────────────
  const handlePrint = () => {
    toast.info("Sauvegardez d'abord le bon, puis imprimez depuis la page de détail");
  };

  // ── View handler (redirect to same type's main page) ────
  const handleView = () => {
    navigate(`/medical-coverage/${coverageType}`);
  };

  // ── Derived data ───────────────────────────────────────
  const summary = employeeInfo?.summary;
  const eligibility = employeeInfo?.eligibility;

  const statusLabels: Record<string, string> = {
    active: "Actif", inactive: "Inactif", retired: "Retraité",
    suspended: "Suspendu", deceased: "Décédé",
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-6 max-w-5xl mx-auto">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/medical-coverage/${coverageType}`)}
          className="flex items-center gap-2 text-sm font-bold transition-colors"
          style={{ color: "#8a8882" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,218,45,0.15)" }}>
            <TypeIcon className="w-5 h-5" style={{ color: "#1a1917" }} />
          </div>
          <span className="text-sm font-black" style={{ color: "#1a1917" }}>
            Nouveau bon — {TYPE_LABELS[coverageType] || coverageType}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 md:p-8" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
        {/* ════════════════════════════════════════════════════
            ZONE 1 — Prestataire
            ════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
              Prestataire
            </h2>
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
            <input
              type="text"
              placeholder="Rechercher un prestataire (laboratoire, centre, imagerie)..."
              value={providerSearch}
              onChange={e => { setProviderSearch(e.target.value); setShowProviderPicker(true); }}
              onFocus={() => setShowProviderPicker(true)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none font-medium"
              style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
            />
            {selectedProvider && (
              <button
                onClick={() => { setSelectedProvider(""); setProviderSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <X className="w-3.5 h-3.5" style={{ color: "#8a8882" }} />
              </button>
            )}
            {showProviderPicker && providers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)" }}>
                {providers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                    style={{ color: "#1a1917", background: selectedProvider === p.id ? "rgba(255,218,45,0.08)" : "transparent" }}
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setProviderSearch(p.name);
                      setShowProviderPicker(false);
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = selectedProvider === p.id ? "rgba(255,218,45,0.08)" : "transparent"}
                  >
                    <span className="font-bold">{p.name}</span>
                    <span className="ml-2 text-xs" style={{ color: "#8a8882" }}>{p.city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            ZONE 2 — Employé (recherche + infos)
            ════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
              Employé
            </h2>
          </div>

          {!selectedEmployee ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
              <input
                type="text"
                placeholder="Rechercher un employé par nom, prénom ou matricule..."
                value={employeeSearch}
                onChange={e => { setEmployeeSearch(e.target.value); setShowEmployeePicker(true); }}
                onFocus={() => setShowEmployeePicker(true)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none font-medium"
                style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
              />
              {showEmployeePicker && employeesData?.results && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden max-h-64 overflow-y-auto"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)" }}>
                  {employeesData.results.map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                      style={{ color: "#1a1917" }}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setEmployeeSearch(`${emp.first_name} ${emp.last_name}`);
                        setShowEmployeePicker(false);
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span className="font-bold">{emp.first_name} {emp.last_name}</span>
                      <span className="ml-2 text-xs font-medium" style={{ color: "#8a8882" }}>{emp.matricule}</span>
                      <span className="ml-2 text-xs" style={{ color: "#a8a49a" }}>{emp.department_name}</span>
                    </button>
                  ))}
                  {employeesData.results.length === 0 && (
                    <p className="px-4 py-3 text-sm" style={{ color: "#8a8882" }}>Aucun résultat</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Employee info card */}
              <div className="flex items-center justify-between p-4 rounded-2xl mb-4"
                style={{ background: "#f8f7f4", border: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg"
                    style={{ background: "#ffda2d", color: "#1a1917" }}>
                    {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-base" style={{ color: "#1a1917" }}>
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-bold" style={{ color: "#8a8882" }}>
                        {selectedEmployee.matricule}
                      </span>
                      <span className="text-xs" style={{ color: "#d4d0c8" }}>|</span>
                      <span className="text-xs font-medium" style={{ color: "#8a8882" }}>
                        {selectedEmployee.department_name}
                      </span>
                      <span className="text-xs" style={{ color: "#d4d0c8" }}>|</span>
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase"
                        style={{
                          background: selectedEmployee.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: selectedEmployee.status === "active" ? "#16a34a" : "#dc2626",
                        }}>
                        {statusLabels[selectedEmployee.status] || selectedEmployee.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedEmployee(null); setEmployeeInfo(null); setEmployeeSearch(""); setVoucherHistory([]); }}
                  className="p-1.5 rounded-xl transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <X className="w-4 h-4" style={{ color: "#8a8882" }} />
                </button>
              </div>

              {/* Quick stats row */}
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-2xl" style={{ background: "#f3f2ee" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#8a8882" }}>Total bons</p>
                    <p className="text-lg font-black mt-0.5" style={{ color: "#1a1917" }}>{summary.total_vouchers}</p>
                  </div>
                  <div className="p-3 rounded-2xl" style={{ background: "#f3f2ee" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#8a8882" }}>3 derniers mois</p>
                    <p className="text-lg font-black mt-0.5" style={{ color: "#1a1917" }}>{summary.count_last_3_months}</p>
                  </div>
                  <div className="p-3 rounded-2xl" style={{ background: "#f3f2ee" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#8a8882" }}>Cette année</p>
                    <p className="text-lg font-black mt-0.5" style={{ color: "#1a1917" }}>{summary.count_current_year}</p>
                  </div>
                  <div className="p-3 rounded-2xl" style={{ background: "#f3f2ee" }}>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#8a8882" }}>Dernier bon</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "#4d4b46" }}>
                      {summary.last_voucher_reference ? (
                        <>{summary.last_voucher_reference}<br /><span className="text-[10px] font-medium" style={{ color: "#8a8882" }}>{summary.last_voucher_date}</span></>
                      ) : "—"}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            ZONE 3 — Bénéficiaire
            ════════════════════════════════════════════════════ */}
        {employeeInfo && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                Bénéficiaire
              </h2>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => { setBeneficiaryType("employee"); setSelectedDependent(""); }}
                className={`flex-1 p-3.5 rounded-2xl text-sm font-bold transition-all ${
                  beneficiaryType === "employee" ? "ring-2 ring-[#ffda2d]" : ""
                }`}
                style={{
                  background: beneficiaryType === "employee" ? "rgba(255,218,45,0.1)" : "#f3f2ee",
                  color: "#1a1917",
                }}
              >
                <User className="w-4 h-4 inline mr-2" />
                L'employé lui-même
              </button>
              <button
                type="button"
                onClick={() => setBeneficiaryType("dependent")}
                className={`flex-1 p-3.5 rounded-2xl text-sm font-bold transition-all ${
                  beneficiaryType === "dependent" ? "ring-2 ring-[#ffda2d]" : ""
                }`}
                style={{
                  background: beneficiaryType === "dependent" ? "rgba(255,218,45,0.1)" : "#f3f2ee",
                  color: "#1a1917",
                }}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Ayant droit
              </button>
            </div>

            {beneficiaryType === "dependent" && (
              <>
                {employeeInfo.dependents.length > 0 ? (
                  <div className="space-y-2">
                    {employeeInfo.dependents.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDependent(d.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-medium transition-all ${
                          selectedDependent === d.id ? "ring-2 ring-[#ffda2d]" : ""
                        }`}
                        style={{
                          background: selectedDependent === d.id ? "rgba(255,218,45,0.08)" : "#f3f2ee",
                          color: "#1a1917",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                            style={{ background: selectedDependent === d.id ? "#ffda2d" : "rgba(0,0,0,0.04)" }}>
                            {d.full_name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="font-bold">{d.full_name}</p>
                            <p className="text-xs font-medium" style={{ color: "#8a8882" }}>{d.relationship_display}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs" style={{ color: "#8a8882" }}>
                          <span>{d.count_last_3_months} bon(s) / 3 mois</span>
                          {d.last_voucher_date && <span>Dernier: {d.last_voucher_date}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium px-1" style={{ color: "#d97706" }}>
                    Aucun ayant droit enregistré pour cet employé
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ZONE 4 — Historique et Statistiques
            ════════════════════════════════════════════════════ */}
        {employeeInfo && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                  Historique et Statistiques
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                style={{ color: "#8a8882", background: "#f3f2ee" }}
              >
                <Clock className="w-3.5 h-3.5" />
                {showHistory ? "Masquer" : "Voir tout l'historique"}
              </button>
            </div>

            {/* Eligibility alert */}
            {eligibility && (
              <div className={`p-4 rounded-2xl mb-4 ${eligibility.is_eligible ? "" : ""}`}
                style={{
                  background: eligibility.is_eligible ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                  border: `1px solid ${eligibility.is_eligible ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                }}>
                <div className="flex items-start gap-3">
                  {eligibility.is_eligible ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#16a34a" }} />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: eligibility.is_eligible ? "#16a34a" : "#dc2626" }}>
                      {eligibility.is_eligible ? "Éligible" : "Non éligible"}
                    </p>
                    {eligibility.messages.map((msg, i) => (
                      <p key={i} className="text-xs font-medium mt-1" style={{ color: "#4d4b46" }}>{msg}</p>
                    ))}
                    {eligibility.next_eligible_date && (
                      <p className="text-xs font-bold mt-1" style={{ color: "#d97706" }}>
                        Prochaine date éligible : {eligibility.next_eligible_date}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                  <div>
                    <p className="text-[10px] font-black uppercase" style={{ color: "#8a8882" }}>Dernier bon</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "#1a1917" }}>
                      {eligibility.last_voucher_reference || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase" style={{ color: "#8a8882" }}>Dernière date</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "#1a1917" }}>
                      {eligibility.last_voucher_date || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase" style={{ color: "#8a8882" }}>Restant cette année</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: "#1a1917" }}>{eligibility.remaining} bon(s)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="p-3.5 rounded-2xl flex items-center gap-3"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)" }}>
                    <Calendar className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase" style={{ color: "#3b82f6" }}>Dernier bon</p>
                    <p className="text-xs font-bold" style={{ color: "#1a1917" }}>
                      {summary.last_voucher_reference
                        ? `${summary.last_voucher_reference} — ${summary.last_voucher_date}`
                        : "Aucun"}
                    </p>
                    {summary.last_voucher_type && (
                      <p className="text-[10px] font-medium" style={{ color: "#8a8882" }}>{summary.last_voucher_type}</p>
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl flex items-center gap-3"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
                    <Clock className="w-4 h-4" style={{ color: "#d97706" }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase" style={{ color: "#d97706" }}>3 derniers mois</p>
                    <p className="text-lg font-black" style={{ color: "#1a1917" }}>{summary.count_last_3_months}</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl flex items-center gap-3"
                  style={{ background: "rgba(147,51,234,0.06)", border: "1px solid rgba(147,51,234,0.12)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(147,51,234,0.1)" }}>
                    <FileText className="w-4 h-4" style={{ color: "#9333ea" }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase" style={{ color: "#9333ea" }}>6 derniers mois</p>
                    <p className="text-lg font-black" style={{ color: "#1a1917" }}>—</p>
                  </div>
                </div>
              </div>
            )}

            {/* History table */}
            {showHistory && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="p-3 text-xs font-black uppercase tracking-wider" style={{ background: "#f8f7f4", color: "#8a8882" }}>
                  Historique des bons
                </div>
                {historyLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8a8882" }} />
                  </div>
                ) : voucherHistory.length === 0 ? (
                  <p className="p-4 text-sm font-medium text-center" style={{ color: "#8a8882" }}>Aucun bon trouvé</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                          <th className="px-3 py-2 font-bold" style={{ color: "#8a8882" }}>Réf.</th>
                          <th className="px-3 py-2 font-bold" style={{ color: "#8a8882" }}>Type</th>
                          <th className="px-3 py-2 font-bold" style={{ color: "#8a8882" }}>Bénéficiaire</th>
                          <th className="px-3 py-2 font-bold" style={{ color: "#8a8882" }}>Date</th>
                          <th className="px-3 py-2 font-bold" style={{ color: "#8a8882" }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherHistory.map((v: any) => {
                          const statusUI = VOUCHER_STATUS_UI[v.workflow_state as keyof typeof VOUCHER_STATUS_UI] || VOUCHER_STATUS_UI.draft;
                          return (
                            <tr key={v.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                              <td className="px-3 py-2 font-bold" style={{ color: "#1a1917" }}>{v.reference}</td>
                              <td className="px-3 py-2" style={{ color: "#4d4b46" }}>{v.coverage_type_name}</td>
                              <td className="px-3 py-2" style={{ color: "#4d4b46" }}>
                                {v.beneficiary_name || v.employee_name}
                                {v.beneficiary_type === "dependent" && (
                                  <span className="text-[9px] ml-1 font-black uppercase" style={{ color: "#a8a49a" }}>(AD)</span>
                                )}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#4d4b46" }}>{v.request_date}</td>
                              <td className="px-3 py-2">
                                <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase"
                                  style={{ color: statusUI.color, background: statusUI.bg }}>
                                  {statusUI.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            ZONE 5 — Date et Observations
            ════════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
              Détails de la prise en charge
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#4d4b46" }}>
                Date de prise en charge <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
                <input
                  type="date"
                  {...register("request_date")}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none font-medium"
                  style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
                />
              </div>
              {errors.request_date && <p className="text-xs text-red-500 mt-1">{errors.request_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: "#4d4b46" }}>Date prévue</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
                <input
                  type="date"
                  {...register("expected_date")}
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none font-medium"
                  style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: "#4d4b46" }}>
              Observation
            </label>
            <textarea
              {...register("observations")}
              rows={3}
              placeholder="Observation / Commentaire..."
              className="w-full px-4 py-2.5 text-sm rounded-xl outline-none font-medium resize-none"
              style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            ZONE 6 — Actions
            ════════════════════════════════════════════════════ */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "1.5rem" }}>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/medical-coverage/${coverageType}`)}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors"
              style={{ color: "#4d4b46" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleView}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ color: "#4d4b46", background: "#f3f2ee" }}
            >
              <Eye className="w-4 h-4" />
              Voir
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ color: "#4d4b46", background: "#f3f2ee" }}
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !selectedEmployee}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: "#ffda2d", color: "#1a1917" }}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
