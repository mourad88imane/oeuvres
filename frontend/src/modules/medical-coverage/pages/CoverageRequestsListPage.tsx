import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Tabs, Tag } from "antd";
import { Plus, RefreshCw, Activity, CheckCircle, Clock, Printer } from "lucide-react";
import { useCoverageRequests, useCoverageRequestStatistics } from "../hooks/useCoverageRequests";
import { REQUEST_STATUS_UI } from "../types/request";

export function CoverageRequestsListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const { data, isLoading, refetch } = useCoverageRequests(
    tab !== "all" ? { status: tab } : {}
  );
  const { data: stats } = useCoverageRequestStatistics();

  const requests = data?.results ?? [];
  const pagination = data?.pagination;

  const statusTabs = [
    { key: "all", label: "Toutes" },
    { key: "pending_manager_approval", label: "En attente" },
    { key: "validated", label: "Validées" },
    { key: "printed", label: "Imprimées" },
  ];

  const kpiCards = stats ? [
    { label: "Total", value: stats.total, icon: Activity, color: "#3b82f6" },
    { label: "En attente", value: stats.pending, icon: Clock, color: "#f59e0b" },
    { label: "Validées", value: stats.validated, icon: CheckCircle, color: "#16a34a" },
    { label: "Imprimées", value: stats.printed, icon: Printer, color: "#9333ea" },
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
          <Button type="primary" onClick={() => navigate("/medical-coverage/requests/new")}
            icon={<Plus className="w-4 h-4" />}
            style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
            Nouvelle demande
          </Button>
        </div>
      </div>

      {kpiCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCards.map(k => (
            <Card key={k.label} size="small" className="text-center">
              <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <Tabs activeKey={tab} onChange={setTab} items={statusTabs.map(s => ({
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
              const ui = REQUEST_STATUS_UI[r.workflow_state as keyof typeof REQUEST_STATUS_UI] || {};
              return (
                <div key={r.id} onClick={() => navigate(`/medical-coverage/requests/${r.id}`)}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{r.request_number}</span>
                      <Tag color={ui.color}>{ui.label}</Tag>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{r.employee_name} — {r.partner_name}</p>
                    <p className="text-xs text-gray-400">{r.category_display} | {r.coverage_date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
