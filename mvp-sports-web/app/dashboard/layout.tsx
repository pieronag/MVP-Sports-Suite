import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020611] transition-colors duration-0">

      {/* 1. SIDEBAR (Desktop: fijo izquierda / Mobile: hamburger overlay) */}
      <Sidebar />

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="xl:ml-64 flex flex-col min-h-screen transition-all duration-0">

        {/* Header */}
        <Header />

        {/* Contenido — ESPACIADO REDUCIDO (Layout Global) */}
        <main className="flex-1 px-3 py-4 md:px-5 md:py-6 xl:p-6 overflow-x-hidden">
          {children}
        </main>

      </div>
    </div>
  );
}
