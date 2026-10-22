import { useParams, useNavigate } from "react-router-dom";
import { App as AntdApp, Button, Card, Tag, Descriptions, Modal, Input, Steps } from "antd";
import { ArrowLeft, FileEdit, Trash2, Send, CheckCircle, XCircle, AlertTriangle, Printer, Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import {
  useCoverageRequest,
  useTransitionCoverageRequest,
  useDeleteCoverageRequest,
} from "../hooks/useCoverageRequests";
import { coverageRequestApi } from "../api/requests";
import { USER_STATUS_UI, BACKEND_TO_USER_STATUS, statusLabel } from "../types/request";
import type { RequestStatus } from "../types/request";

const SIMPLIFIED_STEPS = [
  { key: "draft", labelKey: "requestStatus.draft" },
  { key: "submitted", labelKey: "requestStatus.submitted" },
  { key: "pending_approval", labelKey: "requestStatus.pending" },
  { key: "validated", labelKey: "requestStatus.approved" },
];

const getStepIndex = (state: string): number => {
  if (state === "draft") return 0;
  if (["submitted", "pending_approval", "pending_manager_approval", "pending_director_approval"].includes(state)) return 1;
  if (state === "validated") return 2;
  if (state === "printed") return 2;
  if (state === "rejected") return -1;
  if (state === "closed") return -1;
  return 0;
};

const isDraft = (s: string) => s === "draft";
const isTerminal = (s: string) => ["validated", "printed", "rejected", "closed"].includes(s);

const APPROVED_PRINT_STATES = ["validated", "printed"];
const PENDING_STATES = ["submitted", "pending_approval", "pending_manager_approval", "pending_director_approval"];

export function CoverageRequestDetailPage() {
  const { t } = useTranslation();
  const { message } = AntdApp.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request } = useCoverageRequest(id ?? null);
  const transitionMut = useTransitionCoverageRequest(id!);
  const deleteMut = useDeleteCoverageRequest();
  const [actionModal, setActionModal] = useState<{ to_state: string; label: string; requires_reason: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleTransition = async () => {
    if (!actionModal) return;
    try {
      await transitionMut.mutateAsync({
        to_state: actionModal.to_state as RequestStatus,
        reason: actionModal.requires_reason ? reason : undefined,
      });
      message.success(`Demande ${actionModal.label.toLowerCase()}`);
      setActionModal(null);
      setReason("");
    } catch {
      message.error("Erreur lors de la transition");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(id!);
      message.success("Demande supprimée");
      navigate("/medical-coverage/requests");
    } catch {
      message.error("Erreur lors de la suppression");
    }
  };

  const openPdfPreview = async () => {
    if (!id) return;
    try {
      // Passe par l'apiClient authentifié (JWT) puis ouvre le blob dans un onglet.
      const resp = await coverageRequestApi.downloadPdf(id);
      const url = URL.createObjectURL(resp.data as Blob);
      window.open(url, "_blank");
    } catch {
      message.error(t("coverageRequest.pdfDownloadError") || "Erreur lors de l'aperçu du PDF");
    }
  };

  const downloadPdf = async () => {
    if (!id) return;
    try {
      const resp = await coverageRequestApi.downloadPdf(id);
      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${request?.request_number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      message.error(t("coverageRequest.pdfDownloadError") || "Erreur lors du téléchargement du PDF");
    }
  };

  if (!request) {
    return <div className="text-center py-12 text-gray-400">Chargement...</div>;
  }

  const userStatus = BACKEND_TO_USER_STATUS[request.workflow_state as keyof typeof BACKEND_TO_USER_STATUS] || "draft";
  const ui = USER_STATUS_UI[userStatus] || USER_STATUS_UI.draft;
  const transitions = request.available_transitions ?? [];
  const stepIndex = getStepIndex(request.workflow_state);
  const draft = isDraft(request.workflow_state);
  const terminal = isTerminal(request.workflow_state);

  const stepItems = SIMPLIFIED_STEPS.map((s, i) => {
    return {
      key: s.key,
      title: t(s.labelKey),
      status: (request.workflow_state === "rejected" && i === 3) ? "error" as const
        : (request.workflow_state === "closed" && i === 3) ? "finish" as const
        : i < stepIndex ? "finish" as const
        : i === stepIndex ? "process" as const
        : "wait" as const,
    };
  });

  if (request.workflow_state === "rejected") {
    stepItems.push({ key: "rejected", title: t("requestStatus.rejected"), status: "error" as const });
  } else if (request.workflow_state === "closed") {
    stepItems.push({ key: "closed", title: t("requestStatus.cancelled"), status: "finish" as const });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/medical-coverage/requests")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="flex gap-2">
          {draft && (
            <>
              <RoleGuard permission="coverage.update">
                <Button icon={<FileEdit className="w-4 h-4" />}
                  onClick={() => navigate(`/medical-coverage/requests/${id}/edit`)}>
                  Modifier
                </Button>
              </RoleGuard>
              <RoleGuard permission="coverage.create">
                <Button type="primary" icon={<Send className="w-4 h-4" />}
                  style={{ background: "#3b82f6", borderColor: "#3b82f6" }}
                  onClick={() => setActionModal({ to_state: "submitted", label: "Soumettre", requires_reason: false })}>
                  Soumettre
                </Button>
              </RoleGuard>
              <RoleGuard permission="coverage.update">
                <Button danger icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer
                </Button>
              </RoleGuard>
            </>
          )}
          {APPROVED_PRINT_STATES.includes(request.workflow_state) && (
            <RoleGuard permission="coverage.print_voucher">
              <Button icon={<Printer className="w-4 h-4" />}
                onClick={openPdfPreview}>
                {t("coverageRequest.printButton")}
              </Button>
              <Button icon={<Download className="w-4 h-4" />}
                onClick={downloadPdf}>
                {t("coverageRequest.downloadPdf")}
              </Button>
            </RoleGuard>
          )}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono">{request.request_number}</h1>
            <Tag color={ui.color} className="mt-1">{statusLabel(t, ui)}</Tag>
          </div>
        </div>
        {PENDING_STATES.includes(request.workflow_state) && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-xl text-xs font-bold"
            style={{ background: "rgba(245,158,11,0.08)", color: "#b45309" }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("coverageRequest.printAfterApproval")}
          </div>
        )}

        <Steps current={stepIndex} size="small" className="mb-6" style={{ maxWidth: 600 }}
          items={stepItems} />

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="Catégorie">{request.category_display}</Descriptions.Item>
          <Descriptions.Item label="Partenaire">{request.partner_name}</Descriptions.Item>
          <Descriptions.Item label="Employé">{request.employee_name} ({request.employee_matricule})</Descriptions.Item>
          <Descriptions.Item label="Ayant droit">{request.beneficiary_name || "—"}</Descriptions.Item>
          <Descriptions.Item label="Date de couverture">{request.coverage_date}</Descriptions.Item>
          <Descriptions.Item label="Date de validation">{request.validation_date || "—"}</Descriptions.Item>
          <Descriptions.Item label="Observation" span={2}>{request.observation || "—"}</Descriptions.Item>
        </Descriptions>
      </Card>

      {transitions.length > 0 && !terminal && (
        <Card title="Actions">
          <div className="flex flex-wrap gap-2">
            {transitions.filter(t => t.can_execute).map((t: any) => (
              <RoleGuard key={t.to_state} permission="coverage.validate">
                <Button
                  onClick={() => setActionModal({ to_state: t.to_state, label: t.label, requires_reason: t.requires_reason })}
                  icon={t.severity === "HIGH" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}>
                  {t.label}
                </Button>
              </RoleGuard>
            ))}
          </div>
        </Card>
      )}

      <Modal title={actionModal?.label} open={!!actionModal} onOk={handleTransition}
        onCancel={() => { setActionModal(null); setReason(""); }}
        confirmLoading={transitionMut.isPending}
        okText="Confirmer" cancelText="Annuler">
        {actionModal?.requires_reason && (
          <Input.TextArea rows={3} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Motif obligatoire" />
        )}
        <p className="text-sm text-gray-500 mt-2">
          {actionModal ? `Voulez-vous ${actionModal.label.toLowerCase()} cette demande ?` : ""}
        </p>
      </Modal>

      <Modal title="Confirmer la suppression"
        open={showDeleteConfirm}
        onOk={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
        confirmLoading={deleteMut.isPending}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">Cette action est irréversible. Voulez-vous vraiment supprimer cette demande ?</p>
        </div>
      </Modal>
    </div>
  );
}
