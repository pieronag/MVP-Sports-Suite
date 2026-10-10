"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/services/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileDown, Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";

interface ReportData {
  date: string;
  bookings: number;
  revenue: number;
  occupancy: number;
  avgPrice: number;
}

interface DayStats {
  day: string;
  bookings: number;
  revenue: number;
}

const CurrencyDollarIcon = ({ className }: { className?: string }) => (
  <HugeiconsIcon className={className} />
);

const formatCLP = (amount: number) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function ManagerReports({ tenantId, isDark }: { tenantId: string; isDark: boolean }) {
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const [sportDistribution, setSportDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyBookings, setMonthlyBookings] = useState(0);
  const [avgOccupancy, setAvgOccupancy] = useState(0);

  useEffect(() => {
    if (!tenantId) return;

    const loadReportData = async () => {
      try {
        // Datos de últimos 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const bookingsSnap = await getDocs(
          query(
            collection(db, "bookings"),
            where("tenantId", "==", tenantId),
            where("date", ">=", Timestamp.fromDate(thirtyDaysAgo))
          )
        );

        const bookings = bookingsSnap.docs.map((d) => d.data());

        // Procesar datos por día
        const dayMap = new Map<string, DayStats>();
        const sportMap = new Map<string, number>();
        let totalRevenue = 0;
        let totalBookings = 0;

        bookings.forEach((booking: any) => {
          const date = booking.date?.toDate ? booking.date.toDate() : new Date(booking.date);
          const dateStr = date.toISOString().split("T")[0];

          const existing = dayMap.get(dateStr) || { day: dateStr, bookings: 0, revenue: 0 };
          existing.bookings++;
          existing.revenue += booking.price || 0;
          dayMap.set(dateStr, existing);

          // Sport distribution
          if (booking.sport) {
            sportMap.set(booking.sport, (sportMap.get(booking.sport) || 0) + 1);
          }

          if (booking.paymentStatus === "paid") {
            totalRevenue += booking.price || 0;
            totalBookings++;
          }
        });

        setDayStats(Array.from(dayMap.values()).sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()));
        setSportDistribution(
          Array.from(sportMap.entries()).map(([sport, count]) => ({
            name: sport,
            value: count,
          }))
        );

        setMonthlyRevenue(totalRevenue);
        setMonthlyBookings(totalBookings);
        setAvgOccupancy(bookings.length > 0 ? Math.round((totalBookings / bookings.length) * 100) : 0);
        setLoading(false);
      } catch (error) {
        console.error("Error loading report data:", error);
        setLoading(false);
      }
    };

    loadReportData();
  }, [tenantId]);

  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  const bgClass = isDark ? "bg-[#0f1727]" : "bg-white";
  const borderClass = isDark ? "border-[#1e293b]" : "border-slate-200";
  const textClass = isDark ? "text-slate-200" : "text-slate-900";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${bgClass} p-6 rounded-lg border ${borderClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ingresos Mes</p>
              <p className="text-2xl font-bold mt-1">{formatCLP(monthlyRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-500 opacity-50" />
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-lg border ${borderClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Reservas Pagadas</p>
              <p className="text-2xl font-bold mt-1">{monthlyBookings}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className={`${bgClass} p-6 rounded-lg border ${borderClass}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ocupación Promedio</p>
              <p className="text-2xl font-bold mt-1">{avgOccupancy}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      {!loading && (
        <>
          {/* Ingresos por día */}
          <div className={`${bgClass} p-6 rounded-lg border ${borderClass}`}>
            <h3 className="font-semibold mb-4">Ingresos Últimos 30 Días</h3>
            {dayStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dayStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                  <XAxis dataKey="day" stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#f8fafc",
                      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                    }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Ingresos" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500">Sin datos disponibles</p>
            )}
          </div>

          {/* Distribución por deporte */}
          {sportDistribution.length > 0 && (
            <div className={`${bgClass} p-6 rounded-lg border ${borderClass}`}>
              <h3 className="font-semibold mb-4">Distribución por Deporte</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sportDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sportDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabla de reservas por día */}
          <div className={`${bgClass} p-6 rounded-lg border ${borderClass}`}>
            <h3 className="font-semibold mb-4">Reservas por Día</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2">Fecha</th>
                    <th className="text-right py-2 px-2">Reservas</th>
                    <th className="text-right py-2 px-2">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {dayStats.slice(-7).map((day) => (
                    <tr key={day.day} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-2">{new Date(day.day).toLocaleDateString("es-CL")}</td>
                      <td className="text-right py-2 px-2">{day.bookings}</td>
                      <td className="text-right py-2 px-2 font-semibold text-emerald-500">{formatCLP(day.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
