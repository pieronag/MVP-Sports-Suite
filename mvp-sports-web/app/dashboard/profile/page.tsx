"use client";
import { uploadImage } from "@/services/imageUpload";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, auth } from '@/services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from "@hugeicons/react";
import {
    UserCircleIcon, Mail01Icon, PhoneIcon, Building01Icon,
    IdentityCardIcon, RefreshIcon, Camera01Icon, Key01Icon,
    BellIcon, CheckmarkCircle02Icon, Briefcase01Icon, GlobeIcon,
    Clock01Icon, Logout01Icon, Cancel01Icon, Alert02Icon,
    InfoIcon, ShieldCheckIcon, ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';
import { SectionCard } from '@/components/ui/DashboardWidgets';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-md shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-none font-heading">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-emerald-400/40 transition-all">Cancelar</button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-md text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-500 dark:bg-[#00df82] dark:text-black shadow-emerald-500/20'}`}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

interface UserProfile {
    displayName: string;
    email: string;
    phone: string;
    photoURL: string;
    role: string;
    jobTitle: string;
    tenantId?: string;
    companyName?: string;
    language: string;
    timezone: string;
    notificationsEnabled: boolean;
    emailBookings: boolean;
    weeklySummary: boolean;
    systemNotifications: boolean;
    createdAt?: any;
    status: string;
    fullName?: string;
}

interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string; }

const inputCls = "w-full px-4 py-3 rounded-md border text-[11px] font-black transition-all outline-none bg-white border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:bg-slate-900/50 dark:border-white/10 dark:text-white";

const TIMEZONES = [
    { value: 'America/Santiago', label: 'Chile (Santiago)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
    { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
    { value: 'America/Lima', label: 'Perú (Lima)' },
    { value: 'America/Mexico_City', label: 'México (CDMX)' },
    { value: 'America/New_York', label: 'EE.UU. (Nueva York)' },
    { value: 'Europe/Madrid', label: 'España (Madrid)' },
];
const LANGUAGES = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português' },
];

export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean }>({ isOpen: false, title: '', message: '', action: () => { }, isDestructive: false });

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid) return;
            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                const data = docSnap.exists() ? docSnap.data() : {};
                setProfile({
                    displayName: data.displayName || data.fullName || user.displayName || '',
                    email: data.email || user.email || '',
                    phone: data.phone || '',
                    photoURL: data.photoURL || user.photoURL || '',
                    role: data.role || 'user',
                    jobTitle: data.jobTitle || '',
                    tenantId: data.tenantId,
                    companyName: data.companyName,
                    language: data.language || 'es',
                    timezone: data.timezone || 'America/Santiago',
                    notificationsEnabled: data.notificationsEnabled ?? true,
                    emailBookings: data.emailBookings ?? true,
                    weeklySummary: data.weeklySummary ?? false,
                    systemNotifications: data.systemNotifications ?? true,
                    createdAt: data.createdAt,
                    status: data.status || 'active',
                    fullName: data.fullName
                });
            } catch (error) {
                console.error("Error cargando perfil:", error);
                addToast("Error al cargar perfil", 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Toggle con guardado INMEDIATO en Firestore (funcionalidad real)
    const togglePref = async (field: keyof UserProfile, value: boolean | string) => {
        if (!user?.uid || !profile) return;
        const prev = (profile as any)[field];
        setProfile(p => ({ ...(p as UserProfile), [field]: value }));
        try {
            await updateDoc(doc(db, "users", user.uid), { [field]: value });
            addToast(field === 'language' || field === 'timezone' ? 'Preferencia actualizada' : 'Preferencia actualizada', 'success');
        } catch (error) {
            setProfile(p => ({ ...(p as UserProfile), [field]: prev }));
            addToast("Error al guardar preferencia", 'error');
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { addToast("La imagen es demasiado pesada. Máximo 2MB.", 'error'); return; }
            const reader = new FileReader();
            reader.onload = () => { setImageToCrop(reader.result as string); setShowCropper(true); };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (_c: any, croppedAreaPixels: any) => setCroppedAreaPixels(croppedAreaPixels);

    const handleConfirmCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels || !user || !profile) return;
        setUploadingImg(true);
        try {
            const croppedData = await getCroppedImg(imageToCrop, croppedAreaPixels);
            const croppedImage = croppedData ? await uploadImage(croppedData, { folder: "avatars", maxSize: 512 }) : null;
            if (croppedImage) {
                await updateDoc(doc(db, "users", user.uid), { photoURL: croppedImage });
                try { await updateProfile(user, { photoURL: croppedImage }); } catch (e) { console.error("Auth update failed:", e); }
                setProfile({ ...profile, photoURL: croppedImage });
                addToast("Foto de perfil actualizada", 'success');
                setShowCropper(false);
                setImageToCrop(null);
            }
        } catch (error) {
            console.error(error);
            addToast("Error al procesar la imagen", 'error');
        } finally {
            setUploadingImg(false);
        }
    };

    const handleSave = async () => {
        if (!user?.uid || !profile) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                displayName: profile.displayName || "",
                phone: profile.phone || "",
                jobTitle: profile.jobTitle || "",
                companyName: profile.companyName || "",
            });
            setDirty(false);
            addToast("Perfil actualizado correctamente", 'success');
        } catch (error) {
            addToast("Error al guardar cambios", 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;
        if (passForm.new !== passForm.confirm) { addToast("Las nuevas contraseñas no coinciden", 'error'); return; }
        if (passForm.new.length < 6) { addToast("La contraseña debe tener al menos 6 caracteres", 'error'); return; }
        setPassLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, passForm.current);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passForm.new);
            addToast("Contraseña actualizada exitosamente", 'success');
            setIsPassModalOpen(false);
            setPassForm({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            addToast("Error al actualizar contraseña", 'error');
        } finally {
            setPassLoading(false);
        }
    };

    const handleLogout = async () => {
        setConfirmData({
            isOpen: true,
            title: "¿Cerrar sesión?",
            message: "Estás a punto de salir de la suite administrativa. ¿Deseas continuar?",
            isDestructive: true,
            action: async () => { await signOut(auth); router.push('/login'); }
        });
    };

    if (loading) return <div className="flex h-full items-center justify-center text-slate-400 text-xs gap-2"><HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> Cargando perfil...</div>;
    if (!profile) return <div className="p-10 text-center text-slate-400 text-sm">No se encontró el perfil.</div>;

    const prefToggles = [
        { key: 'notificationsEnabled' as const, label: 'Novedades por correo', desc: 'Recibe novedades y promociones de la plataforma', icon: <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.8} />, enabled: profile.notificationsEnabled },
        { key: 'emailBookings' as const, label: 'Alertas de reservas', desc: 'Aviso por correo cuando hay una reserva nueva', icon: <HugeiconsIcon icon={BellIcon} className="w-4 h-4" strokeWidth={1.8} />, enabled: profile.emailBookings },
        { key: 'weeklySummary' as const, label: 'Resumen semanal', desc: 'Reporte semanal de actividad de tu negocio', icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={1.8} />, enabled: profile.weeklySummary },
        { key: 'systemNotifications' as const, label: 'Alertas del sistema', desc: 'Notificaciones técnicas y de mantenimiento', icon: <HugeiconsIcon icon={InfoIcon} className="w-4 h-4" strokeWidth={1.8} />, enabled: profile.systemNotifications },
    ];

    return (
        <div className="w-full space-y-6 pb-10 relative animate-fadeIn">
            <ConfirmModal isOpen={confirmData.isOpen} title={confirmData.title} message={confirmData.message} onConfirm={confirmData.action} onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} isDestructive={confirmData.isDestructive} />

            {/* TOASTS */}
            <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-md shadow-2xl border animate-slideInRight backdrop-blur-md ${toast.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:border-emerald-500/50 dark:text-emerald-400' : toast.type === 'error' ? 'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:border-red-500/50 dark:text-red-400' : 'bg-white/90 border-blue-500 text-blue-700 dark:bg-[#0B0F19]/90 dark:border-blue-500/50 dark:text-blue-400'}`}>
                        {toast.type === 'success' ? <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-5 h-5" strokeWidth={2} /> : toast.type === 'error' ? <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2} /> : <HugeiconsIcon icon={InfoIcon} className="w-5 h-5" strokeWidth={2} />}
                        <span className="text-[10px] font-black uppercase tracking-wider">{toast.message}</span>
                    </div>
                ))}
            </div>

            {/* CABECERA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-[2px] bg-emerald-500 rounded-md" />
                        <p className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] tracking-[0.2em] uppercase">Ajustes de usuario</p>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none font-heading">
                        Mi <span className="text-emerald-500 dark:text-[#00df82]">Perfil</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {dirty && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Sin guardar
                        </span>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase rounded-md transition-all hover:bg-red-50 dark:hover:bg-red-500/10">
                        <HugeiconsIcon icon={Logout01Icon} className="w-4 h-4" strokeWidth={2} /> Salir
                    </button>
                    <button onClick={handleSave} disabled={saving || !dirty} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[10px] font-black uppercase rounded-md shadow-xl transition-all active:scale-95 disabled:opacity-40">
                        {saving ? <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> : <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" strokeWidth={2} />}
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUMNA IZQUIERDA */}
                <div className="lg:col-span-4 space-y-6">
                    <SectionCard title="Mi cuenta" subtitle="Foto, rol y estado" icon={<HugeiconsIcon icon={UserCircleIcon} className="w-5 h-5" strokeWidth={1.8} />} bodyClassName="p-6 flex flex-col items-center text-center">
                        <div className="relative group mb-5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden border-4 border-white dark:border-white/5 shadow-2xl group-hover:border-emerald-500 transition-all duration-500">
                                {profile.photoURL ? (
                                    <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-slate-300 dark:text-white/20 uppercase tracking-tighter">{profile.displayName?.charAt(0) || 'U'}</span>
                                )}
                                {uploadingImg && (
                                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                                        <HugeiconsIcon icon={RefreshIcon} className="w-8 h-8 text-white animate-spin" strokeWidth={1.6} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-1 right-1 p-2 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-full shadow-xl border-2 border-white dark:border-[#0B0F19] group-hover:scale-110 transition-transform">
                                <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4" strokeWidth={2} />
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none capitalize">{profile.displayName.toLowerCase()}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{profile.jobTitle || 'Sin cargo'}</p>
                        <div className="w-full pt-5 mt-4 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                            <div className={`px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest border ${getRoleBadge(profile.role)}`}>Rol: {getRoleLabel(profile.role)}</div>
                            <div className="px-4 py-2 rounded-md text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 text-slate-400 border border-slate-200 dark:border-white/5">
                                Estado: <span className="text-emerald-600 dark:text-[#00df82]">{profile.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Seguridad" subtitle="Gestión de tu acceso" icon={<HugeiconsIcon icon={Key01Icon} className="w-5 h-5" strokeWidth={1.8} />} bodyClassName="p-6">
                        <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <div>
                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Contraseña</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Cambia tu clave periódicamente</p>
                            </div>
                            <button onClick={() => setIsPassModalOpen(true)} className="px-3 py-1.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black text-[8px] font-black uppercase rounded-md shadow-lg active:scale-95 transition-all">Actualizar</button>
                        </div>
                    </SectionCard>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="lg:col-span-8 space-y-6">
                    <SectionCard title="Datos personales" subtitle="Información básica de tu cuenta" icon={<HugeiconsIcon icon={IdentityCardIcon} className="w-5 h-5" strokeWidth={1.8} />} bodyClassName="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <Field label="Nombre completo" icon={<HugeiconsIcon icon={IdentityCardIcon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="text" value={profile.displayName} onChange={(e) => { setProfile({ ...profile, displayName: e.target.value }); setDirty(true); }} placeholder="NOMBRE APELLIDO" className={inputCls} />
                            </Field>
                            <Field label="Cargo / puesto" icon={<HugeiconsIcon icon={Briefcase01Icon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="text" value={profile.jobTitle} onChange={(e) => { setProfile({ ...profile, jobTitle: e.target.value }); setDirty(true); }} placeholder="GERENTE" className={inputCls} />
                            </Field>
                            <Field label="Correo corporativo" icon={<HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="email" value={profile.email} readOnly className={`${inputCls} bg-slate-50 dark:bg-white/5 text-slate-400 cursor-not-allowed`} />
                            </Field>
                            <Field label="Teléfono de contacto" icon={<HugeiconsIcon icon={PhoneIcon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="tel" value={profile.phone} onChange={(e) => { setProfile({ ...profile, phone: e.target.value }); setDirty(true); }} placeholder="+56 9 XXXX XXXX" className={inputCls} />
                            </Field>
                        </div>
                    </SectionCard>

                    <SectionCard title="Preferencias y alertas" subtitle="Los cambios en toggles se guardan al instante" icon={<HugeiconsIcon icon={BellIcon} className="w-5 h-5" strokeWidth={1.8} />} bodyClassName="p-6 space-y-3">
                        {prefToggles.map(t => (
                            <div key={t.key} className="flex items-center justify-between p-4 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all hover:border-emerald-400/40">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500">{t.icon}</div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{t.label}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">{t.desc}</p>
                                    </div>
                                </div>
                                <Toggle enabled={t.enabled} onChange={() => togglePref(t.key, !t.enabled)} />
                            </div>
                        ))}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <Field label="Idioma" icon={<HugeiconsIcon icon={GlobeIcon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <select value={profile.language} onChange={(e) => togglePref('language', e.target.value)} className={inputCls}>
                                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Zona horaria" icon={<HugeiconsIcon icon={Clock01Icon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <select value={profile.timezone} onChange={(e) => togglePref('timezone', e.target.value)} className={inputCls}>
                                    {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </Field>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* MODAL CROPPER */}
            {showCropper && imageToCrop && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
                    <div className="w-full max-w-xl rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-2xl flex flex-col h-[650px] max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-tighter font-heading">Ajustar imagen</h3>
                            <button onClick={() => { setShowCropper(false); setImageToCrop(null); }} className="p-2 hover:text-red-500 transition-all text-slate-400"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} /></button>
                        </div>
                        <div className="relative flex-1 bg-slate-900 overflow-hidden">
                            <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-6">
                                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => { setShowCropper(false); setImageToCrop(null); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-white/10 rounded-md">Descartar</button>
                                <button onClick={handleConfirmCrop} disabled={uploadingImg} className="flex-1 py-3 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50">{uploadingImg ? 'Subiendo...' : 'Finalizar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PASSWORD */}
            {isPassModalOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-sm rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest font-heading">Actualizar seguridad</h3>
                            <button onClick={() => setIsPassModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2} /></button>
                        </div>
                        <form onSubmit={handlePasswordUpdate} className="p-6 space-y-5">
                            <Field label="Contraseña actual" icon={<HugeiconsIcon icon={Key01Icon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="password" value={passForm.current} onChange={(e) => setPassForm({ ...passForm, current: e.target.value })} className={inputCls} required />
                            </Field>
                            <Field label="Nueva contraseña" icon={<HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="password" value={passForm.new} onChange={(e) => setPassForm({ ...passForm, new: e.target.value })} className={inputCls} required />
                            </Field>
                            <Field label="Confirmar nueva" icon={<HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4" strokeWidth={1.8} />}>
                                <input type="password" value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} className={inputCls} required />
                            </Field>
                            <button type="submit" disabled={passLoading} className="w-full py-3.5 bg-emerald-500 dark:bg-[#00df82] text-white dark:text-black rounded-md font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                {passLoading ? <><HugeiconsIcon icon={RefreshIcon} className="w-4 h-4 animate-spin" strokeWidth={2} /> Procesando...</> : <><HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4" strokeWidth={2} /> Confirmar cambio</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                <span className="text-emerald-600 dark:text-[#00df82]">{icon}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
    return (
        <button onClick={onChange} aria-label="Alternar" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ${enabled ? 'bg-emerald-500 dark:bg-[#00df82] shadow-lg' : 'bg-slate-200 dark:bg-white/10'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-500 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

function getRoleLabel(role: string) {
    switch (role) {
        case 'superadmin': return 'Super Admin';
        case 'admin': return 'Administrador';
        case 'owner': return 'Dueño de Recinto';
        case 'manager': return 'Gerente / Manager';
        default: return 'Usuario Estándar';
    }
}

function getRoleBadge(role: string) {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300';
        case 'owner': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300';
        case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300';
        default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/10 dark:text-slate-400';
    }
}