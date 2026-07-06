"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/player/userService";
import { auth, db } from "@/services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { ChevronLeft, ChevronRight, Save, User, Phone, ShieldCheck, Calendar, Ruler, Weight, Lock, LogOut, Eye, EyeOff, AlertCircle, CheckCircle2, X, Shield, Award, Target, Sun, Moon, Activity, MapPin, Heart } from "lucide-react";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const SPORT_POSITIONS: Record<string, string[]> = {
  "Fútbol": ["Arquero", "Defensa", "Lateral", "Volante", "Delantero"],
  "Pádel": ["Lado Derecho", "Lado Izquierdo"],
  "Tenis": ["Individual", "Dobles"],
  "Básquetbol": ["Base", "Escolta", "Alero", "Ala-Pívot", "Pívot"],
  "Voleibol": ["Armador", "Atacante", "Central", "Líbero"],
};

const SPORT_ICONS: Record<string, any> = {
  "Fútbol": FutbolIcon, "Pádel": PadelIcon, "Tenis": TenisIcon, "Básquetbol": BasquetbolIcon, "Voleibol": VoleibolIcon,
};

const validateAge = (birthDateStr: string) => {
  if (!birthDateStr) return false;
  const parts = birthDateStr.split("/");
  if (parts.length !== 3) return false;
  const d = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1, y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 0 || m > 11 || y < 1900 || y > new Date().getFullYear()) return false;
  const birth = new Date(y, m, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mon = today.getMonth() - birth.getMonth();
  if (mon < 0 || (mon === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
};

const cleanRut = (rut: string) => rut.replace(/[^0-9kK]/g, "").toUpperCase();

const validateChileanRut = (rut: string) => {
  if (!rut) return true;
  let value = cleanRut(rut);
  if (value.length < 2) return false;
  const cuerpo = value.slice(0, -1);
  if (cuerpo.length < 1) return false;
  const dv = value.slice(-1);
  let suma = 0, mul = 2;
  for (let i = 1; i <= cuerpo.length; i++) { suma += mul * parseInt(cuerpo.charAt(cuerpo.length - i)); mul = mul < 7 ? mul + 1 : 2; }
  const dvEsp = 11 - (suma % 11);
  return dv === (dvEsp === 11 ? "0" : dvEsp === 10 ? "K" : dvEsp.toString());
};

const maskRut = (value: string) => {
  let c = cleanRut(value);
  if (c.length <= 1) return c;
  return c.slice(0, -1).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") + "-" + c.slice(-1);
};

const maskPhone = (value: string) => {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("56")) d = d.slice(2);
  d = d.slice(0, 9);
  return d.length === 0 ? "+56 " : "+56 " + d;
};

const maskBirthDate = (value: string) => {
  let c = value.replace(/\D/g, "").slice(0, 8);
  if (c.length <= 2) return c;
  if (c.length <= 4) return c.slice(0, 2) + "/" + c.slice(2);
  return c.slice(0, 2) + "/" + c.slice(2, 4) + "/" + c.slice(4);
};

type FormData = {
  displayName: string; phone: string; rut: string; birthDate: string;
  height: string; weight: string; mainSport: string; position: string;
  dominantFoot: string; favTime: string; frequency: string; intensity: string;
  bio: string; city: string; gender: string;
};

function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[14px] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"} ${className}`}>
      <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : ""}`} />
      {children}
    </div>
  );
}

function SectionPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-8 mb-5 mt-8">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

function InputRow({ icon: Icon, color, label, value, onChange, error, maxLength, type = "text" }: {
  icon: any; color: string; label: string; value: string;
  onChange: (v: string) => void; error?: boolean; maxLength?: number; type?: string;
}) {
  const ctx = usePlayer();
  const isDark = ctx.theme === "dark";
  return (
    <div className={`group flex items-center gap-4 px-6 py-4 transition-all ${error ? (isDark ? "bg-red-500/5" : "bg-red-50") : ""}`}>
      <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-all duration-300 ${error ? "bg-red-500" : ""} group-focus-within:scale-110`} style={{ backgroundColor: error ? undefined : color }}>
        {error ? <AlertCircle color="white" size={20} /> : <Icon color="white" size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <label className={`text-[10px] font-semibold uppercase tracking-wider ${error ? "text-red-500" : (isDark ? "text-slate-500" : "text-slate-400")}`}>{label}</label>
          {error && <span className="text-[8px] font-bold text-red-500 tracking-wider">INVÁLIDO</span>}
        </div>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength}
          className={`w-full bg-transparent text-base font-medium outline-none mt-0.5 transition-colors ${error ? "text-red-500 placeholder-red-300" : (isDark ? "text-slate-100 placeholder-slate-600" : "text-slate-900 placeholder-slate-400")}`}
        />
      </div>
    </div>
  );
}

function SelectRow({ icon: Icon, color, label, value, options, onSelect, disabled, sport }: {
  icon?: any; color: string; label: string; value: string;
  options: string[]; onSelect: (v: string) => void; disabled?: boolean; sport?: string;
}) {
  const ctx = usePlayer();
  const isDark = ctx.theme === "dark";
  const [open, setOpen] = useState(false);

  const renderIcon = () => {
    const SportIcon = (sport && SPORT_ICONS[sport]) || (value && SPORT_ICONS[value]) || null;
    if (SportIcon) return <SportIcon color="white" size={22} />;
    return Icon ? <Icon color="white" size={20} /> : null;
  };

  return (
    <div className={`${disabled ? "opacity-40" : ""}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen(!open)}
        className="flex items-center gap-4 px-6 py-4 w-full transition-all hover:bg-white/[0.02] active:scale-[0.99]">
        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
          {renderIcon()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>{label}</p>
          <p className={`text-[15px] font-medium truncate ${disabled ? (isDark ? "text-slate-600" : "text-slate-400") : (isDark ? "text-slate-100" : "text-slate-900")}`}>
            {disabled ? "Elige deporte primero..." : (value || "Toca para elegir")}
          </p>
        </div>
        {!disabled && (
          <div className={`w-6 h-6 rounded-[14px] flex items-center justify-center transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
            <ChevronRight size={16} className="text-emerald-500" />
          </div>
        )}
      </button>
      {open && !disabled && (
        <div className={`px-6 py-4 flex flex-wrap gap-2.5 border-t ${isDark ? "border-white/[0.04] bg-white/[0.02]" : "border-slate-100 bg-slate-50/50"}`}>
          {options.map((opt) => {
            const OptIcon = SPORT_ICONS[opt];
            const ic = OptIcon ? <OptIcon color={value === opt ? "white" : isDark ? "#94a3b8" : "#64748b"} size={16} /> : null;
            return (
              <button key={opt} type="button" onClick={() => { onSelect(opt); setOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-200 active:scale-95 ${value === opt ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                {ic}{opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Modal({ isOpen, onClose, children, isDark }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; isDark: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 animate-in fade-in duration-200" onClick={onClose}>
      <div className={`w-full max-w-md rounded-[14px] p-6 ${isDark ? "bg-[#0F172A] border border-white/[0.06]" : "bg-white border border-slate-200"} shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function PreferenciasPage() {
  const router = useRouter();
  const { profile, theme, toggleTheme, reloadProfile } = usePlayer();
  const { user, logout } = useAuth();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    displayName: "", phone: "", rut: "", birthDate: "",
    height: "", weight: "", mainSport: "", position: "",
    dominantFoot: "", favTime: "", frequency: "", intensity: "",
    bio: "", city: "", gender: "",
  });
  const [initialData, setInitialData] = useState<FormData | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const p = await userService.getUserProfile(user.uid);
      if (p) {
        const d = p as any;
        const loaded: FormData = {
          displayName: d.displayName || "", phone: d.phone || "", rut: maskRut(d.rut || ""),
          birthDate: d.birthDate || "", height: d.height?.toString() || "", weight: d.weight?.toString() || "",
          mainSport: d.mainSport || "", position: d.position || "", dominantFoot: d.dominantFoot || "",
          favTime: d.favTime || "", frequency: d.frequency || "", intensity: d.intensity || "",
          bio: d.bio || "", city: d.city || "", gender: d.gender || "",
        };
        setFormData(loaded); setInitialData(loaded);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const hasChanges = useCallback(() => {
    if (!initialData) return false;
    return (Object.keys(formData) as (keyof FormData)[]).some((k) => formData[k] !== initialData[k]);
  }, [formData, initialData]);

  const handleBack = () => { if (hasChanges()) setShowUnsavedModal(true); else router.back(); };

  const handleSave = async () => {
    if (!user) return;
    const rutClean = cleanRut(formData.rut);
    if (formData.rut && !validateChileanRut(rutClean)) { showFeedbackMsg("error", "El RUT ingresado no es válido."); return; }
    if (!formData.birthDate) { showFeedbackMsg("error", "La Fecha de Nacimiento es obligatoria."); return; }
    if (!validateAge(formData.birthDate)) { showFeedbackMsg("error", "Debes ser mayor de edad (18+)."); return; }
    setSaving(true);
    try {
      const toSave: any = { ...formData, rut: rutClean, height: formData.height ? Number(formData.height) : undefined, weight: formData.weight ? Number(formData.weight) : undefined, updatedAt: new Date().toISOString() };
      Object.keys(toSave).forEach((k) => toSave[k] === undefined && delete toSave[k]);
      await userService.updateUserProfile(user.uid, toSave);
      await reloadProfile();
      setInitialData({ ...formData });
      showFeedbackMsg("success", "Cambios sincronizados correctamente.");
      setTimeout(() => { setShowFeedback(false); router.replace("/player"); }, 1500);
    } catch { showFeedbackMsg("error", "Error al guardar."); }
    finally { setSaving(false); }
  };

  const showFeedbackMsg = (t: "success" | "error", m: string) => { setFeedbackType(t); setFeedbackMsg(m); setShowFeedback(true); };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) { showFeedbackMsg("error", "Completa todos los campos."); return; }
    if (newPassword !== confirmNewPassword) { showFeedbackMsg("error", "Las contraseñas no coinciden."); return; }
    if (newPassword.length < 6) { showFeedbackMsg("error", "Mínimo 6 caracteres."); return; }
    setPasswordLoading(true);
    try {
      const cu = auth.currentUser;
      if (!cu?.email) return;
      const cred = EmailAuthProvider.credential(cu.email, currentPassword);
      await reauthenticateWithCredential(cu, cred);
      await updatePassword(cu, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword("");
      showFeedbackMsg("success", "Contraseña cambiada.");
    } catch (error: any) {
      let msg = "Error al cambiar la contraseña.";
      if (error.code === "auth/wrong-password") msg = "La contraseña actual es incorrecta.";
      else if (error.code === "auth/weak-password") msg = "Contraseña muy débil (mínimo 6 caracteres).";
      showFeedbackMsg("error", msg);
    } finally { setPasswordLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoadingDelete(true);
    try {
      await userService.deleteAccount(user.uid);
      setShowDeleteModal(false);
      showFeedbackMsg("success", "Cuenta eliminada.");
      setTimeout(() => { logout(); router.push("/login"); }, 1500);
    } catch (err: any) {
      let msg = "No se pudo borrar la cuenta.";
      if (err.code === "auth/requires-recent-login") msg = "Cierra sesión y vuelve a iniciarla antes de eliminar tu cuenta.";
      showFeedbackMsg("error", msg);
    } finally { setLoadingDelete(false); }
  };

  const getPositions = () => SPORT_POSITIONS[formData.mainSport] || [];
  const incomplete = !formData.displayName || !formData.phone || !formData.rut || !formData.mainSport || !formData.birthDate || !validateAge(formData.birthDate);

  const inputFields = (section: string) => {
    const fields: Record<string, Array<{ icon: any; color: string; label: string; key: keyof FormData; mask?: (v: string) => string; max?: number; err?: boolean; t?: string }>> = {
      personal: [
        { icon: User, color: "#3b82f6", label: "Nombre Completo", key: "displayName" },
        { icon: Phone, color: "#10b981", label: "Teléfono", key: "phone", mask: maskPhone, max: 13 },
        { icon: ShieldCheck, color: "#6366f1", label: "RUT", key: "rut", mask: maskRut, max: 12, err: formData.rut.length > 3 && !validateChileanRut(formData.rut) },
        { icon: Calendar, color: "#ec4899", label: "Fecha de Nacimiento (DD/MM/AAAA)", key: "birthDate", mask: maskBirthDate, max: 10, err: formData.birthDate.length === 10 && !validateAge(formData.birthDate) },
        { icon: MapPin, color: "#f59e0b", label: "Ciudad", key: "city" },
        { icon: Heart, color: "#f43f5e", label: "Género", key: "gender" },
      ],
      physique: [
        { icon: Ruler, color: "#f59e0b", label: "Altura (cm)", key: "height" },
        { icon: Weight, color: "#ef4444", label: "Peso (kg)", key: "weight" },
      ],
    };
    return fields[section] || [];
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-emerald-400 text-[10px] font-semibold tracking-[3px] uppercase animate-pulse">Cargando</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <button onClick={handleBack} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Ajustes</h1>
        <button onClick={handleSave} disabled={saving}
          className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-90 shadow-lg shadow-emerald-500/25">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} className="text-white" />}
        </button>
      </div>

      {/* Warning Banner */}
      {incomplete && (
        <div className="mx-5 mt-5 mb-3 p-4 rounded-[14px] bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 font-semibold text-xs uppercase tracking-wider">Perfil Incompleto</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {!formData.displayName && <span className="px-2.5 py-1 rounded-[14px] bg-red-500/15 text-red-400 text-[9px] font-semibold uppercase tracking-wider">Nombre</span>}
            {!formData.phone && <span className="px-2.5 py-1 rounded-[14px] bg-red-500/15 text-red-400 text-[9px] font-semibold uppercase tracking-wider">Teléfono</span>}
            {!formData.rut && <span className="px-2.5 py-1 rounded-[14px] bg-red-500/15 text-red-400 text-[9px] font-semibold uppercase tracking-wider">RUT</span>}
            {(!formData.birthDate || !validateAge(formData.birthDate)) && <span className="px-2.5 py-1 rounded-[14px] bg-red-500/15 text-red-400 text-[9px] font-semibold uppercase tracking-wider">F. Nacimiento (18+)</span>}
            {!formData.mainSport && <span className="px-2.5 py-1 rounded-[14px] bg-red-500/15 text-red-400 text-[9px] font-semibold uppercase tracking-wider">Deporte</span>}
          </div>
        </div>
      )}

      {/* Profile Banner */}
      <div className="px-5 pt-3 pb-2">
        <GlowCard isDark={isDark}>
          <div className="p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-[14px] overflow-hidden border-2 border-emerald-500/30 shrink-0 bg-emerald-500/10 flex items-center justify-center">
              {profile?.photoURL ? <Image src={profile.photoURL} alt="" width={64} height={64} className="object-cover w-full h-full" /> : <User size={28} className="text-emerald-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate">{formData.displayName || "Jugador"}</h2>
              <p className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{user?.email}</p>
            </div>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-[14px] bg-emerald-500/10">
              <span className="text-emerald-400 text-xs font-semibold">{profile?.xp || 0} XP</span>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Personal Info */}
      <SectionPill label="Información Personal" />
      <div className="px-5">
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            {inputFields("personal").map((f) => (
              <InputRow key={f.key} icon={f.icon} color={f.color} label={f.label}
                value={formData[f.key] as string}
                onChange={(v) => setFormData((fd) => ({ ...fd, [f.key]: f.mask ? f.mask(v) : v }))}
                error={f.err} maxLength={f.max} type={f.t || "text"}
              />
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Physique */}
      <SectionPill label="Datos Físicos" />
      <div className="px-5">
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            {inputFields("physique").map((f) => (
              <InputRow key={f.key} icon={f.icon} color={f.color} label={f.label}
                value={formData[f.key] as string}
                onChange={(v) => setFormData((fd) => ({ ...fd, [f.key]: v }))}
              />
            ))}
          </div>
        </GlowCard>
      </div>

      {/* Gaming */}
      <SectionPill label="Mi Juego" />
      <div className="px-5">
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            <SelectRow color="#10b981" label="Deporte Principal" value={formData.mainSport}
              options={["Fútbol", "Pádel", "Tenis", "Básquetbol", "Voleibol"]}
              onSelect={(v) => setFormData((f) => ({ ...f, mainSport: v, position: "" }))}
              sport={formData.mainSport}
            />
            <SelectRow icon={Award} color="#facc15" label="Posición" value={formData.position}
              options={getPositions()} disabled={!formData.mainSport}
              onSelect={(v) => setFormData((f) => ({ ...f, position: v }))}
            />
            <SelectRow icon={Target} color="#3b82f6" label="Lado Hábil" value={formData.dominantFoot}
              options={["Derecho", "Izquierdo", "Ambidiestro"]}
              onSelect={(v) => setFormData((f) => ({ ...f, dominantFoot: v }))}
            />
          </div>
        </GlowCard>
      </div>

      {/* Preferences */}
      <SectionPill label="Preferencias" />
      <div className="px-5">
        <GlowCard isDark={isDark}>
          <div className="divide-y divide-emerald-500/5">
            <SelectRow icon={Calendar} color="#3b82f6" label="Horario Preferido" value={formData.favTime}
              options={["Mañana", "Tarde", "Noche"]} onSelect={(v) => setFormData((f) => ({ ...f, favTime: v }))}
            />
            <SelectRow icon={Activity} color="#facc15" label="Frecuencia" value={formData.frequency}
              options={["De vez en cuando", "1-2 veces por semana", "Casi todos los días"]}
              onSelect={(v) => setFormData((f) => ({ ...f, frequency: v }))}
            />
            <button onClick={toggleTheme} className="flex items-center gap-4 px-6 py-4 w-full transition-all hover:bg-white/[0.02]">
              <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${isDark ? "bg-amber-500/10" : "bg-slate-200"}`}>
                {isDark ? <Moon size={20} className="text-amber-400" /> : <Sun size={20} className="text-slate-600" />}
              </div>
              <span className="flex-1 text-left text-[15px] font-medium">Modo Oscuro</span>
              <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${isDark ? "bg-emerald-500" : "bg-slate-300"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow ${isDark ? "left-6" : "left-1"}`} />
              </div>
            </button>
          </div>
        </GlowCard>
      </div>

      {/* Security */}
      <SectionPill label="Seguridad" />
      <div className="px-5">
        <GlowCard isDark={isDark}>
          <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-4 px-6 py-4 w-full transition-all hover:bg-white/[0.02]">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 bg-rose-500/15">
              <Lock size={20} className="text-rose-400" />
            </div>
            <span className="flex-1 text-left text-[15px] font-medium">Cambiar Contraseña</span>
            <ChevronRight size={16} className="text-emerald-500" />
          </button>
          <div className={`h-px ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
          <button onClick={() => router.push("/player/reporte")} className="flex items-center gap-4 px-6 py-4 w-full transition-all hover:bg-white/[0.02]">
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 bg-blue-500/15">
              <Shield size={20} className="text-blue-400" />
            </div>
            <span className="flex-1 text-left text-[15px] font-medium">Soporte</span>
            <ChevronRight size={16} className="text-emerald-500" />
          </button>
        </GlowCard>
      </div>

      {/* Actions */}
      <div className="px-5 mt-6 space-y-3">
        <button onClick={() => setShowSignOutModal(true)}
          className={`w-full py-4 rounded-[14px] flex items-center justify-center gap-2.5 font-semibold text-sm transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
          <LogOut size={18} /> Cerrar Sesión
        </button>
        <button onClick={() => setShowDeleteModal(true)}
          className="w-full py-4 rounded-[14px] flex items-center justify-center gap-2.5 font-semibold text-sm bg-red-500/10 text-red-400 border border-red-500/20 transition-all active:scale-[0.98] hover:bg-red-500/15">
          <Shield size={18} /> Eliminar Cuenta
        </button>
      </div>

      <p className={`text-center text-[9px] font-medium mt-10 mb-8 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>

      {/* Feedback Toast */}
      {showFeedback && (
        <div className="fixed bottom-8 left-5 right-5 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`max-w-md mx-auto rounded-[14px] p-4 flex items-center gap-3 shadow-2xl backdrop-blur-xl ${feedbackType === "error" ? "bg-red-500/90 text-white" : "bg-emerald-500/90 text-white"}`}>
            {feedbackType === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="flex-1 text-sm font-medium">{feedbackMsg}</span>
            <button onClick={() => setShowFeedback(false)} className="opacity-70 hover:opacity-100"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }} isDark={isDark}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg">Cambiar Contraseña</h2>
          <button onClick={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }}
            className="w-8 h-8 rounded-[14px] flex items-center justify-center hover:bg-white/[0.06] transition-colors">
            <X size={16} className={isDark ? "text-slate-400" : "text-slate-500"} />
          </button>
        </div>
        {[
          { label: "Contraseña Actual", value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
          { label: "Nueva Contraseña", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew) },
          { label: "Confirmar Nueva", value: confirmNewPassword, set: setConfirmNewPassword, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
        ].map((f) => (
          <div key={f.label} className="mb-4">
            <label className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 block ${isDark ? "text-slate-500" : "text-slate-400"}`}>{f.label}</label>
            <div className={`flex items-center rounded-[14px] border transition-colors focus-within:border-emerald-500/50 ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`}>
              <input type={f.show ? "text" : "password"} value={f.value} onChange={(e) => f.set(e.target.value)} placeholder="••••••••"
                className={`flex-1 p-3.5 text-sm font-medium bg-transparent outline-none ${isDark ? "text-slate-100" : "text-slate-900"}`}
              />
              <button onClick={f.toggle} className="px-3.5">{f.show ? <EyeOff size={16} className={isDark ? "text-slate-500" : "text-slate-400"} /> : <Eye size={16} className={isDark ? "text-slate-500" : "text-slate-400"} />}</button>
            </div>
          </div>
        ))}
        <div className="flex gap-3 mt-2">
          <button onClick={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmNewPassword(""); }}
            className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Cancelar</button>
          <button onClick={handleChangePassword} disabled={passwordLoading}
            className="flex-[2] py-3.5 rounded-[14px] font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25 flex items-center justify-center">
            {passwordLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Actualizar"}
          </button>
        </div>
      </Modal>

      {/* Unsaved Changes Modal */}
      <Modal isOpen={showUnsavedModal} onClose={() => setShowUnsavedModal(false)} isDark={isDark}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-[14px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-emerald-500" />
          </div>
          <h2 className="font-semibold text-lg mb-2">¿Guardar cambios?</h2>
          <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Tienes modificaciones sin guardar.</p>
          <div className="space-y-2.5">
            <button onClick={() => { setShowUnsavedModal(false); handleSave(); }} className="w-full py-3.5 rounded-[14px] font-semibold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">Guardar y Salir</button>
            <button onClick={() => { setShowUnsavedModal(false); setFormData(initialData!); router.back(); }} className="w-full py-3.5 rounded-[14px] font-semibold text-sm bg-red-500/10 text-red-400 border border-red-500/20 transition-all active:scale-[0.98]">Descartar Cambios</button>
            <button onClick={() => setShowUnsavedModal(false)} className={`text-xs font-medium py-2 ${isDark ? "text-slate-500" : "text-slate-400"} hover:underline`}>Seguir Editando</button>
          </div>
        </div>
      </Modal>

      {/* Sign Out Modal */}
      <Modal isOpen={showSignOutModal} onClose={() => setShowSignOutModal(false)} isDark={isDark}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-[14px] bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
            <LogOut size={28} className="text-rose-400" />
          </div>
          <h2 className="font-semibold text-lg mb-2">¿Cerrar Sesión?</h2>
          <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>¿Estás seguro de que deseas salir?</p>
          <div className="flex gap-3">
            <button onClick={() => setShowSignOutModal(false)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Cancelar</button>
            <button onClick={() => { setShowSignOutModal(false); logout(); router.push("/login"); }} className="flex-1 py-3.5 rounded-[14px] font-semibold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-all active:scale-[0.98] shadow-lg shadow-rose-500/25">Sí, Salir</button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} isDark={isDark}>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-[14px] bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-rose-400" />
          </div>
          <h2 className="font-semibold text-lg text-rose-500 mb-2">¿Eliminar tu cuenta?</h2>
          <p className={`text-sm font-medium mb-4 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Esta acción es irreversible.</p>
          <div className={`text-left p-4 rounded-[14px] mb-6 space-y-2 text-xs font-medium ${isDark ? "bg-white/[0.03] text-slate-400" : "bg-slate-50 text-slate-500"}`}>
            <p>• Ficha de Jugador Topps Now 2026.</p>
            <p>• Credenciales de acceso Firebase Auth.</p>
            <p>• Reservas e historial se conservan anónimos.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteModal(false)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm transition-all active:scale-[0.98] ${isDark ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>Cancelar</button>
            <button onClick={handleDeleteAccount} disabled={loadingDelete} className="flex-1 py-3.5 rounded-[14px] font-semibold text-sm bg-rose-500 text-white hover:bg-rose-600 transition-all active:scale-[0.98] shadow-lg shadow-rose-500/25 flex items-center justify-center">
              {loadingDelete ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Eliminar"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
