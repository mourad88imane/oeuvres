import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Pencil, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePartner } from "../api";
import { Spinner } from "@shared/components/ui/index";
import { PARTNER_TYPE_UI, PARTNER_CATEGORY_UI } from "../types";
import { fmtDate, fmtDateTime } from "../utils/formatters";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";

export function PartnerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: partner, isLoading } = usePartner(id ?? null);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!partner) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>{t("conventions.partnerNotFound")}</p>
      </div>
    );
  }

  const rows = (items: { label: string; value: React.ReactNode }[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(item => (
        <div key={item.label}>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{item.label}</span>
          <p className="mt-1 text-sm text-gray-900">{item.value || "--"}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/conventions/partners")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("conventions.back")}
        </button>
        <RoleGuard permission="partner.update">
          <button onClick={() => navigate(`/conventions/partners/${partner.id}/edit`)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-brand text-white rounded-lg hover:bg-blue-800">
            <Pencil className="w-4 h-4" />{t("common.edit")}
          </button>
        </RoleGuard>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#ffda2d] flex items-center justify-center">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
          <p className="text-sm text-gray-500">{partner.code || t("conventions.noCode")}</p>
        </div>
        {!partner.is_active && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500 ml-auto">
            {t("conventions.inactive")}
          </span>
        )}
      </div>

      {/* Required Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("conventions.tabRequired")}</h2>
        {rows([
          { label: t("conventions.partnerName"), value: partner.name },
          { label: t("conventions.code"), value: partner.code },
          { label: t("conventions.partnerType"), value: partner.type ? PARTNER_TYPE_UI[partner.type] : "--" },
          { label: t("conventions.partnerCategory"), value: partner.category ? PARTNER_CATEGORY_UI[partner.category] || partner.category : "--" },
          { label: t("common.status"), value: partner.is_active ? t("conventions.active") : t("conventions.inactive") },
        ])}
      </div>

      {/* Contact Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("conventions.tabContact")}</h2>
        {rows([
          { label: t("conventions.address"), value: partner.address },
          { label: t("conventions.city"), value: partner.city },
          { label: t("conventions.wilaya"), value: partner.wilaya },
          { label: t("conventions.postalCode"), value: partner.postal_code },
          { label: t("conventions.phone"), value: partner.phone },
          { label: t("conventions.mobile"), value: partner.contact_phone },
          { label: t("conventions.email"), value: partner.email },
          { label: t("conventions.contactPerson"), value: partner.contact_name },
          { label: t("conventions.contactEmail"), value: partner.contact_email },
          { label: t("conventions.website"), value: partner.website ? <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{partner.website}</a> : "--" },
        ])}
      </div>

      {/* Additional Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t("conventions.tabAdditional")}</h2>
        {rows([
          { label: t("conventions.description"), value: partner.description },
          { label: t("conventions.notes"), value: partner.notes },
          { label: t("conventions.legalForm"), value: partner.legal_form },
          { label: t("conventions.registrationNumber"), value: partner.registration_number },
          { label: t("conventions.taxId"), value: partner.tax_id },
          { label: t("conventions.rcNumber"), value: partner.rc_number },
          { label: t("conventions.gpsCoordinates"), value: partner.gps_coordinates },
          { label: t("conventions.createdBy"), value: partner.created_by_name },
          { label: t("common.createdAt"), value: fmtDateTime(partner.created_at) },
          { label: t("common.updatedAt"), value: fmtDateTime(partner.updated_at) },
        ])}
      </div>

      {/* Conventions */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-800">{t("conventions.partnerConventions")}</h2>
          {partner.conventions && (
            <span className="ml-auto text-xs text-gray-400">{partner.conventions.length} {t("conventions.conventionsCount", { count: partner.conventions.length })}</span>
          )}
        </div>
        {partner.conventions && partner.conventions.length > 0 ? (
          <div className="space-y-3">
            {partner.conventions.map((conv) => (
              <div key={conv.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                onClick={() => navigate(`/conventions/${conv.id}`)}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{conv.reference}</span>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      conv.status === "active" ? "bg-green-100 text-green-700" :
                      conv.status === "draft" ? "bg-gray-100 text-gray-600" :
                      conv.status === "expired" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {conv.status_display}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{conv.title}</p>
                </div>
                <div className="text-right text-xs text-gray-400 ml-4 shrink-0">
                  <div>{fmtDate(conv.start_date)} — {fmtDate(conv.end_date)}</div>
                  {conv.amount != null && (
                    <div className="mt-0.5 font-medium text-gray-600">{Number(conv.amount).toLocaleString()} DZD</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">{t("conventions.noConventions")}</p>
        )}
      </div>
    </div>
  );
}
