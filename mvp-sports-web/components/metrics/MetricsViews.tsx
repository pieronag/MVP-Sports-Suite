"use client";
// Métricas de la plataforma: gráfico semanal, cobranza, métodos de pago, top recintos, transacciones y deudas.
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, BarChartIcon, ChartLineData01Icon, Clock01Icon, CreditCardPosIcon, Store01Icon } from "@hugeicons/core-free-icons";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/ui/DashboardWidgets";
import { relativeTime, type computeMetrics } from "@/utils/platformMetrics";

type M = ReturnType<typeof computeMetrics>;
type IconType = typeof Store01Icon;
export const formatCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n || 0);
const Icon = ({ icon, className = "w-5 h-5" }: { icon: IconType; className?: string }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={1.8} />;
const tooltip = { backgroundColor: "#020617", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, fontSize: 11, color: "#fff", fontWeight: 700 };
// Eje Y: montos chicos completos ($400), miles con un decimal si hace falta ($1,2k), millones ($1,5M)
const short = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })}M`
  : v >= 1000 ? `$${(v / 1000).toLocaleString("es-CL", { maximumFractionDigits: v < 10_000 ? 1 : 0 })}k` : `$${Math.round(v)}`;

function Empty({ icon, text }: { icon: IconType; text: string }) {
  return (
    <div className="py-12 text-center">
      <Icon icon={icon} className="w-9 h-9 text-slate-200 dark:text-white/10 mx-auto mb-3" />
      <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{text}</p>
    </div>
  );
}

export function WeeklyChart({ m }: { m: M }) {
  const hasData = m.weekly.some((w) => w.comisiones > 0);
  return (
    <SectionCard title="Comisiones por semana" subtitle="Lo que la plataforma gana sobre las reservas del mes"
      icon={<Icon icon={ChartLineData01Icon} />} className="lg:col-span-2 h-[360px]" bodyClassName="p-5">
      {hasData ? (
        <div className="w-full h-full min-h-0" role="img" aria-label={`Comisiones por semana: ${m.weekly.map((w) => `${w.name} ${formatCLP(w.comisiones)}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={m.weekly}>
              <defs><linearGradient id="gCom" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00df82" stopOpacity={0.25} /><stop offset="95%" stopColor="#00df82" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={short} width={48} />
              <Tooltip contentStyle={tooltip} formatter={(v) => [formatCLP(Number(v)), "Comisión"]} />
              <Area type="monotone" dataKey="comisiones" stroke="#00df82" strokeWidth={2.5} fill="url(#gCom)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty icon={ChartLineData01Icon} text="Sin reservas pagadas en el mes" />}
    </SectionCard>
  );
}

export function CollectionCard({ m }: { m: M }) {
  const pct = m.collectedPct;
  const data = pct === null ? [] : [{ name: "Cobrado", value: pct, color: "#00df82" }, { name: "Pendiente", value: 100 - pct, color: "#f59e0b" }];
  return (
    <SectionCard title="Cobranza del mes" subtitle="Liquidaciones del periodo pagadas" icon={<Icon icon={BarChartIcon} />} className="h-[360px]" bodyClassName="p-5 flex flex-col">
      {pct === null ? <Empty icon={BarChartIcon} text="Aún no hay liquidaciones de este mes" /> : (
        <>
          <div className="flex-1 relative min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} innerRadius="70%" outerRadius="90%" paddingAngle={4} dataKey="value">{data.map((d) => <Cell key={d.name} fill={d.color} stroke="none" />)}</Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cobrado</span>
              <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{pct}%</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-md text-[12px]">
            <span className="font-bold text-slate-500 uppercase">Liquidado</span>
            <span className="font-black text-slate-900 dark:text-white tabular-nums">{formatCLP(m.billed)}</span>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function Bars({ rows, color }: { rows: { label: string; value: number; extra?: string }[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value)), total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label + i} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">{r.label}</span>
            <span className="font-black text-slate-900 dark:text-white shrink-0 tabular-nums">{formatCLP(r.value)} <span className="text-slate-500 font-bold">· {r.extra ?? `${Math.round((r.value / total) * 100)}%`}</span></span>
          </div>
          <div className="h-1.5 w-full rounded-md bg-slate-100 dark:bg-white/5 overflow-hidden">
            <div className="h-full rounded-md" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MethodsCard({ m }: { m: M }) {
  return (
    <SectionCard title="Cómo pagaron" subtitle="Volumen del mes por medio de pago" icon={<Icon icon={CreditCardPosIcon} />} bodyClassName="p-5">
      {m.methods.length ? <Bars color="#10b981" rows={m.methods.map((x) => ({ label: x.label, value: x.value }))} /> : <Empty icon={CreditCardPosIcon} text="Sin pagos en el mes" />}
    </SectionCard>
  );
}

export function TopVenuesCard({ m }: { m: M }) {
  return (
    <SectionCard title="Recintos con más volumen" subtitle="Top 5 del mes" icon={<Icon icon={Store01Icon} />} bodyClassName="p-5">
      {m.top.length ? <Bars color="#6366f1" rows={m.top.map((t, i) => ({ label: `${i + 1}. ${t.name}`, value: t.value, extra: `${t.count} ${t.count === 1 ? "reserva" : "reservas"}` }))} /> : <Empty icon={Store01Icon} text="Sin operaciones en el mes" />}
    </SectionCard>
  );
}

const th = "px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider";
export function TransactionsCard({ m, now }: { m: M; now: Date }) {
  return (
    <SectionCard title="Últimas reservas pagadas" subtitle="Del mes elegido" icon={<Icon icon={Clock01Icon} />} bodyClassName="p-0">
      {m.transactions.length ? (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[560px]">
            <thead><tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
              <th className={th}>Recinto</th><th className={`${th} text-right`}>Monto</th><th className={`${th} text-right text-emerald-600`}>Comisión</th><th className={`${th} text-center`}>Medio</th><th className={`${th} text-right`}>Hace</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {m.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3.5 text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">{t.venue}</td>
                  <td className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{formatCLP(t.amount)}</td>
                  <td className="px-5 py-3.5 text-right text-[11px] font-black text-emerald-600 dark:text-[#00df82] tabular-nums">{formatCLP(t.fee)}</td>
                  <td className="px-5 py-3.5 text-center"><span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${t.method.key === "noshow" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>{t.method.label}</span></td>
                  <td className="px-5 py-3.5 text-right text-[11px] text-slate-500 tabular-nums">{relativeTime(t.at, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={Clock01Icon} text="Sin reservas pagadas en el mes" />}
    </SectionCard>
  );
}

export function DebtsCard({ m }: { m: M }) {
  return (
    <SectionCard title="Por cobrar" subtitle="Liquidaciones del mes sin pagar (top 10)" icon={<Icon icon={Alert02Icon} />} bodyClassName="p-0">
      {m.debts.length ? (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[480px]">
            <thead><tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
              <th className={th}>Recinto</th><th className={`${th} text-right`}>Comisión</th><th className={`${th} text-right`}>Total</th><th className={`${th} text-center`}>Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {m.debts.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3.5 text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">{d.name}</td>
                  <td className="px-5 py-3.5 text-right text-[11px] font-bold text-emerald-600 tabular-nums">{formatCLP(d.commission)}</td>
                  <td className="px-5 py-3.5 text-right text-[11px] font-black text-slate-900 dark:text-white tabular-nums">{formatCLP(d.total)}</td>
                  <td className="px-5 py-3.5 text-center"><span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${d.overdue ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"}`}>{d.overdue ? "Vencida" : "Pendiente"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={Store01Icon} text="Sin deudas en el mes" />}
    </SectionCard>
  );
}
