import { useEffect, useState } from "react";
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm, message,
  Tabs, InputNumber, Switch, ColorPicker, Tooltip, Alert,
} from "antd";
import { Workflow, Plus, Trash2, Pencil, Settings2, GitBranch } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  fetchWorkflowModels,
  fetchWorkflowStates, createWorkflowState, updateWorkflowState, deleteWorkflowState,
  fetchWorkflowTransitions, createWorkflowTransition, updateWorkflowTransition, deleteWorkflowTransition,
  addRoleToTransition, removeRoleFromTransition,
  fetchRoles,
} from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

export function WorkflowDesignerPage() {
  const { t } = useTranslation();
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [states, setStates] = useState<any[]>([]);
  const [transitions, setTransitions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<any>(null);
  const [editingTransition, setEditingTransition] = useState<any>(null);
  const [stateForm] = Form.useForm();
  const [transitionForm] = Form.useForm();

  const modelKey = selectedModel
    ? `${selectedModel.split(".")[0]}.${selectedModel.split(".")[1]}`
    : "";

  const loadRoles = () =>
    fetchRoles({ page_size: 50 }).then((r) => setRoles(r.results ?? []));

  const loadStates = () => {
    if (!modelKey) return Promise.resolve();
    return fetchWorkflowStates({ app_label: modelKey.split(".")[0], model_name: modelKey.split(".")[1], page_size: 200 })
      .then((r) => setStates(r.results ?? []));
  };

  const loadTransitions = () => {
    if (!modelKey) return Promise.resolve();
    return fetchWorkflowTransitions({ app_label: modelKey.split(".")[0], model_name: modelKey.split(".")[1], page_size: 200 })
      .then((r) => setTransitions(r.results ?? []));
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([loadStates(), loadTransitions()])
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWorkflowModels().then((r) => setModels(r ?? []));
    loadRoles();
  }, []);

  useEffect(() => {
    if (modelKey) loadAll();
    else { setStates([]); setTransitions([]); setLoading(false); }
  }, [selectedModel]);

  // ── State CRUD ──

  const handleStateSave = async () => {
    const values = await stateForm.validateFields();
    const data = {
      ...values,
      color: typeof values.color === "string" ? values.color : values.color?.toHexString(),
      app_label: modelKey.split(".")[0],
      model_name: modelKey.split(".")[1],
    };
    if (editingState) {
      await updateWorkflowState(editingState.id, data);
      message.success("État mis à jour");
    } else {
      await createWorkflowState(data);
      message.success("État créé");
    }
    setStateModalOpen(false);
    stateForm.resetFields();
    setEditingState(null);
    loadAll();
  };

  const handleStateEdit = (record: any) => {
    setEditingState(record);
    stateForm.setFieldsValue({
      ...record,
      color: record.color || "#1677ff",
    });
    setStateModalOpen(true);
  };

  const handleStateDelete = async (id: string) => {
    await deleteWorkflowState(id);
    message.success("État supprimé");
    loadAll();
  };

  // ── Transition CRUD ──

  const handleTransitionSave = async () => {
    const values = await transitionForm.validateFields();
    const data = {
      ...values,
      app_label: modelKey.split(".")[0],
      model_name: modelKey.split(".")[1],
    };
    if (editingTransition) {
      await updateWorkflowTransition(editingTransition.id, data);
      message.success("Transition mise à jour");
    } else {
      await createWorkflowTransition(data);
      message.success("Transition créée");
    }
    setTransitionModalOpen(false);
    transitionForm.resetFields();
    setEditingTransition(null);
    loadAll();
  };

  const handleTransitionEdit = (record: any) => {
    setEditingTransition(record);
    transitionForm.setFieldsValue({
      ...record,
      roles: record.roles?.map((r: any) => r.id ?? r) ?? [],
    });
    setTransitionModalOpen(true);
  };

  const handleTransitionDelete = async (id: string) => {
    await deleteWorkflowTransition(id);
    message.success("Transition supprimée");
    loadAll();
  };

  const stateColumns = [
    { title: "Nom technique", dataIndex: "name", key: "name", width: 180,
      render: (v: string, r: any) => (
        <Space>
          <div className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: r.color || "#1677ff" }} />
          <Tag>{v}</Tag>
        </Space>
      ),
    },
    { title: "Libellé FR", dataIndex: "label_fr", key: "label_fr" },
    { title: "Libellé AR", dataIndex: "label_ar", key: "label_ar" },
    { title: "Initial", dataIndex: "is_initial", key: "is_initial",
      render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag>,
    },
    { title: "Final", dataIndex: "is_final", key: "is_final",
      render: (v: boolean) => v ? <Tag color="red">Oui</Tag> : <Tag>Non</Tag>,
    },
    { title: "Couleur", dataIndex: "color", key: "color", width: 100,
      render: (v: string) => v ? <div className="w-6 h-6 rounded border" style={{ backgroundColor: v }} /> : "-",
    },
    { title: "Ordre", dataIndex: "order", key: "order", width: 70 },
    {
      title: "Actions", key: "actions", width: 120,
      render: (_: any, record: any) => (
        <Space>
          <RoleGuard permission="admin.manage_workflow">
            <Tooltip title="Modifier">
              <Button size="small" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => handleStateEdit(record)} />
            </Tooltip>
          </RoleGuard>
          <RoleGuard permission="admin.manage_workflow">
            <Popconfirm title="Supprimer cet état ?" onConfirm={() => handleStateDelete(record.id)}>
              <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} />
            </Popconfirm>
          </RoleGuard>
        </Space>
      ),
    },
  ];

  const transitionColumns = [
    { title: "Nom technique", dataIndex: "name", key: "name", width: 180,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: "Libellé FR", dataIndex: "label_fr", key: "label_fr" },
    { title: "Libellé AR", dataIndex: "label_ar", key: "label_ar" },
    { title: "De", dataIndex: "from_state", key: "from_state", width: 140,
      render: (v: string, r: any) => (
        <Tag color={r.from_state_color || "orange"}>{v}</Tag>
      ),
    },
    { title: "Vers", dataIndex: "to_state", key: "to_state", width: 140,
      render: (v: string, r: any) => (
        <Tag color={r.to_state_color || "green"}>{v}</Tag>
      ),
    },
    { title: "Raison requise", dataIndex: "requires_reason", key: "requires_reason", width: 130,
      render: (v: boolean) => v ? <Tag color="orange">Oui</Tag> : <Tag>Non</Tag>,
    },
    { title: "Sévérité", dataIndex: "severity", key: "severity", width: 100,
      render: (v: string) => {
        const colors: Record<string, string> = { info: "blue", warning: "orange", critical: "red" };
        return <Tag color={colors[v] || "default"}>{v}</Tag>;
      },
    },
    { title: "Rôles", dataIndex: "roles", key: "roles", width: 200,
      render: (roles: any[]) => (
        <Space wrap size={2}>
          {roles?.map((r: any) => (
            <Tag key={r.id ?? r} color="blue">{r.name ?? r.slug ?? r}</Tag>
          )) ?? "-"}
        </Space>
      ),
    },
    {
      title: "Actions", key: "actions", width: 120,
      render: (_: any, record: any) => (
        <Space>
          <RoleGuard permission="admin.manage_workflow">
            <Tooltip title="Modifier">
              <Button size="small" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => handleTransitionEdit(record)} />
            </Tooltip>
          </RoleGuard>
          <RoleGuard permission="admin.manage_workflow">
            <Popconfirm title="Supprimer cette transition ?" onConfirm={() => handleTransitionDelete(record.id)}>
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
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Concepteur de workflow</h1>
            <p className="text-sm text-gray-500">Configurer les états et transitions dynamiques</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-4 max-w-sm">
          <Select
            className="w-full"
            placeholder="Sélectionner un modèle de workflow"
            value={selectedModel || undefined}
            onChange={setSelectedModel}
            options={models.map((m: any) => ({
              value: `${m.app_label}.${m.model_name}`,
              label: `${m.app_label} — ${m.model_name}`,
            }))}
          />
        </div>

        {!modelKey && (
          <Alert message="Sélectionnez un modèle de workflow pour commencer" type="info" showIcon />
        )}

        {modelKey && (
          <Tabs
            items={[
              {
                key: "states",
                label: (
                  <Space>
                    <Settings2 className="w-4 h-4" />
                    États ({states.length})
                  </Space>
                ),
                children: (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <RoleGuard permission="admin.manage_workflow">
                        <Button type="primary" icon={<Plus className="w-4 h-4" />}
                          onClick={() => { setEditingState(null); stateForm.resetFields(); setStateModalOpen(true); }}>
                          Nouvel état
                        </Button>
                      </RoleGuard>
                    </div>
                    <Table dataSource={states} columns={stateColumns} rowKey="id"
                      loading={loading} pagination={{ pageSize: 50 }} size="middle" />
                  </div>
                ),
              },
              {
                key: "transitions",
                label: (
                  <Space>
                    <GitBranch className="w-4 h-4" />
                    Transitions ({transitions.length})
                  </Space>
                ),
                children: (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <RoleGuard permission="admin.manage_workflow">
                        <Button type="primary" icon={<Plus className="w-4 h-4" />}
                          onClick={() => { setEditingTransition(null); transitionForm.resetFields(); setTransitionModalOpen(true); }}>
                          Nouvelle transition
                        </Button>
                      </RoleGuard>
                    </div>
                    <Table dataSource={transitions} columns={transitionColumns} rowKey="id"
                      loading={loading} pagination={{ pageSize: 50 }} size="middle" />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* State Modal */}
      <Modal title={editingState ? "Modifier l'état" : "Nouvel état"} open={stateModalOpen}
        onOk={handleStateSave} onCancel={() => { setStateModalOpen(false); stateForm.resetFields(); setEditingState(null); }}
        width={520}>
        <Form form={stateForm} layout="vertical">
          <Form.Item name="name" label="Nom technique" rules={[{ required: true, message: "Requis" }]}
            tooltip="Identifiant unique (ex: pending_approval)">
            <Input placeholder="ex: pending_approval" disabled={!!editingState} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="label_fr" label="Libellé FR" rules={[{ required: true }]}>
              <Input placeholder="En attente d'approbation" />
            </Form.Item>
            <Form.Item name="label_ar" label="Libellé AR" rules={[{ required: true }]}>
              <Input placeholder="في انتظار الموافقة" />
            </Form.Item>
          </div>
          <Form.Item name="color" label="Couleur" initialValue="#1677ff">
            <ColorPicker />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="is_initial" label="État initial" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_final" label="État final" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item name="order" label="Ordre d'affichage" tooltip="Ordre de tri dans la timeline">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transition Modal */}
      <Modal title={editingTransition ? "Modifier la transition" : "Nouvelle transition"} open={transitionModalOpen}
        onOk={handleTransitionSave}
        onCancel={() => { setTransitionModalOpen(false); transitionForm.resetFields(); setEditingTransition(null); }}
        width={520}>
        <Form form={transitionForm} layout="vertical">
          <Form.Item name="name" label="Nom technique" rules={[{ required: true }]}
            tooltip="Identifiant unique (ex: submit_for_approval)">
            <Input placeholder="ex: submit_for_approval" disabled={!!editingTransition} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="label_fr" label="Libellé FR" rules={[{ required: true }]}>
              <Input placeholder="Soumettre pour approbation" />
            </Form.Item>
            <Form.Item name="label_ar" label="Libellé AR" rules={[{ required: true }]}>
              <Input placeholder="تقديم للموافقة" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="from_state" label="État source" rules={[{ required: true }]}>
              <Select placeholder="Sélectionner un état"
                options={states.map((s) => ({ value: s.name, label: `${s.name} (${s.label_fr})` }))} />
            </Form.Item>
            <Form.Item name="to_state" label="État destination" rules={[{ required: true }]}>
              <Select placeholder="Sélectionner un état"
                options={states.map((s) => ({ value: s.name, label: `${s.name} (${s.label_fr})` }))} />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="requires_reason" label="Raison obligatoire" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="severity" label="Sévérité" initialValue="info">
              <Select options={[
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "critical", label: "Critical" },
              ]} />
            </Form.Item>
          </div>
          <Form.Item name="roles" label="Rôles autorisés">
            <Select mode="multiple" placeholder="Sélectionner les rôles"
              options={roles.map((r: any) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
