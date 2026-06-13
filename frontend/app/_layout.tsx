import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  PanResponder,
  Modal,
  Text,
  TouchableOpacity,
} from "react-native";
import { useRef, useEffect, useCallback, useState } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import Logger from "../src/services/logger";
import { WeatherProvider } from "../src/context/WeatherContext";

// The wrapper applies the inactivity timeout only to administrator sessions.
function AdminInactivityWrapper({ children }: { children: React.ReactNode }) {
  const { userRole, logout } = useAuth();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  const logoutTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerId = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
  const WARNING_BEFORE_MS = 1 * 60 * 1000;
  const WARNING_TRIGGER_MS = INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS;

  const resetTimer = useCallback(() => {
    if (userRole !== "admin") return;

    // Existing timers are cleared before scheduling a new inactivity window.
    if (warningTimerId.current) clearTimeout(warningTimerId.current);
    if (logoutTimerId.current) clearTimeout(logoutTimerId.current);

    setShowWarning(false);

    // A warning is shown one minute before the forced logout.
    warningTimerId.current = setTimeout(() => {
      Logger.warn("Aviso de inactividad: Mostrando modal al administrador");
      setShowWarning(true);
    }, WARNING_TRIGGER_MS);

    // The session is cleared when the full inactivity window expires.
    logoutTimerId.current = setTimeout(async () => {
      Logger.error("Inactividad crítica: Ejecutando cierre de sesión forzado");
      setShowWarning(false);
      await logout();
      router.replace("/");
    }, INACTIVITY_LIMIT_MS);
  }, [userRole, logout, router, INACTIVITY_LIMIT_MS, WARNING_TRIGGER_MS]);

  // PanResponder observes touches without preventing child controls from working.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  useEffect(() => {
    resetTimer();
    return () => {
      if (logoutTimerId.current) clearTimeout(logoutTimerId.current);
      if (warningTimerId.current) clearTimeout(warningTimerId.current);
    };
  }, [userRole, resetTimer]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}

      <Modal transparent={true} visible={showWarning} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Sesión a punto de expirar</Text>
            <Text style={styles.modalText}>
              Su sesión se cerrará automáticamente en 1 minuto debido a la
              inactividad por motivos de seguridad.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={resetTimer}>
              <Text style={styles.buttonText}>CONTINUAR TRABAJANDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RootLayoutNav() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0f172a" },
        animation: "simple_push",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
      <Stack.Screen name="home" options={{ title: "Home" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit Profile" }} />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change Password" }}
      />
      <Stack.Screen name="about" options={{ title: "About" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <WeatherProvider>
        <SafeAreaProvider>
          <AdminInactivityWrapper>
            <RootLayoutNav />
          </AdminInactivityWrapper>
        </SafeAreaProvider>
        </WeatherProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalText: {
    color: "#cbd5e1",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
