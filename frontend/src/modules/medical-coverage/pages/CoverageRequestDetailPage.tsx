import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Tag, Descriptions, Modal, Input, message, Steps, Tooltip } from "antd";
import { ArrowLeft, Download, Printer, Eye, CheckCircle, XCircle, History } from "lucide-react";
import { useState } from "react";
import {
  useCoverageRequest,
  useTransitionCoverageRequest,
} from "../hooks/useCoverageRequests";
import { coverageRequestApi } from "../api/requests";
import { REQUEST_STATUS_UI, REQUEST_WORKFLOW_ORDER } from "../types/request";
import type { RequestStatus } from "../types/request";

export function CoverageRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request } = useCoverageRequest(id ?? null);
  const transitionMut = useTransitionCoverageRequest(id!);
  const [actionModal, setActionModal] = useState<{ to_state: string; label: string; requires_reason: boolean } | null>(null);
  const [reason, setReason] = useState("");

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

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState("");

  const getPdfData = async (): Promise<Blob> => {
    const resp = await coverageRequestApi.downloadPdf(id!);
    return new Blob([resp.data], { type: "application/pdf" });
  };

  const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handlePreviewPdf = async () => {
    try {
      const blob = await getPdfData();
      const dataUrl = await blobToDataUrl(blob);
      setPdfDataUrl(dataUrl);
      setPreviewOpen(true);
    } catch {
      message.error("Erreur lors de l'aperçu du PDF");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await getPdfData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${request?.request_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Erreur lors du téléchargement du PDF");
    }
  };

  const handlePrint = async () => {
    try {
      const blob = await getPdfData();
      const url = URL.createObjectURL(blob);
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<embed src="${url}" type="application/pdf" width="100%" height="100%" style="border:none">`);
        w.document.close();
        setTimeout(() => {
          w.focus();
          w.print();
        }, 1000);
      } else {
        message.warning("Autorisez les popups pour imprimer, ou utilisez Télécharger PDF");
      }
    } catch {
      message.error("Erreur lors de l'impression");
    }
  };

  if (!request) {
    return <div className="text-center py-12 text-gray-400">Chargement...</div>;
  }

  const ui = REQUEST_STATUS_UI[request.workflow_state as keyof typeof REQUEST_STATUS_UI] || {};
  const transitions = request.available_transitions ?? [];
  const currentStepIndex = REQUEST_WORKFLOW_ORDER.indexOf(request.workflow_state as RequestStatus);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/medical-coverage/requests")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />Retour
        </button>
        <div className="flex gap-2">
          <Tooltip title="Aperçu avant impression">
            <Button icon={<Eye className="w-4 h-4" />} onClick={handlePreviewPdf}>
              Aperçu
            </Button>
          </Tooltip>
          <Tooltip title="Télécharger le PDF">
            <Button icon={<Download className="w-4 h-4" />} onClick={handleDownloadPdf}>
              Télécharger PDF
            </Button>
          </Tooltip>
          <Tooltip title="Imprimer le bon">
            <Button type="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
              Imprimer
            </Button>
          </Tooltip>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold font-mono">{request.request_number}</h1>
            <Tag color={ui.color} className="mt-1">{ui.label}</Tag>
          </div>
        </div>

        <Steps current={currentStepIndex} size="small" className="mb-6" style={{ maxWidth: 600 }}
          items={REQUEST_WORKFLOW_ORDER.map(s => {
            const u = REQUEST_STATUS_UI[s];
            return { key: s, title: u?.label };
          })} />

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

      {request.print_count > 0 && (
        <Card size="small" className="!bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <History className="w-4 h-4" />
            <span>Imprimé {request.print_count} fois{request.printed_at ? ` — Dernière impression : ${new Date(request.printed_at).toLocaleString("fr-DZ")}` : ""}</span>
          </div>
        </Card>
      )}

      {transitions.length > 0 && (
        <Card title="Actions">
          <div className="flex flex-wrap gap-2">
            {transitions.filter(t => t.can_execute).map((t: any) => (
              <Button key={t.to_state}
                onClick={() => setActionModal({ to_state: t.to_state, label: t.label, requires_reason: t.requires_reason })}
                icon={t.severity === "HIGH" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}>
                {t.label}
              </Button>
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

      <Modal title="Aperçu du bon de prise en charge"
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); setPdfDataUrl(""); }}
        footer={null}
        width={800}
        destroyOnClose>
        {pdfDataUrl && (
          <embed src={pdfDataUrl} type="application/pdf" width="100%" height="600" />
        )}
      </Modal>
    </div>
  );
}
