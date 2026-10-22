import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Gift, ArrowUpRight, TrendingUp, CheckCircle2,
  Clock, Zap, Send, Loader2,
  CreditCard, Bell, MessageSquare, Info,
} from "lucide-react";
import { useAskAssistant } from "@modules/ai/api/index";
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { useAuthStore } from "@modules/auth/store/authStore";
import { useGlobalDashboard } from "@modules/analytics/api/index";
import { useNotifications } from "@modules/notifications/api/index";
import { Spinner } from "@shared/components/ui/index";
import { fmtNumber, fmtDZD } from "@modules/analytics/utils/formatters";
import { RecommendationsWidget } from "@modules/ai/components/RecommendationsWidget";
import { AnomalyFeedWidget } from "@modules/ai/components/AnomalyFeedWidget";
import { MedicalCoverageWidget } from "@modules/medical-coverage/components/MedicalCoverageWidget";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data, isLoading } = useGlobalDashboard({ months: 6 });
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const aiAsk = useAskAssistant();

  const sendAiMessage = () => {
    const q = aiQuery.trim();
    if (!q || aiAsk.isPending) return;
    setAiQuery("");
    setAiMessages(prev => [...prev, { role: "user", text: q }]);
    aiAsk.mutate(q, {
      onSuccess: (res) => {
        const reply = typeof res.response === "string" ? res.response : res.response?.text || JSON.stringify(res.response);
        setAiMessages(prev => [...prev, { role: "assistant", text: reply }]);
      },
      onError: () => {
        setAiMessages(prev => [...prev, { role: "assistant", text: t("ai.errorRetry") }]);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const s = data?.summary;
  const trends = (data?.trends || []).map(v => ({
    ...v,
    monthLabel: t(`dashboard.months.${v.month?.slice(5, 7) || ""}`, v.month?.slice(0, 7) || v.month),
  }));

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1917" }}>
            {t("dashboard.greeting", { name: user?.full_name?.split(" ")[0] })}
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#8a8882" }}>{t("dashboard.subtitle")}</p>
        </div>
        <button
          onClick={() => navigate("/reporting")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all"
          style={{ background: "#ffda2d", color: "#1a1917" }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(255,218,45,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
        >
          <Zap className="w-4 h-4" />
          {t("dashboard.generateReport")}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title={t("dashboard.activeEmployeesShort")}
          value={fmtNumber(s?.employees?.active ?? 0)}
          icon={Users}
          color="#3b82f6"
        />
        <KpiCard
          title={t("dashboard.totalBenefits")}
          value={fmtNumber(s?.benefits?.total ?? 0)}
          icon={Gift}
          color="#22c55e"
        />
        <KpiCard
          title={t("dashboard.activeConventionsShort")}
          value={fmtNumber(s?.conventions?.active ?? 0)}
          icon={TrendingUp}
          color="#f59e0b"
        />
        <KpiCard
          title={t("dashboard.totalPaidShort")}
          value={fmtDZD(s?.finance?.total_paid ?? 0, true)}
          icon={CreditCard}
          color="#a855f7"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-black" style={{ color: "#1a1917" }}>{t("dashboard.evolutionTitle")}</h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#8a8882" }}>{t("dashboard.evolutionSubtitle")}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-xs font-bold px-4 py-1.5 rounded-xl transition-colors" style={{ background: "#f3f2ee", color: "#1a1917" }}>
                7J
              </button>
              <button className="text-xs font-bold px-4 py-1.5 rounded-xl" style={{ background: "#ffda2d", color: "#1a1917" }}>
                Live
              </button>
            </div>
          </div>
          <div style={{ height: 280 }}>
            {trends.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm font-medium" style={{ color: "#8a8882" }}>{t("dashboard.noData")}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "#8a8882" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a8882" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px", border: "1px solid rgba(0,0,0,0.04)",
                      fontSize: "12px", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
                      color: "#1a1917", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)",
                    }}
                    formatter={(v: number) => [fmtNumber(v), ""]}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "#8a8882" }} />
                  <Line type="monotone" dataKey="benefits_count" stroke="#ffda2d" strokeWidth={3} dot={{ r: 4, fill: "#ffda2d", strokeWidth: 0 }} name="Soumises" />
                  <Line type="monotone" dataKey="payments_count" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }} name="Payées" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 flex flex-col" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "#ffda2d" }}>
              <Zap className="w-5 h-5" style={{ color: "#1a1917" }} />
            </div>
            <h2 className="text-base font-black" style={{ color: "#1a1917" }}>Assistant Social AI</h2>
          </div>
          <div className="flex-1 space-y-3 mb-4 overflow-y-auto pr-1" style={{ maxHeight: 200 }}>
            {aiMessages.length === 0 && (
              <p className="text-sm font-medium text-center py-6" style={{ color: "#8a8882" }}>
                {t("ai.askQuestion")}
              </p>
            )}
            {aiMessages.map((m, i) => (
              <div key={i} className={`rounded-2xl p-4 text-sm ${m.role === "user" ? "ml-6" : ""}`}
                style={m.role === "user"
                  ? { background: "#ffda2d", color: "#1a1917" }
                  : { background: "#f3f2ee" }}>
                <p className="font-black mb-1 text-xs uppercase tracking-wider" style={{ color: m.role === "user" ? "#1a1917" : "#ffda2d" }}>
                  {m.role === "user" ? t("ai.you") : "SocialBot"}
                </p>
                <p className="font-medium" style={{ color: m.role === "user" ? "#1a1917" : "#1a1917" }}>{m.text}</p>
              </div>
            ))}
            {aiAsk.isPending && (
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: "#8a8882" }}>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("ai.thinking")}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              type="text" placeholder={t("ai.inputPlaceholder")}
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendAiMessage(); }}
              className="w-full rounded-2xl py-3 px-4 text-sm outline-none transition-all pr-12 font-medium"
              style={{
                background: "#f3f2ee",
                border: "1px solid rgba(0,0,0,0.04)",
                color: "#1a1917",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "#ffda2d"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)"; }}
            />
            <button
              onClick={sendAiMessage}
              disabled={!aiQuery.trim() || aiAsk.isPending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 transition-opacity disabled:opacity-40"
              style={{ color: "#ffda2d" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <MedicalCoverageWidget />
        </div>
        <ActivityFeed />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
          <h2 className="text-base font-black mb-4" style={{ color: "#1a1917" }}>
            <Zap className="w-4 h-4 inline mr-2" style={{ color: "#ffda2d" }} />
            Recommandations
          </h2>
          <RecommendationsWidget />
        </div>
        <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
          <h2 className="text-base font-black mb-4" style={{ color: "#1a1917" }}>
            <CheckCircle2 className="w-4 h-4 inline mr-2" style={{ color: "#ffda2d" }} />
            Anomalies
          </h2>
          <AnomalyFeedWidget />
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  badge?: string;
  color: string;
}

function KpiCard({ title, value, icon: Icon, badge, color }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-[32px] p-5 transition-all duration-300"
      style={{
        border: "1px solid rgba(0,0,0,0.04)",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 30px -8px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: `${color}12` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {badge && (
          <span
            className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-1 rounded-xl"
            style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}
          >
            <ArrowUpRight className="w-3 h-3" />
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8a8882" }}>{title}</p>
      <p className="text-xl font-black" style={{ color: "#1a1917" }}>{value}</p>
    </div>
  );
}

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  critical: { icon: Bell,   color: "#dc2626", bg: "rgba(239,68,68,0.1)" },
  high:     { icon: Info,   color: "#d97706", bg: "rgba(245,158,11,0.1)" },
  medium:   { icon: MessageSquare, color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  low:      { icon: Clock,  color: "#8a8882", bg: "rgba(138,136,130,0.08)" },
};

function ActivityFeed() {
  const { t } = useTranslation();
  const { data: notifsData, isLoading } = useNotifications({ page: 1 });
  const notifications = notifsData?.results ?? [];

  return (
    <div className="bg-white rounded-[32px] p-6" style={{ border: "1px solid rgba(0,0,0,0.04)" }}>
      <h2 className="text-base font-black mb-6" style={{ color: "#1a1917" }}>{t("dashboard.recentActivity")}</h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#8a8882" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-sm font-medium" style={{ color: "#8a8882" }}>{t("dashboard.noActivity")}</p>
      ) : (
        <div className="space-y-5">
          {notifications.slice(0, 6).map((n) => {
            const cfg = NOTIF_ICONS[n.priority] || NOTIF_ICONS.low;
            return (
              <div key={n.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "#1a1917" }}>{n.title}</p>
                  {n.body && <p className="text-xs font-medium mt-0.5" style={{ color: "#8a8882" }}>{n.body}</p>}
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1 block" style={{ color: "#a8a49a" }}>{n.time_ago}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
