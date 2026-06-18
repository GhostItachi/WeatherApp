import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../src/api/client";
import { AppColors, COLORS } from "../src/constants/design";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Error", "Por favor ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/users/forgot-password", { email: email.trim() });

      // Navegamos a la siguiente pantalla pasando el correo como parámetro
      router.push({
        pathname: "/reset-password",
        params: { email: email.trim() },
      });
    } catch {
      // Incluso si falla por seguridad del backend, mostramos un mensaje genérico o el error
      Alert.alert(
        "Aviso",
        "Si el correo está registrado, recibirás un código.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={26} color={AppColors.slate900} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Ionicons
            name="lock-closed-outline"
            size={80}
            color={AppColors.blue500}
            style={styles.icon}
          />
          <Text style={styles.title}>Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa el correo electrónico asociado a tu cuenta y te enviaremos
            un código de 6 dígitos para restablecer tu acceso.
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={AppColors.slate400}
            />
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor={AppColors.slate400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar Código</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 15, paddingVertical: 10 },
  backBtn: { padding: 5 },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
    alignItems: "center",
  },
  icon: { marginBottom: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.slate900,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.slate500,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.offWhite,
    borderWidth: 1,
    borderColor: AppColors.slate200,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 20,
    width: "100%",
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: AppColors.slate900 },
  button: {
    backgroundColor: AppColors.blue500,
    borderRadius: 12,
    height: 55,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: AppColors.blue500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
