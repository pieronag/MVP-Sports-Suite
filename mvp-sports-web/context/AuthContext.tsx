"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

// Tipos de roles permitidos
export type UserRole = "superadmin" | "admin" | "owner" | "manager" | "staff" | null;

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreUser, setFirestoreUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Sincronizar cookie para el Middleware de Next.js
        document.cookie = "auth_session=true; path=/; max-age=31536000; SameSite=Lax";

        // BUSCAR EL ROL EN FIRESTORE
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            // Si existe el documento, tomamos el rol
            setRole(userDoc.data().role as UserRole);
            setFirestoreUser(userDoc.data());
          } else {
            // Si el usuario es nuevo y no tiene doc, evitamos el bucle y asignamos rol null o uno seguro
            console.warn("Usuario autenticado sin documento en Firestore. UID:", currentUser.uid);
            setRole(null);
            setFirestoreUser(null);
          }
        } catch (error: any) {
          console.error("Error buscando rol:", error);
          if (error.code === 'permission-denied') {
            console.error("Error de permisos: El usuario no tiene acceso a su propio documento.");
          }
          setRole(null);
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
  }, []);

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
