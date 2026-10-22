import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@modules/notifications/components/NotificationBell";
import { useAuthStore } from "@modules/auth/store/authStore";
import { ToastProvider, ToastViewport } from "@shared/components/ui/index";
import { AIAssistantBubble } from "@modules/ai/components/AIAssistantBubble";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isRtl = i18n.language === "ar";

  // Bandeau d'information (non bloquant) : il reste au plus
  // password_expiration_warning_days jours (fenêtre configurée côté backend,
  // défaut 15 ; 0 = désactivée). Fallback 0 si inconnu (session héritée) :
  // pas d'avertissement tant que le payload n'est pas rafraîchi — on ne
  // duplique jamais le défaut backend côté frontend.
  // Pas d'avertissement si le mot de passe est déjà expiré (0) : le forçage
  // au prochain login prend le relais.
  const warningDays = user?.password_expiration_warning_days ?? 0;
  const daysLeft = user?.password_expires_in_days ?? null;
  const passwordExpiresSoon =
    !user?.must_change_password &&
    daysLeft !== null &&
    warningDays > 0 &&
    daysLeft >= 1 &&
    daysLeft <= warningDays &&
    !bannerDismissed;

  return (
    <ToastProvider>
    <div className="flex h-screen overflow-hidden" style={{ background: "#f3f2ee" }}>
      <div className="hidden md:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className={`relative z-50 flex h-full w-64 ${isRtl ? "right-0" : ""}`}>
            <Sidebar
              collapsed={false}
              onCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center px-4 sm:px-6 lg:px-8 gap-4 shrink-0">
          <button
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "#8a8882" }}
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = i18n.language?.startsWith("ar") ? "fr" : "ar";
                i18n.changeLanguage(next);
                try { localStorage.setItem("i18nextLng", next); } catch {}
              }}
              className="px-2 py-1 text-xs font-bold rounded-lg transition-colors hover:bg-black/5"
              style={{ color: "#8a8882" }}
              title={i18n.language?.startsWith("ar") ? "Français" : "العربية"}
            >
              {i18n.language?.startsWith("ar") ? "FR" : "AR"}
            </button>
            <NotificationBell />
            <div className={`flex items-center gap-2 ${isRtl ? "pr-3" : "pl-3"}`} style={{ [isRtl ? "borderRight" : "borderLeft"]: "1px solid rgba(0,0,0,0.06)" }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: "#ffda2d", color: "#1a1917" }}
              >
                {user?.full_name?.charAt(0).toUpperCase() || "?"}
              </div>
              <span className="text-sm font-bold hidden sm:block" style={{ color: "#1a1917" }}>
                {user?.full_name}
              </span>
            </div>
          </div>
        </header>

        {passwordExpiresSoon && daysLeft !== null && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 text-sm font-medium shrink-0"
            style={{ background: "#fef3c7", color: "#92400e", borderBottom: "1px solid rgba(146,64,14,0.15)" }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">
              {t("auth.passwordExpiresSoon", { count: daysLeft })}
            </span>
            <button
              type="button"
              onClick={() => {
                setBannerDismissed(true);
                navigate("/change-password");
              }}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-colors hover:bg-black/10 shrink-0"
              style={{ background: "rgba(146,64,14,0.12)", color: "#92400e" }}
            >
              {t("auth.changePasswordNow", "Changer maintenant")}
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label={t("common.close", "Fermer")}
              className="p-1 rounded-lg transition-colors hover:bg-black/5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
      <AIAssistantBubble />
    </div>
    </ToastProvider>
  );
}
