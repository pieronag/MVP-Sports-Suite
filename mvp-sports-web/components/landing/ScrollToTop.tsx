"use client";
import { useState, useEffect } from "react";
import { ArrowUpIcon } from "@heroicons/react/24/outline";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top cordinate to 0
  // make scrolling smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-[110]">
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="p-3 rounded-full bg-[#00df82] text-slate-950 shadow-[0_0_30px_rgba(0,223,130,0.4)] hover:scale-110 active:scale-95 transition-all animate-in fade-in zoom-in duration-300 group"
          aria-label="Volver arriba"
        >
          <ArrowUpIcon className="w-6 h-6 transition-transform group-hover:-translate-y-1" />
        </button>
      )}
    </div>
  );
}
