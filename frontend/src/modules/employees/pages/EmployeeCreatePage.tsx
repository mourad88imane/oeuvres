import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, Form, Input, Select, DatePicker, Button, Card, message } from "antd";
import { ArrowLeft, Save, User, Briefcase, FileText } from "lucide-react";
import { useCreateEmployee, useDepartments } from "../hooks/useEmployees";

const { TextArea } = Input;

export function EmployeeCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState("required");
  const createMut = useCreateEmployee();
  const { data: deptData } = useDepartments();
  const departments = deptData?.results ?? [];

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      await createMut.mutateAsync({
        ...values,
        date_of_birth: values.date_of_birth?.format("YYYY-MM-DD"),
        date_hired: values.date_hired?.format("YYYY-MM-DD"),
      });
      message.success(t("employees.created"));
      navigate("/employees");
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const fieldErrors: Record<string, string[]> = err.response.data.errors;
        Object.entries(fieldErrors).forEach(([field, msgs]) => {
          form.setFields([{ name: field, errors: msgs }]);
        });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/employees")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("employees.back")}
        </button>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("employees.newEmployee")}</h1>
            <p className="text-sm text-gray-500">{t("employees.createNewRecord")}</p>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={onSubmit}>

          <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" size="large"
            items={[
              {
                key: "required",
                label: <span className="flex items-center gap-2"><User className="w-4 h-4" />{t("employees.tabRequired")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="last_name" label={t("employees.lastName")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("employees.lastNamePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="first_name" label={t("employees.firstName")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("employees.firstNamePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="last_name_ar" label={t("employees.lastNameAr")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("employees.lastNameArPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="first_name_ar" label={t("employees.firstNameAr")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("employees.firstNameArPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="gender" label={t("employees.gender")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Select placeholder={t("employees.selectGender")}>
                        <Select.Option value="M">{t("employees.male")}</Select.Option>
                        <Select.Option value="F">{t("employees.female")}</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="date_of_birth" label={t("employees.dateOfBirth")} rules={[{ required: true, message: t("validation.required") }]}>
                      <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="marital_status" label={t("employees.maritalStatus")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Select placeholder={t("employees.selectMaritalStatus")}>
                        <Select.Option value="single">{t("employees.single")}</Select.Option>
                        <Select.Option value="married">{t("employees.married")}</Select.Option>
                        <Select.Option value="divorced">{t("employees.divorced")}</Select.Option>
                        <Select.Option value="widowed">{t("employees.widowed")}</Select.Option>
                      </Select>
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "professional",
                label: <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" />{t("employees.tabProfessional")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="matricule" label={t("employees.matricule")}>
                      <Input placeholder={t("employees.matriculePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="department" label={t("employees.department")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Select placeholder={t("employees.selectDepartment")} allowClear showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }>
                        {departments.map((d: { id: string; name: string; code: string }) => (
                          <Select.Option key={d.id} value={d.id} label={`${d.code} - ${d.name}`}>
                            {d.code} - {d.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="service" label={t("employees.service")}>
                      <Input placeholder={t("employees.servicePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="job_title" label={t("employees.jobTitle")} rules={[{ required: true, message: t("validation.required") }]}>
                      <Input placeholder={t("employees.jobTitlePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="grade" label={t("employees.grade")}>
                      <Input placeholder={t("employees.gradePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="date_hired" label={t("employees.dateHired")} rules={[{ required: true, message: t("validation.required") }]}>
                      <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="phone" label={t("employees.phone")}>
                      <Input placeholder={t("employees.phonePlaceholder")} />
                    </Form.Item>
                    <Form.Item name="email_professional" label={t("employees.emailProfessional")}>
                      <Input type="email" placeholder={t("employees.emailPlaceholder")} />
                    </Form.Item>
                  </div>
                ),
              },
              {
                key: "administrative",
                label: <span className="flex items-center gap-2"><FileText className="w-4 h-4" />{t("employees.tabAdministrative")}</span>,
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <Form.Item name="address" label={t("employees.address")}>
                      <TextArea rows={2} placeholder={t("employees.addressPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="wilaya" label={t("employees.wilaya")}>
                      <Input placeholder={t("employees.wilayaPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="city" label={t("employees.city")}>
                      <Input placeholder={t("employees.cityPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="national_id" label={t("employees.nationalId")}>
                      <Input placeholder={t("employees.nationalIdPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="social_security_number" label={t("employees.socialSecurityNumber")}>
                      <Input placeholder={t("employees.ssnPlaceholder")} />
                    </Form.Item>
                    <Form.Item name="notes" label={t("employees.notes")}>
                      <TextArea rows={2} placeholder={t("employees.notesPlaceholder")} />
                    </Form.Item>
                  </div>
                ),
              },
            ]}
          />

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
            <Button onClick={() => navigate("/employees")}>
              {t("common.cancel")}
            </Button>
            <Button type="primary" htmlType="submit" loading={createMut.isPending}
              icon={<Save className="w-4 h-4" />}
              style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
              {t("employees.save")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
