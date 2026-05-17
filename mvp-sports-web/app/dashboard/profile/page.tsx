"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, auth, storage } from '@/services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  UserCircleIcon, EnvelopeIcon, PhoneIcon, BuildingOfficeIcon,
  IdentificationIcon, ArrowPathIcon, CameraIcon, KeyIcon,
  BellIcon, CheckCircleIcon, BriefcaseIcon, GlobeAmericasIcon,
  ClockIcon, ArrowRightOnRectangleIcon, XMarkIcon, ExclamationTriangleIcon, 
  InformationCircleIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon,
  SparklesIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage';
import { PanelGlass } from '@/components/ui/DashboardWidgets';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, isDestructive = false }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onCancel}>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm p-6 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-none">{title}</h3>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-8 uppercase leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={onConfirm} className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl text-white shadow-lg transition-all active:scale-95 ${isDestructive ? 'bg-red-600 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>Confirmar</button>
                </div>
            </div>
        </div>
    );
};

// INTERFACES
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
  createdAt?: any;
  status: string;
  fullName?: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // PASSWORD MODAL
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [passLoading, setPassLoading] = useState(false);

  // IMAGEN
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // TOASTS
  const [toasts, setToasts] = useState<Toast[]>([]);

  // CROPPING
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean, title: string, message: string, action: () => void, isDestructive: boolean }>({ 
    isOpen: false, title: '', message: '', action: () => { }, isDestructive: false 
  });

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // --- 1. CARGAR DATOS ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            displayName: data.displayName || data.fullName || '',
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
            createdAt: data.createdAt,
            status: data.status || 'active',
            fullName: data.fullName
          });
        } else {
          setProfile({
            displayName: user.displayName || '',
            email: user.email || '',
            phone: '',
            photoURL: user.photoURL || '',
            role: 'user',
            jobTitle: '',
            language: 'es',
            timezone: 'America/Santiago',
            notificationsEnabled: true,
            status: 'active'
          });
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
        addToast("Error al cargar perfil", 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        addToast("La imagen es demasiado pesada. Máximo 2MB.", 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleConfirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels || !user || !profile) return;
    setUploadingImg(true);
    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (croppedImage) {
        // 1. Actualizar Firestore (users)
        await updateDoc(doc(db, "users", user.uid), { photoURL: croppedImage });

        // 2. Actualizar Firestore (staff) - si existe
        try {
            const staffRef = collection(db, 'staff');
            const q = query(staffRef, where('uid', '==', user.uid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                await updateDoc(doc(db, 'staff', snap.docs[0].id), { photoURL: croppedImage });
            }
        } catch (e) { console.error("Error updating staff photo on web:", e); }

        // 3. Actualizar Firebase Auth Profile
        try {
            await updateProfile(user, { photoURL: croppedImage });
        } catch (e) { console.error("Auth update failed (base64 too long):", e); }

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
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, {
        displayName: profile.displayName || "",
        phone: profile.phone || "",
        jobTitle: profile.jobTitle || "",
        companyName: profile.companyName || "",
        language: profile.language || "es",
        timezone: profile.timezone || "America/Santiago",
        notificationsEnabled: profile.notificationsEnabled
      });
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

    if (passForm.new !== passForm.confirm) {
      addToast("Las nuevas contraseñas no coinciden", 'error');
      return;
    }
    if (passForm.new.length < 6) {
      addToast("La contraseña debe tener al menos 6 caracteres", 'error');
      return;
    }

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
      title: "¿Cerrar Sesión?",
      message: "Estás a punto de salir de la suite administrativa. ¿Deseas continuar?",
      isDestructive: true,
      action: async () => {
        await signOut(auth);
        router.push('/login');
      }
    });
  };

  if (loading) return <div className="flex h-full items-center justify-center text-slate-400 text-xs gap-2"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Cargando Perfil...</div>;
  if (!profile) return <div>No se encontró el perfil.</div>;

  return (
    <div className="w-full space-y-6 pb-10 relative animate-fadeIn">
        <ConfirmModal 
            isOpen={confirmData.isOpen} 
            title={confirmData.title} 
            message={confirmData.message} 
            onConfirm={confirmData.action} 
            onCancel={() => setConfirmData(prev => ({ ...prev, isOpen: false }))} 
            isDestructive={confirmData.isDestructive} 
        />

        {/* TOASTS PREMIUM */}
        <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-slideInRight backdrop-blur-md ${
                    toast.type === 'success' ? 'bg-white/90 border-emerald-500 text-emerald-700 dark:bg-[#0B0F19]/90 dark:border-emerald-500/50 dark:text-emerald-400' : 
                    toast.type === 'error' ? 'bg-white/90 border-red-500 text-red-700 dark:bg-[#0B0F19]/90 dark:border-red-500/50 dark:text-red-400' : 
                    'bg-white/90 border-blue-500 text-blue-700 dark:bg-[#0B0F19]/90 dark:border-blue-500/50 dark:text-blue-400'
                }`}>
                    {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5" />}
                    {toast.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5" />}
                    {toast.type === 'info' && <InformationCircleIcon className="w-5 h-5" />}
                    <span className="text-[10px] font-black uppercase tracking-wider">{toast.message}</span>
                </div>
            ))}
        </div>

        {/* CABECERA ADN STYLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6 relative z-10">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em] uppercase">
                        Ajustes de Usuario
                    </p>
                </div>
                <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                    Mi <span className="text-emerald-500 dark:text-emerald-400">Perfil</span>
                </h1>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={handleLogout} 
                    className="px-4 py-2 bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase rounded-xl transition-all hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" /> Salir
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="px-6 py-2 bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 text-[10px] font-black uppercase rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA IZQUIERDA - AVATAR & STATUS */}
            <div className="lg:col-span-4 space-y-6">
                <PanelGlass className="p-8 flex flex-col items-center text-center relative overflow-hidden border-none shadow-xl shadow-slate-200/20">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-50 dark:from-white/5 to-transparent pointer-events-none"></div>
                    
                    <div className="relative group mb-6 z-10 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-[#0B0F19] flex items-center justify-center overflow-hidden border-4 border-white dark:border-white/5 shadow-2xl group-hover:border-emerald-500 transition-all duration-500">
                            {profile.photoURL ? (
                                <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-black text-slate-300 dark:text-white/20 uppercase tracking-tighter">
                                    {profile.displayName?.charAt(0) || 'U'}
                                </span>
                            )}
                            {uploadingImg && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                                    <ArrowPathIcon className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 p-2 bg-emerald-500 text-white rounded-full shadow-xl border-2 border-white dark:border-[#0B0F19] group-hover:scale-110 transition-transform">
                            <CameraIcon className="w-4 h-4" />
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </div>

                    <div className="space-y-1 mb-6">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none capitalize">
                            {profile.displayName.toLowerCase()}
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{profile.jobTitle || "Sin Cargo"}</p>
                    </div>

                    <div className="w-full pt-6 border-t border-slate-50 dark:border-white/5 flex flex-col gap-2">
                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getRoleBadge(profile.role)}`}>
                            Rol: {getRoleLabel(profile.role)}
                        </div>
                        <div className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5">
                            Estado: <span className="text-emerald-500">{profile.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>

                    <SparklesIcon className="absolute -bottom-4 -left-4 w-24 h-24 text-emerald-500/5 rotate-12" />
                </PanelGlass>

                <PanelGlass className="p-6 border-none shadow-xl shadow-slate-200/20">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest">
                        <KeyIcon className="w-4 h-4 text-emerald-500" /> Seguridad
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div>
                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Contraseña</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Cambia tu clave periódicamente</p>
                            </div>
                            <button onClick={() => setIsPassModalOpen(true)} className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[8px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all">
                                Actualizar
                            </button>
                        </div>
                    </div>
                </PanelGlass>
            </div>

            {/* COLUMNA DERECHA - DATOS */}
            <div className="lg:col-span-8 space-y-6">
                <PanelGlass className="p-8 border-none shadow-xl shadow-slate-200/20">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest flex items-center gap-2">
                            <InformationCircleIcon className="w-4 h-4 text-emerald-500" /> Datos Personales
                        </h3>
                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Verificado</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <InputGroupPremium 
                            label="Nombre Completo" 
                            value={profile.displayName} 
                            onChange={(e: any) => setProfile({ ...profile, displayName: e.target.value })} 
                            icon={<IdentificationIcon className="w-4 h-4" />} 
                            placeholder="NOMBRE APELLIDO" 
                        />
                        <InputGroupPremium 
                            label="Cargo / Puesto" 
                            value={profile.jobTitle} 
                            onChange={(e: any) => setProfile({ ...profile, jobTitle: e.target.value })} 
                            icon={<BriefcaseIcon className="w-4 h-4" />} 
                            placeholder="GERENTE" 
                        />
                        <InputGroupPremium 
                            label="Correo Corporativo" 
                            value={profile.email} 
                            readOnly 
                            icon={<EnvelopeIcon className="w-4 h-4" />} 
                        />
                        <InputGroupPremium 
                            label="Teléfono de Contacto" 
                            value={profile.phone} 
                            onChange={(e: any) => setProfile({ ...profile, phone: e.target.value })} 
                            icon={<PhoneIcon className="w-4 h-4" />} 
                            placeholder="+56 9 XXXX XXXX" 
                        />
                    </div>

                    <div className="mt-10 pt-8 border-t border-slate-50 dark:border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest flex items-center gap-2">
                            <BellIcon className="w-4 h-4 text-emerald-500" /> Preferencias y Alertas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white dark:bg-[#0B0F19] rounded-xl text-slate-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                                        <EnvelopeIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Email Marketing</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">Recibe novedades</p>
                                    </div>
                                </div>
                                <ToggleSwitch enabled={profile.notificationsEnabled} onChange={() => setProfile({ ...profile, notificationsEnabled: !profile.notificationsEnabled })} />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white dark:bg-[#0B0F19] rounded-xl text-slate-400 group-hover:text-emerald-500 transition-colors shadow-sm">
                                        <GlobeAmericasIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Zona Horaria</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">{profile.timezone}</p>
                                    </div>
                                </div>
                                <div className="p-1 bg-emerald-500/10 text-emerald-500 rounded-lg"><ClockIcon className="w-3.5 h-3.5" /></div>
                            </div>
                        </div>
                    </div>
                </PanelGlass>
            </div>
        </div>

        {/* MODAL CROPPER */}
        {showCropper && imageToCrop && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
                <PanelGlass className="w-full max-w-xl border-none shadow-2xl flex flex-col h-[650px] max-h-[90vh] overflow-hidden bg-white dark:bg-[#0B0F19]">
                    <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase tracking-tighter">Ajustar Imagen</h3>
                        <button onClick={() => { setShowCropper(false); setImageToCrop(null); }} className="p-2 hover:text-red-500 transition-all text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="relative flex-1 bg-slate-900 overflow-hidden">
                        <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-6">
                            <MagnifyingGlassMinusIcon className="w-4 h-4 text-slate-400" />
                            <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                            <MagnifyingGlassPlusIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setShowCropper(false); setImageToCrop(null); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-100 rounded-xl">Descartar</button>
                            <button onClick={handleConfirmCrop} disabled={uploadingImg} className="flex-1 py-3 bg-emerald-500 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50">{uploadingImg ? 'Subiendo...' : 'Finalizar'}</button>
                        </div>
                    </div>
                </PanelGlass>
            </div>
        )}

        {/* MODAL PASSWORD */}
        {isPassModalOpen && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                <PanelGlass className="w-full max-w-sm border-none shadow-2xl bg-white dark:bg-[#0B0F19]">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Actualizar Seguridad</h3>
                        <button onClick={() => setIsPassModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handlePasswordUpdate} className="p-6 space-y-5">
                        <InputGroupPremium label="Contraseña Actual" type="password" value={passForm.current} onChange={(e: any) => setPassForm({ ...passForm, current: e.target.value })} icon={<KeyIcon className="w-4 h-4" />} />
                        <InputGroupPremium label="Nueva Contraseña" type="password" value={passForm.new} onChange={(e: any) => setPassForm({ ...passForm, new: e.target.value })} icon={<ShieldCheckIcon className="w-4 h-4" />} />
                        <InputGroupPremium label="Confirmar Nueva" type="password" value={passForm.confirm} onChange={(e: any) => setPassForm({ ...passForm, confirm: e.target.value })} icon={<ShieldCheckIcon className="w-4 h-4" />} />
                        <button type="submit" disabled={passLoading} className="w-full py-3.5 bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl disabled:opacity-50">
                            {passLoading ? 'Procesando...' : 'Confirmar Cambio'}
                        </button>
                    </form>
                </PanelGlass>
            </div>
        )}
    </div>
  );
}

// --- HELPERS ---

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

function InputGroupPremium({ label, value, onChange, placeholder, icon, readOnly, type = "text" }: any) {
    return (
        <div className="flex flex-col gap-2 group">
            <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors">{label}</label>
            <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-white/20 group-focus-within:text-emerald-500 transition-colors">
                    {icon}
                </div>
                <input 
                    type={type}
                    value={value || ''} 
                    onChange={onChange} 
                    readOnly={readOnly} 
                    placeholder={placeholder} 
                    className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-[11px] font-black transition-all outline-none ${
                        readOnly 
                        ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed dark:bg-white/5 dark:border-white/5' 
                        : 'bg-white border-slate-100 text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 dark:bg-[#0B0F19] dark:border-white/5 dark:text-white'
                    }`} 
                />
            </div>
        </div>
    )
}

function ToggleSwitch({ enabled, onChange }: any) {
    return (
        <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 ${enabled ? 'bg-emerald-500 shadow-lg' : 'bg-slate-200 dark:bg-white/10'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-500 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    )
}
