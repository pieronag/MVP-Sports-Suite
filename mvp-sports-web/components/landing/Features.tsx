"use client";
import { 
  CalendarIcon, 
  TrophyIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon 
} from "@heroicons/react/24/outline";

const features = [
  {
    name: "Reservas en Tiempo Real",
    description: "Gestión inteligente de canchas con disponibilidad instantánea y pagos integrados.",
    icon: CalendarIcon,
    color: "text-blue-400"
  },
  {
    name: "Gestión de Torneos",
    description: "Organiza ligas y torneos con generación automática de fixtures y estadísticas.",
    icon: TrophyIcon,
    color: "text-yellow-400"
  },
  {
    name: "Analytics Avanzados",
    description: "Visualiza tus ingresos, ocupación y métricas clave con reportes detallados.",
    icon: ChartBarIcon,
    color: "text-[#00df82]"
  },
  {
    name: "Comunidad y Gamificación",
    description: "Sistema de medallas, niveles y ranking para mantener a tus jugadores motivados.",
    icon: UserGroupIcon,
    color: "text-emerald-400"
  },
  {
    name: "Pagos Seguros",
    description: "Integración total con Transbank para cobros rápidos y seguros en línea.",
    icon: CreditCardIcon,
    color: "text-sky-400"
  },
  {
    name: "App para Jugadores",
    description: "Tus clientes pueden reservar, ver resultados y recibir notificaciones desde su móvil.",
    icon: DevicePhoneMobileIcon,
    color: "text-purple-400"
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-slate-950 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-[#00df82] font-bold tracking-widest uppercase text-sm">Características</h2>
          <h3 className="text-4xl lg:text-5xl font-bold text-white">Todo lo que necesitas para dominar el mercado</h3>
          <p className="text-slate-400 text-lg">
            Nuestra suite está diseñada para optimizar cada aspecto de tu recinto deportivo, desde la reserva inicial hasta el reporte financiero final.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#00df82]/30 transition-all hover:bg-white/[0.07] group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">{feature.name}</h4>
              <p className="text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
