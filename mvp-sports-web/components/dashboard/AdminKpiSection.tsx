"use client";
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    MoneyBag01Icon,
    Rocket01Icon,
    BarChartIcon,
    Alert02Icon,
    SparklesIcon,
} from "@hugeicons/core-free-icons";
import { TarjetaKpi } from '@/components/ui/DashboardWidgets';

interface KpiData {
    revenue: number;
    tenants: number;
    totalTenants: number;
    mrrGrowth: number;
    usageDensity: number;
    churn: number;
    ltv: number;
    conversionRate: number;
}

interface AdminKpiSectionProps {
    kpis: KpiData;
    formatCLP: (amount: number) => string;
}

const ic = "w-6 h-6";

export default function AdminKpiSection({ kpis, formatCLP }: AdminKpiSectionProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <TarjetaKpi
                titulo="MRR mensual"
                valor={formatCLP(kpis.revenue)}
                sub={`ARR proyectado: ${formatCLP(kpis.revenue * 12)}`}
                tendencia={`${kpis.mrrGrowth.toFixed(1)}%`}
                tendenciaPositiva={kpis.mrrGrowth >= 0}
                icono={<HugeiconsIcon icon={MoneyBag01Icon} className={ic} strokeWidth={1.6} />}
                brillo
            />
            <TarjetaKpi
                titulo="Conversión premium"
                valor={`${kpis.conversionRate.toFixed(1)}%`}
                sub={`${kpis.tenants} de ${kpis.totalTenants} activos`}
                icono={<HugeiconsIcon icon={Rocket01Icon} className={ic} strokeWidth={1.6} />}
            />
            <TarjetaKpi
                titulo="Densidad de reservas"
                valor={kpis.usageDensity.toFixed(1)}
                sub="Promedio por recinto / mes"
                icono={<HugeiconsIcon icon={BarChartIcon} className={ic} strokeWidth={1.6} />}
            />
            <TarjetaKpi
                titulo="Recintos inactivos"
                valor={`${kpis.churn.toFixed(1)}%`}
                sub="Sobre el total registrado"
                icono={<HugeiconsIcon icon={Alert02Icon} className={ic} strokeWidth={1.6} />}
            />
            <TarjetaKpi
                titulo="LTV promedio"
                valor={formatCLP(kpis.ltv)}
                sub="Valor por cliente"
                icono={<HugeiconsIcon icon={SparklesIcon} className={ic} strokeWidth={1.6} />}
            />
        </div>
    );
}
