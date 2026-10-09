"use client";
import React from 'react';
import { HugeiconsIcon } from "@hugeicons/react";
import { SquareLock01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from '@/context/AuthContext';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import OwnerDashboard from '@/components/dashboard/OwnerDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';

export default function DashboardPage() {
  const { role, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay variant="area" />;
  }

  switch (role) {
    case 'superadmin':
    case 'admin':
      return <AdminDashboard />;

    case 'owner':
      return <OwnerDashboard />;

    case 'manager':
      return <ManagerDashboard />;

    default:
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
          <div className="w-16 h-16 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            <HugeiconsIcon icon={SquareLock01Icon} className="w-7 h-7 text-slate-400" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Acceso limitado</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">
              Tu cuenta no tiene un rol administrativo asignado
            </p>
          </div>
        </div>
      );
  }
}
