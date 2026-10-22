/**
 * EMPLOYEE DETAIL PAGE — Fiche complète avec onglets
 * Identité | Ayants droit | Historique | Modifier
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Edit2, Trash2, User, Phone, Briefcase,
  Users, Clock, Shield, AlertTriangle, Camera,
  CheckCircle2, XCircle, Plus,
} from "lucide-react";
import {
  useEmployee, useUpdateEmployee, useDeleteEmployee,
  useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary, useChangeStatus,
} from "../hooks/useEmployees";
import {
  EmployeeStatusBadge, Modal, ConfirmDialog,
  EmptyState, Spinner, Badge,
} from "@shared/components/ui/index";
import { EmployeeForm }    from "../components/EmployeeForm";
import { BeneficiaryForm } from "../components/BeneficiaryForm";
import { EmployeeHistory } from "../components/EmployeeHistory";
import { PhotoUpload }     from "../components/PhotoUpload";
import { RoleGuard }       from "@shared/components/layout/ProtectedRoute";
import type { Beneficiary, EmployeeUpdatePayload, BeneficiaryCreatePayload } from "../types";

type Tab = "identity" | "beneficiaries" | "history" | "security";

export function EmployeeDetailPage() {
  const { t } = useTranslation();
  const { id }  = useParams<{ id: string }>();
  const navigate = useNavigate();
  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "identity",      label: t("employees.identity"),     icon: User    },
    { id: "beneficiaries", label: t("beneficiaries.title"),    icon: Users   },
    { id: "history",       label: t("employees.history"),      icon: Clock   },
    { id: "security",      label: t("employees.status"),       icon: Shield  },
  ];
  const [activeTab,     setActiveTab]     = useState<Tab>("identity");
  const [showEdit,      setShowEdit]      = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [showPhotoEdit, setShowPhotoEdit] = useState(false);
  const [showAddBene,   setShowAddBene]   = useState(false);
  const [editBene,      setEditBene]      = useState<Beneficiary | null>(null);
  const [deleteBene,    setDeleteBene]    = useState<string | null>(null);
  const [showStatus,    setShowStatus]    = useState(false);
  const [newStatus,     setNewStatus]     = useState("");
  const [statusReason,  setStatusReason]  = useState("");

  const { data: employee, isLoading } = useEmployee(id ?? null);
  const updateMutation  = useUpdateEmployee(id!);
  const deleteMutation  = useDeleteEmployee();
  const changeStatus    = useChangeStatus(id!);
  const createBene      = useCreateBeneficiary(id!);
  const updateBene      = useUpdateBeneficiary(id!);
  const deleteBeneM     = useDeleteBeneficiary(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!employee) {
    return (
      <EmptyState icon={User} title={t("app.pageNotFound")}
        description={t("app.pageNotFoundDescription")}
        action={<button onClick={() => navigate("/employees")} className="btn-primary">{t("app.back")}</button>}
      />
    );
  }

  const handleUpdate = async (data: EmployeeUpdatePayload) => {
    await updateMutation.mutateAsync(data);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id!);
    navigate("/employees");
  };

  const handleChangeStatus = async () => {
    await changeStatus.mutateAsync({ status: newStatus, reason: statusReason });
    setShowStatus(false);
    setStatusReason("");
  };

  const handleAddBene = async (data: BeneficiaryCreatePayload) => {
    await createBene.mutateAsync(data);
    setShowAddBene(false);
  };

  const handleUpdateBene = async (data: Partial<BeneficiaryCreatePayload>) => {
    if (!editBene) return;
    await updateBene.mutateAsync({ id: editBene.id, data });
    setEditBene(null);
  };

  const handleDeleteBene = async () => {
    if (!deleteBene) return;
    await deleteBeneM.mutateAsync(deleteBene);
    setDeleteBene(null);
  };

  const cinExpired = employee.cin_expired;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── En-tête ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate("/employees")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />{t("app.back")}
        </button>
        <div className="flex items-center gap-2">
          <RoleGuard permission="employee.update">
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <Edit2 className="w-4 h-4" />{t("common.edit")}
            </button>
          </RoleGuard>
          <RoleGuard permission="employee.delete">
            <button onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />{t("common.delete")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* ── Carte profil ─────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Photo */}
          <div className="shrink-0">
            <RoleGuard permission="employee.update"
              fallback={
                <div className="w-24 h-24 rounded-2xl overflow-hidden">
                  {employee.photo_url
                    ? <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                    : <div className="w-24 h-24 rounded-2xl bg-brand flex items-center justify-center text-white text-3xl font-bold">
                        {employee.first_name[0]}{employee.last_name[0]}
                      </div>}
                </div>
              }
            >
              <div className="relative group cursor-pointer" onClick={() => setShowPhotoEdit(true)}>
                {employee.photo_url
                  ? <img src={employee.photo_url} alt={employee.full_name}
                      className="w-24 h-24 rounded-2xl object-cover" />
                  : <div className="w-24 h-24 rounded-2xl bg-brand flex items-center justify-center text-white text-3xl font-bold">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                }
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
            </RoleGuard>
          </div>

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{employee.full_name}</h1>
                {employee.first_name_ar && (
                  <p className="text-lg text-gray-500 font-arabic" dir="rtl">
                    {employee.first_name_ar} {employee.last_name_ar}
                  </p>
                )}
              </div>
              <EmployeeStatusBadge status={employee.status} />
              {cinExpired && (
                <Badge variant="error">
                  <AlertTriangle className="w-3 h-3" />{t("employees.expiredCIN")}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <InfoChip label={t("employees.matricule")} value={employee.matricule} mono />
              <InfoChip label={t("employees.jobTitle")} value={employee.job_title} />
              <InfoChip label={t("employees.department")}
                value={`[${employee.department_info?.code}] ${employee.department_info?.name}`} />
              <InfoChip label={t("employees.contractType")} value={employee.contract_display} />
              <InfoChip label={t("employees.grade")} value={employee.grade || "—"} />
              <InfoChip label={t("employees.seniority")} value={employee.seniority_label} />
              <InfoChip label={t("employees.age")} value={employee.age ? `${employee.age}` : "—"} />
              <InfoChip label={t("beneficiaries.title")}
                value={t("employees.beneficiaryCount", { count: employee.beneficiaries.length })} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Onglets ──────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px
              ${activeTab === tabId ? "text-brand border-brand bg-blue-50" : "text-gray-500 border-transparent hover:text-gray-700"}`}>
            <Icon className="w-4 h-4" />{label}
            {tabId === "beneficiaries" && (
              <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {employee.beneficiaries.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          TAB : IDENTITÉ
      ════════════════════════════════════════════════ */}
      {activeTab === "identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title={t("employees.civilStatus")} icon={User}>
            <InfoRow label={t("employees.fullName")}     value={employee.full_name} />
            <InfoRow label={t("employees.gender")}           value={employee.gender_display} />
            <InfoRow label={t("employees.dateOfBirth")}  value={formatDate(employee.date_of_birth)} />
            <InfoRow label={t("employees.age")}             value={`${employee.age}`} />
            <InfoRow label={t("employees.placeOfBirth")}  value={employee.place_of_birth || "—"} />
            <InfoRow label={t("employees.maritalStatus")}  value={employee.marital_display} />
            <InfoRow label={t("employees.nationalityLabel")}     value={employee.nationality} />
          </Section>

          <Section title={t("employees.contacts")} icon={Phone}>
            <InfoRow label={t("employees.phone")}       value={<span dir="ltr">{employee.phone || "—"}</span>} />
            <InfoRow label={t("employees.phoneSecondary")} value={<span dir="ltr">{employee.phone_secondary || "—"}</span>} />
            <InfoRow label={t("employees.email")}      value={<span dir="ltr">{employee.email_professional || "—"}</span>} />
            <InfoRow label={t("employees.emailPersonal")}    value={<span dir="ltr">{employee.email_personal || "—"}</span>} />
            <InfoRow label={t("employees.address")}         value={employee.address || "—"} />
            <InfoRow label={t("employees.cityWilaya")}  value={`${employee.city || "—"} / ${employee.wilaya || "—"}`} />
          </Section>

          <Section title={t("employees.documents")} icon={Shield}>
            <InfoRow label={t("employees.nationalId")}    value={employee.national_id || "—"} mono />
            <InfoRow label={t("employees.cinExpiry")}
              value={employee.national_id_expiry ? formatDate(employee.national_id_expiry) : "—"}
              badge={cinExpired ? <Badge variant="error">{t("employees.expired")}</Badge> : undefined}
            />
            <InfoRow label={t("employees.socialSecurityNumber")} value={employee.social_security_number || "—"} mono />
            <InfoRow label={t("employees.taxId")}             value={employee.tax_id || "—"} mono />
          </Section>

          <Section title={t("employees.positionAndCareer")} icon={Briefcase}>
            <InfoRow label={t("employees.jobTitle")}           value={employee.job_title} />
            <InfoRow label={t("employees.grade")}           value={employee.grade || "—"} />
            <InfoRow label={t("employees.gradeLevel")}    value={employee.grade_level?.toString() || "—"} />
            <InfoRow label={t("employees.category")}   value={employee.category || "—"} />
            <InfoRow label={t("employees.contractType")}    value={employee.contract_display} />
            <InfoRow label={t("employees.dateHired")}   value={formatDate(employee.date_hired)} />
            {employee.date_end && <InfoRow label={t("employees.contractEnd")} value={formatDate(employee.date_end)} />}
            <InfoRow label={t("employees.seniority")}      value={employee.seniority_label} />
            {employee.manager_name && <InfoRow label={t("employees.manager")} value={employee.manager_name} />}
          </Section>

          {(employee.education_level || employee.education_field || employee.competencies.length > 0) && (
            <Section title={t("employees.training")} icon={Briefcase}>
              <InfoRow label={t("employees.educationLevel")} value={employee.education_level || "—"} />
              <InfoRow label={t("employees.educationField")}          value={employee.education_field || "—"} />
              {employee.competencies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {employee.competencies.map((c) => (
                    <Badge key={c} variant="info">{c}</Badge>
                  ))}
                </div>
              )}
            </Section>
          )}

          {employee.notes && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{t("employees.internalNotes")}</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{employee.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB : AYANTS DROIT
      ════════════════════════════════════════════════ */}
      {activeTab === "beneficiaries" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t("employees.beneficiaryCount", { count: employee.beneficiaries.length })}
              {" — "}{t("employees.eligibleCount", { count: employee.beneficiaries.filter((b) => b.is_eligible).length })}
            </p>
            <RoleGuard permission="employee.update">
              <button onClick={() => setShowAddBene(true)}
                className="flex items-center gap-2 px-3 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-light">
                <Plus className="w-4 h-4" />{t("beneficiaries.add")}
              </button>
            </RoleGuard>
          </div>

          {employee.beneficiaries.length === 0 ? (
            <EmptyState icon={Users} title={t("beneficiaries.noBeneficiaries")}
              description={t("employees.noHistoryDescription")}
              action={
                <RoleGuard permission="employee.update">
                  <button onClick={() => setShowAddBene(true)} className="btn-primary">
                    <Plus className="w-4 h-4 inline mr-1" />{t("beneficiaries.add")}
                  </button>
                </RoleGuard>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employee.beneficiaries.map((bene) => (
                <BeneficiaryCard key={bene.id} bene={bene}
                  onEdit={() => setEditBene(bene)}
                  onDelete={() => setDeleteBene(bene.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB : HISTORIQUE
      ════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="card p-5">
          <EmployeeHistory employeeId={id!} />
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB : STATUT
      ════════════════════════════════════════════════ */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("employees.fileStatus")}</h3>
            <div className="flex items-center gap-4 mb-6">
              <EmployeeStatusBadge status={employee.status} />
              <span className="text-sm text-gray-500">
                {t("employees.sinceDate", { date: formatDate(employee.date_hired) })}
              </span>
            </div>
            <RoleGuard permission="employee.update">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">{t("employees.changeStatus")}</p>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { s: "active",    label: t("employees.activate"),   color: "bg-green-600 hover:bg-green-700 text-white" },
                    { s: "inactive",  label: t("employees.deactivate"), color: "bg-gray-600 hover:bg-gray-700 text-white"  },
                    { s: "suspended", label: t("employees.suspendAction"), color: "bg-amber-500 hover:bg-amber-600 text-white"},
                    { s: "retired",   label: t("employees.retireAction"),  color: "bg-blue-600 hover:bg-blue-700 text-white"  },
                  ].map(({ s, label, color }) => (
                    <button key={s} disabled={employee.status === s}
                      onClick={() => { setNewStatus(s); setShowStatus(true); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${color}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </RoleGuard>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("employees.auditInfo")}</h3>
            <div className="space-y-2">
              <InfoRow label={t("employees.createdByLabel")}          value={employee.created_by_name || t("employees.system")} />
              <InfoRow label={t("employees.createdDateLabel")}  value={formatDateTime(employee.created_at)} />
              <InfoRow label={t("employees.lastModifiedLabel")}   value={formatDateTime(employee.updated_at)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={t("employees.edit")} size="xl">
        <EmployeeForm mode="edit" initialData={employee}
          onSubmit={handleUpdate} onCancel={() => setShowEdit(false)}
          isLoading={updateMutation.isPending} />
      </Modal>

      <Modal open={showPhotoEdit} onClose={() => setShowPhotoEdit(false)} title={t("employees.photoTitle")} size="sm">
        <div className="flex justify-center py-4">
          <PhotoUpload employeeId={id!} currentPhotoUrl={employee.photo_url} employeeName={employee.full_name} />
        </div>
      </Modal>

      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)}
        onConfirm={handleDelete} title={t("employees.confirmDeleteTitle")}
        message={t("employees.confirmDeleteEmployee", { name: employee.full_name })}
        confirmLabel={t("common.delete")} loading={deleteMutation.isPending} />

      <Modal open={showAddBene} onClose={() => setShowAddBene(false)} title={t("beneficiaries.add")} size="lg">
        <BeneficiaryForm onSubmit={handleAddBene} onCancel={() => setShowAddBene(false)}
          isLoading={createBene.isPending} />
      </Modal>

      <Modal open={!!editBene} onClose={() => setEditBene(null)} title={t("beneficiaries.edit")} size="lg">
        {editBene && (
          <BeneficiaryForm initialData={editBene}
            onSubmit={handleUpdateBene} onCancel={() => setEditBene(null)}
            isLoading={updateBene.isPending} />
        )}
      </Modal>

      <ConfirmDialog open={!!deleteBene} onClose={() => setDeleteBene(null)}
        onConfirm={handleDeleteBene} title={t("beneficiaries.deleteConfirmTitle")}
        message={t("beneficiaries.deleteConfirmMessage")}
        confirmLabel={t("common.delete")} loading={deleteBeneM.isPending} />

      <Modal open={showStatus} onClose={() => setShowStatus(false)} title={t("employees.changeStatus")} size="sm"
        footer={
          <>
            <button onClick={() => setShowStatus(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              {t("common.cancel")}
            </button>
            <button onClick={handleChangeStatus} disabled={changeStatus.isPending}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-light disabled:opacity-60">
              {t("app.confirm")}
            </button>
          </>
        }>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t("employees.changeStatusModal", { name: employee.full_name, status: newStatus })}
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{t("employees.reasonLabel")}</label>
            <textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)}
              rows={3} placeholder={t("employees.reasonPlaceholder")}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Composants utilitaires ─────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
        <Icon className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono, badge }: { label: string; value: React.ReactNode; mono?: boolean; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-32">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm text-gray-800 text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
        {badge}
      </div>
    </div>
  );
}

function InfoChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function BeneficiaryCard({ bene, onEdit, onDelete }: { bene: Beneficiary; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const RELATIONSHIP_COLORS: Record<string, string> = {
    spouse: "bg-purple-100 text-purple-700",
    child:  "bg-blue-100 text-blue-700",
    parent: "bg-orange-100 text-orange-700",
    sibling:"bg-teal-100 text-teal-700",
    other:  "bg-gray-100 text-gray-700",
  };

  return (
    <div className={`card p-4 border-l-4 ${bene.is_eligible ? "border-l-green-400" : "border-l-red-400"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RELATIONSHIP_COLORS[bene.relationship] ?? "bg-gray-100 text-gray-700"}`}>
              {bene.relationship_display}
            </span>
            {bene.is_eligible
              ? <CheckCircle2 className="w-4 h-4 text-green-500" aria-label={t("employees.eligible")} />
              : <XCircle     className="w-4 h-4 text-red-400"   aria-label={t("employees.notEligible")} />
            }
          </div>
          <p className="font-semibold text-gray-900">{bene.full_name}</p>
          <p className="text-xs text-gray-500">
            {bene.age != null ? `${bene.age}` : t("employees.ageUnknown")}
            {bene.is_student && ` · ${t("employees.student")}`}
            {bene.is_handicapped && ` · ${t("employees.handicapped")}`}
          </p>
        </div>
        <RoleGuard permission="employee.update">
          <div className="flex gap-1">
            <button onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-brand hover:bg-blue-50 rounded transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </RoleGuard>
      </div>

      {!bene.is_eligible && bene.ineligibility_reason && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {bene.ineligibility_reason}
        </div>
      )}

      {bene.school_name && (
        <p className="text-xs text-gray-500 mt-2">🎓 {bene.school_name} {bene.school_year && `(${bene.school_year})`}</p>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────
const formatDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" }) : "—";

const formatDateTime = (d: string) =>
  d ? new Date(d).toLocaleString("fr-DZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
