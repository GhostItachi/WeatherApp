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
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";

const { width, height } = Dimensions.get("window");
const [loading, setLoading] = useState(false);
// This value controls how many animated raindrops are rendered.
const NUMBER_OF_RAINDROPS = 40;

export default function RegisterScreen(): React.ReactElement {
  const router = useRouter();

  // These states store the register form data.
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Each Animated.Value controls one raindrop movement.
  const rainAnimations = useRef<Animated.Value[]>(
    Array(NUMBER_OF_RAINDROPS)
      .fill(0)
      .map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Start a loop animation for every raindrop.
    const animations = rainAnimations.map((animValue) => {
      const duration = 800 + Math.random() * 1000;
      const delay = Math.random() * 2000;

      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return animation;
    });

    return () => animations.forEach((a) => a.stop());
  }, []);

  const handleRegister = async () => {
    // Basic validation before sending the request.
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Por favor rellena todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      // Send the new user data to the backend.
      const response = await axios.post("http://192.168.101.76:8000/users/", {
        email: email,
        password: password,
        full_name: name,
      });

      // On success, show a message and go back to login.
      if (response.status === 200 || response.status === 201) {
        Alert.alert("¡Éxito!", "Cuenta creada correctamente.", [
          {
            text: "Ir al Login",
            onPress: () => {
              router.replace("/");
            },
          },
        ]);
      }
    } catch (error: any) {
      // Show a specific message for backend errors or network errors.
      if (error.response) {
        const serverMessage = error.response.data.detail;

        if (serverMessage === "Email ya registrado") {
          Alert.alert(
            "Aviso",
            "Este correo ya tiene una cuenta. Prueba a iniciar sesión o usa otro correo.",
          );
        } else {
          Alert.alert(
            "Error",
            serverMessage || "Algo salió mal en el registro.",
          );
        }
      } else {
        Alert.alert(
          "Error de conexión",
          "No se pudo conectar con el servidor. Verifica tu Wi-Fi.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#020617"]}
      style={styles.container}
    >
      {/* Light status bar works better on this dark background. */}
      <StatusBar barStyle="light-content" />

      <Stack.Screen options={{ headerShown: false }} />

      {/* Background rain effect. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {rainAnimations.map((anim, index) => {
          const marginLeft = Math.random() * width;

          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, height + 50],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.raindrop,
                {
                  left: marginLeft,
                  transform: [{ translateY }],
                  opacity: 0.2 + Math.random() * 0.4,
                },
              ]}
            />
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button to return to the previous screen. */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
          </TouchableOpacity>

          {/* Screen title and short text. */}
          <View style={styles.header}>
            <Ionicons
              name="moon"
              size={70}
              color="#e2e8f0"
              style={styles.moonIcon}
            />
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>
              Únete a WeatherApp y prevé el tiempo
            </Text>
          </View>

          {/* Registration form fields and actions. */}
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#94a3b8"
                style={styles.icon}
              />
              <TextInput
                placeholder="Nombre completo"
                placeholderTextColor="#64748b"
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#94a3b8"
                style={styles.icon}
              />
              <TextInput
                placeholder="Correo electrónico"
                placeholderTextColor="#64748b"
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
                color="#94a3b8"
                style={styles.icon}
              />
              <TextInput
                placeholder="Contraseña"
                placeholderTextColor="#64748b"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="checkmark-done"
                size={20}
                color="#94a3b8"
                style={styles.icon}
              />
              <TextInput
                placeholder="Confirmar contraseña"
                placeholderTextColor="#64748b"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={handleRegister}
              disabled={loading}
            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                style={styles.buttonGradient}
              >
                {/* Show a loader while the account is being created. */}
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Registrarme</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/")}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>
                ¿Ya tienes cuenta?{" "}
                <Text style={styles.linkHighlight}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  raindrop: {
    position: "absolute",
    width: 2,
    height: 25,
    backgroundColor: "#60a5fa",
    borderRadius: 1,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 30,
  },
  moonIcon: {
    marginBottom: 10,
    textShadowColor: "rgba(226, 232, 240, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#f1f5f9",
    marginTop: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 5,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 18,
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#f1f5f9",
    fontSize: 16,
  },
  button: {
    height: 60,
    borderRadius: 16,
    marginTop: 15,
    overflow: "hidden",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    color: "#94a3b8",
    fontSize: 15,
  },
  linkHighlight: {
    color: "#60a5fa",
    fontWeight: "700",
  },
});
