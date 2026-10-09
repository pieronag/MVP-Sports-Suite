"use client";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { DEFAULT_PLANS, PlanConfig, sortPlans } from "./plans";

/**
 * Subscribes to `settings/global.plans` but always renders with a safe
 * fallback so the pricing UI never stays empty if Firestore is unavailable
 * or unconfigured.
 */
export function usePlans() {
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      unsubscribe = onSnapshot(
        doc(db, "settings", "global"),
        (snap) => {
          const raw = (snap.data()?.plans as PlanConfig[] | undefined) ?? [];
          if (Array.isArray(raw) && raw.length > 0) {
            setPlans(sortPlans(raw));
          }
        },
        () => {
          // Keep the default plans on error.
        }
      );
    } catch {
      // Firebase not configured: keep defaults.
    }

    return () => unsubscribe();
  }, []);

  return { plans };
}
