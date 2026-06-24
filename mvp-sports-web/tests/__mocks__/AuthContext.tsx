import React from 'react';

const AuthContext = React.createContext({
  user: null,
  role: null,
  loading: false,
  logout: async () => {},
  firestoreUser: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={{ user: null, role: 'superadmin', loading: false, logout: async () => {}, firestoreUser: null }}>
    {children}
  </AuthContext.Provider>
);

export const useAuth = () => React.useContext(AuthContext);
