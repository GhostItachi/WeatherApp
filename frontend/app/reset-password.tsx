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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../src/api/client";
import { AppColors, COLORS } from "../src/constants/design";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); // Capturamos el correo de la pantalla anterior

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/users/reset-password", {
        email: email,
        token: code.toUpperCase(), // Aseguramos que coincida con el formato del backend
        new_password: newPassword,
      });

      Alert.alert("Éxito", "Tu contraseña ha sido actualizada correctamente.", [
        { text: "Ir al Login", onPress: () => router.replace("/") }, // Ajusta la ruta a tu login
      ]);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "No se pudo actualizar la contraseña.";
      Alert.alert("Error", errorMessage);
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
          <Text style={styles.title}>Crea una nueva contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa el código de 6 dígitos que enviamos a {email} y define tu
            nueva contraseña.
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="keypad-outline"
              size={20}
              color={AppColors.slate400}
            />
            <TextInput
              style={styles.input}
              placeholder="Código de 6 dígitos"
              placeholderTextColor={AppColors.slate400}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={6}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={AppColors.slate400}
            />
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              placeholderTextColor={AppColors.slate400}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={AppColors.slate400}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={AppColors.slate400}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor={AppColors.slate400}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Actualizar Contraseña</Text>
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
  content: { flex: 1, paddingHorizontal: 25, paddingTop: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.slate900,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.slate500,
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
    marginBottom: 15,
    width: "100%",
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: AppColors.slate900 },
  button: {
    backgroundColor: AppColors.blue500,
    borderRadius: 12,
    height: 55,
    width: "100%",
    marginTop: 10,
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
