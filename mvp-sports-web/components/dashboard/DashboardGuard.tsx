"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { normalizeRole, redirectFor } from "@/utils/roles";

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Sin rol administrativo asignado: enviar a la experiencia de jugador.
    if (!role) {
      router.replace("/player");
      return;
    }
    const to = redirectFor(pathname, normalizeRole(role));
    if (to) router.replace(to);
  }, [user, role, loading, pathname, router]);

  if (loading) {
    return <LoadingOverlay variant="screen" />;
  }

  if (!user) return null;

  if (!role) return null;

  if (redirectFor(pathname, normalizeRole(role))) {
    return null;
  }

  return <>{children}</>;
}
