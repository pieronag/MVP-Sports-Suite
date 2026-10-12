import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import DashboardGuard from "@/components/dashboard/DashboardGuard";
import MobileTabBar from "@/components/dashboard/MobileTabBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="dashboard-shell min-h-screen bg-slate-50 dark:bg-[#020611] transition-colors duration-0">

        {/* 1. SIDEBAR (Desktop: fijo izquierda / Mobile: hamburger overlay) */}
        <Sidebar />

        {/* 2. CONTENIDO PRINCIPAL */}
        <div className="xl:ml-64 flex flex-col min-h-screen transition-all duration-0 overflow-x-clip">

          {/* Header */}
          <Header />

          {/* Contenido — ESPACIADO REDUCIDO (Layout Global) */}
          <main className="flex-1 px-4 pt-4 pb-28 md:px-5 md:pt-6 xl:p-6">
            {children}
          </main>

        </div>
        <MobileTabBar />
      </div>
    </DashboardGuard>
  );
}
