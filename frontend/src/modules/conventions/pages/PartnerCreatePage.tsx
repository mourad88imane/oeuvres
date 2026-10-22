import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, Form, Input, Select, Button, Card, message } from "antd";
import { ArrowLeft, Save, User, Phone, FileText } from "lucide-react";
import { useCreatePartner } from "../api";

const { TextArea } = Input;
const { Option } = Select;

const PARTNER_CATEGORIES = [
  { value: "medical_analysis_lab", label: "Medical Analysis Laboratory" },
  { value: "medical_center", label: "Medical Center" },
  { value: "medical_imaging_center", label: "Medical Imaging Center" },
];

export function PartnerCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("required");
  const createMut = useCreatePartner();

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createMut.mutateAsync(values as any);
      message.success(t("conventions.partnerCreated"));
      navigate("/conventions/partners");
    } catch {
      // handled by form
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/conventions/partners")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("conventions.back")}
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("conventions.newPartner")}</h1>
            <p className="text-sm text-gray-500">{t("conventions.createPartnerDesc")}</p>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ is_active: true }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large"
            items={[
              {
                key: "required",
                label: <span className="flex items-center gap-2"><User className="w-4 h-4" />{t("conventions.tabRequired")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="name" label={t("conventions.partnerName")}
                      rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("conventions.namePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="category" label={t("conventions.partnerCategory")}
                      rules={[{ required: true, message: t("validation.required") }]}>
                      <Select placeholder={t("conventions.selectCategory")}>
                        {PARTNER_CATEGORIES.map(c => (
                          <Option key={c.value} value={c.value}>{c.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="type" label={t("conventions.partnerType")}>
                      <Select placeholder={t("conventions.selectType")} allowClear>
                        <Option value="lab">Laboratoire d'analyses</Option>
                        <Option value="clinic">Clinique</Option>
                        <Option value="hospital">Établissement hospitalier</Option>
                        <Option value="imaging_center">Centre d'imagerie</Option>
                        <Option value="medical_center">Centre médical</Option>
                        <Option value="pharmacy">Pharmacie</Option>
                        <Option value="other">Autre</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="is_active" label={t("common.status")}>
                      <Select>
                        <Option value={true}>{t("conventions.active")}</Option>
                        <Option value={false}>{t("conventions.inactive")}</Option>
                      </Select>
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "contact",
                label: <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{t("conventions.tabContact")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="address" label={t("conventions.address")}>
                      <TextArea rows={2} />
                    </Form.Item>
                    <div />
                    <Form.Item name="phone" label={t("conventions.phone")}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="contact_phone" label={t("conventions.mobile")}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="email" label={t("conventions.email")}>
                      <Input type="email" />
                    </Form.Item>
                    <Form.Item name="website" label={t("conventions.website")}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="contact_name" label={t("conventions.contactPerson")}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="contact_email" label={t("conventions.contactEmail")}>
                      <Input type="email" />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "additional",
                label: <span className="flex items-center gap-2"><FileText className="w-4 h-4" />{t("conventions.tabAdditional")}</span>,
                children: (
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    <Form.Item name="description" label={t("conventions.description")}>
                      <TextArea rows={4} />
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
            <Button onClick={() => navigate("/conventions/partners")}>{t("common.cancel")}</Button>
            <Button type="primary" htmlType="submit" loading={createMut.isPending}
              icon={<Save className="w-4 h-4" />}
              style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
              {t("conventions.save")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
