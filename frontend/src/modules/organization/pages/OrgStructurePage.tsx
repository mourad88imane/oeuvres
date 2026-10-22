import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Card, Modal, Form, Input, InputNumber, Switch, Table, Tag, Space, Popconfirm, message, Select,
} from "antd";
import { Plus, Edit2, Trash2, Building2 } from "lucide-react";
import {
  createDirection, updateDirection, deleteDirection,
  createSubDirection, updateSubDirection, deleteSubDirection,
  createService, updateService, deleteService,
  createBureau, updateBureau, deleteBureau,
  fetchOrganizationLookup,
  type DirectionItem, type SubDirectionItem, type ServiceItem, type BureauItem,
} from "../api";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

type Level = "direction" | "sub_direction" | "service" | "bureau";

interface ModalState {
  open: boolean;
  level: Level;
  editItem: any | null;
  parentId: string | null;
}

export function OrgStructurePage() {
  const { t } = useTranslation();
  const [directions, setDirections] = useState<DirectionItem[]>([]);
  const [subDirections, setSubDirections] = useState<SubDirectionItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [bureaux, setBureaux] = useState<BureauItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false, level: "direction", editItem: null, parentId: null });
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOrganizationLookup();
      setDirections(data.directions ?? []);
      setSubDirections(data.sub_directions ?? []);
      setServices(data.services ?? []);
      setBureaux(data.bureaux ?? []);
    } catch { message.error(t("organization.loadError")); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openModal = (level: Level, editItem: any = null, parentId: string | null = null) => {
    setModal({ open: true, level, editItem, parentId });
    if (editItem) {
      form.setFieldsValue(editItem);
    } else {
      form.resetFields();
      if (parentId) form.setFieldValue(
        level === "sub_direction" ? "direction" :
        level === "service" ? "sub_direction" : "service",
        parentId
      );
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const { editItem, level } = modal;
      const clean = { ...values };
      if (level === "direction") {
        if (editItem) await updateDirection(editItem.id, clean);
        else await createDirection(clean);
      } else if (level === "sub_direction") {
        if (editItem) await updateSubDirection(editItem.id, clean);
        else await createSubDirection(clean);
      } else if (level === "service") {
        if (editItem) await updateService(editItem.id, clean);
        else await createService(clean);
      } else if (level === "bureau") {
        if (editItem) await updateBureau(editItem.id, clean);
        else await createBureau(clean);
      }
      message.success(editItem ? t("organization.updated") : t("organization.created"));
      setModal({ ...modal, open: false });
      load();
    } catch { /* validation error */ }
  };

  const handleDelete = async (level: Level, id: string) => {
    try {
      if (level === "direction") await deleteDirection(id);
      else if (level === "sub_direction") await deleteSubDirection(id);
      else if (level === "service") await deleteService(id);
      else if (level === "bureau") await deleteBureau(id);
      message.success(t("organization.deleted"));
      load();
    } catch { message.error(t("organization.deleteError")); }
  };

  const subDirectionsFor = (dirId: string) => subDirections.filter(sd => sd.direction === dirId);
  const servicesFor = (sdId: string) => services.filter(s => s.sub_direction === sdId);
  const bureauxFor = (svcId: string) => bureaux.filter(b => b.service === svcId);

  const columns = (level: Level) => [
    { title: t("organization.code"), dataIndex: "code", key: "code", width: 100 },
    { title: t("organization.name"), dataIndex: "name", key: "name" },
    { title: t("organization.description"), dataIndex: "description", key: "description", ellipsis: true,
      render: (v: string) => v || "-",
    },
    ...(level === "direction" ? [{
      title: t("organization.subDirections"), key: "children_count", width: 140,
      render: (_: any, r: DirectionItem) => <Tag>{r.sub_directions_count}</Tag>,
    }] : []),
    ...(level === "sub_direction" ? [{
      title: t("organization.services"), key: "services_count", width: 120,
      render: (_: any, r: SubDirectionItem) => <Tag>{r.services_count}</Tag>,
    }] : []),
    ...(level === "service" ? [{
      title: t("organization.bureaux"), key: "bureaux_count", width: 120,
      render: (_: any, r: ServiceItem) => <Tag>{r.bureaux_count}</Tag>,
    }] : []),
    { title: t("organization.active"), dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => <Switch size="small" checked={v} disabled />,
    },
    { title: t("organization.order"), dataIndex: "ordering", key: "ordering", width: 70 },
    {
      title: t("organization.actions"), key: "actions", width: 120,
      render: (_: any, record: any) => (
        <Space>
          <RoleGuard permission="admin.manage_system_params">
            <Button size="small" icon={<Edit2 className="w-3 h-3" />} onClick={() => openModal(level, record)} />
          </RoleGuard>
          {level !== "bureau" && (
            <RoleGuard permission="admin.manage_system_params">
              <Button size="small" icon={<Plus className="w-3 h-3" />}
                onClick={() => openModal(
                  level === "direction" ? "sub_direction" : level === "sub_direction" ? "service" : "bureau",
                  null, record.id
                )}
              />
            </RoleGuard>
          )}
          <RoleGuard permission="admin.manage_system_params">
            <Popconfirm title={t("organization.confirmDelete")} onConfirm={() => handleDelete(level, record.id)}>
              <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
            </Popconfirm>
          </RoleGuard>
        </Space>
      ),
    },
  ];

  const getModalTitle = () => {
    const labels: Record<Level, string> = {
      direction: t("organization.direction"),
      sub_direction: t("organization.subDirection"),
      service: t("organization.service"),
      bureau: t("organization.bureau"),
    };
    return `${modal.editItem ? t("organization.modifyLabel") : t("organization.newLabel")} ${labels[modal.level]}`;
  };

  const renderFormFields = () => {
    const { level } = modal;
    return (
      <>
        {level === "sub_direction" && (
          <Form.Item name="direction" label={t("organization.direction")} rules={[{ required: true, message: t("organization.required") }]}>
            <Select placeholder={t("organization.selectDirection")} showSearch optionFilterProp="children">
              {directions.map(d => (
                <Select.Option key={d.id} value={d.id}>{d.code} — {d.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}
        {level === "service" && (
          <Form.Item name="sub_direction" label={t("organization.subDirection")} rules={[{ required: true, message: t("organization.required") }]}>
            <Select placeholder={t("organization.selectSubDirection")} showSearch optionFilterProp="children">
              {subDirections.map(sd => (
                <Select.Option key={sd.id} value={sd.id}>{sd.code} — {sd.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}
        {level === "bureau" && (
          <Form.Item name="service" label={t("organization.service")} rules={[{ required: true, message: t("organization.required") }]}>
            <Select placeholder={t("organization.selectService")} showSearch optionFilterProp="children">
              {services.map(s => (
                <Select.Option key={s.id} value={s.id}>{s.code} — {s.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}
        <Form.Item name="code" label={t("organization.code")} rules={[{ required: true, message: t("organization.required") }]}>
          <Input placeholder={t("organization.codePlaceholder")} />
        </Form.Item>
        <Form.Item name="name" label={t("organization.name")} rules={[{ required: true, message: t("organization.required") }]}>
          <Input placeholder={t("organization.namePlaceholder")} />
        </Form.Item>
        <Form.Item name="description" label={t("organization.description")}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space size="large">
          <Form.Item name="is_active" label={t("organization.active")} valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="ordering" label={t("organization.order")} initialValue={0}>
            <InputNumber min={0} />
          </Form.Item>
        </Space>
      </>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("organization.pageTitle")}</h1>
            <p className="text-sm text-gray-500">{t("organization.pageDescription")}</p>
          </div>
        </div>
        <RoleGuard permission="admin.manage_system_params">
          <Button type="primary" icon={<Plus className="w-4 h-4" />}
            onClick={() => openModal("direction")}>
            {t("organization.newDirection")}
          </Button>
        </RoleGuard>
      </div>

      <Card title={t("organization.directions")} loading={loading}>
        <Table
          dataSource={directions}
          columns={columns("direction") as any}
          rowKey="id"
          pagination={false}
          expandable={{
            expandedRowRender: (dir) => (
              <Table
                dataSource={subDirectionsFor(dir.id)}
                columns={columns("sub_direction") as any}
                rowKey="id"
                pagination={false}
                expandable={{
                  expandedRowRender: (sd) => (
                    <Table
                      dataSource={servicesFor(sd.id)}
                      columns={columns("service") as any}
                      rowKey="id"
                      pagination={false}
                      expandable={{
                        expandedRowRender: (svc) => (
                          <Table
                            dataSource={bureauxFor(svc.id)}
                            columns={columns("bureau") as any}
                            rowKey="id"
                            pagination={false}
                          />
                        ),
                      }}
                    />
                  ),
                }}
              />
            ),
          }}
        />
      </Card>

      <Modal
        title={getModalTitle()}
        open={modal.open}
        onOk={handleSave}
        onCancel={() => setModal({ ...modal, open: false })}
        width={560}
      >
        <Form form={form} layout="vertical">
          {renderFormFields()}
        </Form>
      </Modal>
    </div>
  );
}
