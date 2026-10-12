"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { userService, PlayerProfile } from "@/services/client/player/userService";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/services/client/firebase";

interface PlayerContextType {
    profile: PlayerProfile | null;
    loading: boolean;
    reloadProfile: () => Promise<void>;
    updateProfile: (data: Partial<PlayerProfile>) => Promise<void>;
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

const PlayerContext = createContext<PlayerContextType>({
    profile: null,
    loading: true,
    reloadProfile: async () => {},
    updateProfile: async () => {},
    theme: 'dark',
    toggleTheme: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<PlayerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    // El tema elegido en este dispositivo manda; el de la cuenta solo se usa si aquí no hay uno
    const localTheme = useRef<'dark' | 'light' | null>(null);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('mvp-theme');
            if (saved === 'light' || saved === 'dark') { localTheme.current = saved; setTheme(saved); }
        } catch { /* sin almacenamiento */ }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localTheme.current = next;
            try { localStorage.setItem('mvp-theme', next); } catch { /* sin almacenamiento */ }
            if (user?.uid) userService.updateUserProfile(user.uid, { theme: next }).catch(() => undefined);
            return next;
        });
    }, [user]);

    const reloadProfile = useCallback(async () => {
        if (!user?.uid) { setProfile(null); setLoading(false); return; }
        setLoading(true);
        const p = await userService.getUserProfile(user.uid);
        if (p) {
            setProfile(p);
            if (!localTheme.current && (p.theme === 'light' || p.theme === 'dark')) setTheme(p.theme);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        reloadProfile();
    }, [reloadProfile]);

    useEffect(() => {
        if (!user?.uid) return;
        const fetchProfile = async () => {
            try {
                // Primary: users collection (contains full player data)
                const ref = doc(db, 'users', user.uid);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = { uid: snap.id, ...snap.data() } as PlayerProfile;
                    setProfile(data);
                    return;
                }
                // Fallback: profiles collection
                const profileRef = doc(db, 'profiles', user.uid);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    const data = { uid: profileSnap.id, ...profileSnap.data() } as PlayerProfile;
                    setProfile(data);
                    return;
                }
                console.warn('PlayerProvider: no profile found anywhere for', user.uid);
            } catch (err) {
                console.error('PlayerProvider: getDoc error:', err);
            }
        };
        fetchProfile();
        const unsub = onSnapshot(
            doc(db, 'users', user.uid),
            { includeMetadataChanges: false },
            (snap) => {
                if (snap.exists()) {
                    const data = { uid: snap.id, ...snap.data() } as PlayerProfile;
                    setProfile(data);
                }
            },
            (error) => {
                console.error('PlayerProvider: onSnapshot error:', error);
            }
        );
        return () => unsub();
    }, [user]);

    const updateProfile = async (data: Partial<PlayerProfile>) => {
        if (!user?.uid) return;
        await userService.updateUserProfile(user.uid, data);
        setProfile(prev => prev ? { ...prev, ...data } : prev);
    };

    return (
        <PlayerContext.Provider value={{ profile, loading, reloadProfile, updateProfile, theme, toggleTheme }}>
            {children}
        </PlayerContext.Provider>
    );
};
