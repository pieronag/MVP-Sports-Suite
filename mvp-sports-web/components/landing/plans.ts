export interface PlanFeatures {
  topPosition?: boolean;
  marketing?: boolean;
  multiRecinto?: boolean;
  analytics?: boolean;
  support?: boolean;
}

export interface PlanConfig {
  id: string;
  name: string;
  price: number;
  commission: number;
  priorityScore: number;
  features: PlanFeatures;
}

export const FEATURE_LABELS: { key: keyof PlanFeatures; label: string }[] = [
  { key: "topPosition", label: "Prioridad en búsquedas" },
  { key: "multiRecinto", label: "Multi-recinto" },
  { key: "analytics", label: "Análisis de datos" },
  { key: "marketing", label: "Cupones y marketing" },
  { key: "support", label: "Soporte 24/7" },
];

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    commission: 4.0,
    priorityScore: 10,
    features: {},
  },
  {
    id: "basic",
    name: "Básico",
    price: 29990,
    commission: 3.0,
    priorityScore: 30,
    features: { topPosition: true },
  },
  {
    id: "pro",
    name: "Pro",
    price: 59990,
    commission: 2.0,
    priorityScore: 60,
    features: { topPosition: true, multiRecinto: true, analytics: true, marketing: true },
  },
  {
    id: "elite",
    name: "Elite",
    price: 99990,
    commission: 0,
    priorityScore: 100,
    features: { topPosition: true, multiRecinto: true, analytics: true, marketing: true, support: true },
  },
];

export const sortPlans = (plans: PlanConfig[]) =>
  [...plans].sort((a, b) => a.price - b.price);