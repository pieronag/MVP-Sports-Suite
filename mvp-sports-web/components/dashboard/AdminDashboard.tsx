"use client";
// Panel general del superadmin. Cálculo en utils/adminOverview (mismas reglas que Métricas); secciones en ./admin.
import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Archive01Icon, ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { collection, doc, onSnapshot } from "firebase/firestore";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import AdminKpiSection from "./AdminKpiSection";
import RevenueChart from "./RevenueChart";
import { PlansAndNewVenues, Rankings, RecentBookings, formatCLP } from "./admin/OverviewSections";
import { db } from "@/services/client/firebase";
import { listAllBookings } from "@/services/client/data/bookings";
import { isReal } from "@/utils/bookingModel";
import { chileDateTime } from "@/utils/chileTime";
import type { Booking, RawDoc } from "@/types/booking";
import type { PlanConfig } from "@/utils/invoiceCalc";
import { computeOverview } from "@/utils/adminOverview";
import { chileMonthDay, shiftMonth } from "@/utils/platformMetrics";

export default function AdminDashboard() {
  const today = chileMonthDay(new Date()).month;
  const [month, setMonth] = useState(today);
  const [historic, setHistoric] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [tenants, setTenants] = useState<RawDoc[] | null>(null);
  const [invoices, setInvoices] = useState<RawDoc[] | null>(null);
  const [settings, setSettings] = useState<{ plans: PlanConfig[]; rate: number } | null>(null);
  const [bookings, setBookings] = useState<{ key: string; list: Booking[] } | null>(null);
  const [error, setError] = useState("");
  const key = historic ? "all" : month;

  useEffect(() => {
    const offs = [
      onSnapshot(collection(db, "tenants"), (s) => setTenants(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setTenants([])),
      onSnapshot(collection(db, "invoices"), (s) => setInvoices(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setInvoices([])),
      onSnapshot(doc(db, "settings", "global"), (s) => {
        const d = s.data() || {};
        setSettings({ plans: Array.isArray(d.plans) ? d.plans : [], rate: typeof d.commissionRate === "number" ? d.commissionRate : 0 });
      }, () => setSettings({ plans: [], rate: 0 })),
    ];
    return () => offs.forEach((off) => off());
  }, [refresh]);

  useEffect(() => {
    let alive = true;
    const range = historic ? {} : { from: chileDateTime(`${month}-01`, 0, 0), to: new Date(chileDateTime(`${shiftMonth(month, 1)}-01`, 0, 0).getTime() - 1) };
    listAllBookings(range)
      .then((list) => { if (alive) { setBookings({ key, list: list.filter(isReal) }); setError(""); } })
      .catch((e) => { console.error("Panel", e); if (alive) { setBookings({ key, list: [] }); setError("No se pudieron cargar las reservas de la plataforma."); } });
    return () => { alive = false; };
  }, [month, historic, key, refresh]);

  const ready = tenants && invoices && settings && bookings?.key === key;
  const o = useMemo(() => (ready ? computeOverview({ month: historic ? null : month, tenants: tenants!, invoices: invoices!, bookings: bookings!.list, plans: settings!.plans, defaultRate: settings!.rate }) : null),
    [ready, historic, month, tenants, invoices, bookings, settings]);

  const label = (() => {
    const [y, m] = month.split("-").map(Number);
    const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const navBtn = "w-10 h-10 flex items-center justify-center text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="w-full space-y-6 pb-10 text-left animate-fadeIn">
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 p-4 rounded-md border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
          <p className="text-[12px] font-bold">{error}</p>
          <button onClick={() => setRefresh((k) => k + 1)} className="px-4 h-9 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase">Reintentar</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <PageTitle eyebrow={historic ? "Histórico completo de la plataforma" : "Monitoreo global de reservas"}>Ecosistema <Accent>MVP</Accent></PageTitle>
        <div className="flex flex-wrap items-center gap-2">
          <button aria-pressed={historic} onClick={() => setHistoric((h) => !h)}
            className={`flex items-center gap-2 px-4 h-10 rounded-md text-[11px] font-black uppercase tracking-wider ${historic ? "bg-amber-500 text-white" : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"}`}>
            <HugeiconsIcon icon={Archive01Icon} className="w-4 h-4" strokeWidth={1.8} />{historic ? "Viendo histórico" : "Ver histórico"}
          </button>
          <div className="flex items-center rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10" role="group" aria-label="Mes">
            <button onClick={() => setMonth((x) => shiftMonth(x, -1))} disabled={historic} aria-label="Mes anterior" className={navBtn}><HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2.2} /></button>
            <span className="flex items-center gap-2 px-3 min-w-[150px] justify-center border-x border-slate-200 dark:border-white/10 h-10" aria-live="polite">
              <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
              <span className="text-[11px] font-black uppercase text-slate-700 dark:text-white whitespace-nowrap">{historic ? "Todo el histórico" : label}</span>
            </span>
            <button onClick={() => setMonth((x) => shiftMonth(x, 1))} disabled={historic || month >= today} aria-label="Mes siguiente" className={navBtn}><HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} /></button>
          </div>
          <button onClick={() => setRefresh((k) => k + 1)} aria-label="Actualizar datos" className="w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-[#00df82] text-white dark:text-slate-950 rounded-md active:scale-90">
            <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${!o ? "animate-spin" : ""}`} strokeWidth={2} />
          </button>
        </div>
      </div>

      {!o ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3" role="status">
          <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 animate-spin" strokeWidth={2} />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Cargando la plataforma…</p>
        </div>
      ) : (
        <>
          <AdminKpiSection kpis={{ ...o.kpis, mrrGrowth: 0 }} formatCLP={formatCLP} />
          <RevenueChart data={o.chart} isHistorical={historic} revenue={o.kpis.revenue} formatCLP={formatCLP} />
          <Rankings o={o} />
          <PlansAndNewVenues o={o} total={o.kpis.totalTenants} />
          <RecentBookings o={o} now={new Date()} />
        </>
      )}
    </div>
  );
}
