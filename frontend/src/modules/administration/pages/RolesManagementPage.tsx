import { useEffect, useState, useCallback } from "react";
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Switch, Tag, Space, Popconfirm, message,
  Collapse, Checkbox, Badge, Spin, Tabs,
} from "antd";
import { Shield, Plus, Edit2, Trash2, Lock } from "lucide-react";
import {
  fetchRoles, createRole, updateRole, deleteRole,
  fetchPermissions, fetchRolePermissions,
  assignPermissionToRole, removePermissionFromRole,
} from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

interface Permission {
  id: string; codename: string; name: string; description: string; module: string;
}

interface RoleAssignment {
  id: string; permission: string; permission_codename: string;
}

export function RolesManagementPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  // Permission picker state
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permsLoading, setPermsLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchRoles().then((r) => {
      setRoles(r.results ?? r ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load all permissions once
  useEffect(() => {
    if (allPermissions.length === 0) {
      fetchPermissions({ page_size: 200 }).then((r) => {
        setAllPermissions(r.results ?? r ?? []);
      });
    }
  }, [allPermissions.length]);

  // Load role permissions when editing
  const loadRolePerms = async (roleId: string) => {
    setPermsLoading(true);
    try {
      const r = await fetchRolePermissions({ role: roleId, page_size: 200 });
      const assignments: RoleAssignment[] = r.results ?? r ?? [];
      const map: Record<string, string> = {};
      const selected = new Set<string>();
      for (const a of assignments) {
        map[a.permission_codename] = a.id;
        selected.add(a.permission_codename);
      }
      setRoleAssignments(map);
      setSelectedPerms(selected);
    } finally {
      setPermsLoading(false);
    }
  };

  // Group permissions by module
  const groupedPerms = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});
  const moduleKeys = Object.keys(groupedPerms).sort();

  const handlePermToggle = (codename: string, checked: boolean) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(codename);
      else next.delete(codename);
      return next;
    });
  };

  const handleModuleToggle = (module: string, checked: boolean) => {
    const perms = groupedPerms[module] ?? [];
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (checked) next.add(p.codename);
        else next.delete(p.codename);
      }
      return next;
    });
  };

  const moduleChecked = (module: string) => {
    const perms = groupedPerms[module] ?? [];
    return perms.length > 0 && perms.every((p) => selectedPerms.has(p.codename));
  };

  const moduleIndeterminate = (module: string) => {
    const perms = groupedPerms[module] ?? [];
    const checked = perms.filter((p) => selectedPerms.has(p.codename)).length;
    return checked > 0 && checked < perms.length;
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    let roleId: string;

    if (editing) {
      await updateRole(editing.id, values);
      roleId = editing.id;
      message.success("Rôle mis à jour");
    } else {
      const res = await createRole(values);
      roleId = res?.id ?? res?.data?.id;
      message.success("Rôle créé");
    }

    // Sync permission assignments
    const currentCodenameSet = selectedPerms;

    // Remove deselected
    for (const [codename, assignmentId] of Object.entries(roleAssignments)) {
      if (!currentCodenameSet.has(codename) && assignmentId) {
        try { await removePermissionFromRole(assignmentId); } catch { /* ok */ }
      }
    }

    // Add newly selected
    for (const codename of currentCodenameSet) {
      if (!roleAssignments[codename]) {
        const perm = allPermissions.find((p) => p.codename === codename);
        if (perm) {
          try { await assignPermissionToRole(roleId, perm.id); } catch { /* ok */ }
        }
      }
    }

    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    setSelectedPerms(new Set());
    setRoleAssignments({});
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteRole(id);
    message.success("Rôle désactivé");
    load();
  };

  const openEdit = (role: any) => {
    setEditing(role);
    form.setFieldsValue(role);
    setSelectedPerms(new Set());
    setRoleAssignments({});
    if (role.id) loadRolePerms(role.id);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setSelectedPerms(new Set());
    setRoleAssignments({});
    setModalOpen(true);
  };

  const columns = [
    { title: "Nom", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug", render: (s: string) => <Tag>{s}</Tag> },
    { title: "Ordre", dataIndex: "rank", key: "rank", width: 70 },
    {
      title: "Permissions", key: "perms", width: 100,
      render: (_: any, r: any) => <Tag>{r.permission_count ?? 0}</Tag>,
    },
    {
      title: "Système", dataIndex: "is_system", key: "is_system", width: 80,
      render: (v: boolean) => v ? <Tag color="blue">Oui</Tag> : <Tag>Non</Tag>,
    },
    {
      title: "Actif", dataIndex: "is_active", key: "is_active", width: 70,
      render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag color="red">Non</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 120,
      render: (_: any, record: any) => (
        <Space>
          <RoleGuard permission="admin.manage_roles">
            <Button size="small" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(record)} />
          </RoleGuard>
          {!record.is_system && (
            <RoleGuard permission="admin.manage_roles">
              <Popconfirm title="Désactiver ce rôle ?" onConfirm={() => handleDelete(record.id)}>
                <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
              </Popconfirm>
            </RoleGuard>
          )}
        </Space>
      ),
    },
  ];

  const permissionPanel = (
    <Spin spinning={permsLoading}>
      {moduleKeys.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">Aucune permission disponible</p>
      ) : (
        <Collapse ghost size="small" defaultActiveKey={moduleKeys}>
          {moduleKeys.map((mod) => {
            const perms = groupedPerms[mod];
            return (
              <Collapse.Panel
                key={mod}
                header={
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={moduleChecked(mod)}
                      indeterminate={moduleIndeterminate(mod)}
                      onChange={(e) => handleModuleToggle(mod, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium capitalize">{mod}</span>
                    <Badge count={perms.length} style={{ backgroundColor: "#8c8c8c" }} />
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6">
                  {perms.map((p) => (
                    <Checkbox
                      key={p.id}
                      checked={selectedPerms.has(p.codename)}
                      onChange={(e) => handlePermToggle(p.codename, e.target.checked)}
                    >
                      <div>
                        <span className="text-sm">{p.name}</span>
                        <br />
                        <code className="text-xs text-gray-400">{p.codename}</code>
                      </div>
                    </Checkbox>
                  ))}
                </div>
              </Collapse.Panel>
            );
          })}
        </Collapse>
      )}
    </Spin>
  );

  const tabItems = [
    {
      key: "info",
      label: "Informations",
      children: (
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}
            tooltip="Identifiant unique utilisé dans le code">
            <Input disabled={editing?.is_system} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="flex gap-4">
            <Form.Item name="rank" label="Ordre d'affichage">
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="is_active" label="Actif" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      ),
    },
    {
      key: "permissions",
      label: (
        <span>
          Permissions
          {selectedPerms.size > 0 && (
            <Tag className="ml-1.5" style={{ fontSize: 11, lineHeight: "18px", padding: "0 6px" }}>
              {selectedPerms.size}
            </Tag>
          )}
        </span>
      ),
      children: permissionPanel,
      disabled: !editing,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gestion des Rôles</h1>
            <p className="text-sm text-gray-500">Créer et gérer les rôles avec leurs permissions</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_roles">
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Nouveau rôle
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <Table dataSource={roles} columns={columns} rowKey="id" loading={loading}
          pagination={false} size="middle" />
      </Card>

      <Modal
        title={editing ? "Modifier le rôle" : "Nouveau rôle"}
        open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }}
        width={680}
        okText={editing ? "Enregistrer" : "Créer"}
      >
        <Tabs items={tabItems} />
      </Modal>
    </div>
  );
}
