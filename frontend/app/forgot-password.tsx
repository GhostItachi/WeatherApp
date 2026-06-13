import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../src/api/client";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email) {
      Alert.alert("Error", "Por favor ingresa tu correo.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/request-password-reset", { email });
      Alert.alert(
        "Éxito",
        "Revisa tu correo para continuar con la recuperación.",
      );
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={26} color="#1e293b" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons name="mail-unread-outline" size={80} color="#3b82f6" />
        <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
        <Text style={styles.subtitle}>
          Ingresa tu correo y te enviaremos las instrucciones.
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Email address"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRequestReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enviar instrucciones</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", padding: 20 },
  backBtn: { marginTop: 40, marginBottom: 20 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginTop: 20 },
  subtitle: { color: "#64748b", textAlign: "center", marginVertical: 10 },
  inputWrapper: {
    width: "100%",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
  },
  input: { fontSize: 16 },
  button: {
    width: "100%",
    backgroundColor: "#0f172a",
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
