import Image from "next/image";

type Appearance = "onDark" | "onLight" | "auto";

interface BrandLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
  priority?: boolean;
  /**
   * Controls the logo colors to guarantee contrast:
   * - "onDark" (default): colored mark + white/volt wordmark (for dark surfaces).
   * - "onLight": black mark + dark/emerald wordmark (for light surfaces).
   * - "auto": follows the theme (black in light, colored in dark).
   */
  appearance?: Appearance;
}

export default function BrandLogo({
  size = 40,
  showWordmark = true,
  className = "",
  wordmarkClassName = "",
  priority = false,
  appearance = "onDark",
}: BrandLogoProps) {
  const markClass =
    appearance === "onLight"
      ? "brightness-0"
      : appearance === "auto"
      ? "brightness-0 dark:brightness-100"
      : "brightness-100";

  const mvpClass =
    appearance === "onLight"
      ? "text-slate-900"
      : appearance === "auto"
      ? "text-slate-900 dark:text-white"
      : "text-white";

  const sportsClass = "text-[#00df82]";

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/icons/logo-mark.png"
        alt="MVP Sports"
        width={size}
        height={size}
        priority={priority}
        className={`shrink-0 object-contain ${markClass}`}
        style={{ width: size, height: size }}
      />

      {showWordmark && (
        <span className={`flex items-center text-lg font-black tracking-tighter uppercase font-heading leading-none ${wordmarkClassName}`}>
          <span className={mvpClass}>MVP</span>
          <span className={`${sportsClass} ml-1.5`}>SPORTS</span>
        </span>
      )}
    </span>
  );
}
