import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import apiClient from "@shared/api/apiClient";

const ROLE_OPTIONS = ["admin", "gestionnaire", "comptable", "consultant", "social_agent", "department_manager", "committee_member", "director"] as const;

export function UserCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "gestionnaire",
    password: "",
  });

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await apiClient.post("/users/", form);
      message.success(t("users.created") || "Utilisateur créé avec succès");
      navigate("/users");
    } catch (err: any) {
      if (err?.response?.data?.errors) {
        const fieldErrors: Record<string, string[]> = err.response.data.errors;
        const mapped: Record<string, string> = {};
        Object.entries(fieldErrors).forEach(([field, msgs]) => {
          mapped[field] = msgs[0];
        });
        setErrors(mapped);
      } else if (err?.response?.data?.message) {
        setErrors({ non_field: err.response.data.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/users")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center">
          <UserPlus className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("users.add")}</h1>
          <p className="text-sm text-gray-500">{t("users.createNew") || "Créer un nouveau compte utilisateur"}</p>
        </div>
      </div>

      {errors.non_field && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errors.non_field}
        </div>
      )}

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("users.firstName")} value={form.first_name}
            onChange={(v) => set("first_name", v)} error={errors.first_name} required />
          <Field label={t("users.lastName")} value={form.last_name}
            onChange={(v) => set("last_name", v)} error={errors.last_name} required />
        </div>

        <Field label={t("users.email")} type="email" value={form.email}
          onChange={(v) => set("email", v)} error={errors.email} required />

        <Field label={t("users.phone")} type="tel" value={form.phone}
          onChange={(v) => set("phone", v)} error={errors.phone} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("users.role")} *</label>
          <select
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500">
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{t(`users.${r}`) || r}</option>
            ))}
          </select>
          {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
        </div>

        <Field label={t("users.password")} type="password" value={form.password}
          onChange={(v) => set("password", v)} error={errors.password} required />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate("/users")}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg
              hover:bg-gray-200 transition-colors">
            {t("common.cancel") || "Annuler"}
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-brand rounded-lg
              hover:bg-brand-light transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            {loading ? (t("common.creating") || "Création...") : (t("common.create") || "Créer")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, error, required }: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
