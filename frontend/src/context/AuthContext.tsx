import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "../services/logger";

type UserRole = "user" | "admin" | null;

// AuthState keeps the token and role together so protected screens read one source.
interface AuthState {
  token: string | null;
  role: UserRole;
  email?: string;
}

interface AuthContextType {
  authState: AuthState;
  userRole: UserRole;
  login: (token: string, role: UserRole, email: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    role: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const savedRole = await AsyncStorage.getItem("userRole");
        const savedToken = await AsyncStorage.getItem("userToken");

        if (savedRole && savedToken) {
          setAuthState({
            token: savedToken,
            role: savedRole as UserRole,
          });
        }
      } catch (e) {
        console.error("Error cargando sesión", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const login = async (token: string, role: UserRole, email: string) => {
    setAuthState({ token, role });
    Logger.auth("Sesión Iniciada Satisfactoriamente", {
      usuario: email,
      rol: role,
      token_abreviado: `${token.substring(0, 10)}...${token.slice(-10)}`,
      timestamp: new Date().toISOString(),
    });

    await AsyncStorage.setItem("userToken", token);
    await AsyncStorage.setItem("userRole", role as string);
  };

  const logout = async () => {
    setAuthState({ token: null, role: null, email: undefined });
    Logger.auth("Cerrando sesión y eliminando tokens locales", {
      usuario: authState.email,
    });
    await AsyncStorage.multiRemove(["userToken", "userRole"]);
  };

  return (
    <AuthContext.Provider
      value={{ authState, userRole: authState.role, login, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};
