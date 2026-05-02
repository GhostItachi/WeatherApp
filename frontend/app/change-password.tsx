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
import apiClient from "../src/api/client";

const { width, height } = Dimensions.get("window");

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  useEffect(() => {
    const animateCloud = (
      animValue: Animated.Value,
      duration: number,
      delay: number = 0,
    ) => {
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
  }, []);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Error",
        "La nueva contraseña y la confirmación no coinciden",
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Error",
        "La nueva contraseña debe tener al menos 6 caracteres",
      );
      return;
    }

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      await apiClient.post(
        "/users/change-password",
        { old_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Alert.alert("Éxito", "Contraseña actualizada correctamente");
      router.back();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.detail || "No se pudo actualizar la contraseña";
      Alert.alert("Error", errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

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
            <Text style={styles.title}>Seguridad</Text>
            <Text style={styles.subtitle}>
              Actualiza tu contraseña de acceso
            </Text>
          </View>

          <View style={styles.form}>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "current" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#64748b"
                style={styles.icon}
              />
              <TextInput
                placeholder="Contraseña actual"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                onFocus={() => setFocusedField("current")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View
              style={[
                styles.inputWrapper,
                focusedField === "new" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="key-outline"
                size={20}
                color="#64748b"
                style={styles.icon}
              />
              <TextInput
                placeholder="Nueva contraseña"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                onFocus={() => setFocusedField("new")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View
              style={[
                styles.inputWrapper,
                focusedField === "confirm" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#64748b"
                style={styles.icon}
              />
              <TextInput
                placeholder="Confirmar nueva contraseña"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, updating && { opacity: 0.7 }]}
              onPress={handleUpdatePassword}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Actualizar Contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  cloud: { position: "absolute", opacity: 0.5 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingVertical: 50,
  },
  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 30, fontWeight: "900", color: "#1e293b", marginTop: 10 },
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputFocused: { borderColor: "#3b82f6", backgroundColor: "#fff" },
  icon: { marginRight: 12 },
  input: { flex: 1, color: "#1e293b", fontSize: 16 },
  button: {
    backgroundColor: "#0f172a",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
});
