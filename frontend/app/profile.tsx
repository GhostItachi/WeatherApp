import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();

  // Datos simulados (esto vendría de tu lógica de estado/backend)
  const user = {
    name: "Alex Storm",
    email: "alex.weather@example.com",
    bio: "Entusiasta de la meteorología y cazador de tormentas aficionado. Siempre buscando el sol.",
    location: "Madrid, ES",
    memberSince: "Abril 2024",
    reports: 124,
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con gradiente y Foto */}
        <LinearGradient
          colors={["#3b82f6", "#60a5fa"]}
          style={styles.headerGradient}
        >
          <View style={styles.topButtons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?u=alex" }}
                style={styles.profileImage}
              />
              <View style={styles.statusBadge} />
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <View style={styles.locationTag}>
              <Ionicons name="location" size={14} color="#d1d5db" />
              <Text style={styles.locationText}>{user.location}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Estadísticas de Usuario (Estilo Clima) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="thunderstorm-outline" size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>{user.reports}</Text>
            <Text style={styles.statLabel}>Reportes</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={24} color="#10b981" />
            <Text style={styles.statNumber}>2y</Text>
            <Text style={styles.statLabel}>Antigüedad</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#f59e0b"
            />
            <Text style={styles.statNumber}>Pro</Text>
            <Text style={styles.statLabel}>Nivel</Text>
          </View>
        </View>

        {/* Sección de Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biografía</Text>
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        </View>

        {/* Menú de Opciones */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="person-outline" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.menuText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#ecfdf5" }]}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#10b981"
              />
            </View>
            <Text style={styles.menuText}>Notificaciones de Clima</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.menuIcon, { backgroundColor: "#fff1f2" }]}>
              <Ionicons name="log-out-outline" size={22} color="#f43f5e" />
            </View>
            <Text style={[styles.menuText, { color: "#f43f5e" }]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerGradient: {
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    alignItems: "center",
    marginTop: 10,
  },
  imageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  statusBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10b981",
    borderWidth: 3,
    borderColor: "#3b82f6",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 15,
  },
  locationTag: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    opacity: 0.9,
  },
  locationText: {
    color: "#d1d5db",
    marginLeft: 5,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: -30, // Eleva las tarjetas sobre el gradiente
  },
  statCard: {
    backgroundColor: "#fff",
    width: width * 0.27,
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 25,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 10,
  },
  bioContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  bioText: {
    color: "#475569",
    lineHeight: 22,
    fontSize: 15,
  },
  menuSection: {
    backgroundColor: "#fff",
    marginHorizontal: 25,
    marginTop: 25,
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 40,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
  },
});
