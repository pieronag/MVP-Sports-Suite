"use client";
// Secciones del panel general del superadmin (rankings, planes, recintos nuevos y reservas recientes).
import { HugeiconsIcon } from "@hugeicons/react";
import { BarChartIcon, Calendar03Icon, PieChartIcon, Store01Icon, TrophyIcon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SectionCard } from "@/components/ui/DashboardWidgets";
import { relativeTime } from "@/utils/platformMetrics";
import type { computeOverview } from "@/utils/adminOverview";

type O = ReturnType<typeof computeOverview>;
type IconType = typeof TrophyIcon;
export const formatCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n || 0);
const Icon = ({ icon, className = "w-5 h-5" }: { icon: IconType; className?: string }) => <HugeiconsIcon icon={icon} className={className} strokeWidth={1.8} />;

function Empty({ icon, label }: { icon: IconType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
      <Icon icon={icon} className="w-9 h-9 text-slate-200 dark:text-white/10" />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{label}</p>
    </div>
  );
}

export function Rankings({ o }: { o: O }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard title="Top facturación" subtitle="Recintos con mayor volumen" icon={<Icon icon={TrophyIcon} />} className="min-h-[300px]" bodyClassName="p-5">
        {o.topRevenue.length ? (
          <ol className="space-y-4">
            {o.topRevenue.map((t, i) => (
              <li key={t.name + i}>
                <div className="flex justify-between items-end mb-1.5 gap-3 text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase truncate">{i + 1}. {t.name}</span>
                  <span className="font-black text-slate-900 dark:text-white tabular-nums shrink-0">{formatCLP(t.value)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-md overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-md" style={{ width: `${(t.value / (o.topRevenue[0].value || 1)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        ) : <Empty icon={TrophyIcon} label="Sin reservas pagadas en el periodo" />}
      </SectionCard>
      <SectionCard title="Más reservas" subtitle="Reservas pagadas por recinto" icon={<Icon icon={BarChartIcon} />} className="min-h-[300px]" bodyClassName="p-5">
        {o.topOccupancy.length ? (
          <ol className="space-y-2.5">
            {o.topOccupancy.map((t, i) => (
              <li key={t.name + i} className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-white/5">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-md bg-white dark:bg-white/5 flex items-center justify-center text-[11px] font-black text-emerald-600 dark:text-[#00df82] shrink-0">{i + 1}</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase truncate">{t.name}</span>
                </span>
                <span className="text-right shrink-0"><span className="text-base font-black text-slate-900 dark:text-white tabular-nums">{t.value}</span> <span className="text-[10px] text-slate-500 uppercase font-bold">{t.value === 1 ? "reserva" : "reservas"}</span></span>
              </li>
            ))}
          </ol>
        ) : <Empty icon={BarChartIcon} label="Sin reservas en el periodo" />}
      </SectionCard>
    </div>
  );
}

export function PlansAndNewVenues({ o, total }: { o: O; total: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard title="Recintos por plan" subtitle="Plan contratado" icon={<Icon icon={PieChartIcon} />} className="min-h-[280px]">
        {total ? (
          <div className="flex flex-col sm:flex-row items-center gap-6 h-full">
            <div className="w-full sm:w-1/2 h-[160px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={o.plans} innerRadius={44} outerRadius={64} paddingAngle={4} dataKey="value" stroke="none">{o.plans.map((p) => <Cell key={p.name} fill={p.color} />)}</Pie>
                  <Tooltip contentStyle={{ borderRadius: 5, border: "none", fontSize: 11, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{total}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Recintos</span>
              </div>
            </div>
            <ul className="w-full sm:w-1/2 space-y-3">
              {o.plans.map((p) => (
                <li key={p.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span>
                    <span className="text-slate-900 dark:text-white tabular-nums">{p.value}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-md overflow-hidden"><div className="h-full rounded-md" style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }} /></div>
                </li>
              ))}
            </ul>
          </div>
        ) : <Empty icon={PieChartIcon} label="Sin recintos registrados" />}
      </SectionCard>
      <SectionCard title="Recintos recientes" subtitle="Últimos en sumarse" icon={<Icon icon={UserAdd01Icon} />} className="min-h-[280px]" bodyClassName="p-5">
        {o.newTenants.length ? (
          <ul className="space-y-2.5">
            {o.newTenants.map((t) => (
              <li key={t.id} className="flex justify-between items-center gap-3 p-3 rounded-md bg-slate-50 dark:bg-white/5">
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate">{t.name}</span>
                  <span className="flex items-center gap-2 mt-1 text-[10px] font-black uppercase tracking-wider">
                    <span className="text-emerald-600 dark:text-[#00df82]">{t.plan}</span>
                    <span className={t.active ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>· {t.active ? "Activo" : "Inactivo"}</span>
                  </span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">{t.date ? t.date.toLocaleDateString("es-CL") : "—"}</span>
              </li>
            ))}
          </ul>
        ) : <Empty icon={Store01Icon} label="Sin recintos registrados" />}
      </SectionCard>
    </div>
  );
}

export function RecentBookings({ o, now }: { o: O; now: Date }) {
  const th = "px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500";
  return (
    <SectionCard title="Reservas recientes" subtitle="Últimas pagadas en todos los recintos" icon={<Icon icon={Calendar03Icon} />} bodyClassName="p-0"
      action={
        <div className="flex items-center gap-5 text-right">
          <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Volumen</p><p className="text-base font-black text-emerald-600 dark:text-[#00df82] tabular-nums">{formatCLP(o.kpis.gmv)}</p></div>
          <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reservas</p><p className="text-base font-black text-slate-900 dark:text-white tabular-nums">{o.bookingCount}</p></div>
        </div>
      }>
      {o.recent.length ? (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead><tr className="bg-slate-50/60 dark:bg-white/2 border-b border-slate-100 dark:border-white/5">
              <th className={th}>Cuándo</th><th className={th}>Jugador</th><th className={th}>Recinto</th><th className={`${th} text-center`}>Medio</th><th className={`${th} text-right`}>Monto</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {o.recent.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3.5">
                    <span className="block text-[11px] font-black text-slate-800 dark:text-white uppercase">Hace {relativeTime(b.at, now)}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Juega {b.start ? b.start.toLocaleDateString("es-CL", { timeZone: "America/Santiago" }) : "—"}{b.startTime ? ` · ${b.startTime} hrs` : ""}</span>
                  </td>
                  <td className="px-5 py-3.5 text-[11px] font-bold text-slate-900 dark:text-white uppercase truncate max-w-[160px]">{b.client}</td>
                  <td className="px-5 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate max-w-[180px]">{b.venue}</td>
                  <td className="px-5 py-3.5 text-center"><span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${b.noShow ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>{b.method.label}</span></td>
                  <td className="px-5 py-3.5 text-right text-[11px] font-black text-emerald-600 dark:text-[#00df82] tabular-nums">{formatCLP(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty icon={Calendar03Icon} label="Sin reservas pagadas en el periodo" />}
    </SectionCard>
  );
}
