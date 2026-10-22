/**
 * PROFILE PAGE — « Mon profil »
 * Affiche les informations de l'utilisateur connecté à partir du store
 * (aucun appel API supplémentaire) : email, rôle, date d'inscription,
 * dernière modification du mot de passe et état d'expiration.
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, KeyRound, Mail, ShieldCheck, Timer } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { fmtDate } from "@shared/utils/format";

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(0,0,0,0.04)" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#a8a49a" }}>
          {label}
        </p>
        <div className="text-sm font-semibold mt-0.5" style={{ color: "#1a1917" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Page hors garde de module : un visiteur non connecté est renvoyé au login
  // (cohérent avec ChangePasswordPage, également hors ProtectedRoute).
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const daysLeft = user.password_expires_in_days ?? null;
  const warningDays = user.password_expiration_warning_days ?? 0;

  // État du mot de passe
  let statusText: string;
  let statusColor = "#059669";
  let statusBg = "rgba(5,150,105,0.12)";
  if (daysLeft === null) {
    if (!user.password_changed_at) {
      // Compte hérité (jamais suivi) : pas d'expiration connue
      statusText = t("profile.passwordNotTracked", "Non suivi (compte hérité)");
      statusColor = "#8a8882";
      statusBg = "rgba(0,0,0,0.06)";
    } else {
      // Politique désactivée : jamais expiré
      statusText = t("profile.passwordActive", "À jour");
    }
  } else if (daysLeft === 0) {
    statusText = t("profile.passwordExpired", "Expiré — veuillez le changer");
    statusColor = "#dc2626";
    statusBg = "rgba(220,38,38,0.12)";
  } else if (warningDays > 0 && daysLeft <= warningDays) {
    statusText = t("profile.passwordExpiresSoon", { count: daysLeft });
    statusColor = "#b45309";
    statusBg = "rgba(180,83,9,0.12)";
  } else {
    statusText = t("profile.passwordActive", "À jour");
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center gap-4 p-6" style={{ background: "rgba(255,218,45,0.08)", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0"
            style={{ background: "#ffda2d", color: "#1a1917" }}
          >
            {user.full_name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black truncate" style={{ color: "#1a1917" }}>
              {user.full_name}
            </h1>
            <p className="text-sm font-bold" style={{ color: "#8a8882" }}>
              {user.role_display}
            </p>
          </div>
        </div>

        {/* Informations */}
        <div className="px-6 py-2">
          <InfoRow icon={<Mail size={16} style={{ color: "#8a8882" }} />} label={t("profile.email", "Email")}>
            {user.email}
          </InfoRow>
          <InfoRow icon={<ShieldCheck size={16} style={{ color: "#8a8882" }} />} label={t("profile.role", "Rôle")}>
            {user.role_display}
          </InfoRow>
          <InfoRow icon={<CalendarDays size={16} style={{ color: "#8a8882" }} />} label={t("profile.memberSince", "Membre depuis")}>
            {user.date_joined ? fmtDate(user.date_joined) : "—"}
          </InfoRow>
          <InfoRow icon={<KeyRound size={16} style={{ color: "#8a8882" }} />} label={t("auth.lastPasswordChange", "Dernière modification du mot de passe")}>
            {user.password_changed_at ? fmtDate(user.password_changed_at) : t("auth.passwordNeverChanged", "Jamais modifié")}
          </InfoRow>
          <InfoRow icon={<Timer size={16} style={{ color: "#8a8882" }} />} label={t("profile.passwordStatus", "État du mot de passe")}>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: statusBg, color: statusColor }}
            >
              {statusText}
            </span>
          </InfoRow>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2">
          <button
            type="button"
            onClick={() => navigate("/change-password")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            <KeyRound size={16} />
            {t("profile.changePasswordButton", "Changer le mot de passe")}
          </button>
        </div>
      </div>
    </div>
  );
}
