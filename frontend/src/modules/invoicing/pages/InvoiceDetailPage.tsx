import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Download, Printer, FileText, Building2, Calendar, DollarSign, CreditCard, Paperclip, Upload, Trash2, History, UserCheck, Pencil, X, FileDown } from "lucide-react";
import { clsx } from "clsx";
import { Spinner, ConfirmDialog } from "@shared/components/ui";
import { useInvoice, useTransitionInvoice, useUpdateInvoice } from "../hooks/useInvoices";
import { invoicingApi } from "../api";
import { INVOICE_STATUS_UI, formatMonthYear, categoryLabel, INVOICE_WORKFLOW_ORDER } from "../types";
import html2pdf from "html2pdf.js";
import type { InvoiceStatus, InvoiceAttachment, Invoice } from "../types";

interface EditFormData {
  invoice_number: string;
  invoice_date: string;
  period_start: string;
  period_end: string;
  due_date: string;
  notes: string;
  total_covered_amount: number;
  lines: { id: string; amount: number }[];
}

function toDateInputValue(d: string | null): string {
  if (!d) return "";
  return d.split("T")[0];
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: inv, isLoading, refetch } = useInvoice(id);
  const transitionMut = useTransitionInvoice();

  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const updateMut = useUpdateInvoice();

  const handleExportPdf = async () => {
    if (!pdfContentRef.current) return;
    setPdfLoading(true);
    try {
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${inv?.reference || "facture"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(pdfContentRef.current)
        .save();
    } catch {}
    setPdfLoading(false);
  };

  useEffect(() => {
    if (isEditing && inv) {
      setEditForm({
        invoice_number: inv.invoice_number || "",
        invoice_date: toDateInputValue(inv.invoice_date),
        period_start: toDateInputValue(inv.period_start),
        period_end: toDateInputValue(inv.period_end),
        due_date: toDateInputValue(inv.due_date),
        notes: inv.notes || "",
        total_covered_amount: inv.total_covered_amount,
        lines: inv.lines.map((l) => ({ id: l.id, amount: l.amount })),
      });
    }
  }, [isEditing, inv?.id]);

  const handleEditField = (field: keyof EditFormData, value: string | number) => {
    setEditForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleLineAmount = (lineId: string, amount: number) => {
    setEditForm((prev) => prev ? {
      ...prev,
      lines: prev.lines.map((l) => l.id === lineId ? { ...l, amount } : l),
    } : prev);
  };

  const handleSave = async () => {
    if (!editForm || !inv) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        invoice_number: editForm.invoice_number || null,
        invoice_date: editForm.invoice_date || null,
        period_start: editForm.period_start || null,
        period_end: editForm.period_end || null,
        due_date: editForm.due_date || null,
        notes: editForm.notes || null,
        total_covered_amount: editForm.total_covered_amount,
        lines: editForm.lines.map((l) => ({ id: l.id, amount: l.amount })),
      };
      await updateMut.mutateAsync({ id: inv.id, payload });
      setIsEditing(false);
      setEditForm(null);
      refetch();
    } catch {}
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!inv) return (
    <div className="p-6 text-center">
      <p className="font-bold" style={{ color: "#8a8882" }}>Facture introuvable</p>
      <button onClick={() => navigate("/invoicing")} className="mt-2 text-sm font-bold" style={{ color: "#ffda2d" }}>Retour à la liste</button>
    </div>
  );

  const handleTransition = async () => {
    if (!confirmAction) return;
    try {
      await transitionMut.mutateAsync({ id: inv.id, action: confirmAction as "validate" | "pay" | "cancel" });
      setConfirmAction(null);
      refetch();
    } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await invoicingApi.uploadAttachment(inv.id, file);
      refetch();
    } catch {}
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDeleteAttachment = async (att: InvoiceAttachment) => {
    try {
      await invoicingApi.deleteAttachment(inv.id, att.id);
      refetch();
    } catch {}
  };

  const totalBeforeTax = inv.lines.reduce((s, l) => s + l.amount, 0);
  const coveredAmount = inv.total_covered_amount || totalBeforeTax;
  const beneficiaryPayment = inv.total_beneficiary_payment || 0;

  const steps = INVOICE_WORKFLOW_ORDER.map(s => ({ status: s, label: INVOICE_STATUS_UI[s]?.label || s }));
  const currentStepIdx = INVOICE_WORKFLOW_ORDER.indexOf(inv.status as InvoiceStatus);

  const canAction = (s: string) => {
    if (s === "validate") return inv.status === "draft";
    if (s === "pay") return inv.status === "validated";
    if (s === "cancel") return inv.status === "draft" || inv.status === "validated";
    return false;
  };

  const confirmConfig: Record<string, { title: string; message: string; label: string }> = {
    validate: { title: "Valider la facture", message: "La validation consommera les bons et les marquera comme utilisés.", label: "Valider" },
    pay: { title: "Marquer comme payée", message: "Confirmez le paiement de cette facture.", label: "Confirmer le paiement" },
    cancel: { title: "Annuler la facture", message: "L'annulation remettra les bons en état approuvé.", label: "Annuler" },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate("/invoicing")} className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: "#8a8882" }}>
        <ArrowLeft className="w-4 h-4" /> Retour aux factures
      </button>

      <div ref={pdfContentRef}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black" style={{ color: "#1a1917" }}>{inv.reference}</h1>
            <span
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: INVOICE_STATUS_UI[inv.status as InvoiceStatus]?.bg, color: INVOICE_STATUS_UI[inv.status as InvoiceStatus]?.color }}
            >{inv.status_label}</span>
          </div>
          <p className="text-sm font-medium" style={{ color: "#8a8882" }}>
            {inv.partner_name} — {formatMonthYear(inv.month, inv.year)}
            {inv.invoice_number && <span className="ml-2">· N° facture: {inv.invoice_number}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {inv.status === "draft" && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "#fef3c7", color: "#92400e" }}
            >
              <Pencil className="w-4 h-4" /> Modifier
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                style={{ background: "#dcfce7", color: "#166534" }}
              >
                {saving ? <Spinner /> : <CheckCircle className="w-4 h-4" />} Enregistrer
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                style={{ background: "#fee2e2", color: "#991b1b" }}
              >
                <X className="w-4 h-4" /> Annuler
              </button>
            </>
          )}
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "#f5f4f0", color: "#1a1917" }}
          >
            {pdfLoading ? <Spinner /> : <FileDown className="w-4 h-4" />} PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
            style={{ background: "#f5f4f0", color: "#1a1917" }}
          >
            <Printer className="w-4 h-4" /> Imprimer
          </button>
          {canAction("validate") && (
            <button
              onClick={() => setConfirmAction("validate")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "#dcfce7", color: "#166534" }}
            >
              <CheckCircle className="w-4 h-4" /> Valider
            </button>
          )}
          {canAction("pay") && (
            <button
              onClick={() => setConfirmAction("pay")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "#dbeafe", color: "#1e40af" }}
            >
              <CreditCard className="w-4 h-4" /> Marquer payée
            </button>
          )}
          {canAction("cancel") && (
            <button
              onClick={() => setConfirmAction("cancel")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <XCircle className="w-4 h-4" /> Annuler
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl p-4" style={{ background: "#fff" }}>
          <Building2 className="w-4 h-4 mb-1" style={{ color: "#8a8882" }} />
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Prestataire</p>
          <p className="font-bold" style={{ color: "#1a1917" }}>{inv.partner_name}</p>
          <p className="text-xs" style={{ color: "#8a8882" }}>Code: {inv.partner_code}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#fff" }}>
          <Calendar className="w-4 h-4 mb-1" style={{ color: "#8a8882" }} />
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Période</p>
          {isEditing && editForm ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs" style={{ color: "#8a8882" }}>N° facture</label>
                <input type="text" value={editForm.invoice_number} onChange={(e) => handleEditField("invoice_number", e.target.value)}
                  className="w-full border rounded-lg px-2 py-1 text-sm font-bold" style={{ borderColor: "#e5e3dd", color: "#1a1917" }} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "#8a8882" }}>Date facture</label>
                  <input type="date" value={editForm.invoice_date} onChange={(e) => handleEditField("invoice_date", e.target.value)}
                    className="w-full border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "#e5e3dd", color: "#1a1917" }} />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "#8a8882" }}>Échéance</label>
                  <input type="date" value={editForm.due_date} onChange={(e) => handleEditField("due_date", e.target.value)}
                    className="w-full border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "#e5e3dd", color: "#1a1917" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "#8a8882" }}>Début période</label>
                  <input type="date" value={editForm.period_start} onChange={(e) => handleEditField("period_start", e.target.value)}
                    className="w-full border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "#e5e3dd", color: "#1a1917" }} />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "#8a8882" }}>Fin période</label>
                  <input type="date" value={editForm.period_end} onChange={(e) => handleEditField("period_end", e.target.value)}
                    className="w-full border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "#e5e3dd", color: "#1a1917" }} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="font-bold" style={{ color: "#1a1917" }}>{formatMonthYear(inv.month, inv.year)}</p>
              {inv.period_start && inv.period_end && (
                <p className="text-xs" style={{ color: "#8a8882" }}>
                  du {new Date(inv.period_start).toLocaleDateString("fr-FR")} au {new Date(inv.period_end).toLocaleDateString("fr-FR")}
                </p>
              )}
              {inv.invoice_date && <p className="text-xs" style={{ color: "#8a8882" }}>Date facture: {new Date(inv.invoice_date).toLocaleDateString("fr-FR")}</p>}
              {inv.due_date && <p className="text-xs" style={{ color: "#8a8882" }}>Échéance: {new Date(inv.due_date).toLocaleDateString("fr-FR")}</p>}
            </>
          )}
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#fff" }}>
          <DollarSign className="w-4 h-4 mb-1" style={{ color: "#8a8882" }} />
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Montant TTC</p>
          <p className="text-xl font-black" style={{ color: "#1a1917" }}>{inv.total_amount.toLocaleString()} DZD</p>
          <p className="text-xs" style={{ color: "#8a8882" }}>{inv.line_count} ligne(s)</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#fff" }}>
          <CreditCard className="w-4 h-4 mb-1" style={{ color: "#8a8882" }} />
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Pris en charge</p>
          <p className="text-lg font-black" style={{ color: "#166534" }}>{coveredAmount.toLocaleString()} DZD</p>
          <p className="text-xs" style={{ color: "#92400e" }}>Restant bénéf. : {beneficiaryPayment.toLocaleString()} DZD</p>
        </div>
      </div>

      {inv.category && (
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: "#eff6ff", color: "#3b82f6" }}>
            Catégorie : {categoryLabel(inv.category)}
          </div>
          {inv.convention_reference && (
            <div className="rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: "#fef3c7", color: "#92400e" }}>
              Convention : {inv.convention_reference} — {inv.convention_title}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s.status} className="flex items-center gap-2">
            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold")}
              style={{
                background: i <= currentStepIdx ? "#ffda2d" : "#f5f4f0",
                color: i <= currentStepIdx ? "#1a1917" : "#b0aea6",
              }}
            >
              {i < currentStepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-sm font-bold" style={{ color: i <= currentStepIdx ? "#1a1917" : "#b0aea6" }}>{s.label}</span>
            {i < steps.length - 1 && <div className="w-12 h-px" style={{ background: "#e5e3dd" }} />}
          </div>
        ))}
      </div>

      {inv.status === "paid" && inv.paid_at && (
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ background: "#dbeafe" }}>
          <CreditCard className="w-5 h-5" style={{ color: "#1e40af" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#1e40af" }}>Payée le {new Date(inv.paid_at).toLocaleDateString("fr-FR")}</p>
            {inv.paid_by && <p className="text-xs" style={{ color: "#3b82f6" }}>par {inv.paid_by}</p>}
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "#fff" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <h3 className="font-bold" style={{ color: "#1a1917" }}>Lignes de facture</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                {["Bon", "Employé", "Bénéficiaire", "Type", "Examen", "Date", "Montant autorisé", "Montant facturé"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((line: Invoice["lines"][number]) => {
                const lineAmount = editForm?.lines.find((l) => l.id === line.id)?.amount ?? line.amount;
                return (
                  <tr key={line.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: "#1a1917" }}>{line.voucher_reference}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>
                      {line.voucher_employee_name}
                      {line.voucher_employee_matricule && <span className="text-xs ml-1" style={{ color: "#8a8882" }}>({line.voucher_employee_matricule})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>
                      {line.voucher_beneficiary_name || "—"}
                      {line.voucher_beneficiary_type && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ background: "#f5f4f0", color: "#8a8882" }}>
                          {line.voucher_beneficiary_type === "Ayant droit" ? "Ayant droit" : "Employé"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{line.voucher_coverage_type}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{line.voucher_coverage_type_code || "—"}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#5a5852" }}>{new Date(line.voucher_request_date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#8a8882" }}>{line.voucher_approved_amount ? `${line.voucher_approved_amount.toLocaleString()} DZD` : "—"}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: "#1a1917" }}>
                      {isEditing ? (
                        <input type="number" value={lineAmount} onChange={(e) => handleLineAmount(line.id, Number(e.target.value))}
                          className="w-28 border rounded-lg px-2 py-1 text-sm font-bold text-right" style={{ borderColor: "#e5e3dd", color: "#1a1917" }} />
                      ) : (
                        <>{line.amount.toLocaleString()} DZD</>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 flex justify-end" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Total TTC</p>
            <p className="text-xl font-black" style={{ color: "#1a1917" }}>{(editForm?.lines.reduce((s, l) => s + l.amount, 0) || totalBeforeTax).toLocaleString()} DZD</p>
            {isEditing && editForm ? (
              <div className="mt-1">
                <label className="text-xs" style={{ color: "#8a8882" }}>Pris en charge (DZD)</label>
                <input type="number" value={editForm.total_covered_amount} onChange={(e) => handleEditField("total_covered_amount", Number(e.target.value))}
                  className="w-32 border rounded-lg px-2 py-1 text-sm font-medium text-right" style={{ borderColor: "#e5e3dd", color: "#166534" }} />
              </div>
            ) : (
              <>
                <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Pris en charge: {coveredAmount.toLocaleString()} DZD</p>
                <p className="text-xs" style={{ color: "#92400e" }}>Restant bénéficiaire: {beneficiaryPayment.toLocaleString()} DZD</p>
              </>
            )}
            <p className="text-xs" style={{ color: "#8a8882" }}>créée le {new Date(inv.created_at).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ background: "#fff" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" style={{ color: "#8a8882" }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Pièces jointes</h3>
            {uploading && <Spinner />}
          </div>
          {inv.status === "draft" && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer" style={{ background: "#f5f4f0", color: "#1a1917" }}>
              <Upload className="w-3.5 h-3.5" /> Ajouter un fichier
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          )}
        </div>
        {inv.attachments.length === 0 ? (
          <p className="text-sm" style={{ color: "#b0aea6" }}>Aucune pièce jointe.</p>
        ) : (
          <div className="space-y-2">
            {inv.attachments.map((att: InvoiceAttachment) => (
              <div key={att.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "#f5f4f0" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 shrink-0" style={{ color: "#8a8882" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1a1917" }}>{att.original_name}</p>
                    <p className="text-xs" style={{ color: "#8a8882" }}>
                      {(att.file_size / 1024).toFixed(1)} Ko
                      {att.uploaded_by_name && ` · par ${att.uploaded_by_name}`}
                      {att.uploaded_at && ` · ${new Date(att.uploaded_at).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white transition-colors"
                    style={{ color: "#5a5852" }}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {inv.status === "draft" && (
                    <button
                      onClick={() => handleDeleteAttachment(att)}
                      className="p-1.5 rounded-lg hover:bg-white transition-colors"
                      style={{ color: "#991b1b" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(inv.notes || isEditing) && (
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#fff" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>Notes</p>
          {isEditing && editForm ? (
            <textarea value={editForm.notes} onChange={(e) => handleEditField("notes", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={3}
              style={{ borderColor: "#e5e3dd", color: "#5a5852" }} />
          ) : (
            <p className="text-sm" style={{ color: "#5a5852" }}>{inv.notes}</p>
          )}
        </div>
      )}

      {inv.validated_by_name && (
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ background: "#f0fdf4" }}>
          <UserCheck className="w-5 h-5" style={{ color: "#166534" }} />
          <div>
            <p className="text-sm font-bold" style={{ color: "#166534" }}>
              Validée par {inv.validated_by_name}
              {inv.validated_at && ` le ${new Date(inv.validated_at).toLocaleDateString("fr-FR")}`}
            </p>
          </div>
        </div>
      )}

      {inv.status_history.length > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#fff" }}>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4" style={{ color: "#8a8882" }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8a8882" }}>Historique des statuts</h3>
          </div>
          <div className="space-y-0">
            {[...inv.status_history].reverse().map((h: Invoice["status_history"][number]) => (
              <div key={h.id} className="flex items-start gap-3 pb-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{
                  background: h.status_to === "validated" ? "#166534" : h.status_to === "paid" ? "#1e40af" : h.status_to === "cancelled" ? "#991b1b" : "#8a8882"
                }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                      background: INVOICE_STATUS_UI[h.status_from as InvoiceStatus]?.bg || "#f5f4f0",
                      color: INVOICE_STATUS_UI[h.status_from as InvoiceStatus]?.color || "#8a8882",
                    }}>{INVOICE_STATUS_UI[h.status_from as InvoiceStatus]?.label || h.status_from}</span>
                    <span className="text-xs" style={{ color: "#8a8882" }}>→</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
                      background: INVOICE_STATUS_UI[h.status_to as InvoiceStatus]?.bg || "#f5f4f0",
                      color: INVOICE_STATUS_UI[h.status_to as InvoiceStatus]?.color || "#8a8882",
                    }}>{INVOICE_STATUS_UI[h.status_to as InvoiceStatus]?.label || h.status_to}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "#8a8882" }}>
                    {h.changed_by_name && `par ${h.changed_by_name} · `}
                    {new Date(h.changed_at).toLocaleString("fr-FR")}
                  </p>
                  {h.notes && <p className="text-xs mt-0.5" style={{ color: "#5a5852" }}>{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleTransition}
        title={confirmAction ? confirmConfig[confirmAction]?.title : ""}
        message={confirmAction ? confirmConfig[confirmAction]?.message : ""}
        confirmLabel={confirmAction ? confirmConfig[confirmAction]?.label : ""}
        variant={(confirmAction === "cancel" ? "danger" : "info") as "danger" | "info"}
        loading={transitionMut.isPending}
      />
      </div>
    </div>
  );
}