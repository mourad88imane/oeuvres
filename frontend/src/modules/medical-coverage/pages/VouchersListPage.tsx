import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

export function VouchersListPage() {
  const navigate = useNavigate();
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold mb-4" style={{ color: "#8a8882" }}>
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <div className="text-center py-16">
        <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: "#d4d2cc" }} />
        <h1 className="text-2xl font-black mb-2" style={{ color: "#1a1917" }}>Bons de prise en charge</h1>
        <p className="text-sm font-medium" style={{ color: "#8a8882" }}>Module en cours de développement.</p>
      </div>
    </div>
  );
}