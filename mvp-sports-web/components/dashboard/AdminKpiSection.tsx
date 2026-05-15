"use client";
import React from 'react';
import { 
    CreditCardIcon, RocketLaunchIcon, PresentationChartLineIcon, 
    BoltIcon, SparklesIcon 
} from '@heroicons/react/24/outline';
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

export default function AdminKpiSection({ kpis, formatCLP }: AdminKpiSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <TarjetaKpi
                titulo="MRR (MENSUAL)"
                valor={formatCLP(kpis.revenue)}
                sub={`PROYECCIÓN ARR: ${formatCLP(kpis.revenue * 12)}`}
                tendencia={`${kpis.mrrGrowth.toFixed(1)}%`}
                tendenciaPositiva={kpis.mrrGrowth >= 0}
                icono={<CreditCardIcon />}
                brillo
            />
            <TarjetaKpi
                titulo="CONVERSIÓN PREMIUM"
                valor={`${kpis.conversionRate.toFixed(1)}%`}
                sub={`${kpis.tenants} / ${kpis.totalTenants} ACTIVOS`}
                tendencia="MARKET"
                icono={<RocketLaunchIcon />}
            />
            <TarjetaKpi
                titulo="DENSIDAD (RESERVAS)"
                valor={kpis.usageDensity.toFixed(1)}
                sub="AVG X RECINTO X MES"
                tendencia="+5%"
                icono={<PresentationChartLineIcon />}
            />
            <TarjetaKpi
                titulo="TASA DE DESERCIÓN"
                valor={`${kpis.churn.toFixed(1)}%`}
                sub="RECINTOS INACTIVOS"
                tendencia="-0.5%"
                tendenciaPositiva={true}
                icono={<BoltIcon />}
            />
            <TarjetaKpi
                titulo="LTV PROMEDIO"
                valor={formatCLP(kpis.ltv)}
                sub="VALOR X CLIENTE"
                tendencia="+8%"
                icono={<SparklesIcon />}
            />
        </div>

    );
}
