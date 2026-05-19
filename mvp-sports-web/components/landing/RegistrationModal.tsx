"use client";
import { useState, useEffect } from "react";
import { XMarkIcon, CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon, ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";

const SPORT_POSITIONS: Record<string, string[]> = {
  'Fútbol': ['Arquero', 'Defensa', 'Lateral', 'Volante', 'Delantero'],
  'Pádel': ['Lado Derecho', 'Lado Izquierdo'],
  'Tenis': ['Individual', 'Dobles'],
  'Básquetbol': ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
  'Voleibol': ['Armador', 'Atacante', 'Central', 'Líbero']
};

const normalizeBadgeId = (id: string): string => {
  const normMap: Record<string, string> = {
    goals: 'scorer',
    assists: 'playmaker',
    clean_sheets: 'defender',
    won: 'wins',
    played: 'experience',
    sports_played: 'multi_sport',
    loyalty: 'loyal'
  };
  return normMap[id] || id;
};

export default function RegistrationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    rut: "",
    password: "",
    confirmPassword: "",
    mainSport: "",
    position: "",
    dominantFoot: "",
    height: "",
    weight: "",
    favTime: "",
    frequency: "",
    city: "",
    birthDate: "",
    gender: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Resetear estado al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSuccess(false);
      setError("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setAcceptTerms(false);
      // Opcional: Limpiar formulario al abrir
      setFormData({
        displayName: "", email: "", confirmEmail: "", phone: "", rut: "", password: "", confirmPassword: "",
        mainSport: "", position: "", dominantFoot: "", height: "", weight: "",
        favTime: "", frequency: "", city: "", birthDate: "", gender: ""
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- VALIDATIONS ---
  const validateRut = (rut: string) => {
    if (!rut) return false;
    let value = rut.replace(/\./g, "").replace("-", "");
    if (value.length < 8) return false;
    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1).toUpperCase();
    let suma = 0;
    let multiplo = 2;
    for (let i = 1; i <= cuerpo.length; i++) {
      suma += multiplo * parseInt(value.charAt(cuerpo.length - i));
      multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    let dvEsperado = 11 - (suma % 11);
    let dvFinal = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();
    return dv === dvFinal;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("569");
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          formData.displayName.trim().length > 3 &&
          formData.email.includes("@") &&
          formData.email === formData.confirmEmail &&
          validatePhone(formData.phone) &&
          validateRut(formData.rut) &&
          formData.password.length >= 6 &&
          formData.password === formData.confirmPassword &&
          formData.city.trim().length > 2
        );
      case 2:
        return (
          formData.mainSport &&
          formData.position &&
          formData.dominantFoot &&
          formData.height &&
          formData.weight &&
          formData.gender
        );
      case 3:
        return (
          formData.favTime &&
          formData.frequency &&
          formData.birthDate &&
          acceptTerms
        );
      default:
        return false;
    }
  };

  // --- MASKS & FORMATTERS ---
  const formatRut = (rut: string) => {
    let value = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    if (value.length <= 1) return value;
    let cuerpo = value.slice(0, -1);
    let dv = value.slice(-1);
    return cuerpo.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") + "-" + dv;
  };

  const formatPhone = (phone: string) => {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("56")) digits = digits.slice(2);
    if (digits.startsWith("9")) digits = digits.slice(1);
    digits = digits.slice(0, 8);
    if (digits.length === 0) return "+56 9 ";
    return "+56 9 " + digits.replace(/(\d{4})(\d{0,4})/, "$1 $2").trim();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    if (name === "rut") formattedValue = formatRut(value);
    if (name === "phone") formattedValue = formatPhone(value);
    setFormData({ ...formData, [name]: formattedValue });
    setError("");
  };

  const nextStep = () => {
    if (isStepValid()) { setStep(s => s + 1); setError(""); }
    else { setError("Por favor completa todos los campos correctamente."); }
  };

  const prevStep = () => { setStep(s => s - 1); setError(""); };

  const recalculateUserELO = async (userId: string, email: string) => {
    try {
      // 1. Obtener Configuración Global
      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      const settingsData = settingsSnap.exists() ? settingsSnap.data() || {} : {};
      const gamification = settingsData.gamification || {
        xpPerCheckin: 50,
        xpPerMatch: 100,
        xpPerWin: 150,
        xpPerMvp: 200,
        xpPerGoal: 25,
        xpPerAssist: 15,
        xpPerLoss: 50,
        xpPerNoShow: 150,
        tiers: { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 }
      };
      const tiers = settingsData.tiers || gamification.tiers || { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 };
      const maxXP = tiers.legend || 25000;
      const badgeConfigs = settingsData.badges || gamification.badges || {};
      const BADGE_XP = settingsData.badgeXpValues || gamification.badgeXpValues || { bronze: 50, silver: 150, gold: 500 };

      // 2. Buscar Bookings SOLO como creador/reserva para checkins/noshows
      const q1 = query(collection(db, "bookings"), where("userId", "==", userId));
      const q3 = query(collection(db, "bookings"), where("createdBy", "==", email));

      const [snap1, snap3] = await Promise.all([getDocs(q1), getDocs(q3)]);
      const allDocsMap = new Map();
      [snap1, snap3].forEach(snap => snap.docs.forEach((d: any) => { if (!allDocsMap.has(d.id)) allDocsMap.set(d.id, d.data()); }));

      let totalCheckins = 0;
      let totalNoShows = 0;
      let matchesReservedAndPlayed = 0;

      Array.from(allDocsMap.values()).forEach(b => {
          const s = b.status;
          const isNoShow = s === 'no-show' || 
                           b.paymentStatus === 'no-show' || 
                           b.noShow === true || 
                           (b.notes && (b.notes.toLowerCase().includes('no-show') || b.notes.toLowerCase().includes('inasistencia')));
          
          if (isNoShow) {
              totalNoShows++;
          } else if (s === 'completed' || s === 'confirmed' || b.checkOut === true) {
              matchesReservedAndPlayed++;
              if (b.checkIn) totalCheckins++;
          }
      });

      let calculatedXp = 0;

      // Al ser registro nuevo, performance stats son 0
      const statsWins = 0, statsLosses = 0, statsGoals = 0, statsAssists = 0, statsMVPs = 0;

      // XP por Reserva, Check-in y No-show (Solo para el que reserva)
      calculatedXp += matchesReservedAndPlayed * (gamification.xpPerMatch !== undefined ? gamification.xpPerMatch : 100);
      calculatedXp += totalCheckins * (gamification.xpPerCheckin !== undefined ? gamification.xpPerCheckin : 50);
      calculatedXp -= totalNoShows * (gamification.xpPerNoShow !== undefined ? gamification.xpPerNoShow : 150);

      calculatedXp = Math.max(0, calculatedXp);

      // === CALCULAR BADGES Y SU XP BONUS ===
      const daysActive = 1; // Registro inicial
      const statsMap: Record<string, number> = {
        scorer: statsGoals, goals: statsGoals,
        playmaker: statsAssists, assists: statsAssists,
        defender: 0, clean_sheets: 0,
        wins: statsWins, won: statsWins,
        mvp: statsMVPs, mvps: statsMVPs,
        experience: 0, played: 0,
        multi_sport: 1, sports_played: 1,
        captaincy: 0, captain_matches: 0,
        comeback: 0, comebacks: 0,
        precision: 0, precision_matches: 0,
        clutch: 0, clutch_goals: 0,
        tournaments: 0, tournaments_played: 0,
        invictus: 0, longest_win_streak: 0,
        rivalry: 0, rivalries_won: 0,
        morning_player: 0, morning_matches: 0,
        night_player: 0, night_matches: 0,
        loyal: Math.floor(daysActive / 30), loyalty: Math.floor(daysActive / 30),
        weekend_warrior: 0, weekend_matches: 0,
        stamina: 0, minutes_played: 0,
        social: 0, invited_players: 0
      };

      const earnedBadges: any[] = [];
      let badgeXpBonus = 0;
      Object.keys(badgeConfigs).forEach(badgeId => {
        const config = badgeConfigs[badgeId] || { bronze: 5, silver: 15, gold: 30 };
        const userVal = statsMap[badgeId] || 0;
        let tier = null;

        const goldVal = Number(config.gold || 0);
        const silverVal = Number(config.silver || 0);
        const bronzeVal = Number(config.bronze || 0);

        if (userVal > 0) {
          if (goldVal > 0 && userVal >= goldVal) { 
            tier = 'gold'; 
            badgeXpBonus += BADGE_XP.gold; 
          } else if (silverVal > 0 && userVal >= silverVal) { 
            tier = 'silver'; 
            badgeXpBonus += BADGE_XP.silver; 
          } else if (bronzeVal > 0 && userVal >= bronzeVal) { 
            tier = 'bronze'; 
            badgeXpBonus += BADGE_XP.bronze; 
          }
        }
        if (tier) {
          const normId = normalizeBadgeId(badgeId);
          if (!earnedBadges.some(b => b.id === normId)) {
            earnedBadges.push({ id: normId, tier, value: userVal });
          }
        }
      });

      calculatedXp += badgeXpBonus;

      // 3. Determinar Tier y OVR
      let projectedTier = 'BRONCE';
      if (tiers) {
        const t = tiers;
        if (calculatedXp >= t.legend) projectedTier = 'LEYENDA';
        else if (calculatedXp >= t.elite) projectedTier = 'ÉLITE';
        else if (calculatedXp >= t.diamond) projectedTier = 'DIAMANTE';
        else if (calculatedXp >= t.platinum) projectedTier = 'PLATINO';
        else if (calculatedXp >= t.gold) projectedTier = 'ORO';
        else if (calculatedXp >= t.silver) projectedTier = 'PLATA';
      }

      const progress = Math.min(1, Math.sqrt(calculatedXp / maxXP));
      const projectedOvr = Math.floor(40 + (progress * 59));

      // 4. Actualizar Usuario
      await setDoc(doc(db, "users", userId), {
        xp: calculatedXp,
        ovr: projectedOvr,
        tier: projectedTier,
        badges: earnedBadges,
        stats: {
          played: matchesReservedAndPlayed,
          won: statsWins,
          lost: statsLosses,
          goals: statsGoals,
          assists: statsAssists,
          clean_sheets: 0,
          mvp: statsMVPs,
          sports_played: 1,
          minutes_played: 0,
          longest_win_streak: 0,
          weekend_matches: 0,
          morning_matches: 0,
          night_matches: 0,
          loyal: Math.floor(daysActive / 30)
        },
        lastELOUpdate: new Date().toISOString(),
        lastBulkSync: new Date().toISOString()
      }, { merge: true });

    } catch (err) {
      console.error("Error en recalculateUserELO:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid()) { setError("Faltan datos obligatorios."); return; }
    if (formData.email !== formData.confirmEmail) { setError("Los correos electrónicos ingresados no coinciden."); return; }
    if (formData.password !== formData.confirmPassword) { setError("Las contraseñas ingresadas no coinciden."); return; }
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: formData.displayName });

      // Enviar correo electrónico de verificación de Firebase Auth
      await sendEmailVerification(user);

      // Formatear fecha de YYYY-MM-DD a DD/MM/AAAA para compatibilidad total de la Suite
      let formattedBirthDate = formData.birthDate;
      if (formData.birthDate && formData.birthDate.includes("-")) {
        const parts = formData.birthDate.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          formattedBirthDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      // Guardar perfil base con estadísticas e insignias vacías por defecto
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        displayName: formData.displayName,
        phone: formData.phone,
        rut: formData.rut,
        city: formData.city,
        mainSport: formData.mainSport,
        position: formData.position,
        dominantFoot: formData.dominantFoot,
        height: Number(formData.height),
        weight: Number(formData.weight),
        gender: formData.gender,
        favTime: formData.favTime,
        frequency: formData.frequency,
        birthDate: formattedBirthDate,
        role: "player",
        createdAt: new Date().toISOString(),
        xp: 0,
        level: 1,
        tier: 'BRONCE',
        ovr: 40,
        rating: 5.0,
        status: "active",
        badges: [],
        stats: {
          played: 0,
          won: 0,
          lost: 0,
          goals: 0,
          assists: 0,
          clean_sheets: 0,
          mvp: 0,
          sports_played: 1,
          minutes_played: 0,
          longest_win_streak: 0,
          weekend_matches: 0,
          morning_matches: 0,
          night_matches: 0,
          loyal: 0
        }
      });

      // Importar historial de reservas y calcular ELO inicial de inmediato
      try {
        await recalculateUserELO(user.uid, formData.email);
      } catch (recalcErr) {
        console.error("Error al calcular el ELO inicial:", recalcErr);
      }

      // Enviar correo electrónico confirmando el registro de manera asíncrona
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.displayName,
            email: formData.email,
            rut: formData.rut,
            phone: formData.phone,
            sport: formData.mainSport,
            position: formData.position
          })
        });
      } catch (emailErr) {
        console.error("No se pudo enviar el correo de confirmación de registro:", emailErr);
      }

      // Forzar cierre de sesión tras el registro como solicita el usuario
      await signOut(auth);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") setError("El correo ya existe.");
      else setError("Error al crear cuenta.");
    } finally { setLoading(false); }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-l-2 border-[#00df82] pl-3">Cuenta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nombre" name="displayName" value={formData.displayName} onChange={handleInputChange} placeholder="Juan Pérez" />
              <div className="relative">
                <Input label="RUT" name="rut" value={formData.rut} onChange={handleInputChange} placeholder="12345678-9" maxLength={12} />
                {formData.rut.length >= 8 && (
                  <div className={`absolute right-3 top-[32px] text-[7px] font-black uppercase ${validateRut(formData.rut) ? 'text-[#00df82]' : 'text-red-500'}`}>
                    {validateRut(formData.rut) ? '✓ OK' : '✗ NO'}
                  </div>
                )}
              </div>
              <Input label="Email" name="email" value={formData.email} onChange={handleInputChange} placeholder="usuario@email.com" type="email" />
              <Input label="Confirmar Email" name="confirmEmail" value={formData.confirmEmail} onChange={handleInputChange} placeholder="usuario@email.com" type="email" />
              
              <div className="relative text-left">
                <Input 
                  label="Password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[26px] text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="relative text-left">
                <Input 
                  label="Confirmar Password" 
                  name="confirmPassword" 
                  value={formData.confirmPassword} 
                  onChange={handleInputChange} 
                  placeholder="••••••••" 
                  type={showConfirmPassword ? "text" : "password"} 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[26px] text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="relative">
                <Input label="Teléfono" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+56 9 ..." maxLength={15} />
                {formData.phone.length > 7 && (
                  <div className={`absolute right-3 top-[32px] text-[7px] font-black uppercase ${validatePhone(formData.phone) ? 'text-[#00df82]' : 'text-red-500'}`}>
                    {validatePhone(formData.phone) ? '✓ OK' : '✗ NO'}
                  </div>
                )}
              </div>
              <Input label="Ciudad" name="city" value={formData.city} onChange={handleInputChange} placeholder="Santiago" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-l-2 border-[#00df82] pl-3">Deporte</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Deporte" name="mainSport" value={formData.mainSport} onChange={handleInputChange} options={['Fútbol', 'Pádel', 'Tenis', 'Básquetbol', 'Voleibol']} />
              <Select label="Posición" name="position" value={formData.position} onChange={handleInputChange} options={formData.mainSport ? SPORT_POSITIONS[formData.mainSport] : []} disabled={!formData.mainSport} />
              <Select label="Lado" name="dominantFoot" value={formData.dominantFoot} onChange={handleInputChange} options={['Derecho', 'Izquierdo', 'Ambidiestro']} />
              <Input label="Altura (cm)" name="height" value={formData.height} onChange={handleInputChange} placeholder="180" type="number" />
              <Input label="Peso (kg)" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="75" type="number" />
              <Select label="Género" name="gender" value={formData.gender} onChange={handleInputChange} options={['Masculino', 'Femenino', 'Otro']} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-l-2 border-[#00df82] pl-3">Preferencias</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Horario" name="favTime" value={formData.favTime} onChange={handleInputChange} options={['Mañana', 'Tarde', 'Noche']} />
              <Select label="Frecuencia" name="frequency" value={formData.frequency} onChange={handleInputChange} options={['De vez en cuando', '1-2 veces por semana', 'Casi todos los días']} />
              <Input label="Nacimiento" name="birthDate" value={formData.birthDate} onChange={handleInputChange} type="date" />
              
              {/* Checkbox de Términos y Condiciones */}
              <div className="col-span-1 sm:col-span-2 mt-4 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 accent-[#00df82] rounded border-white/10 bg-white/5 text-[#00df82] focus:ring-[#00df82] h-4 w-4 cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed cursor-pointer select-none">
                  Acepto los{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#00df82] transition-colors">
                    Términos y Condiciones
                  </a>{" "}
                  y la{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#00df82] transition-colors">
                    Política de Privacidad
                  </a>{" "}
                  de MVP Sports Chile.
                </label>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
      <div className="relative w-full max-w-xl bg-slate-900/50 border border-white/10 rounded-[2.5rem] shadow-[0_0_150px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="absolute top-0 left-0 h-1 bg-[#00df82] transition-all duration-700" style={{ width: `${(step / 3) * 100}%` }} />
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white transition-colors z-20 bg-white/5 rounded-full">
          <XMarkIcon className="w-4 h-4" />
        </button>

        {!success ? (
          <div className="p-8 sm:p-10">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-[#00df82] flex items-center justify-center text-slate-950 font-black text-[10px]">{step}</div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fase {step} / 3</span>
              </div>
              <h2 className="text-2xl font-black text-white font-heading uppercase tracking-tighter">Únete a la <span className="text-gradient">Élite.</span></h2>
            </div>

            <form onSubmit={handleSubmit} className="min-h-[280px] flex flex-col justify-between">
              {renderStep()}
              <div className="mt-6 space-y-4">
                {error && <div className="text-[10px] text-red-400 font-bold flex items-center gap-2"><ExclamationCircleIcon className="w-4 h-4" /> {error}</div>}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  {step > 1 ? <button type="button" onClick={prevStep} className="text-[8px] font-black uppercase text-slate-500 hover:text-white">Atrás</button> : <div />}
                  {step < 3 ? (
                    <button type="button" onClick={nextStep} className={`px-8 py-3 bg-white text-slate-950 font-black rounded-xl text-[10px] uppercase ${!isStepValid() ? 'opacity-30' : ''}`}>Siguiente</button>
                  ) : (
                    <button type="submit" disabled={loading || !isStepValid()} className="px-10 py-3 bg-[#00df82] text-slate-950 font-black rounded-xl text-[10px] uppercase shadow-[0_0_20px_rgba(0, 223, 130,0.3)] disabled:opacity-30">
                      {loading ? "..." : "Registrarme"}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-12 text-center space-y-6 animate-in zoom-in duration-500">
            <CheckCircleIcon className="w-16 h-16 text-[#00df82] mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white font-heading">¡CUENTA CREADA!</h2>
              <p className="text-xs text-slate-400 max-w-[320px] mx-auto">
                Te hemos enviado un correo de verificación. Por favor, confirma tu cuenta haciendo clic en el enlace del correo antes de iniciar sesión.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="space-y-1 text-left">
      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[#00df82] outline-none transition-all text-xs" required {...props} />
    </div>
  );
}

function Select({ label, options, ...props }: any) {
  return (
    <div className="space-y-1 text-left">
      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-[#00df82] outline-none appearance-none text-xs" required {...props}>
        <option value="" disabled className="bg-slate-900">...</option>
        {options.map((opt: string) => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
      </select>
    </div>
  );
}
