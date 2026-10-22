import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FileText, Receipt, CheckCircle2, Clock,
  TrendingUp, RefreshCw, BarChart3, DollarSign,
} from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@shared/components/ui";
import { Breadcrumb } from "@shared/components/ui/Breadcrumb";
import { providerInvoiceApi } from "../api/providerInvoices";
import { PROVIDER_CATEGORY_OPTIONS } from "../types/providerInvoice";
import { fmtDZD, fmtNumber, CHART_COLORS } from "@modules/analytics/utils/formatters";
import type { ProviderInvoiceStatistics } from "../types/providerInvoice";
import { PROVIDER_INVOICE_KEYS } from "../hooks/useProviderInvoices";

export function ProviderInvoiceStatisticsPage() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: PROVIDER_INVOICE_KEYS.statistics(),
    queryFn: () => providerInvoiceApi.statistics().then((r) => r.data.data),
  });

  const categoryColor = (cat: string) => {
    const idx = PROVIDER_CATEGORY_OPTIONS.findIndex((o) => o.value === cat);
    return CHART_COLORS[idx >= 0 ? idx % CHART_COLORS.length : 0];
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: "Statistiques" }]} />
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Breadcrumb items={[{ label: "Statistiques" }]} />
        <div className="text-center py-16 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune donnée statistique disponible</p>
        </div>
      </div>
    );
  }

  const consumedPct = stats.total > 0
    ? Math.round(((stats.voucher_stats?.consumed ?? 0) / Math.max(stats.voucher_stats?.consumed + stats.voucher_stats?.approved, 1)) * 100)
    : 0;

  const monthlyData = (stats.by_month ?? []).map((m) => ({
    month: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"][(m.month || 1) - 1] ?? m.month,
    count: m.count,
    amount: Math.round(m.amount / 1000),
  }));

  const partnerData = (stats.by_partner ?? []).slice(0, 8).map((p) => ({
    name: (p.partner__name || "?").length > 18 ? (p.partner__name || "?").slice(0, 16) + "…" : p.partner__name || "?",
    amount: Math.round(p.amount / 1000),
    count: p.count,
  }));

  const categoryData = (stats.by_category ?? []).map((c) => {
    const label = PROVIDER_CATEGORY_OPTIONS.find((o) => o.value === c.category)?.label || c.category;
    return { name: label, value: c.amount, count: c.count };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb
            items={[
              { label: "Factures prestataires", path: "/medical-coverage/invoices" },
              { label: "Statistiques" },
            ]}
          />
          <h1 className="text-2xl font-black mt-2" style={{ color: "#1a1917" }}>Statistiques des factures prestataires</h1>
          <p className="text-sm font-medium mt-1" style={{ color: "#8a8882" }}>Indicateurs clés et tendances</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
          style={{ background: "#f5f4f0", color: "#1a1917" }}
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4" style={{ background: "#eff6ff" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#3b82f6", color: "#fff" }}>
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black" style={{ color: "#1a1917" }}>{fmtNumber(stats.total)}</p>
          <p className="text-xs font-bold" style={{ color: "#3b82f6" }}>Total factures</p>
          <div className="flex gap-3 mt-1 text-xs" style={{ color: "#8a8882" }}>
            <span><span className="font-bold" style={{ color: "#166534" }}>{stats.validated}</span> validées</span>
            <span><span className="font-bold" style={{ color: "#1e40af" }}>{stats.paid}</span> payées</span>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#dcfce7" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#16a34a", color: "#fff" }}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black" style={{ color: "#1a1917" }}>{fmtDZD(stats.total_amount, true)}</p>
          <p className="text-xs font-bold" style={{ color: "#16a34a" }}>Montant total</p>
          <div className="flex gap-3 mt-1 text-xs" style={{ color: "#8a8882" }}>
            <span><span className="font-bold" style={{ color: "#1e40af" }}>{fmtDZD(stats.paid_amount, true)}</span> payé</span>
            <span><span className="font-bold" style={{ color: "#166534" }}>{fmtDZD(stats.validated_amount, true)}</span> validé</span>
          </div>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#fef3c7" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#d97706", color: "#fff" }}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black" style={{ color: "#1a1917" }}>{fmtNumber(stats.voucher_stats?.consumed ?? 0)}</p>
          <p className="text-xs font-bold" style={{ color: "#d97706" }}>Bons consommés</p>
          <p className="text-xs mt-1" style={{ color: "#b45309" }}>{consumedPct}% des bons traités</p>
        </div>

        <div className="rounded-2xl p-4" style={{ background: "#f3e8ff" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#9333ea", color: "#fff" }}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black" style={{ color: "#1a1917" }}>{fmtNumber(stats.voucher_stats?.approved ?? 0)}</p>
          <p className="text-xs font-bold" style={{ color: "#9333ea" }}>Bons non consommés</p>
          <p className="text-xs mt-1" style={{ color: "#7c3aed" }}>encore disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: "#fff" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "#1a1917" }}>
            <TrendingUp className="w-4 h-4 inline mr-2" style={{ color: "#8a8882" }} />
            Évolution mensuelle
          </h3>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: "#8a8882" }}>Aucune donnée mensuelle</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#8a8882" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#8a8882" />
                <Tooltip
                  formatter={(val: number, name: string) =>
                    name === "amount" ? [`${(val * 1000).toLocaleString("fr-DZ")} DZD`, "Montant"]
                      : [val, "Factures"]
                  }
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
                />
                <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#1A3C6E" strokeWidth={2} dot={{ r: 3 }} name="amount" />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="count" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: "#fff" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "#1a1917" }}>
            <DollarSign className="w-4 h-4 inline mr-2" style={{ color: "#8a8882" }} />
            Montant par prestataire
          </h3>
          {partnerData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: "#8a8882" }}>Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={partnerData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#8a8882" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} stroke="#8a8882" />
                <Tooltip
                  formatter={(val: number) => `${(val * 1000).toLocaleString("fr-DZ")} DZD`}
                  contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {partnerData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: "#fff" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "#1a1917" }}>
            <BarChart3 className="w-4 h-4 inline mr-2" style={{ color: "#8a8882" }} />
            Montant par catégorie
          </h3>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: "#8a8882" }}>Aucune donnée</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={2}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={categoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => fmtDZD(val, true)}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex flex-col justify-center">
                {categoryData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: categoryColor(d.name) }} />
                      <span style={{ color: "#5a5852" }}>{d.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold" style={{ color: "#1a1917" }}>{fmtDZD(d.value, true)}</span>
                      <span className="ml-2" style={{ color: "#8a8882" }}>({d.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: "#fff" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "#1a1917" }}>
            <Receipt className="w-4 h-4 inline mr-2" style={{ color: "#8a8882" }} />
            Répartition des factures
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Brouillons", value: stats.draft, color: "#92400e", bg: "#fef3c7" },
              { label: "Validées", value: stats.validated, color: "#166534", bg: "#dcfce7" },
              { label: "Payées", value: stats.paid, color: "#1e40af", bg: "#dbeafe" },
              { label: "Annulées", value: stats.cancelled, color: "#991b1b", bg: "#fee2e2" },
            ].map((s) => (
              <div key={s.label} className={clsx("rounded-xl p-3 text-center")} style={{ background: s.bg }}>
                <p className={clsx("text-xl font-black")} style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-bold mt-0.5" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
          {stats.top_employees && stats.top_employees.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#8a8882" }}>Top employés</p>
              {stats.top_employees.slice(0, 5).map((e, i) => (
                <div key={e.matricule} className="flex items-center gap-2 py-1 text-xs" style={{ borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                  <span className="font-bold w-4" style={{ color: "#8a8882" }}>#{i + 1}</span>
                  <span className="flex-1 font-medium" style={{ color: "#1a1917" }}>{e.name}</span>
                  <span className="font-bold" style={{ color: "#1e40af" }}>{fmtDZD(e.total, true)}</span>
                  <span style={{ color: "#8a8882" }}>({e.count})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}