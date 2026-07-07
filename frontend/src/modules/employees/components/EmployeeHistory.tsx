import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Clock, Gift, HandCoins, FileText, ChevronDown, ChevronUp,
  ExternalLink, Filter,
} from "lucide-react";
import { useEmployeeBusinessHistory } from "../hooks/useEmployees";
import { Spinner, EmptyState } from "@shared/components/ui/index";
import type { BusinessHistoryRecord } from "../types";

interface EmployeeHistoryProps { employeeId: string; }

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; route: string }> = {
  benefit:          { icon: Gift,     color: "text-purple-600", bg: "bg-purple-100", route: "/benefits" },
  loan:             { icon: HandCoins, color: "text-amber-600", bg: "bg-amber-100", route: "/loans" },
  medical_voucher:  { icon: FileText,  color: "text-blue-600",  bg: "bg-blue-100",  route: "/medical-coverage/vouchers" },
  medical_request:  { icon: FileText,  color: "text-teal-600",  bg: "bg-teal-100",  route: "/medical-coverage/requests" },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", submitted: "Soumis", under_review: "En cours",
  on_hold: "En attente", pending_director_approval: "Approbation direction",
  validated: "Validé", approved: "Approuvé", rejected: "Rejeté",
  paid: "Payé", cancelled: "Annulé", consumed: "Consommé",
  pending_approval: "En attente", pending_manager_approval: "Approbation chef",
  printed: "Imprimé", closed: "Clôturé", active: "Actif", fully_repaid: "Remboursé",
};

export function EmployeeHistory({ employeeId }: EmployeeHistoryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useEmployeeBusinessHistory(employeeId);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!data?.data) return [];
    let items = data.data;
    if (typeFilter !== "all") items = items.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") items = items.filter((r) => r.status === statusFilter);
    return items;
  }, [data, typeFilter, statusFilter]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  if (!data?.data.length) {
    return (
      <EmptyState
        icon={Clock}
        title={t("employees.noHistory")}
        description="Aucune opération métier trouvée pour cet employé."
      />
    );
  }

  const typeOptions = Array.from(new Set(data.data.map((r) => r.type)));
  const statusOptions = Array.from(new Set(data.data.map((r) => r.status)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{data.count} opération(s)</p>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <Filter className="w-3 h-3" />
          Filtres
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-4 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="all">Tous les types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {TYPE_CONFIG[t] ? t : t}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="all">Tous les statuts</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Type</th>
              <th className="pb-2 pr-3">Référence</th>
              <th className="pb-2 pr-3">Bénéficiaire</th>
              <th className="pb-2 pr-3">Statut</th>
              <th className="pb-2 pr-3">Demandé par</th>
              <th className="pb-2 pr-3">Mis à jour</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <Row key={`${record.type}-${record.id}`} record={record} navigate={navigate} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ record, navigate }: { record: BusinessHistoryRecord; navigate: ReturnType<typeof useNavigate> }) {
  const cfg = TYPE_CONFIG[record.type];
  const Icon = cfg?.icon ?? FileText;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
      <td className="py-2.5 pr-3 whitespace-nowrap">
        {formatDate(record.date)}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${cfg?.bg ?? "bg-gray-100"}`}>
            <Icon className={`w-3.5 h-3.5 ${cfg?.color ?? "text-gray-500"}`} />
          </div>
          <span className="text-xs font-medium text-gray-700">{record.type_label}</span>
        </div>
      </td>
      <td className="py-2.5 pr-3 font-mono text-xs text-gray-600">{record.reference}</td>
      <td className="py-2.5 pr-3 text-xs text-gray-600">{record.beneficiary}</td>
      <td className="py-2.5 pr-3">
        <StatusBadge status={record.status} />
      </td>
      <td className="py-2.5 pr-3 text-xs text-gray-500">{record.requested_by || "—"}</td>
      <td className="py-2.5 pr-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(record.updated_at)}</td>
      <td className="py-2.5">
        {cfg && (
          <button
            onClick={() => navigate(`${cfg.route}/${record.id}`)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Détail <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-yellow-100 text-yellow-700",
    on_hold: "bg-orange-100 text-orange-700",
    pending_director_approval: "bg-purple-100 text-purple-700",
    pending_approval: "bg-yellow-100 text-yellow-700",
    pending_manager_approval: "bg-indigo-100 text-indigo-700",
    validated: "bg-green-100 text-green-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-gray-100 text-gray-500",
    consumed: "bg-teal-100 text-teal-700",
    printed: "bg-cyan-100 text-cyan-700",
    closed: "bg-gray-100 text-gray-500",
    active: "bg-green-100 text-green-700",
    fully_repaid: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status] ?? "bg-gray-100 text-gray-600"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" });
}
