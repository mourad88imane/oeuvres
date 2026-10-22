import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Modal, Form, Input, InputNumber, Switch, Table, Space, Popconfirm, message } from "antd";
import { Plus, Edit2, Trash2, Briefcase } from "lucide-react";
import { fetchFunctions, createFunction, updateFunction, deleteFunction, type FunctionItem } from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

export function FunctionsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<FunctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<FunctionItem | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchFunctions({ page_size: 200 });
      setItems(data.results ?? data ?? []);
    } catch { message.error(t("functions.loadError")); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (item: FunctionItem | null = null) => {
    setEditItem(item);
    if (item) form.setFieldsValue(item);
    else form.resetFields();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editItem) await updateFunction(editItem.id, values);
      else await createFunction(values);
      message.success(editItem ? t("functions.updated") : t("functions.created"));
      setModalOpen(false);
      load();
    } catch { /* validation */ }
  };

  const handleDelete = async (id: string) => {
    try { await deleteFunction(id); message.success(t("functions.deleted")); load(); }
    catch { message.error(t("functions.deleteError")); }
  };

  const columns = [
    { title: t("functions.name"), dataIndex: "name", key: "name" },
    { title: t("functions.description"), dataIndex: "description", key: "description", ellipsis: true,
      render: (v: string) => v || "-",
    },
    { title: t("functions.active"), dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => <Switch size="small" checked={v} disabled />,
    },
    { title: t("functions.order"), dataIndex: "ordering", key: "ordering", width: 70 },
    {
      title: t("functions.actions"), key: "actions", width: 100,
      render: (_: any, r: FunctionItem) => (
        <Space>
          <RoleGuard permission="admin.manage_system_params">
            <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => openModal(r)} />
          </RoleGuard>
          <RoleGuard permission="admin.manage_system_params">
            <Popconfirm title={t("functions.confirmDelete")} onConfirm={() => handleDelete(r.id)}>
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
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("functions.pageTitle")}</h1>
            <p className="text-sm text-gray-500">{t("functions.pageDescription")}</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_system_params">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openModal()}>
            {t("functions.newFunction")}
          </Button>
        </RoleGuard>
      </div>

      <Card loading={loading}>
        <Table dataSource={items} columns={columns} rowKey="id" pagination={false} />
      </Card>

      <Modal title={editItem ? t("functions.modifyLabel") : t("functions.newLabel")} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t("functions.name")} rules={[{ required: true, message: t("functions.required") }]}>
            <Input placeholder={t("functions.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="description" label={t("functions.description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space size="large">
            <Form.Item name="is_active" label={t("functions.active")} valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
            <Form.Item name="ordering" label={t("functions.order")} initialValue={0}>
              <InputNumber min={0} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
