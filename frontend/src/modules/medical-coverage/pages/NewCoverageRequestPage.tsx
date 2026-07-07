import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Save, Search, AlertTriangle, CheckCircle2,
  User, X, Printer, Eye, Loader2, Building2, Syringe,
  Scan, Stethoscope, Calendar, FileText, Users, Clock,
  ChevronDown, Ban,
} from "lucide-react";
import { useToast } from "@shared/components/ui/index";
import { useTranslation } from "react-i18next";
import { coverageRequestApi } from "../api/requests";
import { useCreateCoverageRequest } from "../hooks/useCoverageRequests";
import { employeeApi } from "@modules/employees/api";
import type { EmployeeListItem } from "@modules/employees/types";
import { usePartners } from "@modules/conventions/api";
import type { EmployeeEligibilityResponse } from "../types/request";
import { ELIGIBILITY_UI, REQUEST_STATUS_UI } from "../types/request";
import type { RequestStatus } from "../types/request";
import { medicalCoverageApi } from "../api";
import apiClient from "@shared/api/apiClient";

const CATEGORY_OPTIONS = [
  { value: "analysis", labelKey: "coverageRequest.categoryAnalysis", icon: Syringe },
  { value: "imaging", labelKey: "coverageRequest.categoryImaging", icon: Scan },
  { value: "center", labelKey: "coverageRequest.categoryCenter", icon: Stethoscope },
];

const CATEGORY_PARTNER_TYPE: Record<string, string> = {
  analysis: "medical_analysis_lab",
  imaging: "medical_imaging_center",
  center: "medical_center",
};



function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function NewCoverageRequestPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();

  const [category, setCategory] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);

  const [employeeData, setEmployeeData] = useState<EmployeeEligibilityResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const [beneficiaryType, setBeneficiaryType] = useState<"employee" | "dependent">("employee");
  const [selectedDependent, setSelectedDependent] = useState<string>("");

  const [partnerId, setPartnerId] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [showPartnerPicker, setShowPartnerPicker] = useState(false);

  const [coverageDate, setCoverageDate] = useState(new Date().toISOString().slice(0, 10));
  const [observation, setObservation] = useState("");

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [hasActiveConvention, setHasActiveConvention] = useState<boolean | null>(null);
  const [checkingConvention, setCheckingConvention] = useState(false);

  const createMut = useCreateCoverageRequest();
  const { data: partnersData } = usePartners({ is_active: "true", page_size: "200" });
  const partners = partnersData?.results ?? [];

  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === category);
  const TypeIcon = selectedCategory?.icon || Syringe;

  const filteredPartners = category
    ? partners.filter((p: any) => p.category === CATEGORY_PARTNER_TYPE[category])
    : [];

  const { data: employeesData } = useQuery({
    queryKey: ["employees", "search", employeeSearch],
    queryFn: () => employeeApi.list({ search: employeeSearch, page_size: 10 }).then(r => r.data),
    enabled: employeeSearch.length >= 2,
  });

  useEffect(() => {
    if (!category) return;
    setPartnerId("");
    setPartnerSearch("");
  }, [category]);

  useEffect(() => {
    if (selectedEmployee && category) {
      setDataLoading(true);
      Promise.all([
        coverageRequestApi.getEmployeeEligibility(selectedEmployee.id, category),
        medicalCoverageApi.getEmployeeInfo(selectedEmployee.id, category),
      ]).then(([eligRes, infoRes]) => {
        const merged: EmployeeEligibilityResponse = {
          ...eligRes.data.data,
          voucher_summary: infoRes.data.data.summary,
          voucher_eligibility: {
            is_eligible: infoRes.data.data.eligibility?.is_eligible ?? true,
            messages: infoRes.data.data.eligibility?.messages ?? [],
            next_eligible_date: infoRes.data.data.eligibility?.next_eligible_date ?? null,
            last_voucher_date: infoRes.data.data.eligibility?.last_voucher_date ?? null,
            last_voucher_reference: infoRes.data.data.eligibility?.last_voucher_reference ?? null,
            count_last_3_months: infoRes.data.data.eligibility?.count_last_3_months ?? 0,
            count_current_year: infoRes.data.data.eligibility?.count_current_year ?? 0,
            remaining: infoRes.data.data.eligibility?.remaining ?? 0,
          },
          employee: {
            ...eligRes.data.data.employee,
            marital_status: infoRes.data.data.employee?.marital_status ?? "",
            marital_status_display: infoRes.data.data.employee?.marital_status
              ? MARITAL_LABELS[infoRes.data.data.employee.marital_status] || infoRes.data.data.employee.marital_status
              : "",
          },
          beneficiaries: infoRes.data.data.dependents?.map((d: any) => ({
            id: d.id,
            full_name: d.full_name,
            relationship: d.relationship,
            relationship_display: d.relationship_display,
            is_eligible: true,
          })) ?? [],
        };
        setEmployeeData(merged);
        setDataLoading(false);
      }).catch(() => {
        setEmployeeData(null);
        setDataLoading(false);
      });
    } else {
      setEmployeeData(null);
    }
  }, [selectedEmployee, category]);

  useEffect(() => {
    if (!partnerId) { setHasActiveConvention(null); return; }
    setCheckingConvention(true);
    apiClient.get(`/conventions/partners/${partnerId}/has_active_convention/`)
      .then(r => setHasActiveConvention(r.data.has_active_convention))
      .catch(() => setHasActiveConvention(false))
      .finally(() => setCheckingConvention(false));
  }, [partnerId]);

  const handleSubmit = async (action: "save" | "print") => {
    if (!selectedEmployee) { toast.error(t("coverageRequest.selectEmployeeError")); return; }
    if (!category) { toast.error(t("coverageRequest.selectCategoryError")); return; }
    if (!partnerId) { toast.error(t("coverageRequest.selectPartnerError")); return; }
    if (hasActiveConvention === false) { toast.error(t("coverageRequest.noActiveConvention")); return; }
    if (!coverageDate) { toast.error(t("coverageRequest.selectCoverageDateError")); return; }

    try {
      const payload: any = {
        category,
        partner: partnerId,
        employee: selectedEmployee.id,
        coverage_date: coverageDate,
        observation,
      };
      if (beneficiaryType === "dependent" && selectedDependent) {
        payload.beneficiary = selectedDependent;
      }
      const result = await createMut.mutateAsync(payload);
      setCreatedId(result.id);
      toast.success(t("coverageRequest.creationSuccess"));
      if (action === "print") {
        const resp = await coverageRequestApi.downloadPdf(result.id);
        downloadBlob(resp.data, `demande-${result.id}.pdf`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.detail
        || t("coverageRequest.creationError");
      toast.error(msg);
    }
  };

  const handlePrint = async () => {
    if (!createdId) return;
    setPrintLoading(true);
    try {
      const resp = await coverageRequestApi.downloadPdf(createdId);
      downloadBlob(resp.data, `demande-${createdId}.pdf`);
    } catch {
      toast.error(t("coverageRequest.pdfDownloadError"));
    } finally {
      setPrintLoading(false);
    }
  };

  const createdWorkflowState = createMut.data?.workflow_state;
  const isCreatedPending = createdWorkflowState === "pending_manager_approval";

  if (createdId) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-[32px] p-8 text-center space-y-6"
          style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: isCreatedPending ? "rgba(249,115,22,0.1)" : "rgba(34,197,94,0.1)" }}>
            {isCreatedPending ? (
              <Clock className="w-8 h-8" style={{ color: "#f97316" }} />
            ) : (
              <CheckCircle2 className="w-8 h-8" style={{ color: "#16a34a" }} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#1a1917" }}>
              {t("coverageRequest.requestCreatedTitle", { ref: createdId.slice(0, 8) })}
            </h2>
            <p className="text-sm mt-1" style={{ color: "#8a8882" }}>
              {isCreatedPending
                ? t("coverageRequest.sentForApproval")
                : t("coverageRequest.approvedAndPrintable")}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={handlePrint}
              disabled={printLoading || isCreatedPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: "#ffda2d", color: "#1a1917" }}
            >
              {printLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {t("coverageWizard.print")}
            </button>
            <button
              onClick={() => navigate(`/medical-coverage/requests/${createdId}`)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ color: "#4d4b46", background: "#f3f2ee" }}
            >
              <Eye className="w-4 h-4" />
              {t("coverageRequest.viewRequest")}
            </button>
          </div>
          {isCreatedPending && (
            <p className="text-xs font-medium" style={{ color: "#f97316" }}>
              {t("coverageRequest.printAfterApproval")}
            </p>
          )}
          <button
            onClick={() => navigate(`/medical-coverage/${category}`)}
            className="text-sm font-bold transition-colors"
            style={{ color: "#8a8882" }}
          >
            {t("coverageRequest.backToList")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 max-w-6xl mx-auto">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(category ? `/medical-coverage/${category}` : "/medical-coverage")}
          className="flex items-center gap-2 text-sm font-bold transition-colors"
          style={{ color: "#8a8882" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("app.back")}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,218,45,0.15)" }}>
            <TypeIcon className="w-5 h-5" style={{ color: "#1a1917" }} />
          </div>
          <span className="text-sm font-black" style={{ color: "#1a1917" }}>
            {t("coverageRequest.newRequest", { category: selectedCategory ? t(selectedCategory.labelKey) : "..." })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ════════════════════════════════════════════════════
            LEFT COLUMN — Form
            ════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] p-6 md:p-8" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
            {/* STEP 1 — Catégorie */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                  {t("coverageRequest.coverageCategory")} <span className="text-red-500">*</span>
                </h2>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-xl font-medium text-left"
                  style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: category ? "#1a1917" : "#a8a49a" }}
                >
                  <span className="flex items-center gap-2">
                    {selectedCategory && <selectedCategory.icon className="w-4 h-4" />}
                    {selectedCategory ? t(selectedCategory.labelKey) : t("coverageRequest.selectCategory")}
                  </span>
                  <ChevronDown className="w-4 h-4" style={{ color: "#8a8882" }} />
                </button>
                {showCategoryPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden"
                    style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)" }}>
                    {CATEGORY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setCategory(opt.value); setShowCategoryPicker(false); setPartnerId(""); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors"
                        style={{
                          color: "#1a1917",
                          background: category === opt.value ? "rgba(255,218,45,0.08)" : "transparent",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                        onMouseLeave={e => e.currentTarget.style.background = category === opt.value ? "rgba(255,218,45,0.08)" : "transparent"}
                      >
                        <opt.icon className="w-4 h-4" style={{ color: "#4d4b46" }} />
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2 — Prestataire (after category, before employee) */}
            {category && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.partner")}
                  </h2>
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
                  <input
                    type="text"
                    placeholder={t("coverageRequest.searchPartner")}
                    value={partnerSearch}
                    onChange={e => { setPartnerSearch(e.target.value); setShowPartnerPicker(true); }}
                    onFocus={() => setShowPartnerPicker(true)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none font-medium"
                    style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
                  />
                  {partnerId && (
                    <button
                      onClick={() => { setPartnerId(""); setPartnerSearch(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <X className="w-3.5 h-3.5" style={{ color: "#8a8882" }} />
                    </button>
                  )}
                  {showPartnerPicker && filteredPartners.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-2xl overflow-hidden max-h-64 overflow-y-auto"
                      style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)" }}>
                      {filteredPartners
                        .filter((p: any) => !partnerSearch || p.name.toLowerCase().includes(partnerSearch.toLowerCase()))
                        .map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => { setPartnerId(p.id); setPartnerSearch(p.name); setShowPartnerPicker(false); }}
                            className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                            style={{
                              color: "#1a1917",
                              background: partnerId === p.id ? "rgba(255,218,45,0.08)" : "transparent",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                            onMouseLeave={e => e.currentTarget.style.background = partnerId === p.id ? "rgba(255,218,45,0.08)" : "transparent"}
                          >
                            <span className="font-bold">{p.name}</span>
                            {p.city && <span className="ml-2 text-xs" style={{ color: "#8a8882" }}>{p.city}</span>}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                {partnerId && checkingConvention && (
                  <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "#8a8882" }}>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("coverageRequest.checkingConvention")}
                  </div>
                )}
                {partnerId && hasActiveConvention === false && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(239,68,68,0.06)", color: "#dc2626" }}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t("coverageRequest.noActiveConvention")}
                  </div>
                )}
                {partnerId && hasActiveConvention === true && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(34,197,94,0.06)", color: "#16a34a" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t("coverageRequest.activeConvention")}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 — Employé */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                  {t("coverageWizard.employee")}
                </h2>
              </div>

              {!selectedEmployee ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
                  <input
                    type="text"
                    placeholder={t("coverageRequest.searchEmployeeLong")}
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
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setEmployeeSearch(`${emp.first_name} ${emp.last_name}`);
                            setShowEmployeePicker(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                          style={{ color: "#1a1917" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span className="font-bold">{emp.first_name} {emp.last_name}</span>
                          <span className="ml-2 text-xs font-medium" style={{ color: "#8a8882" }}>{emp.matricule}</span>
                          <span className="ml-2 text-xs" style={{ color: "#a8a49a" }}>{emp.department_name}</span>
                        </button>
                      ))}
                      {employeesData.results.length === 0 && (
                        <p className="px-4 py-3 text-sm" style={{ color: "#8a8882" }}>{t("app.noResults")}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-2xl"
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
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedEmployee(null); setEmployeeData(null); setEmployeeSearch(""); setSelectedDependent(""); }}
                    className="p-1.5 rounded-xl transition-colors"
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <X className="w-4 h-4" style={{ color: "#8a8882" }} />
                  </button>
                </div>
              )}
            </div>

            {/* STEP 4 — Bénéficiaire (shown after employee) */}
            {selectedEmployee && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.beneficiary")}
                  </h2>
                </div>
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => { setBeneficiaryType("employee"); setSelectedDependent(""); }}
                    className={`flex-1 p-3.5 rounded-2xl text-sm font-bold transition-all ${beneficiaryType === "employee" ? "ring-2 ring-[#ffda2d]" : ""}`}
                    style={{
                      background: beneficiaryType === "employee" ? "rgba(255,218,45,0.1)" : "#f3f2ee",
                      color: "#1a1917",
                    }}
                  >
                    <User className="w-4 h-4 inline mr-2" />
                    {t("coverageRequest.employeeItself")}
                  </button>
                  <button
                    onClick={() => setBeneficiaryType("dependent")}
                    className={`flex-1 p-3.5 rounded-2xl text-sm font-bold transition-all ${beneficiaryType === "dependent" ? "ring-2 ring-[#ffda2d]" : ""}`}
                    style={{
                      background: beneficiaryType === "dependent" ? "rgba(255,218,45,0.1)" : "#f3f2ee",
                      color: "#1a1917",
                    }}
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    {t("coverageWizard.dependent")}
                  </button>
                </div>
                {beneficiaryType === "dependent" && (
                  <>
                    {employeeData?.beneficiaries && employeeData.beneficiaries.length > 0 ? (
                      <div className="space-y-2">
                        {employeeData.beneficiaries.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={() => setSelectedDependent(b.id)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-medium transition-all ${selectedDependent === b.id ? "ring-2 ring-[#ffda2d]" : ""}`}
                            style={{
                              background: selectedDependent === b.id ? "rgba(255,218,45,0.08)" : "#f3f2ee",
                              color: "#1a1917",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                                style={{ background: selectedDependent === b.id ? "#ffda2d" : "rgba(0,0,0,0.04)" }}>
                                {b.full_name.split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <p className="font-bold">{b.full_name}</p>
                                <p className="text-xs font-medium" style={{ color: "#8a8882" }}>{b.relationship_display}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-medium px-1" style={{ color: "#d97706" }}>
                        {t("coverageRequest.noDependents")}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* STEP 5 — Date et observation */}
            {selectedEmployee && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: "#ffda2d" }} />
                  <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.requestDetails")}
                  </h2>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.coverageDate")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
                    <input
                      type="date"
                      value={coverageDate}
                      onChange={e => setCoverageDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none font-medium"
                      style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{ color: "#4d4b46" }}>
                    {t("coverageWizard.observation")}
                  </label>
                  <textarea
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    rows={3}
                    placeholder={t("coverageRequest.observationPlaceholder")}
                    className="w-full px-4 py-2.5 text-sm rounded-xl outline-none font-medium resize-none"
                    style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
                  />
                </div>
              </div>
            )}

            {/* STEP 6 — Actions */}
            {selectedEmployee && (
              <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "1.5rem" }}>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => navigate(category ? `/medical-coverage/${category}` : "/medical-coverage")}
                    className="px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors"
                    style={{ color: "#4d4b46" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={() => navigate(`/medical-coverage/requests/${createdId || "new"}`)}
                    disabled={!createdId}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-40"
                    style={{ color: "#4d4b46", background: "#f3f2ee" }}
                  >
                    <Eye className="w-4 h-4" />
                    {t("employees.view")}
                  </button>
                  <button
                    onClick={() => handleSubmit("save")}
                    disabled={createMut.isPending || !partnerId || hasActiveConvention === false}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{ color: "#4d4b46", background: "#f3f2ee" }}
                  >
                    {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t("common.save")}
                  </button>
                  <button
                    onClick={() => handleSubmit("print")}
                    disabled={createMut.isPending || !partnerId || hasActiveConvention === false || employeeData?.status !== "APPROVED"}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                    style={{ background: "#ffda2d", color: "#1a1917" }}
                  >
                    {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    {t("coverageRequest.saveAndPrint")}
                  </button>
                </div>
                {employeeData && employeeData.status !== "APPROVED" && (
                  <p className="text-xs font-medium text-right mt-2" style={{ color: "#f97316" }}>
                    {employeeData.reason || t("coverageRequest.submittedForApproval")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT COLUMN — Information Panel
            ════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {!selectedEmployee ? (
            <div className="bg-white rounded-[32px] p-6 text-center"
              style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(255,218,45,0.1)" }}>
                <FileText className="w-6 h-6" style={{ color: "#ffda2d" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#8a8882" }}>
                {t("coverageRequest.selectEmployeePrompt")}
              </p>
            </div>
          ) : dataLoading ? (
            <div className="bg-white rounded-[32px] p-6 flex items-center justify-center"
              style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#8a8882" }} />
            </div>
          ) : employeeData ? (
            <div className="bg-white rounded-[32px] overflow-hidden"
              style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
              {/* EMPLOYÉ */}
              <div className="p-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4" style={{ color: "#4d4b46" }} />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.employeeInfo")}
                  </h3>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: "#8a8882" }}>{t("employees.matricule")}</span>
                    <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.employee.matricule}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "#8a8882" }}>{t("employees.lastName")}</span>
                    <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.employee.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: "#8a8882" }}>{t("employees.maritalStatus")}</span>
                    <span className="font-bold" style={{ color: "#1a1917" }}>
                      {employeeData.employee.marital_status_display || t(`employees.${employeeData.employee.marital_status}`, employeeData.employee.marital_status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* DERNIÈRE PRISE EN CHARGE (request-level) */}
              <div className="p-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: "#4d4b46" }} />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.lastCoverage")}
                  </h3>
                </div>
                {employeeData.last_request ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: "#8a8882" }}>{t("coverageRequest.coverageNumber")}</span>
                      <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.last_request.request_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "#8a8882" }}>{t("coverageWizard.category")}</span>
                      <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.last_request.category_display}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "#8a8882" }}>{t("coverageRequest.partner")}</span>
                      <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.last_request.partner_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "#8a8882" }}>{t("coverageWizard.voucherDate")}</span>
                      <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.last_request.coverage_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "#8a8882" }}>{t("coverageRequest.beneficiary")}</span>
                      <span className="font-bold" style={{ color: "#1a1917" }}>{employeeData.last_request.beneficiary_name || employeeData.employee.full_name}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium" style={{ color: "#8a8882" }}>{t("coverageRequest.noPreviousCoverage")}</p>
                )}
              </div>

              {/* HISTORIQUE DES DEMANDES */}
              <div className="p-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: "#4d4b46" }} />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.requestsLast", { months: employeeData.restriction_period_months })}
                  </h3>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase" style={{ color: "#8a8882" }}>{t("coverageRequest.total")}</span>
                  <span className="text-sm font-black" style={{ color: "#1a1917" }}>{t("coverageRequest.totalRequests", { count: employeeData.total_requests_last_period })}</span>
                </div>
                {employeeData.request_history && employeeData.request_history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                          <th className="text-left py-1.5 pr-2 font-bold uppercase" style={{ color: "#8a8882" }}>{t("coverageWizard.voucherDate")}</th>
                          <th className="text-left py-1.5 px-2 font-bold uppercase" style={{ color: "#8a8882" }}>{t("coverageWizard.category")}</th>
                          <th className="text-left py-1.5 px-2 font-bold uppercase" style={{ color: "#8a8882" }}>{t("coverageRequest.partner")}</th>
                          <th className="text-left py-1.5 px-2 font-bold uppercase" style={{ color: "#8a8882" }}>{t("coverageRequest.beneficiary")}</th>
                          <th className="text-right py-1.5 pl-2 font-bold uppercase" style={{ color: "#8a8882" }}>{t("app.status")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeData.request_history.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                            <td className="py-1.5 pr-2 whitespace-nowrap font-medium" style={{ color: "#1a1917" }}>{r.coverage_date}</td>
                            <td className="py-1.5 px-2 whitespace-nowrap" style={{ color: "#4d4b46" }}>{r.category_display}</td>
                            <td className="py-1.5 px-2 whitespace-nowrap" style={{ color: "#4d4b46" }}>{r.partner_name}</td>
                            <td className="py-1.5 px-2 whitespace-nowrap" style={{ color: "#4d4b46" }}>{r.beneficiary_name || employeeData.employee.full_name}</td>
                            <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                              <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[10px]"
                                style={{
                                  background: REQUEST_STATUS_UI[r.workflow_state as RequestStatus]?.bg || "rgba(138,136,130,0.1)",
                                  color: REQUEST_STATUS_UI[r.workflow_state as RequestStatus]?.color || "#6b6963",
                                }}>
                                {REQUEST_STATUS_UI[r.workflow_state as RequestStatus]?.label || r.workflow_state}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm font-medium" style={{ color: "#6b6963" }}>{t("coverageRequest.noRequestsFound")}</p>
                )}
              </div>

              {/* ÉLIGIBILITÉ */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {employeeData.status === "NOT_ELIGIBLE" ? (
                    <Ban className="w-4 h-4" style={{ color: "#dc2626" }} />
                  ) : employeeData.status === "PENDING_MANAGER_APPROVAL" ? (
                    <AlertTriangle className="w-4 h-4" style={{ color: "#f97316" }} />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
                  )}
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "#4d4b46" }}>
                    {t("coverageRequest.eligibility")}
                  </h3>
                </div>
                <div className={`p-3 rounded-2xl`}
                  style={{
                    background: ELIGIBILITY_UI[employeeData.status].bg,
                    border: `1px solid ${ELIGIBILITY_UI[employeeData.status].color}40`,
                  }}>
                  <div className="flex items-center gap-2">
                    {employeeData.status === "NOT_ELIGIBLE" ? (
                      <Ban className="w-4 h-4" style={{ color: "#dc2626" }} />
                    ) : employeeData.status === "PENDING_MANAGER_APPROVAL" ? (
                      <Clock className="w-4 h-4" style={{ color: "#f97316" }} />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
                    )}
                    <span className="text-sm font-bold" style={{ color: ELIGIBILITY_UI[employeeData.status].color }}>
                      {ELIGIBILITY_UI[employeeData.status].label}
                    </span>
                  </div>
                  {employeeData.reason && (
                    <p className="text-xs font-medium mt-1" style={{ color: "#4d4b46" }}>
                      {employeeData.reason}
                    </p>
                  )}
                </div>
                {employeeData.voucher_eligibility?.next_eligible_date && (
                  <div className="mt-2 text-xs font-medium" style={{ color: "#d97706" }}>
                    {t("coverageRequest.nextEligibleDate")} {employeeData.voucher_eligibility.next_eligible_date}
                  </div>
                )}
                {employeeData.voucher_eligibility && !employeeData.voucher_eligibility.is_eligible && employeeData.voucher_eligibility.messages && !employeeData.reason && (
                  <div className="mt-2 text-xs font-medium" style={{ color: "#f97316" }}>
                    {employeeData.voucher_eligibility.messages[0]}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
