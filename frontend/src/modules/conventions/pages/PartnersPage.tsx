import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Search, RefreshCw, Plus, ChevronLeft, ChevronRight,
  Eye, Pencil, Archive, Trash2,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { usePartners, useUpdatePartner, useDeletePartner } from "../api/index";
import { EmptyState, Spinner, Modal } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { PARTNER_TYPE_UI, PARTNER_CATEGORY_UI } from "../types";
import { fmtDate } from "../utils/formatters";

export function PartnersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string; active: boolean } | null>(null);

  const { data, isLoading, refetch } = usePartners({
    search,
    type: typeFilter || undefined,
    category: categoryFilter || undefined,
    is_active: activeFilter || undefined,
    page,
    page_size: 25,
  });

  const updateMut = useUpdatePartner();
  const deleteMut = useDeletePartner();

  const partners = data?.results ?? [];
  const pagination = data?.pagination;

  const handleArchive = async () => {
    if (!archiveTarget) return;
    await updateMut.mutateAsync({
      id: archiveTarget.id,
      data: { is_active: !archiveTarget.active },
    });
    setArchiveTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("conventions.partners")}</h1>
          <p className="text-gray-500 text-sm">{t("conventions.partnersCount", { count: pagination?.count ?? 0 })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          <RoleGuard permission="partner.create">
            <button onClick={() => navigate("/conventions/partners/new")}
              className="flex items-center gap-2 px-3 py-2 bg-brand text-white text-sm rounded-lg hover:bg-blue-800">
              <Plus className="w-4 h-4" />{t("conventions.addPartner")}
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder={t("conventions.searchPartners")}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">{t("conventions.allTypes")}</option>
          {Object.entries(PARTNER_TYPE_UI).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">{t("conventions.allCategories")}</option>
          {Object.entries(PARTNER_CATEGORY_UI).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">{t("common.all")}</option>
          <option value="true">{t("conventions.active")}</option>
          <option value="false">{t("conventions.inactive")}</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : partners.length === 0 ? (
          <EmptyState icon={Building2} title={t("conventions.noPartners")}
            description={t("conventions.noPartnersDescription")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[t("conventions.code"), t("conventions.partnerName"), t("conventions.partnerCategory"), "Type", t("conventions.phone"), t("conventions.email"), t("common.status"), t("common.createdAt"), ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {partners.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.code || "--"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3">
                      {p.category ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {PARTNER_CATEGORY_UI[p.category] || p.category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.type_display || "--"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.phone || "--"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.email || "--"}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full",
                        p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                        {p.is_active ? t("conventions.active") : t("conventions.inactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/conventions/partners/${p.id}`)}
                          title={t("common.view")}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <RoleGuard permission="partner.update">
                          <button onClick={() => navigate(`/conventions/partners/${p.id}/edit`)}
                            title={t("common.edit")}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setArchiveTarget({ id: p.id, name: p.name, active: p.is_active })}
                            title={p.is_active ? t("conventions.archive") : t("conventions.restore")}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600">
                            <Archive className="w-4 h-4" />
                          </button>
                          <RoleGuard permission="partner.delete">
                            <button onClick={() => setDeleteTarget(p.id)}
                              title={t("common.delete")}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </RoleGuard>
                        </RoleGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">{t("conventions.results", { count: pagination.count })}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.previous}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm text-brand font-medium">
                {pagination.page} / {pagination.total_pages}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.next}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archive/Restore modal */}
      <Modal open={!!archiveTarget} onClose={() => setArchiveTarget(null)}
        title={archiveTarget?.active ? t("conventions.archivePartner") : t("conventions.restorePartner")}>
        <p className="text-sm text-gray-600 mb-4">
          {archiveTarget?.active
            ? t("conventions.archiveConfirm", { name: archiveTarget?.name })
            : t("conventions.restoreConfirm", { name: archiveTarget?.name })}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setArchiveTarget(null)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            {t("common.cancel")}
          </button>
          <button onClick={handleArchive} disabled={updateMut.isPending}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {archiveTarget?.active ? t("conventions.archive") : t("conventions.restore")}
          </button>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title={t("common.delete")}>
        <p className="text-sm text-gray-600 mb-4">{t("conventions.deleteConfirm")}</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            {t("common.cancel")}
          </button>
          <button onClick={handleDelete} disabled={deleteMut.isPending}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {t("common.delete")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
