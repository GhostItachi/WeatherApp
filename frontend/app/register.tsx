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
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Configuración de la lluvia
const NUMBER_OF_RAINDROPS = 40; // Cuántas gotas/hilos de lluvia

export default function RegisterScreen(): React.ReactElement {
  const router = useRouter();

  // Estados del formulario con tipado
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Referencia para las animaciones de lluvia
  const rainAnimations = useRef<Animated.Value[]>(
    Array(NUMBER_OF_RAINDROPS)
      .fill(0)
      .map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    // Función para crear la animación de cada gota
    const animateRaindrop = (animValue: Animated.Value, index: number) => {
      // Aleatoriedad para que no caigan todas a la vez
      const duration = 800 + Math.random() * 1000; // Velocidad aleatoria
      const delay = Math.random() * 2000; // Retraso inicial aleatorio

      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1, // Final de la caída
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0, // Reinicio instantáneo arriba
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    // Iniciar animaciones para todas las gotas
    rainAnimations.forEach((anim, index) => animateRaindrop(anim, index));
  }, [rainAnimations]);

  return (
    <LinearGradient
      // Colores de noche profunda profesional
      colors={["#0f172a", "#1e293b", "#020617"]}
      style={styles.container}
    >
      {/* Ajustar barra de estado para fondo oscuro */}
      <StatusBar barStyle="light-content" />

      {/* Oculta el header de Expo Router */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Capa de Lluvia Animada */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {rainAnimations.map((anim, index) => {
          // Posición horizontal aleatoria para cada gota
          const marginLeft = Math.random() * width;

          // Interpolación para mover la gota de arriba a abajo
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, height + 50], // Empieza fuera arriba, termina fuera abajo
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.raindrop,
                {
                  left: marginLeft,
                  transform: [{ translateY }],
                  // Opacidad aleatoria para profundidad
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
          {/* Botón Volver (Flecha) */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
          </TouchableOpacity>

          <View style={styles.header}>
            {/* Ícono de Luna para temática de Noche */}
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

          <View style={styles.form}>
            {/* Campo Nombre */}
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

            {/* Campo Correo */}
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

            {/* Campo Contraseña */}
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

            {/* Campo Confirmar Contraseña */}
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

            {/* Botón Registro (Contraste con el Login) */}
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={() => console.log("Registro intentado")}
            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]} // Degradado azul en el botón para que resalte
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Registrarme</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/")} // Asumiendo que "/" es el login
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
    paddingTop: Platform.OS === "ios" ? 60 : 40, // Espacio para el notch/status bar
    paddingBottom: 40,
  },
  raindrop: {
    position: "absolute",
    width: 2, // Lluvia fina profesional
    height: 25, // Longitud de la gota
    backgroundColor: "#60a5fa", // Azul claro brillante
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
    marginTop: 30, // Espacio extra por el botón volver
  },
  moonIcon: {
    marginBottom: 10,
    // Brillo sutil en la luna
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
    // Fondo translúcido (Glassmorphism)
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 18,
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)", // Borde casi invisible
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#f1f5f9", // Texto claro
    fontSize: 16,
  },
  button: {
    height: 60,
    borderRadius: 16,
    marginTop: 15,
    overflow: "hidden", // Necesario para el degradado redondeado
    shadowColor: "#3b82f6", // Sombra azul para que parezca que brilla
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
    color: "#60a5fa", // Azul claro para el enlace
    fontWeight: "700",
  },
});
