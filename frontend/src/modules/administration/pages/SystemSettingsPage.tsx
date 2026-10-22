import { useEffect, useState } from "react";
import { Card, Table, Tag, message, Input, Button, Modal } from "antd";
import { Settings, Save } from "lucide-react";
import { fetchSystemParameters, updateSystemParameter } from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

export function SystemSettingsPage() {
  const [params, setParams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchSystemParameters().then((r) => {
      setParams(r.results ?? []);
      setLoading(false);
    });
  }, []);

  const handleSave = async (id: string) => {
    try {
      await updateSystemParameter(id, { value: editValue });
      message.success("Paramètre mis à jour");
      setEditingId(null);
      const r = await fetchSystemParameters();
      setParams(r.results ?? []);
    } catch {
      message.error("Erreur lors de la mise à jour");
    }
  };

  const columns = [
    { title: "Clé", dataIndex: "key", key: "key", render: (k: string) => <code>{k}</code> },
    {
      title: "Valeur", dataIndex: "value", key: "value",
      render: (v: string, record: any) =>
        editingId === record.id ? (
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={() => handleSave(record.id)} style={{ maxWidth: 200 }} />
        ) : (
          <Tag>{v}</Tag>
        ),
    },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Actions", key: "actions",
      render: (_: any, record: any) =>
        editingId === record.id ? (
          <div className="flex gap-2">
            <RoleGuard permission="admin.manage_system_params">
              <Button type="primary" size="small" icon={<Save className="w-3 h-3" />}
                onClick={() => handleSave(record.id)}>Enregistrer</Button>
            </RoleGuard>
            <Button size="small" onClick={() => setEditingId(null)}>Annuler</Button>
          </div>
        ) : (
          <RoleGuard permission="admin.manage_system_params">
            <Button size="small" onClick={() => { setEditingId(record.id); setEditValue(record.value); }}>
              Modifier
            </Button>
          </RoleGuard>
        ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Paramètres Système</h1>
          <p className="text-sm text-gray-500">Configuration des paramètres métier configurables</p>
        </div>
      </div>
      <Card>
        <Table dataSource={params} columns={columns} rowKey="id" loading={loading}
          pagination={false} size="middle" />
      </Card>
    </div>
  );
}
