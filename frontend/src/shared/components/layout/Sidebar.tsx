import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, Gift, Wallet,
  FileText, BarChart3, Settings, LogOut, ChevronLeft,
  Building2, Shield, Lightbulb, Activity, Bot,
  HandCoins, GitBranch, ClipboardList, Sliders, KeyRound, GitMerge, UserCog, Workflow,
  TrendingUp, Briefcase, Layers, Handshake,
  Receipt, Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@modules/auth/hooks/useAuth";
import { useAuthStore } from "@modules/auth/store/authStore";
import { LanguageSwitcher } from "@shared/components/ui/LanguageSwitcher";

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
  badge?: number;
}

const navItemDefs: Omit<NavItem, "labelKey">[] = [
  { path: "/dashboard", icon: LayoutDashboard },
  {
    path: "/employees",
    icon: Users,
    roles: ["admin", "gestionnaire", "comptable", "department_manager"],
  },
  {
    path: "/beneficiaries",
    icon: UserCheck,
    roles: ["admin", "gestionnaire", "department_manager", "director"],
  },
  { path: "/benefits", icon: Gift },
  { path: "/loans", icon: HandCoins, roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"] },
  {
    path: "/finance",
    icon: Wallet,
    roles: ["admin", "comptable"],
  },
  {
    path: "/conventions",
    icon: Building2,
    roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"],
  },
  {
    path: "/conventions/partners",
    icon: Handshake,
    roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"],
  },
  {
    path: "/reporting",
    icon: FileText,
    roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"],
  },
  {
    path: "/analytics",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    path: "/analytics/decisions",
    icon: Lightbulb,
    roles: ["admin"],
  },
  {
    path: "/analytics/visualizations",
    icon: TrendingUp,
    roles: ["admin"],
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
    roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"],
  },
];

const adminItemDefs: Omit<NavItem, "labelKey">[] = [
  { path: "/admin/roles", icon: Shield, roles: ["admin"] },
  { path: "/admin/permissions", icon: KeyRound, roles: ["admin"] },
  { path: "/admin/org-structure", icon: Building2, roles: ["admin"] },
  { path: "/admin/functions", icon: Briefcase, roles: ["admin"] },
  { path: "/admin/grades", icon: Layers, roles: ["admin"] },
  { path: "/admin/system-settings", icon: Settings, roles: ["admin"] },
  { path: "/admin/committee-params", icon: Sliders, roles: ["admin"] },
  { path: "/admin/workflow-designer", icon: Workflow, roles: ["admin"] },
  { path: "/admin/workflow-rules", icon: GitBranch, roles: ["admin"] },
  { path: "/admin/approval-matrix", icon: GitMerge, roles: ["admin"] },
  { path: "/admin/user-roles", icon: UserCog, roles: ["admin"] },
  { path: "/admin/audit-logs", icon: ClipboardList, roles: ["admin"] },
  { path: "/users", icon: Users, roles: ["admin"] },
  { path: "/monitoring", icon: Activity, roles: ["admin"] },
];

const careSupportItemDefs: Omit<NavItem, "labelKey">[] = [
  { path: "/medical-coverage/requests", icon: ClipboardList, roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"] },
  { path: "/medical-coverage/vouchers", icon: FileText, roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"] },
  { path: "/invoicing", icon: Receipt, roles: ["admin", "gestionnaire", "comptable"] },
  { path: "/medical-coverage/history", icon: Clock, roles: ["admin", "gestionnaire", "comptable", "department_manager", "director"] },
];

const pathToNavKey: Record<string, string> = {
  "/dashboard": "dashboard",
  "/employees": "employees",
  "/beneficiaries": "beneficiaries",
  "/benefits": "benefits",
  "/medical-coverage/requests": "coverageRequests",
  "/medical-coverage/vouchers": "vouchers",
  "/medical-coverage/history": "history",
  "/loans": "loans",
  "/invoicing": "invoicing",
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
  const { user } = useAuthStore();

  const navItems: NavItem[] = navItemDefs.map((d) => ({
    ...d,
    labelKey: pathToNavKey[d.path],
  }));

  const adminItems: NavItem[] = adminItemDefs.map((d) => ({
    ...d,
    labelKey: pathToNavKey[d.path],
  }));

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const filteredAdminItems = adminItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const careSupportItems: NavItem[] = careSupportItemDefs.map((d) => ({
    ...d,
    labelKey: pathToNavKey[d.path],
  }));

  const filteredCareSupport = careSupportItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

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
        {filteredNavItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}

        {filteredCareSupport.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-5 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#a8a49a" }}>
                  {t("nav.careSupport")}
                </p>
              </div>
            )}
            <div className="pt-1" style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}>
              {filteredCareSupport.map((item) => (
                <NavItem key={item.path} item={item} collapsed={collapsed} />
              ))}
            </div>
          </>
        )}

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
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold"
              style={{ background: "#ffda2d", color: "#1a1917" }}
            >
              {user?.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
          </div>
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
