"use client";
import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  AlertCircleIcon,
  ViewIcon,
  ViewOffIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { emailService } from "../../services/emailService";

const SPORT_POSITIONS: Record<string, string[]> = {
  'Fútbol': ['Arquero', 'Defensa', 'Lateral', 'Volante', 'Delantero'],
  'Pádel': ['Lado Derecho', 'Lado Izquierdo'],
  'Tenis': ['Individual', 'Dobles'],
  'Básquetbol': ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot'],
  'Voleibol': ['Armador', 'Atacante', 'Central', 'Líbero']
};

const STEP_LABELS = ["Cuenta", "Deporte", "Preferencias"];

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

  const openMailClient = () => {
    try {
      window.open('mailto:' + formData.email, '_blank');
    } catch (e) {
      window.open('https://mail.google.com', '_blank');
    }
  };

  const handleClose = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      onClose();
    }
  };

  // Resetear estado al abrir el modal y cerrar sesión al cerrar
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSuccess(false);
      setError("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setAcceptTerms(false);
      setFormData({
        displayName: "", email: "", confirmEmail: "", phone: "", rut: "", password: "", confirmPassword: "",
        mainSport: "", position: "", dominantFoot: "", height: "", weight: "",
        favTime: "", frequency: "", city: "", birthDate: "", gender: ""
      });
    } else {
      (async () => {
        try {
          if (auth.currentUser) {
            await signOut(auth);
          }
        } catch (err) {
          console.error("Error al limpiar sesión al cerrar modal:", err);
        }
      })();
    }
  }, [isOpen]);

  // Bloquear scroll y cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Requisitos pendientes del paso actual (se muestran bajo el botón para que el
  // usuario sepa por qué no puede avanzar)
  const stepIssues = (): string[] => {
    if (step !== 1) return [];
    const issues: string[] = [];
    const sameEmail = formData.email.trim().toLowerCase() === formData.confirmEmail.trim().toLowerCase();
    if (formData.displayName.trim().length < 2) issues.push("Nombre");
    if (!validateRut(formData.rut)) issues.push("RUT válido");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) issues.push("Email válido");
    else if (!sameEmail) issues.push("Los emails no coinciden");
    if (formData.password.length < 6) issues.push("Contraseña de 6+ caracteres");
    else if (formData.password !== formData.confirmPassword) issues.push("Las contraseñas no coinciden");
    if (!validatePhone(formData.phone)) issues.push("Teléfono válido");
    if (formData.city.trim().length <= 2) issues.push("Ciudad");
    return issues;
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return stepIssues().length === 0;
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

      const statsWins = 0, statsLosses = 0, statsGoals = 0, statsAssists = 0, statsMVPs = 0;

      calculatedXp += matchesReservedAndPlayed * (gamification.xpPerMatch !== undefined ? gamification.xpPerMatch : 100);
      calculatedXp += totalCheckins * (gamification.xpPerCheckin !== undefined ? gamification.xpPerCheckin : 50);
      calculatedXp -= totalNoShows * (gamification.xpPerNoShow !== undefined ? gamification.xpPerNoShow : 150);

      calculatedXp = Math.max(0, calculatedXp);

      const daysActive = 1;
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

      try {
        await emailService.sendAuthEmail(formData.email, 'verify', formData.displayName);
      } catch (emailErr) {
        console.error('Error al enviar correo de verificación:', emailErr);
        setError("No se pudo enviar el correo de verificación. Intente nuevamente.");
        setLoading(false);
        return;
      }

      let formattedBirthDate = formData.birthDate;
      if (formData.birthDate && formData.birthDate.includes("-")) {
        const parts = formData.birthDate.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          formattedBirthDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

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

      try {
        await recalculateUserELO(user.uid, formData.email);
      } catch (recalcErr) {
        console.error("Error al calcular el ELO inicial:", recalcErr);
      }

      try {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken || ""}` },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nombre" name="displayName" value={formData.displayName} onChange={handleInputChange} placeholder="Juan Pérez" autoComplete="name" />
              <Input
                label="RUT"
                name="rut"
                value={formData.rut}
                onChange={handleInputChange}
                placeholder="12345678-9"
                maxLength={12}
                rightSlot={
                  formData.rut.length >= 8 ? (
                    <span className={validateRut(formData.rut) ? "text-[#00df82]" : "text-red-500"}>
                      <HugeiconsIcon icon={validateRut(formData.rut) ? Tick02Icon : Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  ) : null
                }
              />
              <Input label="Email" name="email" value={formData.email} onChange={handleInputChange} placeholder="usuario@email.com" type="email" autoComplete="email" />
              <Input label="Confirmar email" name="confirmEmail" value={formData.confirmEmail} onChange={handleInputChange} placeholder="usuario@email.com" type="email" autoComplete="email" />

              <Input
                label="Contraseña"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mínimo 6 caracteres"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="text-slate-400 hover:text-[#00df82] transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                }
              />

              <Input
                label="Confirmar contraseña"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Repite tu contraseña"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="text-slate-400 hover:text-[#00df82] transition-colors cursor-pointer"
                  >
                    <HugeiconsIcon icon={showConfirmPassword ? ViewOffIcon : ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                }
              />
              <Input
                label="Teléfono"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+56 9 ..."
                maxLength={15}
                type="tel"
                autoComplete="tel"
                rightSlot={
                  formData.phone.length > 7 ? (
                    <span className={validatePhone(formData.phone) ? "text-[#00df82]" : "text-red-500"}>
                      <HugeiconsIcon icon={validatePhone(formData.phone) ? Tick02Icon : Cancel01Icon} className="w-4 h-4" strokeWidth={2.5} />
                    </span>
                  ) : null
                }
              />
              <Input label="Ciudad" name="city" value={formData.city} onChange={handleInputChange} placeholder="Santiago" autoComplete="address-level2" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Deporte" name="mainSport" value={formData.mainSport} onChange={handleInputChange} options={['Fútbol', 'Pádel', 'Tenis', 'Básquetbol', 'Voleibol']} />
              <Select label="Posición" name="position" value={formData.position} onChange={handleInputChange} options={formData.mainSport ? SPORT_POSITIONS[formData.mainSport] : []} disabled={!formData.mainSport} />
              <Select label="Pierna / lado" name="dominantFoot" value={formData.dominantFoot} onChange={handleInputChange} options={['Derecho', 'Izquierdo', 'Ambidiestro']} />
              <Input label="Altura (cm)" name="height" value={formData.height} onChange={handleInputChange} placeholder="180" type="number" />
              <Input label="Peso (kg)" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="75" type="number" />
              <Select label="Género" name="gender" value={formData.gender} onChange={handleInputChange} options={['Masculino', 'Femenino', 'Otro']} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Horario preferido" name="favTime" value={formData.favTime} onChange={handleInputChange} options={['Mañana', 'Tarde', 'Noche']} />
              <Select label="Frecuencia" name="frequency" value={formData.frequency} onChange={handleInputChange} options={['De vez en cuando', '1-2 veces por semana', 'Casi todos los días']} />
              <Input label="Fecha de nacimiento" name="birthDate" value={formData.birthDate} onChange={handleInputChange} type="date" />

              <div className="col-span-1 sm:col-span-2 mt-2 flex items-start gap-3 rounded-md border border-white/5 bg-white/2 p-4">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 accent-[#00df82] h-4 w-4 cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-[11px] text-slate-400 font-medium leading-relaxed cursor-pointer select-none">
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
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={handleClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900/70 border border-white/10 rounded-md shadow-[0_0_120px_-20px_rgba(0,223,130,0.35)] overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* grid + glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-[#00df82]/15 blur-[110px] rounded-full" />

        {/* progress */}
        <div className="relative z-30 flex gap-1.5 px-6 pt-6">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded-md transition-all duration-500 ${step > i ? "bg-[#00df82]" : "bg-white/10"}`} />
            </div>
          ))}
        </div>

        {!success ? (
          <div className="relative z-10 p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-black text-[#00df82] uppercase tracking-[0.3em]">
                  Paso {step} de 3 · {STEP_LABELS[step - 1]}
                </span>
                <h2 id="register-title" className="text-2xl sm:text-3xl font-black text-white font-heading uppercase tracking-tighter mt-1">
                  Únete a la <span className="text-gradient">élite.</span>
                </h2>
              </div>
              <button
                onClick={handleClose}
                aria-label="Cerrar registro"
                className="p-2 -mt-1 text-slate-400 hover:text-white hover:bg-white/5 transition-colors rounded-md cursor-pointer shrink-0"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              {renderStep()}

              <div className="mt-6 space-y-4">
                {error && (
                  <div role="alert" className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[11px] font-bold text-red-300">
                    <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2} />
                      Atrás
                    </button>
                  ) : <div />}

                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!isStepValid()}
                      className="inline-flex items-center gap-2 px-7 py-3 bg-[#00df82] text-slate-950 font-black rounded-md text-[11px] uppercase tracking-[0.15em] hover:bg-[#3affa0] transition-all shadow-[0_0_25px_-8px_rgba(0,223,130,0.6)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Siguiente
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" strokeWidth={2} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || !isStepValid()}
                      className="px-8 py-3 bg-[#00df82] text-slate-950 font-black rounded-md text-[11px] uppercase tracking-[0.15em] shadow-[0_0_25px_-8px_rgba(0,223,130,0.6)] hover:bg-[#3affa0] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loading ? "Creando cuenta..." : "Registrarme"}
                    </button>
                  )}
                </div>
                {step === 1 && stepIssues().length > 0 && (formData.displayName || formData.email || formData.rut) && (
                  <p className="mt-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Falta: {stepIssues().join(" · ")}
                  </p>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="relative z-10 p-8 sm:p-10 overflow-y-auto flex-1 custom-scrollbar">
            <button
              onClick={handleClose}
              aria-label="Cerrar registro"
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors rounded-md cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
            </button>
            <div className="text-center space-y-6 animate-in zoom-in duration-500">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-[#00df82]/20 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center text-[#00df82]">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-14 h-14" strokeWidth={1.6} />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white font-heading uppercase tracking-tighter">¡Cuenta creada!</h2>
                <p className="text-sm text-slate-400 max-w-[340px] mx-auto leading-relaxed">
                  Te enviamos un correo de verificación. Confirma tu cuenta haciendo clic en el enlace
                  antes de iniciar sesión.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-8 py-3 bg-white text-slate-950 font-black rounded-md text-[11px] uppercase tracking-[0.15em] hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleClose();
                    openMailClient();
                  }}
                  className="px-8 py-3 bg-[#00df82] text-slate-950 font-black rounded-md text-[11px] uppercase tracking-[0.15em] shadow-[0_0_25px_-8px_rgba(0,223,130,0.6)] hover:bg-[#3affa0] transition-all cursor-pointer"
                >
                  Abrir correo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, className = "", rightSlot, ...props }: any) {
  const id = props.name || props.id;
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#00df82] focus:ring-2 focus:ring-[#00df82]/20 outline-hidden transition-all ${rightSlot ? "pr-11" : ""} ${className}`}
          {...props}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

function Select({ label, options, ...props }: any) {
  const id = props.name || props.id;
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
        {label}
      </label>
      <select
        id={id}
        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white focus:border-[#00df82] focus:ring-2 focus:ring-[#00df82]/20 outline-hidden appearance-none transition-all disabled:opacity-40"
        {...props}
      >
        <option value="" disabled className="bg-slate-900">—</option>
        {options.map((opt: string) => (
          <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
        ))}
      </select>
    </div>
  );
}
