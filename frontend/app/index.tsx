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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppLoader from "../components/AppLoader";
import { useAuth } from "../src/context/AuthContext";

// This shared client sends all frontend requests to the backend API.
import apiClient from "../src/api/client";

const { width, height } = Dimensions.get("window");

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  const { login, authState, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  // These states store the login form values and the request state.
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // These animated values move the background clouds from right to left.
  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          const response = await apiClient.get("/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          await login(token, response.data.role, response.data.email);
          router.replace("/home");
        } else {
          setIsChecking(false);
        }
      } catch {
        setIsChecking(false);
      }
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && authState.token) {
      setIsChecking(false);
      router.replace("/home");
    }
  }, [authState.token, isLoading, router]);

  useEffect(() => {
    // This helper creates an infinite cloud animation.
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please complete all fields");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response = await apiClient.post("/users/login", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { access_token, role } = response.data;

      // Older login responses are supported by reading the role from /users/me.
      let finalRole = role;
      if (!finalRole) {
        const userRes = await apiClient.get("/users/me", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        finalRole = userRes.data.role;
      }

      await login(access_token, finalRole, email);
      router.replace("/home");

      console.log("Login exitoso con rol:", finalRole);
    } catch (error: any) {
      const errorDetail =
        error.response?.data?.detail || "Could not connect to server";
      Alert.alert("Login failed", errorDetail);
    } finally {
      setLoading(false);
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
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons name="sunny" size={80} color="#f59e0b" />
            <Text style={styles.title}>WeatherApp</Text>
            <Text style={styles.subtitle}>Your weather, in one place</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#64748b"
                style={styles.icon}
              />
              <TextInput
                placeholder="Email address"
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
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={password}
                onChangeText={(text: string) => setPassword(text)}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              // eslint-disable-next-line react-native/no-inline-styles
              style={[styles.button, loading && { opacity: 0.7 }]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/register")}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                ¿Nuevo aquí?{" "}
                <Text style={styles.linkHighlight}>Create an account</Text>
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
