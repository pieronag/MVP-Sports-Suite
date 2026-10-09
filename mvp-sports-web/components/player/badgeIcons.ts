import type { ElementType } from "react";
import {
  Target, GraduationCap, ShieldAlert, Trophy, Award, Crown, Activity, Shield, Flame, Crosshair,
  Zap, Swords, Medal, Sword, Sunrise, Moon, Heart, CalendarDays, Timer, Users,
} from "@/components/player/icons";

// Íconos de insignias compartidos por Perfil y Estadísticas
export const BADGE_ICONS: Record<string, ElementType> = {
  scorer: Target, playmaker: GraduationCap, defender: ShieldAlert, wins: Trophy, mvp: Award,
  experience: Crown, multi_sport: Activity, captaincy: Shield, comeback: Flame, precision: Crosshair,
  clutch: Zap, tournaments: Swords, invictus: Medal, rivalry: Sword, morning_player: Sunrise,
  night_player: Moon, loyal: Heart, weekend_warrior: CalendarDays, stamina: Timer, social: Users,
};
