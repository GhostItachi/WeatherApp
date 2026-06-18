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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../src/api/client";
import { AppColors, COLORS } from "../src/constants/design";

export default function VerifyAccountScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length < 6) {
      Alert.alert("Error", "Ingresa el código completo de 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/users/verify", {
        email: email,
        code: code.toUpperCase(),
      });

      Alert.alert(
        "¡Cuenta activada!",
        "Ya puedes iniciar sesión con tus credenciales.",
        [
          {
            text: "Ir al Login",
            onPress: () =>
              router.replace({ pathname: "/", params: { registered: "true" } }),
          },
        ],
      );
    } catch (error: any) {
      const serverMessage =
        error.response?.data?.detail || "No se pudo verificar la cuenta.";
      Alert.alert("Error", serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="mail-unread-outline"
          size={80}
          color={AppColors.blue500}
          style={{ marginBottom: 20 }}
        />
        <Text style={styles.title}>Confirma tu cuenta</Text>
        <Text style={styles.subtitle}>
          Hemos enviado un código de activación a {email}. Ingrésalo a
          continuación.
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

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Activar Cuenta</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
    alignItems: "center",
  },
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
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: AppColors.slate900,
    textAlign: "center",
    letterSpacing: 5,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: AppColors.blue500,
    borderRadius: 12,
    height: 55,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
