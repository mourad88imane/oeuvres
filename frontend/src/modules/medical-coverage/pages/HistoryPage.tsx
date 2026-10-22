import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Clock } from "lucide-react";
import { coverageRequestApi } from "../api/requests";
import type { WorkflowLogEntry } from "../types/request";

export function HistoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: requestLogs, isLoading } = useQuery({
    queryKey: ["coverage-requests", "all", "history-page"],
    queryFn: async () => {
      const resp = await coverageRequestApi.list({ page_size: 200 });
      const requests = resp.data.results ?? [];
      const logPromises = requests.map(r =>
        coverageRequestApi.workflowLog(r.id).then(lr => ({
          request: r,
          logs: lr.data.data ?? [],
        })).catch(() => ({ request: r, logs: [] }))
      );
      const results = await Promise.all(logPromises);
      return results.flatMap(({ request, logs }) =>
        logs.map((log: WorkflowLogEntry) => ({ ...log, request }))
      ).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    placeholderData: prev => prev,
  });

  const filtered = requestLogs
    ? search
      ? requestLogs.filter(e =>
          e.request.request_number.toLowerCase().includes(search.toLowerCase()) ||
          e.request.employee_name.toLowerCase().includes(search.toLowerCase()) ||
          e.transition_name.toLowerCase().includes(search.toLowerCase())
        )
      : requestLogs
    : [];

  const stateLabel = (s: string) => {
    const labels: Record<string, string> = {
      draft: "Brouillon", submitted: "Soumise", pending_approval: "En attente",
      pending_manager_approval: "Chef de service", pending_director_approval: "Directeur",
      validated: "Validée", rejected: "Rejetée", printed: "Imprimée",
      closed: "Clôturée", cancelled: "Annulée",
    };
    return labels[s] || s;
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl transition-colors" style={{ background: "#f3f2ee" }}>
            <ArrowLeft className="w-4 h-4" style={{ color: "#4d4b46" }} />
          </button>
          <div>
            <h1 className="text-xl font-black" style={{ color: "#1a1917" }}>Historique</h1>
            <p className="text-xs font-medium" style={{ color: "#8a8882" }}>
              Toutes les transitions de workflow
            </p>
          </div>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8a49a" }} />
          <input
            type="text" placeholder="Rechercher par demande, employé..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none font-medium"
            style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#ffda2d] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Clock className="w-12 h-12 mb-3" style={{ color: "#d4d2cc" }} />
            <p className="text-sm font-bold" style={{ color: "#8a8882" }}>
              {search ? "Aucun résultat" : "Aucun historique disponible"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Date</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Demande</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Employé</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Transition</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>De → Vers</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Acteur</th>
                  <th className="pb-3 font-black text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: "#8a8882" }}>Motif</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry: any) => (
                  <tr key={entry.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td className="py-3 font-medium whitespace-nowrap" style={{ color: "#8a8882" }}>
                      {new Date(entry.timestamp).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 font-bold" style={{ color: "#1a1917" }}>
                      <button onClick={() => navigate(`/medical-coverage/requests/${entry.request.id}`)}
                        className="hover:underline">
                        {entry.request.request_number}
                      </button>
                    </td>
                    <td className="py-3 font-medium" style={{ color: "#4d4b46" }}>{entry.request.employee_name}</td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold"
                        style={{ background: "rgba(255,218,45,0.1)", color: "#4d4b46" }}>
                        {entry.transition_name}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-xs font-medium" style={{ color: "#8a8882" }}>
                        {stateLabel(entry.from_state)}
                      </span>
                      <span className="mx-1.5" style={{ color: "#d4d2cc" }}>→</span>
                      <span className="text-xs font-bold" style={{ color: "#16a34a" }}>
                        {stateLabel(entry.to_state)}
                      </span>
                    </td>
                    <td className="py-3 font-medium" style={{ color: "#4d4b46" }}>{entry.actor_email}</td>
                    <td className="py-3 text-xs font-medium" style={{ color: "#8a8882" }}>
                      {entry.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
