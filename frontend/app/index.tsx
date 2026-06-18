import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppLoader from "../src/components/AppLoader";
import { useAuth } from "../src/context/AuthContext";
import apiClient from "../src/api/client";
import { useCallback } from "react";
import { AppColors } from "../src/constants/design";

const { width, height } = Dimensions.get("window");

interface SavedAccount {
  email: string;
  password?: string;
  profile_picture?: string | null;
  full_name?: string | null;
}

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams(); // <-- Captura parámetros de la URL
  const { login } = useAuth();

  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSavedAccounts, setShowSavedAccounts] = useState<boolean>(false);

  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkSessionAndSavedAccounts = async () => {
        try {
          const token = await AsyncStorage.getItem("userToken");

          if (token) {
            const response = await apiClient.get("/users/me", {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (isActive) {
              await login(token, response.data.role, response.data.email);
              router.replace("/home");
            }
            return;
          }

          const saved = await AsyncStorage.getItem("saved_accounts");

          if (saved && params.registered !== "true") {
            const parsedAccounts = JSON.parse(saved);
            if (parsedAccounts.length > 0 && isActive) {
              setSavedAccounts(parsedAccounts);
              setShowSavedAccounts(true);
            }
          }
        } catch {
          console.log("No hay sesión previa o error al cargar cuentas");
        } finally {
          if (isActive) setIsChecking(false);
        }
      };

      checkSessionAndSavedAccounts();

      return () => {
        isActive = false;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.registered]),
  );

  useEffect(() => {
    const animateCloud = (
      animValue: Animated.Value,
      duration: number,
      delay: number = 0,
    ): void => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -200,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: width,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    animateCloud(cloud1Anim, 30000);
    animateCloud(cloud2Anim, 20000, 5000);
  }, [cloud1Anim, cloud2Anim]);

  const executeLogin = async (
    loginEmail: string,
    loginPass: string,
    shouldSave: boolean,
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", loginEmail);
      formData.append("password", loginPass);

      const response = await apiClient.post("/users/login", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { access_token, role } = response.data;

      const userRes = await apiClient.get("/users/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const finalRole = role || userRes.data.role;
      const profilePic = userRes.data.profile_picture;
      const fullName = userRes.data.full_name;

      if (shouldSave) {
        const newAccount: SavedAccount = {
          email: loginEmail,
          password: loginPass,
          profile_picture: profilePic,
          full_name: fullName,
        };

        const filteredAccounts = savedAccounts.filter(
          (acc) => acc.email !== loginEmail,
        );
        const updatedAccounts = [newAccount, ...filteredAccounts];

        setSavedAccounts(updatedAccounts);
        await AsyncStorage.setItem(
          "saved_accounts",
          JSON.stringify(updatedAccounts),
        );
      }

      await login(access_token, finalRole, loginEmail);
      router.replace("/home");
    } catch (error: any) {
      const errorDetail =
        error.response?.data?.detail || "Error al conectar con el servidor";
      Alert.alert("Login fallido", errorDetail);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }
    executeLogin(email, password, rememberMe);
  };

  const removeSavedAccount = async (emailToRemove: string) => {
    const updatedAccounts = savedAccounts.filter(
      (acc) => acc.email !== emailToRemove,
    );
    setSavedAccounts(updatedAccounts);
    await AsyncStorage.setItem(
      "saved_accounts",
      JSON.stringify(updatedAccounts),
    );
    if (updatedAccounts.length === 0) {
      setShowSavedAccounts(false);
    }
  };

  if (isChecking) {
    return <AppLoader />;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.cloud,
          { top: height * 0.1, transform: [{ translateX: cloud1Anim }] },
        ]}
      >
        <Ionicons name="cloud" size={150} color="#e2e8f0" />
      </Animated.View>

      <Animated.View
        style={[
          styles.cloud,
          { top: height * 0.3, transform: [{ translateX: cloud2Anim }] },
        ]}
      >
        <Ionicons name="cloud" size={100} color="#cbd5e1" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons name="sunny" size={80} color="#f59e0b" />
            <Text style={styles.title}>WeatherApp</Text>
            <Text style={styles.subtitle}>Tu clima, en un solo lugar</Text>
          </View>

          {showSavedAccounts ? (
            <View style={styles.savedAccountsContainer}>
              <Text style={styles.savedAccountsTitle}>
                Selecciona una cuenta
              </Text>
              {savedAccounts.map((acc, index) => {
                const displayName = acc.full_name || acc.email.split("@")[0];
                const baseURL = apiClient.defaults.baseURL || "";
                const avatarUri = acc.profile_picture
                  ? `${baseURL}${acc.profile_picture}`
                  : `https://ui-avatars.com/api/?name=${displayName}&background=fff&color=3b82f6`;

                return (
                  <View key={index} style={styles.accountCard}>
                    <TouchableOpacity
                      style={styles.accountInfo}
                      onPress={() =>
                        executeLogin(acc.email, acc.password || "", true)
                      }
                      disabled={loading}
                    >
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage}
                      />
                      <Text style={styles.accountEmail} numberOfLines={1}>
                        {acc.email}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeSavedAccount(acc.email)}
                    >
                      <Ionicons name="close-circle" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.anotherAccountBtn}
                onPress={() => {
                  setShowSavedAccounts(false);
                  setEmail("");
                  setPassword("");
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
                <Text style={styles.anotherAccountText}>
                  Iniciar sesión en otra cuenta
                </Text>
              </TouchableOpacity>

              {loading && (
                <ActivityIndicator color="#0f172a" style={{ marginTop: 20 }} />
              )}
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#64748b"
                  style={styles.icon}
                />
                <TextInput
                  placeholder="Correo electrónico"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#64748b"
                  style={styles.icon}
                />
                <TextInput
                  placeholder="Contraseña"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.7}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <Ionicons
                  name={rememberMe ? "checkbox" : "square-outline"}
                  size={24}
                  color={rememberMe ? "#3b82f6" : "#94a3b8"}
                />
                <Text style={styles.checkboxText}>
                  Guardar información de inicio de sesión
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/forgot-password")}
                style={{ marginTop: 15, alignItems: "center" }}
              >
                <Text style={{ color: AppColors.blue500, fontWeight: "600" }}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={handleManualLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Iniciar Sesión</Text>
                )}
              </TouchableOpacity>

              {savedAccounts.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowSavedAccounts(true)}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>
                    Volver a mis cuentas guardadas
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => router.push("/register")}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  ¿Nuevo aquí?{" "}
                  <Text style={styles.linkHighlight}>Crea una cuenta</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  cloud: { position: "absolute", opacity: 0.5 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingVertical: 50,
  },
  header: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#1e293b",
    marginTop: 10,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 16, color: "#94a3b8", marginTop: 5 },
  form: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 18,
    height: 60,
  },
  icon: { marginRight: 12 },
  input: { flex: 1, color: "#1e293b", fontSize: 16 },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkboxText: { marginLeft: 10, fontSize: 14, color: "#64748b" },
  button: {
    backgroundColor: "#0f172a",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  linkButton: { marginTop: 25 },
  linkText: { textAlign: "center", color: "#64748b", fontSize: 15 },
  linkHighlight: { color: "#3b82f6", fontWeight: "700" },
  savedAccountsContainer: { width: "100%", alignItems: "center" },
  savedAccountsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 20,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    width: "100%",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  accountInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#e2e8f0",
  },
  accountEmail: { fontSize: 16, fontWeight: "500", color: "#0f172a", flex: 1 },
  removeButton: { padding: 5 },
  anotherAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    padding: 10,
  },
  anotherAccountText: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 15,
    marginLeft: 8,
  },
});
