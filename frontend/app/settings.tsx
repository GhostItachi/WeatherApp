import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const router = useRouter();

  const handleAction = (title: string) => {
    // Most settings are placeholders for future work, so this shows a simple message.
    Alert.alert(
      "Función en desarrollo",
      `La opción ${title} estará disponible próximamente.`,
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Eliminar Cuenta",
      "¿Estás seguro de que deseas eliminar tu cuenta de forma permanente? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => console.log("Cuenta eliminada"),
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

        {/* This empty view keeps the title centered in the header row. */}
        <View style={styles.headerPlaceholder} />
      </View>
      <ScrollView>
        {/* Security actions group account protection options. */}
        <Text style={styles.sectionTitle}>Seguridad y Acceso</Text>
        <View style={styles.menuCard}>
          <SettingItem
            icon="key-outline"
            label="Cambiar Contraseña"
            onPress={() => handleAction("Cambiar Contraseña")}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            label="Verificación en dos pasos"
            onPress={() => handleAction("2FA")}
          />
        </View>

        {/* Privacy actions group device and local app data options. */}
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
            onPress={() => handleAction("Limpiar Caché")}
          />
        </View>

        {/* Legal actions group informational pages about the app. */}
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
            onPress={() => handleAction("Acerca de")}
          />
        </View>

        {/* This section isolates destructive account actions. */}
        <Text style={[styles.sectionTitle, { color: "#f43f5e" }]}>
          Acciones de Cuenta
        </Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#fff1f2" }]}>
              <Ionicons name="trash-outline" size={20} color="#f43f5e" />
            </View>
            <Text style={[styles.menuText, { color: "#f43f5e" }]}>
              Eliminar Cuenta Permanente
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>
          Versión 1.0.2 - Proyecto Ingeniería
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// This small helper keeps the settings rows consistent.
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
  versionText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 40,
    marginBottom: 20,
  },
});
