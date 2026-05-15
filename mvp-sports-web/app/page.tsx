"use client";
import { useState } from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import AppFunctions from "../components/landing/AppFunctions";
import AppShowcase from "../components/landing/AppShowcase";
import AdminPreview from "../components/landing/AdminPreview";
import Footer from "../components/landing/Footer";
import RegistrationModal from "../components/landing/RegistrationModal";
import ScrollToTop from "../components/landing/ScrollToTop";

export default function Home() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 selection:bg-[#00df82] selection:text-slate-950">
      <Navbar onRegisterClick={() => setIsRegisterOpen(true)} />
      
      <div className="pt-20">
        {/* HERO SECTION */}
        <div className="container mx-auto">
          <Hero onRegisterClick={() => setIsRegisterOpen(true)} />
        </div>
        
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

      <Footer />
      <ScrollToTop />
      <RegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </main>
  );
}
