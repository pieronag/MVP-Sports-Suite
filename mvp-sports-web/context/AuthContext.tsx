"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export type UserRole = "superadmin" | "admin" | "owner" | "manager" | "staff" | "player" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  logout: () => Promise<void>;
  firestoreUser: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => { },
  firestoreUser: null,
});

export const useAuth = () => useContext(AuthContext);

import { usePathname } from "next/navigation";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreUser, setFirestoreUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Si estamos en la landing page principal y no en otra ruta, retrasamos la inicialización
    // de Firebase para no bloquear el hilo principal y mejorar el LCP/PageSpeed.
    if (pathname === "/") {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Sincronizar cookie para el Middleware de Next.js
        document.cookie = "auth_session=true; path=/; max-age=31536000; SameSite=Lax";

        try {
          let userDoc = await getDoc(doc(db, "users", currentUser.uid));
          let foundRole: UserRole = null;
          let foundUser: any = null;
          if (userDoc.exists()) {
            foundRole = userDoc.data().role as UserRole;
            foundUser = userDoc.data();
          } else {
            const profileDoc = await getDoc(doc(db, "profiles", currentUser.uid));
            if (profileDoc.exists()) {
              foundRole = (profileDoc.data().role || "player") as UserRole;
              foundUser = profileDoc.data();
            }
          }
          setRole(foundRole);
          setFirestoreUser(foundUser);
        } catch (error: any) {
          console.error("Error buscando rol:", error);
          setRole(null);
          setFirestoreUser(null);
        }
      } else {
        // Limpiar cookie y rol al cerrar sesión
        document.cookie = "auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        setRole(null);
        setFirestoreUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname]);

  // Función comodín para hacer logout y limpiar todo
  const logout = async () => {
    try {
      await auth.signOut();
      // AuthStateChanged se disparará y limpiará la cookie
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout, firestoreUser }}>
      {children}
    </AuthContext.Provider>
  );
};
