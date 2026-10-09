"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { userService, PlayerProfile } from "../services/player/userService";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mvp-theme');
            if (saved === 'light' || saved === 'dark') setTheme(saved);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('mvp-theme', theme);
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const reloadProfile = useCallback(async () => {
        if (!user?.uid) { setProfile(null); setLoading(false); return; }
        setLoading(true);
        const p = await userService.getUserProfile(user.uid);
        if (p) {
            setProfile(p);
            if (p.theme === 'light' || p.theme === 'dark') setTheme(p.theme);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        reloadProfile();
    }, [reloadProfile]);

    useEffect(() => {
        if (!user?.uid) return;
        console.log('PlayerProvider: checking profile for uid:', user.uid, 'project:', (db as any)._databaseId?.projectId || (db as any)._persistenceKey || 'unknown');
        const fetchProfile = async () => {
            try {
                // Primary: users collection (contains full player data)
                const ref = doc(db, 'users', user.uid);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = { uid: snap.id, ...snap.data() } as PlayerProfile;
                    console.log('PlayerProvider: profile loaded from users/', user.uid);
                    setProfile(data);
                    return;
                }
                // Fallback: profiles collection
                const profileRef = doc(db, 'profiles', user.uid);
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    const data = { uid: profileSnap.id, ...profileSnap.data() } as PlayerProfile;
                    console.log('PlayerProvider: profile loaded from profiles/', user.uid);
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
