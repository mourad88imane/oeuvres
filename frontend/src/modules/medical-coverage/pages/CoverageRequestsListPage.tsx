import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { App as AntdApp, Button, Card, Tabs, Tag, Modal } from "antd";
import { Plus, RefreshCw, FileEdit, Trash2, Send, Eye, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { useCoverageRequests, useCoverageRequestStatistics, useDeleteCoverageRequest } from "../hooks/useCoverageRequests";
import { coverageRequestApi } from "../api/requests";
import { USER_STATUS_UI, BACKEND_TO_USER_STATUS, statusLabel } from "../types/request";
import type { RequestStatus } from "../types/request";

const USER_TABS = [
  { key: "all", label: "Toutes" },
  { key: "draft", label: "Brouillons" },
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Approuvées" },
  { key: "rejected", label: "Rejetées" },
  { key: "cancelled", label: "Annulées" },
];

const isDraft = (s: string) => s === "draft";

export function CoverageRequestsListPage() {
  const { t } = useTranslation();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const params: Record<string, unknown> = {};
  if (tab !== "all") {
    if (tab === "draft") params.status = "draft";
    else if (tab === "pending") params.status__in = "submitted,pending_approval,pending_manager_approval,pending_director_approval";
    else if (tab === "approved") params.status__in = "validated,printed";
    else if (tab === "rejected") params.status = "rejected";
    else if (tab === "cancelled") params.status__in = "closed,cancelled";
  }

  const { data, isLoading, refetch } = useCoverageRequests(params);
  const { data: stats } = useCoverageRequestStatistics();
  const deleteMut = useDeleteCoverageRequest();

  const submitMut = useMutation({
    mutationFn: (id: string) =>
      coverageRequestApi.transition(id, "submitted" as RequestStatus).then(r => r.data.data),
    onSuccess: () => {
      message.success("Demande soumise");
      qc.invalidateQueries({ queryKey: ["coverage-requests"] });
    },
    onError: () => message.error("Erreur lors de la soumission"),
  });

  const requests = data?.results ?? [];
  const pagination = data?.pagination;

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      message.success("Demande supprimée");
      setDeleteTarget(null);
    } catch {
      message.error("Erreur lors de la suppression");
    }
  };

  const kpiItems = stats ? [
    { label: "Total", value: stats.total, color: "#3b82f6" },
    { label: "Brouillons", value: stats.draft, color: "#6b6963" },
    { label: "En attente", value: stats.pending, color: "#f59e0b" },
    { label: "Approuvées", value: stats.approved, color: "#16a34a" },
    { label: "Rejetées", value: stats.rejected, color: "#dc2626" },
  ] : [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demandes</h1>
          <p className="text-gray-500 text-sm">{pagination?.count ?? 0} demandes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => refetch()} />
          <RoleGuard permission="coverage.create">
            <Button type="primary" onClick={() => navigate("/medical-coverage/requests/new")}
              icon={<Plus className="w-4 h-4" />}
              style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
              Nouvelle demande
            </Button>
          </RoleGuard>
        </div>
      </div>

      {kpiItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {kpiItems.map(k => (
            <Card key={k.label} size="small" className="text-center">
              <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <Tabs activeKey={tab} onChange={setTab} items={USER_TABS.map(s => ({
          key: s.key,
          label: s.label,
        }))} />

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucune demande trouvée</div>
        ) : (
          <div className="space-y-2">
            {requests.map((r: any) => {
              const userStatus = BACKEND_TO_USER_STATUS[r.workflow_state as keyof typeof BACKEND_TO_USER_STATUS] || "draft";
              const ui = USER_STATUS_UI[userStatus] || USER_STATUS_UI.draft;
              const draft = isDraft(r.workflow_state);
              return (
                <div key={r.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/medical-coverage/requests/${r.id}`)}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{r.request_number}</span>
                      <Tag color={ui.color}>{statusLabel(t, ui)}</Tag>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{r.employee_name} — {r.partner_name}</p>
                    <p className="text-xs text-gray-400">{r.category_display} | {r.coverage_date}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4 shrink-0">
                    {draft ? (
                      <>
                        <RoleGuard permission="coverage.update">
                          <button onClick={() => navigate(`/medical-coverage/requests/${r.id}/edit`)}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Modifier">
                            <FileEdit className="w-4 h-4" style={{ color: "#6b6963" }} />
                          </button>
                        </RoleGuard>
                        <RoleGuard permission="coverage.create">
                          <button onClick={(e) => { e.stopPropagation(); submitMut.mutate(r.id); }}
                            className="p-2 rounded-xl hover:bg-blue-50 transition-colors" title="Soumettre">
                            <Send className="w-4 h-4" style={{ color: "#3b82f6" }} />
                          </button>
                        </RoleGuard>
                        <RoleGuard permission="coverage.update">
                          <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.id); }}
                            className="p-2 rounded-xl hover:bg-red-50 transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
                          </button>
                        </RoleGuard>
                      </>
                    ) : (
                      <button onClick={() => navigate(`/medical-coverage/requests/${r.id}`)}
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Voir">
                        <Eye className="w-4 h-4" style={{ color: "#6b6963" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        title="Confirmer la suppression"
        open={!!deleteTarget}
        onOk={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
        confirmLoading={deleteMut.isPending}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">Cette action est irréversible. Voulez-vous vraiment supprimer cette demande ?</p>
        </div>
      </Modal>
    </div>
  );
}
