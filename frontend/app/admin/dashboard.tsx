import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../src/context/AuthContext";
import apiClient from "../../src/api/client";

interface SystemStats {
  total_users: number;
  total_favorites: number;
  system_status: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { authState, userRole, isLoading } = useAuth();

  // Metrics and logs are loaded from admin-only backend endpoints.
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Logs del Sistema");
  const [isApiView, setIsApiView] = useState(false);

  // The same modal renders either authentication logs or technical API logs.
  const fetchLogs = async (type: "auth" | "api") => {
    setLoadingLogs(true);
    setIsApiView(type === "api");
    setModalTitle(
      type === "api" ? "Consola de Peticiones API" : "Auditoría de Accesos",
    );

    try {
      const response = await apiClient.get(`/users/logs?type=${type}`);
      setLogs(response.data);
      setShowLogsModal(true);
    } catch {
      console.warn(`Error al obtener logs de tipo: ${type}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!isLoading && userRole !== "admin") {
      router.replace("/home");
    }
  }, [isLoading, router, userRole]);

  const fetchStats = useCallback(async () => {
    if (!authState.token || userRole !== "admin") {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const response = await apiClient.get("/users/stats");
      setStats(response.data);
    } catch (error: any) {
      console.warn("Error al obtener métricas:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authState.token, userRole]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (isLoading || loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loaderText}>Cargando consola de admin...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel de Control</Text>
        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
      >
        <Text style={styles.welcomeText}>Estado del Sistema</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <View style={[styles.iconBox, { backgroundColor: "#e0e7ff" }]}>
              <Ionicons name="people" size={24} color="#4f46e5" />
            </View>
            <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
            <Text style={styles.statLabel}>Usuarios Totales</Text>
          </View>

          <View style={styles.statCard}>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <View style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="heart" size={24} color="#d97706" />
            </View>
            <Text
              style={
                stats?.total_favorites
                  ? styles.statValue
                  : styles.statValueEmpty
              }
            >
              {stats?.total_favorites || 0}
            </Text>
            <Text style={styles.statLabel}>Favoritos Guardados</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Gestión Global</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => fetchLogs("auth")}
        >
          <LinearGradient
            colors={["#1e293b", "#0f172a"]}
            style={styles.actionGradient}
          >
            <Ionicons name="shield-checkmark" size={22} color="#22c55e" />
            <Text style={styles.actionText}>Auditoría de Accesos</Text>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => fetchLogs("api")}
        >
          <LinearGradient
            colors={["#1e293b", "#0f172a"]}
            style={styles.actionGradient}
          >
            {loadingLogs && isApiView ? (
              <ActivityIndicator size="small" color="#0ea5e9" />
            ) : (
              <>
                <Ionicons name="terminal" size={22} color="#0ea5e9" />
                <Text style={styles.actionText}>Logs de peticiones API</Text>
                <Ionicons name="chevron-forward" size={18} color="#475569" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showLogsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isApiView && styles.modalContentTerminal,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  isApiView && styles.modalTitleTerminal,
                ]}
              >
                {modalTitle}
              </Text>
              <TouchableOpacity onPress={() => setShowLogsModal(false)}>
                <Ionicons
                  name="close-circle"
                  size={28}
                  color={isApiView ? "#22c55e" : "#94a3b8"}
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {logs.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay registros disponibles
                </Text>
              ) : (
                logs.map((log) => (
                  <View
                    key={log.id}
                    style={[
                      styles.logItem,
                      isApiView && styles.logItemTerminal,
                    ]}
                  >
                    <View
                      style={[
                        styles.logDot,
                        // eslint-disable-next-line react-native/no-inline-styles
                        {
                          backgroundColor:
                            log.level === "AUTH"
                              ? "#22c55e"
                              : log.level === "ERROR"
                                ? "#ef4444"
                                : "#0ea5e9",
                        },
                      ]}
                    />
                    <View style={styles.logInfoContainer}>
                      <Text
                        style={[
                          styles.logMessage,
                          isApiView && styles.logMessageTerminal,
                        ]}
                      >
                        {log.message}
                      </Text>
                      <Text style={styles.logSubtext}>
                        {log.user_email || "Sistema"} •{" "}
                        {new Date(log.created_at).toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  loaderText: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  backButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },
  statusText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: "#1e293b",
    width: "48%",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    marginTop: 10,
  },
  actionItem: {
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
  },
  actionText: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 15,
    marginLeft: 15,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "85%",
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#f8fafc",
  },
  logItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  logMessage: {
    fontSize: 15,
    color: "#f1f5f9",
    fontWeight: "600",
    marginBottom: 4,
  },
  logSubtext: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "monospace",
  },
  modalContentTerminal: {
    backgroundColor: "#000",
    borderColor: "#1e293b",
  },
  modalTitleTerminal: {
    color: "#22c55e",
    fontFamily: "monospace",
  },
  logItemTerminal: {
    backgroundColor: "#0a0a0a",
    borderLeftWidth: 2,
    borderLeftColor: "#22c55e",
  },
  logMessageTerminal: {
    color: "#22c55e",
    fontFamily: "monospace",
    fontSize: 13,
  },
  logInfoContainer: {
    flex: 1,
  },
  emptyText: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  statValueEmpty: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#475569",
  },
});
