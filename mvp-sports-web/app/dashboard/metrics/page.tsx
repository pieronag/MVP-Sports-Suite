"use client";
// Métricas de la plataforma (superadmin) por mes. Cálculos en utils/platformMetrics (misma comisión que la liquidación).
import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon, ChartIncreaseIcon, CreditCardIcon, Download01Icon, GlobeIcon, RefreshIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { collection, doc, onSnapshot } from "firebase/firestore";
import PageTitle, { Accent } from "@/components/dashboard/PageTitle";
import { TarjetaKpi } from "@/components/ui/DashboardWidgets";
import { useFeedback } from "@/components/ui/Feedback";
import { CollectionCard, DebtsCard, MethodsCard, TopVenuesCard, TransactionsCard, WeeklyChart, formatCLP } from "@/components/metrics/MetricsViews";
import { db } from "@/services/client/firebase";
import { listAllBookings } from "@/services/client/data/bookings";
import { countsAsIncome } from "@/utils/bookingModel";
import { chileDateTime } from "@/utils/chileTime";
import type { Booking, RawDoc } from "@/types/booking";
import type { PlanConfig } from "@/utils/invoiceCalc";
import { chileMonthDay, computeMetrics, shiftMonth, trend } from "@/utils/platformMetrics";

const Icon = ({ icon }: { icon: typeof GlobeIcon }) => <HugeiconsIcon icon={icon} className="w-6 h-6" strokeWidth={1.6} />;
const trendProp = (cur: number, prev: number, upIsGood = true) => {
  const t = trend(cur, prev);
  return t === null ? undefined : { value: `${t >= 0 ? "+" : ""}${t}%`, isUp: upIsGood ? t >= 0 : t <= 0 };
};

export default function MetricsPage() {
  const { toast } = useFeedback();
  const today = chileMonthDay(new Date()).month;
  const [month, setMonth] = useState(today);
  const [invoices, setInvoices] = useState<RawDoc[] | null>(null);
  const [tenants, setTenants] = useState<RawDoc[] | null>(null);
  const [settings, setSettings] = useState<{ plans: PlanConfig[]; rate: number } | null>(null);
  const [bookings, setBookings] = useState<{ month: string; list: Booking[] } | null>(null);
  const [error, setError] = useState("");

  // Liquidaciones, recintos y planes en vivo
  useEffect(() => {
    const offs = [
      onSnapshot(collection(db, "invoices"), (s) => setInvoices(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setInvoices([])),
      onSnapshot(collection(db, "tenants"), (s) => setTenants(s.docs.map((d) => ({ ...d.data(), id: d.id }))), () => setTenants([])),
      onSnapshot(doc(db, "settings", "global"), (s) => {
        const d = s.data() || {};
        setSettings({ plans: Array.isArray(d.plans) ? d.plans : [], rate: typeof d.commissionRate === "number" ? d.commissionRate : 0 });
      }, () => setSettings({ plans: [], rate: 0 })),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Reservas con ingreso del mes elegido y del anterior (para la tendencia)
  useEffect(() => {
    let alive = true;
    const from = chileDateTime(`${shiftMonth(month, -1)}-01`, 0, 0);
    const to = new Date(chileDateTime(`${shiftMonth(month, 1)}-01`, 0, 0).getTime() - 1);
    listAllBookings({ from, to })
      .then((list) => { if (alive) { setBookings({ month, list: list.filter(countsAsIncome) }); setError(""); } })
      .catch((e) => { console.error("Métricas", e); if (alive) { setBookings({ month, list: [] }); setError("No se pudieron cargar las reservas del periodo."); } });
    return () => { alive = false; };
  }, [month]);

  const ready = invoices && tenants && settings && bookings?.month === month;
  const m = useMemo(() => (ready ? computeMetrics({
    month, now: new Date(), bookings: bookings!.list, invoices: invoices!, tenants: tenants!, plans: settings!.plans, defaultRate: settings!.rate,
  }) : null), [ready, month, bookings, invoices, tenants, settings]);

  const label = (() => {
    const [y, mo] = month.split("-").map(Number);
    const s = new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const exportCsv = () => {
    if (!m || !bookings?.list.length) { toast("No hay reservas en el mes para exportar", "error"); return; }
    const rows = bookings.list.filter((b) => b.start && chileMonthDay(b.start).month === month);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [["Fecha", "Recinto", "Monto", "Estado"], ...rows.map((b) => [b.start!.toLocaleDateString("es-CL", { timeZone: "America/Santiago" }), b.tenantName, b.price, b.isNoShow ? "Inasistencia" : "Pagada"])]
      .map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    Object.assign(document.createElement("a"), { href: url, download: `metricas_${month}.csv` }).click();
    URL.revokeObjectURL(url);
    toast(`${rows.length} ${rows.length === 1 ? "reserva exportada" : "reservas exportadas"}`);
  };

  const navBtn = "w-10 h-10 flex items-center justify-center text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed";
  return (
    <div className="w-full space-y-6 pb-12 animate-fadeIn">
      {error && <div role="alert" className="p-4 rounded-md border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-[12px] font-bold">{error}</div>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
        <PageTitle eyebrow="Auditoría ejecutiva">Métricas de <Accent>Desempeño</Accent></PageTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10" role="group" aria-label="Mes">
            <button onClick={() => setMonth((x) => shiftMonth(x, -1))} aria-label="Mes anterior" className={navBtn}><HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2.2} /></button>
            <span className="flex items-center gap-2 px-3 min-w-[150px] justify-center border-x border-slate-200 dark:border-white/10 h-10" aria-live="polite">
              <HugeiconsIcon icon={Calendar03Icon} className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.8} />
              <span className="text-[11px] font-black uppercase text-slate-700 dark:text-white whitespace-nowrap">{label}</span>
            </span>
            <button onClick={() => setMonth((x) => shiftMonth(x, 1))} aria-label="Mes siguiente" disabled={month >= today} className={navBtn}><HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2.2} /></button>
          </div>
          <button onClick={exportCsv} disabled={!m} className="flex items-center gap-2 px-3.5 h-10 rounded-md bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[11px] font-black uppercase tracking-wider disabled:opacity-40">
            <HugeiconsIcon icon={Download01Icon} className="w-4 h-4" strokeWidth={2} />CSV
          </button>
        </div>
      </div>

      {!m ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3" role="status">
          <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-emerald-500 animate-spin" strokeWidth={2} />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Calculando métricas de {label.toLowerCase()}…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <TarjetaKpi titulo="Volumen (GMV)" valor={formatCLP(m.kpis.gmv)} sub={`${m.bookingCount} ${m.bookingCount === 1 ? "reserva pagada" : "reservas pagadas"}`} icono={<Icon icon={GlobeIcon} />} brillo trend={trendProp(m.kpis.gmv, m.prevKpis.gmv)} />
            <TarjetaKpi titulo="Comisiones" valor={formatCLP(m.kpis.commission)} sub={m.isCurrent ? "Estimado a la fecha" : "Sobre el volumen del mes"} icono={<Icon icon={ChartIncreaseIcon} />} trend={trendProp(m.kpis.commission, m.prevKpis.commission)} />
            <TarjetaKpi titulo="Planes" valor={formatCLP(m.kpis.plans)} sub={m.isCurrent ? "MRR de recintos activos" : "Liquidado y pagado"} icono={<Icon icon={CreditCardIcon} />} brillo trend={m.isCurrent ? undefined : trendProp(m.kpis.plans, m.prevKpis.plans)} />
            <TarjetaKpi titulo="Por cobrar" valor={formatCLP(m.kpis.pending)} sub="Liquidaciones sin pagar" icono={<Icon icon={Wallet01Icon} />} trend={trendProp(m.kpis.pending, m.prevKpis.pending, false)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5"><WeeklyChart m={m} /><CollectionCard m={m} /></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><MethodsCard m={m} /><TopVenuesCard m={m} /></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><TransactionsCard m={m} now={new Date()} /><DebtsCard m={m} /></div>
        </>
      )}
    </div>
  );
}
