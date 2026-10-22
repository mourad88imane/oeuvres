import { useEffect, useState } from "react";
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message,
} from "antd";
import { KeyRound, Plus, Edit2, Trash2 } from "lucide-react";
import { fetchPermissions, createPermission, updatePermission, deletePermission } from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

const MODULES = [
  "admin", "employees", "beneficiaries", "benefits", "loans",
  "medical_coverage", "conventions", "finance", "reports", "analytics",
];

export function PermissionsManagementPage() {
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [moduleFilter, setModuleFilter] = useState<string>();

  const load = () => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (moduleFilter) params.module = moduleFilter;
    fetchPermissions(params).then((r) => {
      setPerms(r.results ?? r ?? []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [moduleFilter]);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updatePermission(editing.id, values);
      message.success("Permission mise à jour");
    } else {
      await createPermission(values);
      message.success("Permission créée");
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: string) => {
    await deletePermission(id);
    message.success("Permission supprimée");
    load();
  };

  const openEdit = (perm: any) => {
    setEditing(perm);
    form.setFieldsValue(perm);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: "Code", dataIndex: "codename", key: "codename",
      render: (c: string) => <Tag color="purple">{c}</Tag> },
    { title: "Nom", dataIndex: "name", key: "name" },
    { title: "Module", dataIndex: "module", key: "module",
      render: (m: string) => <Tag color="blue">{m}</Tag> },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Actions", key: "actions", width: 100,
      render: (_: any, record: any) => (
        <Space>
          <RoleGuard permission="admin.manage_permissions">
            <Button size="small" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(record)} />
          </RoleGuard>
          <RoleGuard permission="admin.manage_permissions">
            <Popconfirm title="Supprimer cette permission ?" onConfirm={() => handleDelete(record.id)}>
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
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gestion des Permissions</h1>
            <p className="text-sm text-gray-500">Permissions granulaires par module</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_permissions">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Nouvelle permission
          </Button>
        </RoleGuard>
      </div>

      <div className="flex gap-3">
        <Select
          allowClear placeholder="Filtrer par module"
          style={{ width: 200 }} value={moduleFilter}
          onChange={setModuleFilter}
          options={MODULES.map((m) => ({ value: m, label: m }))}
        />
      </div>

      <Card>
        <Table dataSource={perms} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 50 }} size="middle" />
      </Card>

      <Modal
        title={editing ? "Modifier la permission" : "Nouvelle permission"}
        open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="codename" label="Code" rules={[{ required: true }]}
            tooltip="Identifiant unique au format 'module.action'">
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="module" label="Module" rules={[{ required: true }]}>
            <Select options={MODULES.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
