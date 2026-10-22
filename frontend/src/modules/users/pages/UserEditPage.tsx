import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import apiClient from "@shared/api/apiClient";

const ROLE_OPTIONS = ["admin", "gestionnaire", "comptable", "consultant", "social_agent", "department_manager", "committee_member", "director"] as const;

export function UserEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "gestionnaire",
    is_active: true,
    password: "",
  });

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/users/${id}/`)
      .then((r) => {
        const d = r.data?.data || r.data;
        setForm({
          first_name: d.first_name || "",
          last_name: d.last_name || "",
          email: d.email || "",
          phone: d.phone || "",
          role: d.role || "gestionnaire",
          is_active: d.is_active !== undefined ? d.is_active : true,
          password: "",
        });
      })
      .catch(() => {
        message.error(t("users.loadError") || "Impossible de charger l'utilisateur");
        navigate("/users");
      })
      .finally(() => setFetching(false));
  }, [id, navigate, t]);

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        role: form.role,
        is_active: form.is_active,
      };
      if (form.password) {
        payload.password = form.password;
      }
      await apiClient.patch(`/users/${id}/`, payload);
      message.success(t("users.updated") || "Utilisateur modifié avec succès");
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

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t("common.loading")}
      </div>
    );
  }

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
        <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center text-white font-bold">
          {form.first_name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t("users.edit") || "Modifier l'utilisateur"}</h1>
          <p className="text-sm text-gray-500">{form.email}</p>
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
          error={errors.email} required disabled />

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

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full
              peer peer-checked:after:translate-x-full after:content-[''] after:absolute
              after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4
              after:transition-all peer-checked:bg-green-600" />
          </label>
          <span className="text-sm font-medium text-gray-700">
            {form.is_active ? t("users.active") : t("users.inactive")}
          </span>
          {errors.is_active && <p className="text-xs text-red-500">{errors.is_active}</p>}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-1">{t("users.password") || "Mot de passe"}</p>
          <p className="text-xs text-gray-400 mb-3">
            {t("users.passwordEditHint") || "Laissez vide pour conserver le mot de passe actuel"}
          </p>
          <Field label={t("users.newPassword") || "Nouveau mot de passe"} type="password" value={form.password}
            onChange={(v) => set("password", v)} error={errors.password} />
        </div>

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
            {loading ? (t("common.saving") || "Enregistrement...") : (t("common.save") || "Enregistrer")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, error, required, disabled }: {
  label: string;
  type?: string;
  value: string;
  onChange?: (v: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
