import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { App as AntdApp, Button, Card } from "antd";
import { ArrowLeft, Save } from "lucide-react";
import { useCoverageRequest, useUpdateCoverageRequest } from "../hooks/useCoverageRequests";

export function CoverageRequestEditPage() {
  const { message } = AntdApp.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: request } = useCoverageRequest(id ?? null);
  const updateMut = useUpdateCoverageRequest(id!);

  const [category, setCategory] = useState("");
  const [coverageDate, setCoverageDate] = useState("");
  const [observation, setObservation] = useState("");

  useEffect(() => {
    if (request) {
      setCategory(request.category);
      setCoverageDate(request.coverage_date);
      setObservation(request.observation || "");
    }
  }, [request]);

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ category: category as any, coverage_date: coverageDate, observation });
      message.success("Demande modifiée");
      navigate(`/medical-coverage/requests/${id}`);
    } catch {
      message.error("Erreur lors de la modification");
    }
  };

  if (!request) {
    return <div className="text-center py-12 text-gray-400">Chargement...</div>;
  }

  if (request.workflow_state !== "draft") {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-500">Seules les demandes en brouillon peuvent être modifiées.</p>
        <Button onClick={() => navigate(`/medical-coverage/requests/${id}`)} className="mt-4">Retour</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(`/medical-coverage/requests/${id}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <Button type="primary" icon={<Save className="w-4 h-4" />}
          onClick={handleSave} loading={updateMut.isPending}
          style={{ background: "#ffda2d", borderColor: "#ffda2d", color: "#1a1917" }}>
          Enregistrer
        </Button>
      </div>

      <Card>
        <h1 className="text-xl font-bold mb-6">Modifier la demande {request.request_number}</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: "#4d4b46" }}>Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
              style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }}>
              <option value="analysis">Analyse Médicale</option>
              <option value="imaging">Imagerie Médicale</option>
              <option value="center">Centre Médical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: "#4d4b46" }}>Date de couverture</label>
            <input type="date" value={coverageDate} onChange={e => setCoverageDate(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium outline-none"
              style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: "#4d4b46" }}>Observation</label>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-medium outline-none resize-none"
              style={{ background: "#f3f2ee", border: "1px solid rgba(0,0,0,0.04)", color: "#1a1917" }} />
          </div>
        </div>
      </Card>
    </div>
  );
}
