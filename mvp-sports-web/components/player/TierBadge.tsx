// Insignia de rango (Bronce → Leyenda) con el metal de cada nivel.
// Solo estilos en línea: también se usa dentro de la carta MVP que se exporta como imagen.

const TIERS: Record<string, { from: string; to: string; ink: string }> = {
  bronce: { from: "#f3b98a", to: "#9a5a2e", ink: "#2b1406" },
  plata: { from: "#f8fafc", to: "#94a3b8", ink: "#1e293b" },
  oro: { from: "#fde68a", to: "#d39b12", ink: "#3a2500" },
  platino: { from: "#ccfbf1", to: "#2aa198", ink: "#032a27" },
  diamante: { from: "#e0f2fe", to: "#3b82f6", ink: "#0b1f4d" },
  elite: { from: "#ede9fe", to: "#7c3aed", ink: "#ffffff" },
  leyenda: { from: "#fce7f3", to: "#db2777", ink: "#ffffff" },
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const tierPalette = (name: string) => TIERS[norm(name || "")] || TIERS.bronce;

export default function TierBadge({ name, scale = 1 }: { name: string; scale?: number }) {
  const t = tierPalette(name);
  const px = (n: number) => Math.round(n * scale);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: px(6), height: px(26), padding: `0 ${px(10)}px 0 ${px(7)}px`,
      borderRadius: px(7), background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)`,
      boxShadow: `inset 0 ${px(1)}px 0 rgba(255,255,255,0.55), 0 ${px(2)}px ${px(8)}px rgba(0,0,0,0.25)`,
      color: t.ink, fontSize: px(12), fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {/* Escudo */}
      <svg width={px(14)} height={px(14)} viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.5 4 5.5v6.2c0 4.6 3.3 8.6 8 9.8 4.7-1.2 8-5.2 8-9.8V5.5l-8-3Z" fill={t.ink} fillOpacity="0.85" />
        <path d="m12 7.2 1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5L12 7.2Z" fill={t.from} />
      </svg>
      {name}
    </span>
  );
}
