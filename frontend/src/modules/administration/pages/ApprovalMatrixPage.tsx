import { useEffect, useState } from "react";
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, Tag, Space, Popconfirm, message,
} from "antd";
import { GitMerge, Plus, Edit2, Trash2 } from "lucide-react";
import { fetchApprovalMatrix, createApprovalMatrixEntry, updateApprovalMatrixEntry, deleteApprovalMatrixEntry } from "../api";
import { fetchRoles } from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

const MODULES = ["loans", "medical_coverage", "benefits", "conventions", "finance"];

export function ApprovalMatrixPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchApprovalMatrix({ page_size: 100 }),
      fetchRoles({ page_size: 50 }),
    ]).then(([r, rr]) => {
      setEntries(r.results ?? []);
      setRoles(rr.results ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateApprovalMatrixEntry(editing.id, values);
      message.success("Règle mise à jour");
    } else {
      await createApprovalMatrixEntry(values);
      message.success("Règle créée");
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteApprovalMatrixEntry(id);
    message.success("Règle supprimée");
    load();
  };

  const openEdit = (entry: any) => {
    setEditing(entry);
    form.setFieldsValue({
      ...entry,
      required_roles: entry.required_roles ?? [],
    });
    setModalOpen(true);
  };

  const columns = [
    { title: "Module", dataIndex: "module", key: "module", render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: "Min (DZD)", dataIndex: "min_amount", key: "min_amount", render: (v: number | null) => v ?? "—" },
    { title: "Max (DZD)", dataIndex: "max_amount", key: "max_amount", render: (v: number | null) => v ?? "—" },
    {
      title: "Niveau", dataIndex: "approval_level", key: "approval_level", width: 90,
      render: (v: number) => <Tag color={v >= 3 ? "red" : v === 2 ? "orange" : "green"}>{v}</Tag>,
    },
    {
      title: "Rôles requis", dataIndex: "required_role_names", key: "required_role_names",
      render: (v: string[]) => v?.map((r) => <Tag key={r}>{r}</Tag>) ?? "—",
    },
    {
      title: "Actif", dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag color="red">Non</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 120,
      render: (_: any, record: any) => (
        <Space>
          <RoleGuard permission="admin.manage_approval_matrix">
            <Button size="small" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(record)} />
          </RoleGuard>
          <RoleGuard permission="admin.manage_approval_matrix">
            <Popconfirm title="Supprimer cette règle ?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
            </Popconfirm>
          </RoleGuard>
        </Space>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Matrice d'approbation</h1>
            <p className="text-sm text-gray-500">Seuils d'escalade par module et montant</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_approval_matrix">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
            Nouvelle règle
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <Table dataSource={entries} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 50 }} size="middle" />
      </Card>

      <Modal
        title={editing ? "Modifier la règle" : "Nouvelle règle"}
        open={modalOpen} onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="module" label="Module" rules={[{ required: true }]}>
            <Select options={MODULES.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item name="min_amount" label="Montant min (DZD)">
              <InputNumber min={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="max_amount" label="Montant max (DZD)">
              <InputNumber min={0} style={{ width: 180 }} />
            </Form.Item>
          </div>
          <Form.Item name="approval_level" label="Niveau d'approbation" rules={[{ required: true }]}
            tooltip="1 = Manager, 2 = Directeur, 3 = Commission">
            <InputNumber min={1} max={3} />
          </Form.Item>
          <Form.Item name="required_roles" label="Rôles requis">
            <Select mode="multiple" options={roles.map((r: any) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="is_active" label="Actif" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
