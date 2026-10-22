import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, ChevronLeft, ChevronRight,
  Microscope, Scan, Building2, Eye, X, Filter,
  Calendar,
} from "lucide-react";
import { useToast } from "@shared/components/ui/index";
import { RoleGuard } from "@shared/components/layout/ProtectedRoute";
import { medicalCoverageApi } from "../api";
import { VOUCHER_STATUS_UI } from "../types";
import type { MedicalCoverageFilters, VoucherStatus } from "../types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  analysis: Microscope,
  imaging: Scan,
  center: Building2,
};

const TYPE_LABELS: Record<string, string> = {
  analysis: "Analyse Médicale",
  imaging: "Imagerie Médicale",
  center: "Centre Médical",
};

interface Props {
  coverageType?: string;
}

export function MedicalCoverageListPage({ coverageType }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | "">("");
  const [beneficiaryTypeFilter, setBeneficiaryTypeFilter] = useState<"" | "employee" | "dependent">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filters: MedicalCoverageFilters = {
    coverage_type: coverageType,
    search,
    status: statusFilter,
    beneficiary_type: beneficiaryTypeFilter,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    page_size: 25,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["medicalCoverage", filters],
    queryFn: () => medicalCoverageApi.list(filters).then(r => r.data),
    placeholderData: p => p,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => medicalCoverageApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicalCoverage"] });
      toast.success("Bon supprimé");
    },
  });

  const vouchers = data?.results ?? [];
  const pagination = data?.pagination;

  const hasActiveFilters = search || statusFilter || beneficiaryTypeFilter || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setBeneficiaryTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const Icon = (coverageType && TYPE_ICONS[coverageType]) || Microscope;
  const typeLabel = (coverageType && TYPE_LABELS[coverageType]) || "Couverture Médicale";

  const newPath = "/medical-coverage/new";

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#ffda2d" }}>
            <Icon className="w-5 h-5" style={{ color: "#1a1917" }} />
          </div>
          <div>
            <h1 className="text-xl font-black" style={{ color: "#1a1917" }}>{typeLabel}</h1>
            <p className="text-xs font-medium" style={{ color: "#8a8882" }}>Gestion des bons de prise en charge</p>
          </div>
        </div>
        <RoleGuard permission="coverage.create">
          <button
            onClick={() => navigate(newPath)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all"
            style={{ background: "#ffda2d", color: "#1a1917" }}
          >
            <Plus className="w-4 h-4" />
            Nouveau bon
          </button>
        </RoleGuard>
      </div>

      <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
        {/* ── Filters bar ──────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
            <input
              type="text"
              placeholder="Rechercher par référence, nom, matricule..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none font-medium"
              style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as VoucherStatus | ""); setPage(1); }}
            className="text-sm rounded-xl px-3 py-2 font-medium outline-none"
            style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(VOUCHER_STATUS_UI).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
            style={{
              background: showFilters || hasActiveFilters ? "rgba(255,218,45,0.12)" : "#f3f2ee",
              color: "#1a1917",
            }}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full" style={{ background: "#ffda2d" }} />
            )}
          </button>
        </div>

        {/* ── Expanded filters ─────────────────────────────── */}
        {showFilters && (
          <div className="p-4 rounded-2xl mb-5 flex flex-wrap items-end gap-4"
            style={{ background: "#f8f7f4", border: "1px solid rgba(0,0,0,0.04)" }}>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>
                Bénéficiaire
              </label>
              <select
                value={beneficiaryTypeFilter}
                onChange={e => { setBeneficiaryTypeFilter(e.target.value as "" | "employee" | "dependent"); setPage(1); }}
                className="text-sm rounded-xl px-3 py-2 font-medium outline-none"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", color: "#1a1917" }}
              >
                <option value="">Tous</option>
                <option value="employee">Employé</option>
                <option value="dependent">Ayant droit</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>
                Date début
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#a8a49a" }} />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="pl-8 pr-3 py-2 text-sm rounded-xl outline-none font-medium"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", color: "#1a1917", width: 160 }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>
                Date fin
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#a8a49a" }} />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="pl-8 pr-3 py-2 text-sm rounded-xl outline-none font-medium"
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)", color: "#1a1917", width: 160 }}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                style={{ color: "#dc2626", background: "rgba(239,68,68,0.08)" }}
              >
                <X className="w-3.5 h-3.5" />
                Effacer les filtres
              </button>
            )}
          </div>
        )}

        {/* ── Table ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#ffda2d] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Icon className="w-12 h-12 mb-3" style={{ color: "#d4d0c8" }} />
            <p className="text-sm font-bold" style={{ color: "#8a8882" }}>Aucun bon trouvé</p>
            <RoleGuard permission="coverage.create">
              <button
                onClick={() => navigate(newPath)}
                className="mt-3 px-4 py-2 rounded-2xl font-bold text-sm"
                style={{ background: "#ffda2d", color: "#1a1917" }}
              >
                Créer un bon
              </button>
            </RoleGuard>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Réf.</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Employé</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Bénéficiaire</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Type</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Date</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Statut</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider" style={{ color: "#8a8882" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => {
                  const statusUI = VOUCHER_STATUS_UI[v.workflow_state] || VOUCHER_STATUS_UI.draft;
                  return (
                    <tr key={v.id} className="cursor-pointer" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                      onClick={() => navigate(`/medical-coverage/${coverageType || v.coverage_type_code}/${v.id}`)}
                    >
                      <td className="py-3 font-bold" style={{ color: "#1a1917" }}>{v.reference}</td>
                      <td className="py-3">
                        <div>
                          <p className="font-bold" style={{ color: "#1a1917" }}>{v.employee_name}</p>
                          <p className="text-xs font-medium" style={{ color: "#8a8882" }}>{v.employee_matricule}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-medium" style={{ color: "#4d4b46" }}>
                          {v.beneficiary_name || v.employee_name}
                        </span>
                        {v.beneficiary_type === "dependent" && (
                          <span className="text-[10px] ml-1 font-black uppercase" style={{ color: "#a8a49a" }}>(AD)</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold"
                          style={{ background: "rgba(255,218,45,0.1)", color: "#4d4b46" }}>
                          {v.coverage_type_name}
                        </span>
                      </td>
                      <td className="py-3 font-medium" style={{ color: "#4d4b46" }}>{v.request_date}</td>
                      <td className="py-3">
                        <span className="inline-block px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-wider"
                          style={{ color: statusUI.color, background: statusUI.bg }}>
                          {statusUI.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/medical-coverage/${coverageType || v.coverage_type_code}/${v.id}`); }}
                            className="p-1.5 rounded-xl transition-colors"
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <Eye className="w-4 h-4" style={{ color: "#8a8882" }} />
                          </button>
                           {v.workflow_state === "draft" && (
                            <RoleGuard permission="coverage.update">
                              <button
                                onClick={e => { e.stopPropagation(); deleteMutation.mutate(v.id); }}
                                className="p-1.5 rounded-xl transition-colors"
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <X className="w-4 h-4" style={{ color: "#dc2626" }} />
                              </button>
                            </RoleGuard>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
            <span className="text-xs font-medium" style={{ color: "#8a8882" }}>
              Page {pagination.page} sur {pagination.total_pages} ({pagination.count} résultats)
            </span>
            <div className="flex gap-1">
              <button
                disabled={!pagination.previous}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-xl transition-colors disabled:opacity-30"
                style={{ background: "#f3f2ee" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={!pagination.next}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-xl transition-colors disabled:opacity-30"
                style={{ background: "#f3f2ee" }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
