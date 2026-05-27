import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../src/api/client";

export default function SettingsScreen() {
  const router = useRouter();

  const handleAction = (title: string) => {
    Alert.alert(
      "Función en desarrollo",
      `La opción ${title} estará disponible próximamente.`,
    );
  };

  const handleClearCache = async () => {
    try {
      const keysToRemove = [
        "user_data_cache",
        "location_weather_cache",
        "last_weather_description",
      ];

      await AsyncStorage.multiRemove(keysToRemove);

      Alert.alert(
        "Mantenimiento",
        "Se han eliminado los datos temporales. La próxima vez que entres a tu perfil, se descargarán datos frescos del servidor.",
        [{ text: "Entendido" }],
      );
    } catch {
      Alert.alert("Error", "No se pudo limpiar el caché local.");
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Acción Irreversible",
      "¿Realmente deseas eliminar tu cuenta? Todos tus datos se borrarán permanentemente de nuestros servidores.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar definitivamente",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("userToken");

              await apiClient.delete("/users/me", {
                headers: { Authorization: `Bearer ${token}` },
              });

              await AsyncStorage.clear();

              router.replace("/");
            } catch (error) {
              console.error(error);
              Alert.alert(
                "Error",
                "No se pudo eliminar la cuenta. Inténtalo más tarde.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#334155" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Configuración</Text>

        <View style={styles.headerPlaceholder} />
      </View>
      <ScrollView>
        <Text style={styles.sectionTitle}>Seguridad y Acceso</Text>
        <View style={styles.menuCard}>
          <SettingItem
            icon="key-outline"
            label="Cambiar Contraseña"
            onPress={() => router.push("/change-password")}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Verificación en dos pasos"
            onPress={() => handleAction("2FA")}
          />
        </View>

        <Text style={styles.sectionTitle}>Privacidad y Datos</Text>
        <View style={styles.menuCard}>
          <SettingItem
            icon="location-outline"
            label="Permisos de Ubicación"
            onPress={() => handleAction("Permisos")}
          />
          <SettingItem
            icon="trash-bin-outline"
            label="Limpiar Caché de la App"
            onPress={() => handleClearCache()}
          />
        </View>

        <Text style={styles.sectionTitle}>Información Legal</Text>
        <View style={styles.menuCard}>
          <SettingItem
            icon="document-text-outline"
            label="Términos y Condiciones"
            onPress={() => handleAction("Términos")}
          />
          <SettingItem
            icon="information-circle-outline"
            label="Acerca de la Aplicación"
            onPress={() => router.push("/about")}
          />
        </View>

        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Text style={[styles.sectionTitle, { color: "#f43f5e" }]}>
          Acciones de Cuenta
        </Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <View style={[styles.menuIcon]}>
              <Ionicons name="trash-outline" size={20} color="#f43f5e" />
            </View>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <Text style={[styles.menuText, { color: "#f43f5e" }]}>
              Eliminar Cuenta Permanente
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.footerVersion}>Build Version: 2.0.1-2026</Text>
          <Text style={styles.footerEnvironment}>
            Entorno: Production (v2.0)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SettingItem = ({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={20} color="#64748b" />
    </View>
    <Text style={styles.menuText}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#f8fafc",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  headerPlaceholder: {
    width: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    marginLeft: 25,
    marginTop: 25,
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuText: { flex: 1, fontSize: 15, color: "#334155", fontWeight: "500" },
  footerInfo: {
    marginTop: 40,
    marginBottom: 20,
    alignItems: "center",
  },
  footerVersion: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  footerEnvironment: {
    color: "#cbd5e1",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
