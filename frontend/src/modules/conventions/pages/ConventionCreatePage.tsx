import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, Form, Input, Select, DatePicker, Button, Card, message, Upload } from "antd";
import { ArrowLeft, Save, FileText, ClipboardList, User } from "lucide-react";
import { useCreateConvention, usePartners } from "../api";

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

const COVERED_SERVICES = [
  { value: "consultation", label: "Consultation médicale" },
  { value: "specialized_consultation", label: "Consultation spécialisée" },
  { value: "analysis", label: "Analyses médicales" },
  { value: "imaging", label: "Imagerie médicale" },
  { value: "radiology", label: "Radiologie" },
  { value: "ultrasound", label: "Échographie" },
  { value: "mri", label: "IRM" },
  { value: "scanner", label: "Scanner" },
  { value: "hospitalization", label: "Hospitalisation" },
  { value: "surgery", label: "Chirurgie" },
  { value: "dental", label: "Soins dentaires" },
  { value: "ophthalmology", label: "Ophtalmologie" },
  { value: "physiotherapy", label: "Kinésithérapie" },
  { value: "pharmacy", label: "Pharmacie" },
  { value: "prosthesis", label: "Prothèses et appareillage" },
  { value: "other", label: "Autres prestations" },
];

export function ConventionCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("required");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const createMut = useCreateConvention();
  const { data: partnersData } = usePartners({ is_active: "true", page_size: "200" });
  const partners = partnersData?.results ?? [];

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        start_date: values.start_date?.format("YYYY-MM-DD"),
        end_date: values.end_date?.format("YYYY-MM-DD"),
        signed_date: values.signed_date?.format("YYYY-MM-DD"),
        amount: values.amount ? Number(values.amount) : null,
      };
      await createMut.mutateAsync(payload as never);
      message.success(t("conventions.created"));
      navigate("/conventions");
    } catch {
      // handled by form
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/conventions")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("conventions.back")}
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("conventions.createTitle")}</h1>
            <p className="text-sm text-gray-500">{t("conventions.createDesc")}</p>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large"
            items={[
              {
                key: "required",
                label: <span className="flex items-center gap-2"><User className="w-4 h-4" />{t("conventions.tabRequired")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="partner" label={t("conventions.partner")}
                      rules={[{ required: true, message: t("validation.required") }]}>
                      <Select showSearch placeholder={t("conventions.selectPartner")}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }>
                        {partners.map((p: any) => (
                          <Option key={p.id} value={p.id} label={`[${p.code}] ${p.name}`}>
                            [{p.code}] {p.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <div />
                    <Form.Item name="title" label={t("conventions.title")}
                      rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("conventions.exTitle")} />
                    </Form.Item>
                    <div />
                    <Form.Item name="start_date" label={t("conventions.startDate")}
                      rules={[{ required: true, message: t("validation.required") }]}>
                      <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="end_date" label={t("conventions.endDate")}
                      rules={[{ required: true, message: t("validation.required") }]}>
                      <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "details",
                label: <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" />{t("conventions.tabDetails")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="description" label={t("conventions.description")}>
                      <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="covered_services" label={t("conventions.coveredServices")}>
                      <Select mode="multiple" placeholder={t("conventions.selectCoveredServices")}
                        allowClear maxTagCount={4}>
                        {COVERED_SERVICES.map(s => (
                          <Option key={s.value} value={s.value}>{s.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="signed_date" label={t("conventions.signedDate")}>
                      <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="reference" label={t("conventions.referenceNumber")}>
                      <Input placeholder={t("conventions.referencePlaceholder")} />
                    </Form.Item>
                    <Form.Item label={t("conventions.pdfDocument")}>
                      <Dragger beforeUpload={(file) => { setPdfFile(file); return false; }}
                        accept=".pdf" maxCount={1}>
                        <p className="text-sm">{pdfFile ? pdfFile.name : t("conventions.uploadPdf")}</p>
                      </Dragger>
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "followup",
                label: <span className="flex items-center gap-2"><FileText className="w-4 h-4" />{t("conventions.tabFollowup")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="status" label={t("conventions.status")}>
                      <Select placeholder={t("conventions.selectStatus")} allowClear>
                        <Option value="draft">{t("conventions.draft")}</Option>
                        <Option value="active">{t("conventions.active")}</Option>
                        <Option value="suspended">{t("conventions.suspended")}</Option>
                        <Option value="expired">{t("conventions.expired")}</Option>
                      </Select>
                    </Form.Item>
                    <div />
                    <Form.Item name="renewal_mode" label={t("conventions.renewalMode")}>
                      <Select>
                        <Option value="manual">{t("conventions.expressRenewal")}</Option>
                        <Option value="auto">{t("conventions.tacitRenewal")}</Option>
                        <Option value="none">{t("conventions.nonRenewable")}</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="notes" label={t("conventions.notes")}>
                      <TextArea rows={3} />
                    </Form.Item>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
            <Button onClick={() => navigate("/conventions")}>{t("common.cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={createMut.isPending}
              icon={<Save className="w-4 h-4" />}
              style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
              {t("conventions.createConvention")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
