"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import AppFunctions from "../components/landing/AppFunctions";
import SupportedSports from "../components/landing/SupportedSports";
import AppShowcase from "../components/landing/AppShowcase";
import AdminPreview from "../components/landing/AdminPreview";
import Footer from "../components/landing/Footer";
import ScrollToTop from "../components/landing/ScrollToTop";
import dynamic from "next/dynamic";

const RegistrationModal = dynamic(() => import("../components/landing/RegistrationModal"));
const TermsModal = dynamic(() => import("../components/landing/TermsModal"));
const PrivacyModal = dynamic(() => import("../components/landing/PrivacyModal"));

export default function Home() {
  const router = useRouter();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) router.replace("/login");
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 selection:bg-[#00df82] selection:text-slate-950">
      <Navbar onRegisterClick={() => setIsRegisterOpen(true)} />
      
      <div className="pt-20">
        {/* HERO SECTION */}
        <div className="container mx-auto">
          <Hero onRegisterClick={() => setIsRegisterOpen(true)} />
        </div>
        
        {/* SUPPORTED SPORTS BANNER */}
        <SupportedSports />
        
        {/* PLAYER FIRST APPROACH - Bento Grid */}
        <div className="container mx-auto">
          <AppFunctions onRegisterClick={() => setIsRegisterOpen(true)} />
        </div>

        {/* APP SHOWCASE - Full Width Background */}
        <AppShowcase />
        
        {/* OWNER MANAGEMENT SECTION */}
        <div className="container mx-auto">
          <AdminPreview onRegisterClick={() => setIsRegisterOpen(true)} />
        </div>
      </div>

      <Footer 
        onTermsClick={() => setIsTermsOpen(true)} 
        onPrivacyClick={() => setIsPrivacyOpen(true)} 
      />
      <ScrollToTop />
      <RegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </main>
  );
}
