import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { authApi } from "../api";
import { useAuthStore } from "../store/authStore";

/**
 * Aligné avec AUTH_PASSWORD_VALIDATORS du backend :
 * - dev : MinimumLengthValidator min_length=10
 * - prod : min_length=12
 * - CommonPasswordValidator / UserAttributeSimilarityValidator / NumericPasswordValidator
 */
const MIN_PASSWORD_LENGTH = 10;

interface FieldErrors {
  old_password?: string;
  new_password?: string;
  confirm_password?: string;
  general?: string;
}

/** Score de robustesse 0..5 : longueur + variété de classes de caractères. */
function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

function StrengthMeter({ password }: { password: string }) {
  const { t } = useTranslation();
  if (!password) return null;

  const score = passwordStrength(password);
  const labels = [
    t("auth.password_strength_weak", "Faible"),
    t("auth.password_strength_weak", "Faible"),
    t("auth.password_strength_fair", "Moyen"),
    t("auth.password_strength_good", "Bon"),
    t("auth.password_strength_strong", "Fort"),
    t("auth.password_strength_strong", "Fort"),
  ];
  const colors = [
    "bg-red-500",
    "bg-red-500",
    "bg-red-400",
    "bg-amber-400",
    "bg-green-500",
    "bg-green-500",
  ];
  const textColors = [
    "text-red-600",
    "text-red-600",
    "text-red-500",
    "text-amber-600",
    "text-green-600",
    "text-green-600",
  ];

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs font-medium ${textColors[score]}`}>
        {t("auth.password_strength_label", "Force du mot de passe")} : {labels[score]}
      </p>
    </div>
  );
}

/** Champ mot de passe avec bouton afficher/masquer et erreur inline. */
function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  hint,
  inputId,
  showStrength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  hint?: string;
  inputId: string;
  showStrength?: boolean;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full px-4 py-2 pr-11 border rounded-lg focus:ring-2 focus:outline-none transition ${
            error
              ? "border-red-400 focus:ring-red-200 focus:border-red-500"
              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
          }`}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? t("auth.hide_password", "Masquer le mot de passe")
              : t("auth.show_password", "Afficher le mot de passe")
          }
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {showStrength && <StrengthMeter password={value} />}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Page hors ProtectedRoute : un visiteur non connecté est renvoyé au login.
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  // Changement forcé (1ère connexion / expiration) OU volontaire (préventif) :
  // la page est accessible dans les deux cas, seul le sous-titre diffère.
  const forced = !!user.must_change_password;

  const validate = (values = form): FieldErrors => {
    const errs: FieldErrors = {};
    if (!values.old_password) {
      errs.old_password = t("auth.current_password_required", "Le mot de passe actuel est requis");
    }
    if (!values.new_password) {
      errs.new_password = t("auth.new_password_required", "Le nouveau mot de passe est requis");
    } else if (values.new_password.length < MIN_PASSWORD_LENGTH) {
      errs.new_password = t(
        "auth.password_too_short",
        "Le mot de passe doit contenir au moins 10 caractères"
      );
    }
    if (!values.confirm_password) {
      errs.confirm_password = t("auth.confirm_password_required", "La confirmation est requise");
    } else if (values.new_password && values.new_password !== values.confirm_password) {
      errs.confirm_password = t(
        "auth.passwords_dont_match",
        "Les mots de passe ne correspondent pas"
      );
    }
    return errs;
  };

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    // Validation en direct après une première tentative de soumission.
    // NB: valider `next` (pas `form`, qui n'est pas encore à jour).
    if (attempted) {
      const fresh = validate(next);
      // `[field]: fresh[field]` (undefined si pas d'erreur) efface aussi
      // l'erreur serveur affichée sur ce champ quand l'utilisateur le corrige,
      // et le bandeau général disparaît dès qu'on touche au formulaire.
      setErrors((prev) => ({ ...prev, general: undefined, ...fresh, [field]: fresh[field] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setLoading(true);
    try {
      await authApi.changePassword({
        old_password: form.old_password,
        new_password: form.new_password,
        confirm_password: form.confirm_password,
      });
      if (user) {
        // Rafraîchit aussi l'état d'expiration local : le mot de passe vient
        // d'être changé, il ne peut plus être « proche d'expiration » (évite
        // un bandeau périmé au rechargement avant le prochain refresh token).
        setUser({
          ...user,
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
          password_expires_in_days: null,
        });
      }
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      // Enveloppe API : { status, code, message, errors: { old_password: [...], new_password: [...], ... } }
      const data = err?.response?.data;
      const fieldErrors = data?.errors;
      const serverErrors: FieldErrors = {};
      if (fieldErrors?.detail) serverErrors.general = fieldErrors.detail;
      else if (data?.detail) serverErrors.general = data.detail;
      if (Array.isArray(fieldErrors?.old_password))
        serverErrors.old_password = fieldErrors.old_password[0];
      if (Array.isArray(fieldErrors?.new_password))
        serverErrors.new_password = fieldErrors.new_password[0];
      if (Array.isArray(fieldErrors?.confirm_password))
        serverErrors.confirm_password = fieldErrors.confirm_password[0];
      if (Array.isArray(fieldErrors?.non_field_errors))
        serverErrors.general = serverErrors.general || fieldErrors.non_field_errors[0];
      // Filet de sécurité : le message d'enveloppe si rien n'a été mappé.
      if (Object.keys(serverErrors).length === 0 && data?.message)
        serverErrors.general = data.message;
      // Erreur réseau (pas de réponse) : au moins un retour utilisateur.
      if (Object.keys(serverErrors).length === 0 && !data && err?.message)
        serverErrors.general = err.message;
      setErrors(serverErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          {t("auth.change_password_title", "Changer le mot de passe")}
        </h1>
        <p className="text-gray-500 text-center mb-6">
          {forced
            ? t(
                "auth.change_password_subtitle",
                "Vous devez changer votre mot de passe avant de continuer."
              )
            : t(
                "auth.change_password_subtitle_voluntary",
                "Changez votre mot de passe quand vous le souhaitez pour renforcer la sécurité de votre compte."
              )}
        </p>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <PasswordField
            label={t("auth.current_password", "Mot de passe actuel")}
            value={form.old_password}
            onChange={handleChange("old_password")}
            error={errors.old_password}
            autoComplete="current-password"
            inputId="old-password"
          />
          <PasswordField
            label={t("auth.new_password", "Nouveau mot de passe")}
            value={form.new_password}
            onChange={handleChange("new_password")}
            error={errors.new_password}
            autoComplete="new-password"
            inputId="new-password"
            showStrength
            hint={t(
              "auth.password_hint",
              "10 caractères minimum — mélangez majuscules, minuscules, chiffres et symboles. Évitez les mots de passe courants ou trop proches de votre email."
            )}
          />
          <PasswordField
            label={t("auth.confirm_new_password", "Confirmer le nouveau mot de passe")}
            value={form.confirm_password}
            onChange={handleChange("confirm_password")}
            error={errors.confirm_password}
            autoComplete="new-password"
            inputId="confirm-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading
              ? t("common.loading", "Chargement...")
              : t("auth.change_password_btn", "Changer le mot de passe")}
          </button>
        </form>
      </div>
    </div>
  );
}
