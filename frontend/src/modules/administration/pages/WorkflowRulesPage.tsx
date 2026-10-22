import { useEffect, useState } from "react";
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message,
} from "antd";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { fetchWorkflowPermissions, createWorkflowPermission, deleteWorkflowPermission } from "../api";
import { fetchRoles } from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

const APP_LABELS = ["loans", "medical_coverage", "benefits", "conventions"];
const MODEL_NAMES = ["loan", "medicalcoveragevoucher", "medicalcoveragerequest", "benefit", "convention"];

export function WorkflowRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchWorkflowPermissions({ page_size: 200 }),
      fetchRoles({ page_size: 50 }),
    ]).then(([r, rr]) => {
      setRules(r.results ?? []);
      setRoles(rr.results ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    await createWorkflowPermission(values);
    message.success("Règle créée");
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteWorkflowPermission(id);
    message.success("Règle supprimée");
    load();
  };

  const columns = [
    { title: "App", dataIndex: "app_label", key: "app_label", render: (v: string) => <Tag>{v}</Tag> },
    { title: "Modèle", dataIndex: "model_name", key: "model_name" },
    { title: "De", dataIndex: "from_state", key: "from_state", render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: "Vers", dataIndex: "to_state", key: "to_state", render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: "Rôle", dataIndex: "role_name", key: "role_name", render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: any, record: any) => (
        <RoleGuard permission="admin.manage_workflow">
          <Popconfirm title="Supprimer cette règle ?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
          </Popconfirm>
        </RoleGuard>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Règles Workflow</h1>
            <p className="text-sm text-gray-500">Configuration des transitions par rôle</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_workflow">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            Nouvelle règle
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <Table dataSource={rules} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 50 }} size="middle" />
      </Card>

      <Modal title="Nouvelle règle" open={modalOpen} onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }} width={480}>
        <Form form={form} layout="vertical">
          <Form.Item name="app_label" label="Application" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner une application"
              options={APP_LABELS.map((a) => ({ value: a, label: a }))} />
          </Form.Item>
          <Form.Item name="model_name" label="Modèle" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un modèle"
              options={MODEL_NAMES.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="from_state" label="État source" rules={[{ required: true }]}
            tooltip="Nom technique de l'état actuel (ex: pending_approval)">
            <Input placeholder="ex: pending_approval" />
          </Form.Item>
          <Form.Item name="to_state" label="État destination" rules={[{ required: true }]}
            tooltip="Nom technique de l'état cible (ex: validated)">
            <Input placeholder="ex: validated" />
          </Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un rôle"
              options={roles.map((r: any) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
