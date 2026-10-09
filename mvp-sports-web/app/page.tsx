"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import TrustBand from "../components/landing/TrustBand";
import HowItWorks from "../components/landing/HowItWorks";
import AppFunctions from "../components/landing/AppFunctions";
import SupportedSports from "../components/landing/SupportedSports";
import AdminPreview from "../components/landing/AdminPreview";
import Pricing from "../components/landing/Pricing";
import PlanSimulator from "../components/landing/PlanSimulator";
import IntegracionesSection from "../components/landing/IntegracionesSection";
import FinalCta from "../components/landing/FinalCta";
import Footer from "../components/landing/Footer";
import ScrollToTop from "../components/landing/ScrollToTop";

const RegistrationModal = dynamic(() => import("../components/landing/RegistrationModal"));
const TermsModal = dynamic(() => import("../components/landing/TermsModal"));
const PrivacyModal = dynamic(() => import("../components/landing/PrivacyModal"));

export default function Home() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 selection:bg-[#00df82] selection:text-slate-950">
      <Navbar onRegisterClick={() => setIsRegisterOpen(true)} />

      {/* HERO */}
      <Hero onRegisterClick={() => setIsRegisterOpen(true)} />

      {/* TRUST / STATS BAND */}
      <TrustBand />

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* PLAYER FEATURES - Bento Grid */}
      <AppFunctions onRegisterClick={() => setIsRegisterOpen(true)} />

      {/* SPORTS */}
      <SupportedSports />

      {/* OWNER MANAGEMENT */}
      <AdminPreview onRegisterClick={() => setIsRegisterOpen(true)} />

      {/* PRICING PLANS */}
      <Pricing />

      {/* PLAN SIMULATOR */}
      <PlanSimulator />

      {/* INTEGRATIONS */}
      <IntegracionesSection />

      {/* FINAL CTA */}
      <FinalCta onRegisterClick={() => setIsRegisterOpen(true)} />

      <Footer
        onTermsClick={() => setIsTermsOpen(true)}
        onPrivacyClick={() => setIsPrivacyOpen(true)}
        onRegisterClick={() => setIsRegisterOpen(true)}
      />
      <ScrollToTop />
      <RegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </main>
  );
}
