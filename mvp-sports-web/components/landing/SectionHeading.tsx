import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  accentText?: string;
  accentBar?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  accentText = "text-[#00df82]",
  accentBar = "bg-[#00df82]",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col md:flex-row gap-4 md:gap-6 lg:gap-16 mb-8 md:mb-12 lg:mb-20 ${
        centered ? "items-center text-center" : "items-start md:items-end"
      }`}
    >
      <div className={`flex-2 space-y-3 md:space-y-4 ${centered ? "flex flex-col items-center" : ""}`}>
        {eyebrow && (
          <div className={`inline-flex items-center gap-2 md:gap-2.5 ${centered ? "justify-center" : ""}`}>
            <span className={`h-[2px] md:h-[3px] w-6 rounded-md ${accentBar}`} />
            <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ${accentText}`}>
              {eyebrow}
            </span>
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-black text-white leading-[0.95] tracking-tighter font-heading uppercase">
          {title}
        </h2>
      </div>
      {description && (
        <div className={`flex-1 ${centered ? "max-w-2xl" : "md:pb-2"}`}>
          <p
            className={`text-xs md:text-sm lg:text-base text-slate-400 font-medium leading-relaxed ${
              centered ? "" : "md:border-l-2 md:border-white/10 md:pl-6"
            }`}
          >
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
