"use client";
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard'; // Asegúrate de haber movido tu código antiguo aquí
import OwnerDashboard from '@/components/dashboard/OwnerDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { role, loading } = useAuth(); // Asumiendo que useAuth devuelve loading

  // 1. Estado de Carga
  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 gap-2">
        <ArrowPathIcon className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="text-xs font-bold uppercase tracking-widest">CARGANDO MVP SPORTS SUITE...</span>
      </div>
    );
  }

  // 2. Renderizado Condicional por Rol
  switch (role) {
    case 'superadmin':
    case 'admin':
      return <AdminDashboard />;

    case 'owner':
      return <OwnerDashboard />;

    case 'manager':
      // Por ahora el manager ve lo mismo que el dueño, o podrías hacer un ManagerDashboard
      return <ManagerDashboard />;

    default:
      // Fallback para usuarios sin rol (o usuario final si tuviera acceso aquí)
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase">ACCESO LIMITADO</h2>
          <p className="text-sm text-slate-500 mt-2 uppercase font-bold">TU CUENTA NO TIENE UN ROL ADMINISTRATIVO ASIGNADO.</p>
        </div>
      );

  }
}
