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
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Client
import apiClient from "../src/api/client";

const { width, height } = Dimensions.get("window");

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  // These states store the form data and the loading state.
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // These animated values move the clouds across the screen.
  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  useEffect(() => {
    // If a token already exists, the user goes directly to the home screen.
    const checkSession = async () => {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      try {
        // Optionally, you could verify the token with the backend here.
        await apiClient.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error: any) {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem("userToken");
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    // This helper creates a loop animation for one cloud.
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
  }, [cloud1Anim, cloud2Anim, width]);

  const handleLogin = async () => {
    // Basic check before sending data to the backend.
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      // FastAPI OAuth2 login expects FormData with username and password.
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response = await apiClient.post("/users/login", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Save the token so the session can stay active later.
      const { access_token } = response.data;

      await AsyncStorage.setItem("userToken", access_token);

      console.log("Login exitoso, token guardado");
      router.replace("/home");
    } catch (error: any) {
      const errorDetail =
        error.response?.data?.detail || "No se pudo conectar con el servidor";
      Alert.alert("Fallo en el inicio de sesión", errorDetail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative animated clouds in the background. */}
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
          {/* App title and short welcome message. */}
          <View style={styles.header}>
            <Ionicons name="sunny" size={80} color="#f59e0b" />
            <Text style={styles.title}>WeatherApp</Text>
            <Text style={styles.subtitle}>Tu clima, en un solo lugar</Text>
          </View>

          {/* Login form fields and actions. */}
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
                onChangeText={(text: string) => setEmail(text)}
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
                onChangeText={(text: string) => setPassword(text)}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
            >
              {/* Show a spinner while the login request is in progress. */}
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </TouchableOpacity>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  cloud: {
    position: "absolute",
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingVertical: 50,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#1e293b",
    marginTop: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 5,
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 18,
    height: 60,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#1e293b",
    fontSize: 16,
  },
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
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  linkButton: {
    marginTop: 30,
  },
  linkText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 15,
  },
  linkHighlight: {
    color: "#3b82f6",
    fontWeight: "700",
  },
});
