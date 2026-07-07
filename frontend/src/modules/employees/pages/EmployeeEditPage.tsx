import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useEmployee, useUpdateEmployee } from "../hooks/useEmployees";
import { EmployeeForm } from "../components/EmployeeForm";
import { Spinner } from "@shared/components/ui/index";
import type { EmployeeUpdatePayload } from "../types";

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: employee, isLoading } = useEmployee(id ?? null);
  const updateMutation = useUpdateEmployee(id!);

  const handleSubmit = async (data: EmployeeUpdatePayload) => {
    await updateMutation.mutateAsync(data);
    navigate(`/employees/${id}`);
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`/employees/${id}`)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />{t("employees.back")}
        </button>
      </div>
      <h1 className="text-xl font-bold text-gray-900">{t("employees.edit")}</h1>
      <EmployeeForm mode="edit" initialData={employee}
        onSubmit={handleSubmit} onCancel={() => navigate(`/employees/${id}`)}
        isLoading={updateMutation.isPending} />
    </div>
  );
}
