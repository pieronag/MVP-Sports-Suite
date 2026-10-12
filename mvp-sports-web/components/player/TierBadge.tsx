// Insignia de rango (Bronce → Leyenda), plana: bloque del color del metal con el nombre.
// Solo estilos en línea: también se usa dentro de la carta MVP que se exporta como imagen.

const TIERS: Record<string, string> = {
  bronce: "#d9925b",
  plata: "#cbd5e1",
  oro: "#f5c542",
  platino: "#5eead4",
  diamante: "#7dd3fc",
  elite: "#a78bfa",
  leyenda: "#f472b6",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const tierColor = (name: string) => TIERS[norm(name || "")] || TIERS.bronce;

export default function TierBadge({ name, scale = 1 }: { name: string; scale?: number }) {
  const px = (n: number) => Math.round(n * scale);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: px(5), height: px(22), padding: `0 ${px(8)}px`, borderRadius: px(5), // mismo radio de la app (5 px)
      background: tierColor(name), color: "#020611", fontSize: px(12), fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {/* Doble chevrón hacia arriba: subir de nivel */}
      <svg width={px(12)} height={px(12)} viewBox="0 0 24 24" aria-hidden>
        <path d="M5 13.5 12 7l7 6.5" fill="none" stroke="#020611" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 19.5 12 13l7 6.5" fill="none" stroke="#020611" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      </svg>
      {name}
    </span>
  );
}
