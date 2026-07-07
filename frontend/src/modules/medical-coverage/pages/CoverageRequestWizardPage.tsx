import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Card, Select, Steps, message, DatePicker, Input, Tag, Table } from "antd";
import { ArrowLeft, Save, Building2, CheckCircle, Printer, FileText } from "lucide-react";
import apiClient from "@shared/api/apiClient";
import { fmtDate } from "@shared/utils/format";
import { usePartners } from "@modules/conventions/api";
import { useEmployees } from "@modules/employees/hooks/useEmployees";
import { useCreateCoverageRequest } from "../hooks/useCoverageRequests";
import { medicalCoverageApi } from "../api";
import { coverageRequestApi } from "../api/requests";
import type { MedicalCoverageVoucher } from "../types";

const { TextArea } = Input;

const CATEGORY_PARTNER_TYPE: Record<string, string> = {
  analysis: "medical_analysis_lab",
  imaging: "medical_imaging_center",
  center: "medical_center",
};

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  analysis: { label: "Medical Analysis", emoji: "\uD83E\uDDCA" },
  imaging: { label: "Medical Imaging", emoji: "\uD83E\uDEBB" },
  center: { label: "Medical Center", emoji: "\uD83C\uDFE5" },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, { label, emoji }]) => ({
  value,
  label: `${emoji} ${label}`,
  style: { color: "#000", fontWeight: 600, fontSize: 14 },
}));

const VOUCHER_STATUS_COLOR: Record<string, string> = {
  draft: "default", submitted: "blue", pending_approval: "orange",
  pending_director_approval: "pink", approved: "green", rejected: "red",
  cancelled: "default", consumed: "purple",
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CoverageRequestWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [category, setCategory] = useState<string>("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [beneficiaryId, setBeneficiaryId] = useState<string>("");
  const [beneficiaryType, setBeneficiaryType] = useState<"employee" | "dependent">("employee");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [coverageDate, setCoverageDate] = useState<string>("");
  const [observation, setObservation] = useState("");
  const [vouchers, setVouchers] = useState<MedicalCoverageVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [hasActiveConvention, setHasActiveConvention] = useState<boolean | null>(null);
  const [checkingConvention, setCheckingConvention] = useState(false);

  useEffect(() => {
    if (!partnerId) {
      setHasActiveConvention(null);
      return;
    }
    setCheckingConvention(true);
    apiClient.get(`/conventions/partners/${partnerId}/has_active_convention/`)
      .then(r => setHasActiveConvention(r.data.has_active_convention))
      .catch(() => setHasActiveConvention(false))
      .finally(() => setCheckingConvention(false));
  }, [partnerId]);

  const createMut = useCreateCoverageRequest();
  const { data: partnersData } = usePartners({ is_active: "true", page_size: "200" });
  const { data: empData } = useEmployees({ search: employeeSearch, page_size: 20 });
  const employees = empData?.results ?? [];
  const partners = partnersData?.results ?? [];

  const selectedPartner = partners.find((p: any) => p.id === partnerId);

  const filteredPartners = category
    ? partners.filter((p: any) => p.category === CATEGORY_PARTNER_TYPE[category])
    : [];

  useEffect(() => {
    if (employeeId) {
      apiClient.get(`/employees/${employeeId}/beneficiaries/`).then((r: any) => {
        setBeneficiaries(r.data?.data ?? []);
      });
      setVouchersLoading(true);
      medicalCoverageApi.list({ employee: employeeId, page_size: 50 })
        .then(r => setVouchers(r.data.results ?? []))
        .catch(() => {})
        .finally(() => setVouchersLoading(false));
    } else {
      setVouchers([]);
    }
  }, [employeeId]);

  useEffect(() => {
    setPartnerId("");
  }, [category]);

  const handleCategoryChange = (value: unknown) => {
    setCategory(value as string);
    setPartnerId("");
  };

  const handleFinish = async () => {
    if (hasActiveConvention === false) {
      message.error(t("coverageWizard.noActiveConvention"));
      return;
    }
    try {
      const payload: any = {
        category,
        partner: partnerId,
        employee: employeeId,
        coverage_date: coverageDate,
        observation,
      };
      if (beneficiaryType === "dependent" && beneficiaryId) {
        payload.beneficiary = beneficiaryId;
      }
      const result = await createMut.mutateAsync(payload);
      setCreatedId(result.id);
      setCurrent(3);
    } catch {
      message.error(t("coverageWizard.error"));
    }
  };

  const handlePrint = async () => {
    if (!createdId) return;
    setPrintLoading(true);
    try {
      const resp = await coverageRequestApi.downloadPdf(createdId);
      downloadBlob(resp.data, `demande-${createdId}.pdf`);
    } catch {
      message.error("Erreur lors du téléchargement du PDF");
    } finally {
      setPrintLoading(false);
    }
  };

  const canNext = () => {
    if (current === 0) return !!category && !!partnerId && hasActiveConvention === true;
    if (current === 1) return !!employeeId;
    return true;
  };

  const selectedCategory = category ? CATEGORY_LABELS[category] : null;

  const lastVoucher = vouchers[0] ?? null;
  const last3Months = vouchers.filter(v => {
    const d = new Date(v.request_date);
    const cut = new Date(); cut.setMonth(cut.getMonth() - 3);
    return d >= cut;
  });
  const consumedCount = vouchers.filter(v => v.workflow_state === "consumed").length;
  const approvedCount = vouchers.filter(v => v.workflow_state === "approved").length;

  const STEPS = [
    t("coverageWizard.stepPartner"),
    t("coverageWizard.stepEmployee"),
    t("coverageWizard.stepConfirm"),
  ];

  const voucherColumns = [
    { title: t("coverageWizard.voucherRef"), dataIndex: "reference", key: "reference", width: 140,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    { title: t("coverageWizard.voucherDate"), dataIndex: "request_date", key: "request_date", width: 110,
      render: (v: string) => fmtDate(v),
    },
    { title: t("coverageWizard.voucherType"), dataIndex: "coverage_type_name", key: "coverage_type_name", width: 100 },
    { title: t("coverageWizard.voucherStatus"), dataIndex: "workflow_state", key: "workflow_state", width: 110,
      render: (v: string) => <Tag color={VOUCHER_STATUS_COLOR[v] ?? "default"}>{v}</Tag>,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/medical-coverage/requests")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("common.back")}
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("coverageWizard.title")}</h1>
            <p className="text-sm text-gray-500">{t("coverageWizard.subtitle")}</p>
          </div>
        </div>

        <Steps current={Math.min(current, 2)} className="mb-8"
          items={STEPS.map((s, i) => ({ title: s, icon: i < current ? <CheckCircle /> : undefined }))} />

        {current === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("coverageWizard.categoryRequired")}</label>
              <Select
                value={category || undefined}
                onChange={handleCategoryChange}
                placeholder={t("coverageWizard.selectCategory")}
                className="w-full"
                size="large"
                key={category}
                getPopupContainer={(node) => node.parentNode}
                options={CATEGORY_OPTIONS}
                labelRender={(props) => (
                  <span style={{ color: "#000", fontWeight: 600, fontSize: 14 }}>
                    {props.label as string}
                  </span>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("coverageWizard.partnerRequired")}</label>
              <Select
                value={partnerId || undefined}
                onChange={(v) => setPartnerId(v as string)}
                placeholder={t("coverageWizard.selectPartner")}
                className="w-full"
                size="large"
                showSearch
                disabled={!category}
                getPopupContainer={(node) => node.parentNode}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={filteredPartners.map((p: any) => ({
                  value: p.id,
                  label: p.name,
                  city: p.city,
                  style: { color: "#000", fontWeight: 600, fontSize: 14 },
                }))}
                labelRender={(props) => {
                  const p = filteredPartners.find((x: any) => x.id === props.value);
                  if (!p) return (
                    <span style={{ color: "#000", fontWeight: 600, fontSize: 14 }}>
                      {props.label as string}
                    </span>
                  );
                  const catInfo = Object.entries(CATEGORY_PARTNER_TYPE).find(
                    ([, v]) => v === p.category
                  );
                  const badge = catInfo
                    ? CATEGORY_LABELS[catInfo[0]]?.label ?? p.category
                    : p.category;
                  return (
                    <span style={{ color: "#000", fontWeight: 600, fontSize: 14 }}>
                      {p.name}{" "}
                      <span style={{
                        display: "inline-block",
                        fontSize: 11, fontWeight: 500, color: "#6b7280",
                        background: "#f3f4f6", borderRadius: 4, padding: "0 6px", marginLeft: 6,
                      }}>
                        {badge}
                      </span>
                    </span>
                  );
                }}
              />
            </div>
            {partnerId && hasActiveConvention === false && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {t("coverageWizard.noActiveConvention")}
              </div>
            )}
            {partnerId && checkingConvention && (
              <div className="text-sm text-gray-400">{t("common.loading")}</div>
            )}
          </div>
        )}

        {current === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("coverageWizard.employeeRequired")}</label>
              <Select
                showSearch
                value={employeeId || undefined}
                onChange={(v) => { setEmployeeId(v as string); setBeneficiaryId(""); }}
                onSearch={setEmployeeSearch}
                placeholder={t("coverageWizard.searchEmployee")}
                className="w-full"
                size="large"
                filterOption={false}
                notFoundContent={null}
                getPopupContainer={(node) => node.parentNode}
                options={employees.map((e: any) => ({
                  value: e.id,
                  label: `${e.matricule} - ${e.full_name}`,
                  style: { color: "#000", fontWeight: 600, fontSize: 14 },
                }))}
                labelRender={(props) => (
                  <span style={{ color: "#000", fontWeight: 600, fontSize: 14 }}>
                    {props.label as string}
                  </span>
                )}
              />
            </div>

            {employeeId && (
              <div>
                <label className="block text-sm font-medium mb-2">{t("coverageWizard.beneficiaryType")}</label>
                <div className="flex gap-3">
                  <Button type={beneficiaryType === "employee" ? "primary" : "default"}
                    onClick={() => setBeneficiaryType("employee")}
                    style={beneficiaryType === "employee" ? { background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" } : {}}
                    className="flex-1 h-12">
                    {t("coverageWizard.employeeInsured")}
                  </Button>
                  <Button type={beneficiaryType === "dependent" ? "primary" : "default"}
                    onClick={() => setBeneficiaryType("dependent")}
                    style={beneficiaryType === "dependent" ? { background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" } : {}}
                    className="flex-1 h-12">
                    {t("coverageWizard.dependent")}
                  </Button>
                </div>
              </div>
            )}

            {beneficiaryType === "dependent" && beneficiaries.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">{t("coverageWizard.dependentRequired")}</label>
                <Select
                  value={beneficiaryId || undefined}
                  onChange={(v) => setBeneficiaryId(v as string)}
                  placeholder={t("coverageWizard.selectDependent")}
                  className="w-full"
                  size="large"
                  getPopupContainer={(node) => node.parentNode}
                  options={beneficiaries.map((b: any) => ({
                    value: b.id,
                    label: `${b.full_name} (${b.relationship_display})`,
                    style: { color: "#000", fontWeight: 600, fontSize: 14 },
                  }))}
                  labelRender={(props) => (
                    <span style={{ color: "#000", fontWeight: 600, fontSize: 14 }}>
                      {props.label as string}
                    </span>
                  )}
                />
              </div>
            )}

            {employeeId && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-600">{t("coverageWizard.employeeHistory")}</h3>

                {vouchersLoading ? (
                  <div className="text-sm text-gray-400 py-4">{t("common.loading")}</div>
                ) : vouchers.length === 0 ? (
                  <p className="text-sm text-gray-400">{t("coverageWizard.noHistory")}</p>
                ) : (
                  <>
                    {lastVoucher && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">{t("coverageWizard.lastVoucher")}</p>
                          <p className="text-sm font-semibold text-blue-700">{lastVoucher.reference}</p>
                          <p className="text-xs text-gray-400">{fmtDate(lastVoucher.request_date)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">{t("coverageWizard.last3Months")}</p>
                          <p className="text-lg font-bold text-purple-700">{last3Months.length}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">{t("coverageWizard.approved")}</p>
                          <p className="text-lg font-bold text-green-700">{approvedCount}</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">{t("coverageWizard.consumed")}</p>
                          <p className="text-lg font-bold text-orange-700">{consumedCount}</p>
                        </div>
                      </div>
                    )}

                    <Table
                      dataSource={vouchers.slice(0, 10)}
                      columns={voucherColumns as any}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      className="border rounded-lg"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {current === 2 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p><strong>{t("coverageWizard.summaryCategory")}</strong> {selectedCategory ? `${selectedCategory.emoji} ${selectedCategory.label}` : category}</p>
              <p><strong>{t("coverageWizard.summaryPartner")}</strong> {selectedPartner?.name ?? partnerId}</p>
              {selectedPartner?.city && <p className="text-gray-500 text-xs">{selectedPartner.city}</p>}
              <p><strong>{t("coverageWizard.summaryEmployee")}</strong> {employees.find((e: any) => e.id === employeeId)?.full_name}</p>
              {beneficiaryType === "dependent" && beneficiaryId && (
                <p><strong>{t("coverageWizard.summaryDependent")}</strong> {beneficiaries.find((b: any) => b.id === beneficiaryId)?.full_name}</p>
              )}
              <p><strong>{t("coverageWizard.coverageDate")}</strong> {coverageDate}</p>
              {observation && <p><strong>{t("coverageWizard.observation")}</strong> {observation}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("coverageWizard.coverageDateRequired")}</label>
              <DatePicker className="w-full" size="large" format="YYYY-MM-DD"
                onChange={(d) => setCoverageDate(d?.format("YYYY-MM-DD") || "")} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("coverageWizard.observation")}</label>
              <TextArea rows={3} value={observation} onChange={(e) => setObservation(e.target.value)} />
            </div>
          </div>
        )}

        {current === 3 && (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("coverageWizard.requestCreated")}</h2>
              <p className="text-sm text-gray-500 mt-1">{t("coverageWizard.requestCreatedDesc")}</p>
            </div>
            <div className="flex justify-center gap-3">
              <Button icon={<Printer className="w-4 h-4" />} type="primary" loading={printLoading} onClick={handlePrint}
                style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
                {t("coverageWizard.print")}
              </Button>
              <Button icon={<FileText className="w-4 h-4" />}
                onClick={() => navigate(`/medical-coverage/requests/${createdId}`)}>
                {t("coverageWizard.viewRequest")}
              </Button>
            </div>
            <Button type="link" onClick={() => navigate("/medical-coverage/requests")}>
              {t("common.back")}
            </Button>
          </div>
        )}

        {current < 3 && (
          <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
            <Button disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
              {t("coverageWizard.previous")}
            </Button>
            {current < 2 ? (
              <Button type="primary" disabled={!canNext()} onClick={() => setCurrent(c => c + 1)}
                style={canNext() ? { background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" } : {}}>
                {t("coverageWizard.next")}
              </Button>
            ) : (
              <Button type="primary" loading={createMut.isPending} onClick={handleFinish}
                icon={<Save className="w-4 h-4" />}
                style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
                {t("coverageWizard.create")}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
