import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Modal, Form, Input, InputNumber, Switch, Table, Space, Popconfirm, message } from "antd";
import { Plus, Edit2, Trash2, Layers } from "lucide-react";
import { fetchGrades, createGrade, updateGrade, deleteGrade, type GradeItem } from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

export function GradesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<GradeItem | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGrades({ page_size: 200 });
      setItems(data.results ?? data ?? []);
    } catch { message.error(t("grades.loadError")); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (item: GradeItem | null = null) => {
    setEditItem(item);
    if (item) form.setFieldsValue(item);
    else form.resetFields();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editItem) await updateGrade(editItem.id, values);
      else await createGrade(values);
      message.success(editItem ? t("grades.updated") : t("grades.created"));
      setModalOpen(false);
      load();
    } catch { /* validation */ }
  };

  const handleDelete = async (id: string) => {
    try { await deleteGrade(id); message.success(t("grades.deleted")); load(); }
    catch { message.error(t("grades.deleteError")); }
  };

  const columns = [
    { title: t("grades.name"), dataIndex: "name", key: "name" },
    { title: t("grades.level"), dataIndex: "level", key: "level", width: 100,
      render: (v: number) => <span className="font-medium">{v}</span>,
    },
    { title: t("grades.description"), dataIndex: "description", key: "description", ellipsis: true,
      render: (v: string) => v || "-",
    },
    { title: t("grades.active"), dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => <Switch size="small" checked={v} disabled />,
    },
    { title: t("grades.order"), dataIndex: "ordering", key: "ordering", width: 70 },
    {
      title: t("grades.actions"), key: "actions", width: 100,
      render: (_: any, r: GradeItem) => (
        <Space>
          <RoleGuard permission="admin.manage_system_params">
            <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => openModal(r)} />
          </RoleGuard>
          <RoleGuard permission="admin.manage_system_params">
            <Popconfirm title={t("grades.confirmDelete")} onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
            </Popconfirm>
          </RoleGuard>
        </Space>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("grades.pageTitle")}</h1>
            <p className="text-sm text-gray-500">{t("grades.pageDescription")}</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_system_params">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openModal()}>
            {t("grades.newGrade")}
          </Button>
        </RoleGuard>
      </div>

      <Card loading={loading}>
        <Table dataSource={items} columns={columns} rowKey="id" pagination={false} />
      </Card>

      <Modal title={editItem ? t("grades.modifyLabel") : t("grades.newLabel")} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t("grades.name")} rules={[{ required: true, message: t("grades.required") }]}>
            <Input placeholder={t("grades.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="level" label={t("grades.level")} rules={[{ required: true, message: t("grades.required") }]}>
            <InputNumber min={1} max={20} style={{ width: "100%" }} placeholder={t("grades.levelPlaceholder")} />
          </Form.Item>
          <Form.Item name="description" label={t("grades.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="is_active" label={t("grades.active")} valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="ordering" label={t("grades.order")} initialValue={0}>
              <InputNumber min={0} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
