import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, CheckCircle2, ThumbsUp, Ban, X, Printer } from "lucide-react";
import { useToast, Spinner, Modal } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { fmtDate, fmtDateTime } from "@shared/utils/format";
import { medicalCoverageApi } from "../api";
import { VOUCHER_STATUS_UI } from "../types";

export function MedicalCoverageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [showTransition, setShowTransition] = useState<{ to_state: string; label: string; requires_reason: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["medicalCoverage", "detail", id],
    queryFn: () => medicalCoverageApi.get(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ to_state, reason: r }: { to_state: string; reason?: string }) =>
      medicalCoverageApi.transition(id!, to_state, r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicalCoverage"] });
      toast.success("Statut mis à jour");
      setShowTransition(null);
      setReason("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Erreur");
    },
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !data) return;
    printWindow.document.write(`
      <html><head><title>Bon ${data.reference}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #1a1917; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .ref { font-size: 24px; font-weight: bold; color: #1a1917; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e0ddd5; font-size: 13px; }
        td:first-child { font-weight: bold; color: #6b6963; width: 180px; }
        .footer { margin-top: 40px; font-size: 11px; color: #8a8882; text-align: center; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      </style></head><body>
      <h1>Bon de Prise en Charge Médicale</h1>
      <div class="ref">${data.reference}</div>
      <table>
        <tr><td>Type</td><td>${data.coverage_type_name}</td></tr>
        <tr><td>Employé</td><td>${data.employee_name} (${data.employee_matricule})</td></tr>
        <tr><td>Département</td><td>${data.department_name}</td></tr>
        <tr><td>Bénéficiaire</td><td>${data.beneficiary_name || data.employee_name} ${data.beneficiary_type === "dependent" ? "(Ayant droit)" : ""}</td></tr>
        <tr><td>Date de demande</td><td>${fmtDate(data.request_date)}</td></tr>
        <tr><td>Date prévue</td><td>${fmtDate(data.expected_date) || "—"}</td></tr>
        <tr><td>Prestataire</td><td>${data.provider_name || "—"}</td></tr>
        <tr><td>Statut</td><td><span>${VOUCHER_STATUS_UI[data.workflow_state]?.label || data.workflow_state}</span></td></tr>
        ${data.observations ? `<tr><td>Observations</td><td>${data.observations}</td></tr>` : ""}
      </table>
      <div class="footer">
        Créé le {fmtDateTime(data.created_at)} par {data.created_by_name} — Document généré automatiquement
      </div>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }
  if (!data) {
    return <div className="text-center py-16 font-bold" style={{ color: "#8a8882" }}>Bon introuvable</div>;
  }

  const statusUI = VOUCHER_STATUS_UI[data.workflow_state] || VOUCHER_STATUS_UI.draft;

  const handleTransition = () => {
    if (!showTransition) return;
    if (showTransition.requires_reason && !reason.trim()) {
      toast.error("Veuillez saisir un motif");
      return;
    }
    transitionMutation.mutate({ to_state: showTransition.to_state, reason });
  };

  const TRANSITION_BUTTONS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    submitted: { label: "Soumettre", color: "#3b82f6", icon: ThumbsUp },
    approved: { label: "Approuver", color: "#16a34a", icon: CheckCircle2 },
    rejected: { label: "Rejeter", color: "#dc2626", icon: Ban },
    consumed: { label: "Consommer", color: "#9333ea", icon: FileText },
    cancelled: { label: "Annuler", color: "#8a8882", icon: X },
  };

  return (
    <div className="space-y-6 py-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/medical-coverage/${data.coverage_type_code}`)}
          className="flex items-center gap-2 text-sm font-bold transition-colors"
          style={{ color: "#8a8882" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <RoleGuard permission="coverage.print_voucher">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "#f3f2ee", color: "#4d4b46" }}
          >
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </RoleGuard>
      </div>

      <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-black" style={{ color: "#1a1917" }}>{data.reference}</span>
              <span className="inline-block px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-wider"
                style={{ color: statusUI.color, background: statusUI.bg }}>
                {statusUI.label}
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: "#8a8882" }}>
              {data.coverage_type_name} — {data.employee_name}
            </p>
          </div>
          <div className="flex gap-2">
            {data.available_transitions?.filter(t => t.can_execute).map(t => {
              const btn = TRANSITION_BUTTONS[t.to_state] || { label: t.label, color: "#8a8882", icon: FileText };
              const Icon = btn.icon;
              return (
                <RoleGuard key={t.to_state} permission="coverage.validate">
                  <button
                    onClick={() => setShowTransition({ to_state: t.to_state, label: t.label, requires_reason: t.requires_reason })}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all"
                    style={{ background: btn.color + "15", color: btn.color }}
                  >
                    <Icon className="w-4 h-4" />
                    {btn.label}
                  </button>
                </RoleGuard>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <InfoCard label="Employé" value={data.employee_name} />
          <InfoCard label="Matricule" value={data.employee_matricule} />
          <InfoCard label="Département" value={data.department_name} />
          <InfoCard label="Bénéficiaire" value={data.beneficiary_name || data.employee_name} />
          <InfoCard label="Date de demande" value={fmtDate(data.request_date)} />
          <InfoCard label="Date prévue" value={fmtDate(data.expected_date) || "—"} />
          <InfoCard label="Prestataire" value={data.provider_name || "—"} />
          <InfoCard label="Prochaine date éligible" value={fmtDate(data.next_eligible_date) || "—"} />
        </div>

        <div className="p-4 rounded-2xl mb-4" style={{ background: "#f8f7f4" }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Créé par</p>
          <p className="text-sm font-bold" style={{ color: "#1a1917" }}>{data.created_by_name}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: "#8a8882" }}>{fmtDateTime(data.created_at)}</p>
        </div>

        {data.observations && (
          <div className="p-4 rounded-2xl mb-4" style={{ background: "#f8f7f4" }}>
            <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Observations</p>
            <p className="text-sm font-medium" style={{ color: "#1a1917" }}>{data.observations}</p>
          </div>
        )}

        {data.rejection_reason && (
          <div className="p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "#dc2626" }}>Motif du rejet</p>
            <p className="text-sm font-medium" style={{ color: "#1a1917" }}>{data.rejection_reason}</p>
          </div>
        )}
      </div>

      {showTransition && (
        <Modal
          open={!!showTransition}
          onClose={() => { setShowTransition(null); setReason(""); }}
          title={showTransition.label}
          size="sm"
        >
          <div className="space-y-4">
            {showTransition.requires_reason && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: "#4d4b46" }}>Motif <span className="text-red-500">*</span></label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none font-medium resize-none"
                  style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
                  placeholder="Saisir le motif..."
                />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowTransition(null); setReason(""); }}
                className="px-4 py-2 rounded-2xl text-sm font-bold"
                style={{ color: "#4d4b46" }}
              >
                Annuler
              </button>
              <button
                onClick={handleTransition}
                disabled={transitionMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold"
                style={{ background: "#ffda2d", color: "#1a1917" }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-2xl" style={{ background: "#f8f7f4" }}>
      <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: "#1a1917" }}>{value}</p>
    </div>
  );
}
