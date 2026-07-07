import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@modules/notifications/components/NotificationBell";
import { useAuthStore } from "@modules/auth/store/authStore";
import { ToastProvider, ToastViewport } from "@shared/components/ui/index";
import { AIAssistantBubble } from "@modules/ai/components/AIAssistantBubble";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const isRtl = i18n.language === "ar";

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
