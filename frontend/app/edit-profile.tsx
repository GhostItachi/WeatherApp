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

export default function EditProfileScreen() {
  const router = useRouter();

  // These states store the editable profile fields and request status.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // This state highlights the active input.
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // These animated values reuse the moving cloud background from the login screen.
  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  useEffect(() => {
    loadUserData();

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

  const loadUserData = async () => {
    // The current profile is loaded from the protected /users/me endpoint.
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await apiClient.get("/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFullName(response.data.full_name || "");
      setEmail(response.data.email || "");
      setBio(response.data.bio || "");
    } catch (e: any) {
      console.warn("Error cargando perfil:", e);
      if (e.response?.status === 401) router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    // The form is validated first, then the updated fields are sent to the backend.
    if (!fullName.trim() || !email.trim()) {
      Alert.alert("Error", "El nombre y email son obligatorios");
      return;
    }

    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      await apiClient.put(
        "/users/me",
        { full_name: fullName, email: email, bio: bio },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Alert.alert("Éxito", "Perfil actualizado correctamente");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", "No se pudo actualizar el perfil");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated clouds keep the same visual language as the auth screens. */}
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
          {/* This header explains the screen purpose and keeps the back action visible. */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={30} color="#1e293b" />
            </TouchableOpacity>
            <Ionicons name="person-circle" size={80} color="#3b82f6" />
            <Text style={styles.title}>Edita tu perfil</Text>
            <Text style={styles.subtitle}>
              Mantén tu información actualizada
            </Text>
          </View>

          {/* The form lets the user update name, email, and bio. */}
          <View style={styles.form}>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "name" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#64748b"
                style={styles.icon}
              />
              <TextInput
                placeholder="Nombre completo"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View
              style={[
                styles.inputWrapper,
                focusedField === "email" && styles.inputFocused,
              ]}
            >
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
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View
              style={[
                styles.inputWrapper,
                styles.bioWrapper,
                focusedField === "bio" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#64748b"
                style={[styles.icon, { marginTop: 18 }]}
              />
              <TextInput
                placeholder="Biografía"
                placeholderTextColor="#94a3b8"
                style={[
                  styles.input,
                  { textAlignVertical: "top", paddingTop: 18 },
                ]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                onFocus={() => setFocusedField("bio")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, updating && { opacity: 0.7 }]}
              onPress={handleUpdate}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  cloud: { position: "absolute", opacity: 0.5 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingVertical: 50,
  },
  header: { alignItems: "center", marginBottom: 30 },
  backBtn: { position: "absolute", left: -20, top: -20, padding: 10 },
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
  bioWrapper: { height: 120, alignItems: "flex-start" },
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
