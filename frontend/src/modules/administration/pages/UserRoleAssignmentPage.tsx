import { useEffect, useState } from "react";
import {
  Card, Table, Button, Modal, Form, Select, Switch, Tag, Space, Popconfirm, message,
} from "antd";
import { UserCog, Plus, Trash2 } from "lucide-react";
import { fetchUserRoleAssignments, assignRoleToUser, removeUserRoleAssignment } from "../api";
import { fetchRoles } from "../api";
import apiClient from "@shared/api/apiClient";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

export function UserRoleAssignmentPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchUserRoleAssignments({ page_size: 200 }),
      fetchRoles({ page_size: 50 }),
      apiClient.get("/users/", { params: { page_size: 200 } }).then((r) => r.data?.results ?? []),
    ]).then(([a, rr, u]) => {
      setAssignments(a.results ?? []);
      setRoles(rr.results ?? []);
      setUsers(u);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    await assignRoleToUser(values);
    message.success("Rôle assigné");
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleDelete = async (id: string) => {
    await removeUserRoleAssignment(id);
    message.success("Assignation supprimée");
    load();
  };

  const columns = [
    {
      title: "Utilisateur", key: "user",
      render: (_: any, r: any) => <span>{r.user_name || r.user_email}</span>,
    },
    { title: "Email", dataIndex: "user_email", key: "user_email" },
    { title: "Rôle", dataIndex: "role_name", key: "role_name", render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: "Actif", dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag color="red">Non</Tag>,
    },
    {
      title: "Expire le", dataIndex: "expires_at", key: "expires_at",
      render: (v: string | null) => v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: any, record: any) => (
        <Popconfirm title="Supprimer cette assignation ?" onConfirm={() => handleDelete(record.id)}>
          <RoleGuard permission="admin.manage_users">
            <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
          </RoleGuard>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Rôles utilisateurs</h1>
            <p className="text-sm text-gray-500">Assignations supplémentaires de rôles</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_users">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            Assigner un rôle
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <Table dataSource={assignments} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 50 }} size="middle" />
      </Card>

      <Modal title="Assigner un rôle" open={modalOpen} onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }} width={480}>
        <Form form={form} layout="vertical">
          <Form.Item name="user" label="Utilisateur" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              getPopupContainer={(node) => node.parentNode}
              labelRender={(props) => <span style={{ color: "#000", fontWeight: 600 }}>{props.label}</span>}
              options={users.map((u: any) => ({ value: u.id, label: `${u.full_name || u.email} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true }]}>
            <Select getPopupContainer={(node) => node.parentNode}
              labelRender={(props) => <span style={{ color: "#000", fontWeight: 600 }}>{props.label}</span>}
              options={roles.map((r: any) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item name="is_active" label="Actif" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
