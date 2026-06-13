import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import apiClient from "../src/api/client";

const { width, height } = Dimensions.get("window");

export default function EditProfileScreen() {
  const router = useRouter();

  // These states store the editable profile fields and request status.
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  // Image state tracks both the preview URL and the file selected for upload.
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newImageSelected, setNewImageSelected] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // This state highlights the active input.
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // These animated values reuse the moving cloud background from the login screen.
  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  const loadUserData = useCallback(async () => {
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

      if (response.data.profile_picture) {
        // Backend avatar paths are relative, so the API base URL is prepended.
        const baseURL = apiClient.defaults.baseURL || "";
        setProfileImage(`${baseURL}${response.data.profile_picture}`);
      }
    } catch (e: any) {
      console.warn("Error cargando perfil:", e);
      if (e.response?.status === 401) router.replace("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

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
  }, [cloud1Anim, cloud2Anim, loadUserData]);

  // The image picker returns a local URI that can be sent as multipart form data.
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a tu galería para cambiar la foto.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);

      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      setNewImageSelected({ uri, type, name: filename });
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

      // Avatar upload runs before profile text updates so both changes persist.
      if (newImageSelected) {
        const formData = new FormData();
        formData.append("file", {
          uri: newImageSelected.uri,
          name: newImageSelected.name,
          type: newImageSelected.type,
        } as any);

        await apiClient.post("/users/me/avatar", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      await apiClient.put(
        "/users/me",
        { full_name: fullName, email: email, bio: bio },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      Alert.alert("Éxito", "Perfil actualizado correctamente");
      router.back();
    } catch {
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

  const displayName = email.includes("@") ? email.split("@")[0] : "Usuario";
  const defaultAvatar = `https://ui-avatars.com/api/?name=${fullName || displayName}&background=fff&color=3b82f6`;

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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
              <Image
                source={{ uri: profileImage || defaultAvatar }}
                style={styles.profileImage}
              />
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={styles.title}>Edita tu perfil</Text>
            <Text style={styles.subtitle}>
              Mantén tu información actualizada
            </Text>
          </View>

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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  cloud: { position: "absolute", opacity: 0.5 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingVertical: 50,
  },
  header: { alignItems: "center", marginBottom: 30 },

  imageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#3b82f6",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3b82f6",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f8fafc",
  },

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
