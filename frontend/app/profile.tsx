import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../src/api/client";
import { getWeatherTheme } from "../src/constants/themes";
import { WeatherBackground } from "../src/constants/weatherbg";
import { AppColors } from "../src/constants/design";
import { useAuth } from "../src/context/AuthContext";
import { useWeather } from "../src/context/WeatherContext";

const { width } = Dimensions.get("window");

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { logout } = useAuth();

  // WeatherContext provides location data instantly without recalculating it here.
  const { currentCity, weatherData } = useWeather();

  const initialProfileLoadedRef = useRef(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  const fetchFreshProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const response = await apiClient.get("/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData(response.data);
      await AsyncStorage.setItem(
        "user_data_cache",
        JSON.stringify(response.data),
      );
    } catch (error) {
      console.warn("Error refreshing profile:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFreshProfile();
    }, [fetchFreshProfile]),
  );

  const theme = getWeatherTheme(weatherData?.description);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/");
    } catch {
      Alert.alert("Error", "Could not log out");
    }
  }, [logout, router]);

  useEffect(() => {
    const initializeProfile = async () => {
      let hasDataInCache = false;

      try {
        const cachedUser = await AsyncStorage.getItem("user_data_cache");
        if (cachedUser) {
          try {
            setUserData(JSON.parse(cachedUser));
            hasDataInCache = true;
          } catch (e) {
            console.error("Corrupted user cache:", e);
            await AsyncStorage.removeItem("user_data_cache");
          }
        }

        if (cachedUser) setLoading(false);

        const token = await AsyncStorage.getItem("userToken");
        if (!token) return router.replace("/");

        const profileRes = await apiClient.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserData(profileRes.data);
        await AsyncStorage.setItem(
          "user_data_cache",
          JSON.stringify(profileRes.data),
        );
      } catch (error) {
        console.warn("Initialization error:", error);
        if (!hasDataInCache) {
          handleLogout();
        } else {
          Alert.alert("Warning", "Connection error. Showing local data.");
        }
      } finally {
        initialProfileLoadedRef.current = true;
        setLoading(false);
      }
    };

    initializeProfile();

    const loadUnitPreference = async () => {
      const savedUnit = await AsyncStorage.getItem("userUnit");
      if (savedUnit) setUnit(savedUnit as "metric" | "imperial");
    };
    loadUnitPreference();
  }, [router, handleLogout]);

  const formatLocalTemp = (tempValue: number | undefined) => {
    if (tempValue === undefined || tempValue === null) return "--";

    if (unit === "imperial") {
      const tempF = Math.round((tempValue * 9) / 5 + 32);
      return `${tempF}°F`;
    }
    return `${Math.round(tempValue)}°C`;
  };

  const toggleUnit = async (newUnit: "metric" | "imperial") => {
    setUnit(newUnit);
    await AsyncStorage.setItem("userUnit", newUnit);
  };

  const userEmail =
    userData?.email || userData?.username || "usuario@correo.com";
  const displayName = userEmail.includes("@")
    ? userEmail.split("@")[0]
    : userEmail;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loaderText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Text style={styles.topText}>Perfil</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient colors={theme.primary} style={[styles.headerGradient]}>
          <View style={styles.profileInfo}>
            <View style={styles.imageContainer}>
              <View style={styles.weatherBackgroundOpacity}>
                <WeatherBackground themeName={theme.name} />
              </View>
              <Image
                source={{
                  uri: userData?.profile_picture
                    ? `${apiClient.defaults.baseURL}${userData.profile_picture}`
                    : `https://ui-avatars.com/api/?name=${displayName}&background=fff&color=3b82f6`,
                }}
                style={styles.profileImage}
              />
              <View style={styles.statusBadge} />
            </View>
            <Text style={[styles.userName]}>
              {userData?.full_name || displayName}
            </Text>
            <View style={styles.locationTag}>
              <Ionicons name="mail" size={14} color="#d1d5db" />
              <Text style={styles.locationText}>{userEmail}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>
              {userData?.favorites?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Favoritos</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.tempText}>
              {formatLocalTemp(weatherData?.temperature)}
            </Text>
            <Text style={styles.statValueSmall} numberOfLines={1}>
              {currentCity !== "Buscando..."
                ? currentCity
                : weatherData?.city || "Sin datos"}
            </Text>
            <Text style={styles.statLabel}>Ubicación</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cloud-done-outline" size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>Online</Text>
            <Text style={styles.statLabel}>Estado</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biografía</Text>
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              {userData?.bio && userData.bio.trim() !== ""
                ? userData.bio
                : "Aún no has agregado una biografía. ¡Cuéntanos algo sobre ti!"}
            </Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/edit-profile")}
          >
            <View style={[styles.menuIcon]}>
              <Ionicons name="person-outline" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.menuText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={[styles.menuIcon]}>
              <Ionicons name="options-outline" size={22} color="#0ea5e9" />
            </View>
            <Text style={styles.menuText}>Unidades</Text>
            <View style={styles.unitToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.unitBtn,
                  unit === "metric" && styles.unitBtnActive,
                ]}
                onPress={() => toggleUnit("metric")}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    unit === "metric" && styles.unitBtnTextActive,
                  ]}
                >
                  °C
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitBtn,
                  unit === "imperial" && styles.unitBtnActive,
                ]}
                onPress={() => toggleUnit("imperial")}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    unit === "imperial" && styles.unitBtnTextActive,
                  ]}
                >
                  °F
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.lastMenuItem} onPress={handleLogout}>
            <View style={[styles.menuIcon]}>
              <Ionicons name="log-out-outline" size={22} color="#f43f5e" />
            </View>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.offWhite,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  headerGradient: {
    overflow: "hidden",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 20,
    marginBottom: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    backgroundColor: "transparent",
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
    backgroundColor: AppColors.emerald500,
    borderWidth: 3,
    borderColor: AppColors.blue500,
  },
  userName: {
    textTransform: "capitalize",
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
    color: AppColors.gray300,
    marginLeft: 5,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: -30,
  },
  statCard: {
    backgroundColor: "#fff",
    width: width * 0.28,
    paddingVertical: 15,
    paddingHorizontal: 5,
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
    color: AppColors.slate900,
    marginTop: 8,
  },
  tempText: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.emerald500,
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.slate900,
    marginTop: 8,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.slate500,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 10,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.slate900,
    marginBottom: 10,
  },
  bioContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.blue500,
    elevation: 2,
  },
  bioText: {
    color: AppColors.slate600,
    lineHeight: 22,
    fontSize: 15,
  },
  menuSection: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginTop: 25,
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 40,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.slate100,
  },
  menuIcon: {
    backgroundColor: AppColors.lightBlue,
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
    color: AppColors.slate700,
  },
  unitToggleContainer: {
    flexDirection: "row",
    backgroundColor: AppColors.slate100,
    borderRadius: 10,
    padding: 4,
  },
  unitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  unitBtnActive: {
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  unitBtnText: {
    fontSize: 12,
    color: AppColors.slate500,
  },
  unitBtnTextActive: {
    color: AppColors.sky500,
    fontWeight: "bold",
  },
  locationContainer: {
    alignItems: "center",
  },
  topText: {
    fontSize: 18,
    fontWeight: "bold",
    color: AppColors.sky900,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: AppColors.offWhite,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    color: AppColors.slate500,
  },
  weatherBackgroundOpacity: {
    opacity: 0.4,
  },
  lastMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 0,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: AppColors.rose500,
  },
});
