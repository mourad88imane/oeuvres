import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, Gift, Wallet,
  FileText, BarChart3, Settings, LogOut, ChevronLeft, ChevronDown,
  Building2, Shield, Lightbulb, Activity, Bot,
  HandCoins, GitBranch, ClipboardList, Sliders, KeyRound, GitMerge, UserCog, Workflow,
  TrendingUp, Briefcase, Layers, Handshake,
  Receipt, Clock, PieChart,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@modules/auth/hooks/useAuth";
import { useAuthStore } from "@modules/auth/store/authStore";
import { LanguageSwitcher } from "@shared/components/ui/LanguageSwitcher";
import { fmtDate } from "@shared/utils/format";

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
  module?: string;
  badge?: number;
}

const navItemDefs: Omit<NavItem, "labelKey">[] = [
  { path: "/dashboard", icon: LayoutDashboard },
  {
    path: "/employees",
    icon: Users,
    module: "employees",
  },
  {
    path: "/beneficiaries",
    icon: UserCheck,
    module: "beneficiaries",
  },
  { path: "/benefits", icon: Gift, module: "benefits" },
  { path: "/loans", icon: HandCoins, module: "loans" },
  {
    path: "/finance",
    icon: Wallet,
    module: "finance",
  },
  {
    path: "/conventions",
    icon: Building2,
    module: "conventions",
  },
  {
    path: "/conventions/partners",
    icon: Handshake,
    module: "conventions",
  },
  {
    path: "/reporting",
    icon: FileText,
    module: "reports",
  },
  {
    path: "/analytics",
    icon: BarChart3,
    module: "analytics",
  },
  {
    path: "/analytics/decisions",
    icon: Lightbulb,
    module: "analytics",
  },
  {
    path: "/analytics/visualizations",
    icon: TrendingUp,
    module: "analytics",
  },
  {
    path: "/ai/assistant",
    icon: Bot,
    roles: ["admin"],
  },
  {
    path: "/ai/predictive",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    path: "/monitoring",
    icon: Activity,
    roles: ["admin"],
  },
  {
    path: "/documents",
    icon: FileText,
    roles: ["admin", "comptable", "department_manager", "director"],
  },
];

const adminItemDefs: Omit<NavItem, "labelKey">[] = [
  { path: "/admin/roles", icon: Shield, module: "admin" },
  { path: "/admin/permissions", icon: KeyRound, module: "admin" },
  { path: "/admin/org-structure", icon: Building2, module: "admin" },
  { path: "/admin/functions", icon: Briefcase, module: "admin" },
  { path: "/admin/grades", icon: Layers, module: "admin" },
  { path: "/admin/system-settings", icon: Settings, module: "admin" },
  { path: "/admin/committee-params", icon: Sliders, module: "admin" },
  { path: "/admin/workflow-designer", icon: Workflow, module: "admin" },
  { path: "/admin/workflow-rules", icon: GitBranch, module: "admin" },
  { path: "/admin/approval-matrix", icon: GitMerge, module: "admin" },
  { path: "/admin/user-roles", icon: UserCog, module: "admin" },
  { path: "/admin/audit-logs", icon: ClipboardList, module: "admin" },
  { path: "/users", icon: Users, module: "admin" },
  { path: "/monitoring", icon: Activity, roles: ["admin"] },
];

const careSupportItemDefs: Omit<NavItem, "labelKey">[] = [
  { path: "/medical-coverage/requests", icon: ClipboardList, module: "medical_coverage" },
  { path: "/medical-coverage/vouchers", icon: FileText, module: "medical_coverage" },
  { path: "/medical-coverage/invoices", icon: Receipt, module: "medical_coverage" },
  { path: "/medical-coverage/invoices/statistics", icon: PieChart, module: "medical_coverage" },
  { path: "/medical-coverage/history", icon: Clock, module: "medical_coverage" },
];

const pathToNavKey: Record<string, string> = {
  "/dashboard": "dashboard",
  "/employees": "employees",
  "/beneficiaries": "beneficiaries",
  "/benefits": "benefits",
  "/medical-coverage/requests": "coverageRequests",
  "/medical-coverage/vouchers": "vouchers",
  "/medical-coverage/invoices": "providerInvoices",
  "/medical-coverage/invoices/statistics": "invoicingStatistics",
  "/medical-coverage/history": "history",
  "/loans": "loans",
  "/finance": "finance",
  "/conventions": "conventions",
  "/conventions/partners": "partners",
  "/reporting": "reports",
  "/analytics": "analytics",
  "/analytics/decisions": "decisions",
  "/analytics/visualizations": "visualizations",
  "/ai/assistant": "assistant",
  "/ai/predictive": "predictiveAnalytics",
  "/monitoring": "monitoring",
  "/documents": "documents",
  "/users": "users",
  "/admin/system-settings": "systemSettings",
  "/admin/committee-params": "committeeParams",
  "/admin/workflow-designer": "workflowDesigner",
  "/admin/workflow-rules": "workflowRules",
  "/admin/approval-matrix": "approvalMatrix",
  "/admin/user-roles": "userRoles",
  "/admin/audit-logs": "auditLogs",
  "/admin/roles": "roles",
  "/admin/permissions": "permissions",
  "/admin/org-structure": "orgStructure",
  "/admin/functions": "orgFunctions",
  "/admin/grades": "orgGrades",
};

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { user, hasModuleAccess } = useAuthStore();
  const location = useLocation();

  // Accordéon « Prise en charge » : replié par défaut, ouvert si on est dans le module
  const isInCareSupport = location.pathname.startsWith("/medical-coverage");
  const [careSupportOpen, setCareSupportOpen] = useState(isInCareSupport);
  useEffect(() => {
    if (isInCareSupport) setCareSupportOpen(true);
  }, [isInCareSupport]);

  const matchesItem = (item: NavItem): boolean => {
    if (item.module) return hasModuleAccess(item.module);
    if (item.roles) return !!user && item.roles.includes(user.role);
    return true;
  };

  const navItems: NavItem[] = navItemDefs.map((d) => ({
    ...d,
    labelKey: pathToNavKey[d.path],
  }));

  const adminItems: NavItem[] = adminItemDefs.map((d) => ({
    ...d,
    labelKey: pathToNavKey[d.path],
  }));

  const filteredNavItems = navItems.filter(matchesItem);

  // Ordre requis : Tableau de bord → Employés → Ayants droit → Prise en charge → reste
  const preCarePaths = ["/dashboard", "/employees", "/beneficiaries"];
  const leadItems = preCarePaths
    .map((p) => filteredNavItems.find((i) => i.path === p))
    .filter((i): i is NavItem => !!i);
  const restNavItems = filteredNavItems.filter((i) => !preCarePaths.includes(i.path));

  const filteredAdminItems = adminItems.filter(matchesItem);

  const careSupportItems: NavItem[] = careSupportItemDefs.map((d) => ({
    ...d,
    labelKey: pathToNavKey[d.path],
  }));

  const filteredCareSupport = careSupportItems.filter(matchesItem);

  const isRtl = i18n.language === "ar";

  return (
    <aside
      className={clsx(
        "flex flex-col h-full transition-all duration-300",
        isRtl ? "rounded-l-[40px]" : "rounded-r-[40px]",
        collapsed ? "w-20" : "w-64"
      )}
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        [isRtl ? "borderLeft" : "borderRight"]: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="flex items-center justify-between p-5"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "#ffda2d" }}
            >
              <span className="text-sm font-black text-[#1a1917]">OS</span>
            </div>
            <div>
              <p className="font-black text-sm leading-tight uppercase" style={{ fontStretch: "condensed" }}>
                Oeuvres
              </p>
              <p className="text-xs font-semibold" style={{ color: "#ffda2d" }}>Sociales</p>
            </div>
          </div>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="p-1.5 rounded-xl transition-colors"
          style={{ color: "#8a8882" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          {isRtl ? (
            <ChevronLeft className={clsx("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
          ) : (
            <ChevronLeft className={clsx("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
        {leadItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {filteredCareSupport.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setCareSupportOpen(o => !o)}
              aria-expanded={careSupportOpen}
              className={clsx(
                "flex items-center gap-3 rounded-2xl transition-all text-sm font-bold w-full",
                collapsed ? "justify-center p-3" : "px-4 py-3"
              )}
              style={{
                color: careSupportOpen ? "#1a1917" : "#8a8882",
                background: careSupportOpen ? "rgba(0,0,0,0.04)" : "transparent",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = careSupportOpen ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.03)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = careSupportOpen ? "rgba(0,0,0,0.04)" : "transparent"; }}
            >
              <ClipboardList className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className={clsx("truncate flex-1", isRtl ? "text-right" : "text-left")}>{t("nav.careSupport")}</span>
              )}
              {!collapsed && (
                <span className="flex items-center justify-center shrink-0">
                  {isRtl ? (
                    <ChevronDown className={clsx("w-4 h-4 transition-transform duration-300", !careSupportOpen && "rotate-90")} />
                  ) : (
                    <ChevronDown className={clsx("w-4 h-4 transition-transform duration-300", !careSupportOpen && "-rotate-90")} />
                  )}
                </span>
              )}
            </button>
            <div
              className={clsx(
                "grid transition-all duration-300 ease-in-out",
                careSupportOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="pt-1 space-y-1" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                  {filteredCareSupport.map((item) => (
                    <NavItem key={item.path} item={item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {restNavItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {filteredAdminItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-5 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#a8a49a" }}>
                  {t("nav.administration")}
                </p>
              </div>
            )}
            <div className="pt-1" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
              {filteredAdminItems.map((item) => (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              ))}
            </div>
          </>
        )}
      </nav>

      {!collapsed && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }} className="p-3">
          <LanguageSwitcher />
        </div>
      )}

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }} className="p-4">
        {!collapsed ? (
          <NavLink
            to="/profile"
            title={t("profile.title", "Mon profil")}
            className={({ isActive }) =>
              clsx(
                "block rounded-xl -m-1 p-1 transition-colors hover:bg-black/5",
                isActive && "bg-black/5"
              )
            }
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "#ffda2d", color: "#1a1917" }}
              >
                {user?.full_name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "#1a1917" }}>{user?.full_name}</p>
                <p className="text-xs truncate font-medium" style={{ color: "#8a8882" }}>{user?.role_display}</p>
                <p
                  className="text-[11px] flex items-center gap-1 min-w-0"
                  style={{ color: "#a8a49a" }}
                  title={
                    user?.password_changed_at
                      ? `${t("auth.lastPasswordChange")} : ${fmtDate(user.password_changed_at)}`
                      : t("auth.passwordNeverChanged")
                  }
                >
                  <span className="shrink-0">{t("auth.lastPasswordChange")}</span>
                  <span className="shrink-0">:</span>
                  <span className="truncate font-medium">
                    {user?.password_changed_at ? fmtDate(user.password_changed_at) : t("auth.passwordNeverChanged")}
                  </span>
                </p>
              </div>
            </div>
          </NavLink>
        ) : (
          <NavLink
            to="/profile"
            title={t("profile.title", "Mon profil")}
            aria-label={t("profile.title", "Mon profil")}
            className="block rounded-xl -m-1 p-1 transition-colors hover:bg-black/5 mb-2"
          >
            <div className="flex justify-center">
              <div
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold"
                style={{ background: "#ffda2d", color: "#1a1917" }}
              >
                {user?.full_name?.charAt(0).toUpperCase() || "?"}
              </div>
            </div>
          </NavLink>
        )}
        <button
          onClick={() => logout()}
          className={clsx(
            "flex items-center gap-2 w-full px-2 py-1.5 rounded-xl transition-all text-sm font-medium",
            collapsed && "justify-center"
          )}
          style={{ color: "#8a8882" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#8a8882"; e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t("auth.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { t, i18n } = useTranslation();
  const label = t(`nav.${item.labelKey}`, item.labelKey);
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-2xl transition-all text-sm font-bold",
          collapsed ? "justify-center p-3" : "px-4 py-3",
          isActive ? "" : ""
        )
      }
      title={collapsed ? label : undefined}
      style={({ isActive }: { isActive: boolean }) => ({
        color: isActive ? "#1a1917" : "#8a8882",
        background: isActive ? "#ffda2d" : "transparent",
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.classList.contains("active")) {
          e.currentTarget.style.background = "rgba(0,0,0,0.03)";
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.classList.contains("active")) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      <item.icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span
          className={`text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center font-bold ${i18n.language === "ar" ? "mr-auto" : "ml-auto"}`}
          style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}
        >
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </NavLink>
  );
}
