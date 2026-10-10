"use client";
import { useTheme } from "next-themes";
import ActivityFeed from "@/components/player/ActivityFeed";
import { useAuth } from "@/context/AuthContext";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ActivityPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingOverlay variant="page" />;
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-white"}`}>
      <div className="max-w-2xl mx-auto p-4">
        <ActivityFeed isDark={isDark} />
      </div>
    </div>
  );
}
