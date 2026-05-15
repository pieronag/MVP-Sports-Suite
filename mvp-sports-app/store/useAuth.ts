import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import { UserProfile } from '../types/user';


interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    role: UserProfile['role'] | null;
    isLoading: boolean;
    theme: 'light' | 'dark';

    // Acciones
    initSession: () => (() => void);
    signOut: () => Promise<void>;
    toggleTheme: () => void;
    setTheme: (t: 'light' | 'dark') => void;
    updateProfileState: (data: Partial<UserProfile>) => void;
    reloadProfile: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            role: null,
            isLoading: true,
            theme: 'light',

            setTheme: (theme) => set({ theme }),

            toggleTheme: () => {
                const current = get().theme;
                set({ theme: current === 'light' ? 'dark' : 'light' });
            },

            updateProfileState: (data) => {
                const currentProfile = get().profile;
                if (currentProfile) {
                    set({ profile: { ...currentProfile, ...data } });
                }
            },

            initSession: () => {
                let unsubProfile: (() => void) | null = null;

                const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
                    // Limpiar listener de perfil previo
                    if (unsubProfile) {
                        unsubProfile();
                        unsubProfile = null;
                    }

                    if (firebaseUser) {
                        // Iniciar escucha en tiempo real del perfil en Firestore
                        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
                            if (docSnap.exists()) {
                                const data = docSnap.data() as UserProfile;
                                set({
                                    user: firebaseUser,
                                    profile: data,
                                    role: data.role || 'player',
                                    isLoading: false
                                });
                            } else {
                                // Usuario autenticado pero sin documento en Firestore
                                set({
                                    user: firebaseUser,
                                    profile: null,
                                    role: 'player',
                                    isLoading: false
                                });
                            }
                        }, (error) => {
                            console.error("Profile Sync Error:", error);
                            set({ isLoading: false });
                        });
                    } else {
                        // Sesión cerrada
                        set({
                            user: null,
                            profile: null,
                            role: null,
                            isLoading: false
                        });
                    }
                });

                return () => {
                    unsubAuth();
                    if (unsubProfile) unsubProfile();
                };
            },

            signOut: async () => {
                try {
                    await firebaseSignOut(auth);
                } catch (error) {
                    console.error("Error signing out:", error);
                }
            },

            reloadProfile: async () => {
                const currentUser = get().user;
                if (!currentUser) return;
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data() as UserProfile;
                        set({ 
                            profile: data, 
                            role: data.role || 'player' 
                        });
                    }
                } catch (error) {
                    console.error("Error reloading profile:", error);
                }
            },
        }),
        {
            name: 'mvp-sports-storage', // Nombre de la llave en AsyncStorage
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                theme: state.theme // Solo persistimos el tema para seguridad de datos
            }),
        }
    )
);