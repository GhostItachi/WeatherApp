import React, { useEffect, useState, useCallback } from "react";
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
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../src/api/client";
import * as Location from "expo-location";
import { getWeatherTheme } from "../src/constants/themes";
const { width } = Dimensions.get("window");

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();

  // userData stores the profile returned by the backend.
  const [userData, setUserData] = useState<any>(null);
  // loading controls the first profile load.
  const [loading, setLoading] = useState<boolean>(true);
  // currentCity stores the city name from device reverse geocoding.
  const [currentCity, setCurrentCity] = useState<string>("Buscando...");
  // locationData stores the local weather summary shown in the stats card.
  const [locationData, setLocationData] = useState({
    city: "Cargando...",
    temp: "--",
    description: "",
  });
  const [themeDesc, setThemeDesc] = useState("");
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");

  const fetchFreshProfile = async () => {
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
      console.warn("Error al refrescar perfil:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const syncThemeAndData = async () => {
        // On focus, the screen restores the latest weather description for theming.
        const lastDesc = await AsyncStorage.getItem("last_weather_description");

        if (lastDesc) {
          setThemeDesc(lastDesc);
        } else {
          // The cached weather object is used as a fallback if the direct value is missing.
          const cachedLoc = await AsyncStorage.getItem(
            "location_weather_cache",
          );
          if (cachedLoc) {
            const parsed = JSON.parse(cachedLoc);
            setThemeDesc(parsed.description || "");
          }
        }
      };

      syncThemeAndData();

      if (!loading) {
        fetchFreshProfile();
      }
    }, [loading]),
  );
  const currentTheme = getWeatherTheme(themeDesc);

  // First load uses cache for speed and then refreshes the profile and local weather.
  useEffect(() => {
    const initializeProfile = async () => {
      // Cache is tracked so the app can avoid logging out on temporary failures.
      let hasDataInCache = false;

      try {
        // Cached data is shown first to make the screen feel faster.
        const [cachedUser, cachedLoc] = await Promise.all([
          AsyncStorage.getItem("user_data_cache"),
          AsyncStorage.getItem("location_weather_cache"),
        ]);

        if (cachedUser) {
          setUserData(JSON.parse(cachedUser));
          hasDataInCache = true;
        }
        if (cachedLoc) setLocationData(JSON.parse(cachedLoc));

        // When cache exists, the main loader can stop before the network finishes.
        if (cachedUser) setLoading(false);

        const token = await AsyncStorage.getItem("userToken");
        if (!token) return router.replace("/");

        // The profile request runs in parallel with the local weather flow.
        const profilePromise = apiClient.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const freshLocationData = await fetchUnifiedLocationAndWeather();

        const profileRes = await profilePromise;

        setUserData(profileRes.data);

        if (freshLocationData) {
          if (freshLocationData.errorType === "permission_denied") {
            Alert.alert(
              "Permisos necesarios",
              "La app necesita acceso a la ubicación para mostrar el clima local.",
            );
          }

          setCurrentCity(freshLocationData.cityName);

          if (freshLocationData.weather) {
            setLocationData({
              city: freshLocationData.weather.city,
              temp: freshLocationData.weather.temp,
              description: freshLocationData.weather.description,
            });
            setThemeDesc(freshLocationData.weather.description);

            await AsyncStorage.setItem(
              "location_weather_cache",
              JSON.stringify(freshLocationData.weather),
            );
          }
        }

        await AsyncStorage.setItem(
          "user_data_cache",
          JSON.stringify(profileRes.data),
        );
      } catch (error) {
        console.warn("Initialization error:", error);
        // Logout is used only when there is no cached profile to display.
        if (!hasDataInCache) {
          handleLogout();
        } else {
          Alert.alert("Aviso", "Error de conexión. Mostrando datos locales.");
        }
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();

    const loadUnitPreference = async () => {
      const savedUnit = await AsyncStorage.getItem("userUnit");
      if (savedUnit) setUnit(savedUnit as "metric" | "imperial");
    };
    loadUnitPreference();
  }, []);

  // This result type makes location failures easier to handle in the UI.
  interface UnifiedLocationResult {
    cityName: string;
    weather: { city: string; temp: string; description: string } | null;
    errorType:
      | "none"
      | "permission_denied"
      | "location_failed"
      | "partial_success"
      | "unknown";
  }

  // This helper resolves city name and weather in one location request flow.
  const fetchUnifiedLocationAndWeather =
    async (): Promise<UnifiedLocationResult> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return {
            cityName: "Sin Permisos",
            weather: null,
            errorType: "permission_denied",
          };
        }

        const location = await Location.getCurrentPositionAsync({}).catch(
          () => null,
        );
        if (!location) {
          return {
            cityName: "Ubicación desactivada",
            weather: null,
            errorType: "location_failed",
          };
        }

        const { latitude, longitude } = location.coords;

        const results = await Promise.allSettled([
          Location.reverseGeocodeAsync({ latitude, longitude }),
          apiClient.get("/weather/current-coord", {
            params: { lat: latitude, lon: longitude },
          }),
        ]);

        let cityName = "Desconocida";
        let weatherData = null;
        let hasError = false;

        // Geocoding and weather are handled separately so one failure does not block the other.
        if (results[0].status === "fulfilled") {
          const geocode = results[0].value;
          if (geocode && geocode.length > 0) {
            cityName =
              geocode[0].city ||
              geocode[0].subregion ||
              geocode[0].region ||
              "Desconocida";
          }
        } else {
          console.warn("Geocoding failed:", results[0].reason);
          cityName = "Error de nombre";
          hasError = true;
        }

        if (results[1].status === "fulfilled") {
          const res = results[1].value;
          weatherData = {
            city: res.data.city,
            temp: `${Math.round(res.data.temperature)}°C`,
            description: res.data.description,
          };
          setThemeDesc(res.data.description);
        } else {
          console.warn("Weather API failed:", results[1].reason);
          hasError = true;
        }

        return {
          cityName,
          weather: weatherData,
          errorType: hasError ? "partial_success" : "none",
        };
      } catch (e) {
        console.warn("Error in unified location flow:", e);
        return { cityName: "Error", weather: null, errorType: "unknown" };
      }
    };

  const formatLocalTemp = (tempStr: string) => {
    if (tempStr === "--") return "--";
    // The cached value is a string like "25°C", so the numeric part is extracted first.
    const numericTemp = parseInt(tempStr);
    if (isNaN(numericTemp)) return tempStr;

    if (unit === "imperial") {
      const tempF = Math.round((numericTemp * 9) / 5 + 32);
      return `${tempF}°F`;
    }
    return `${numericTemp}°C`;
  };

  const handleLogout = async () => {
    try {
      // Logout removes the token and returns the user to the login screen.
      await AsyncStorage.removeItem("userToken");
      router.replace("/");
    } catch (e) {
      Alert.alert("Error", "No se pudo cerrar la sesión");
    }
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
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        {/* A simple loader is shown while the profile screen is still preparing data. */}
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: "#64748b" }}>
          Cargando perfil y ubicación...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* The header shows the user identity and quick navigation actions. */}
        <LinearGradient
          colors={currentTheme.primary}
          style={styles.headerGradient}
        >
          <View style={styles.topButtons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color="#000000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/settings")}
            >
              <Ionicons name="settings-outline" size={24} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: `https://ui-avatars.com/api/?name=${displayName}&background=fff&color=3b82f6`,
                }}
                style={styles.profileImage}
              />
              <View style={styles.statusBadge} />
            </View>
            <Text style={[styles.userName, { textTransform: "capitalize" }]}>
              {userData?.full_name || displayName}
            </Text>
            <View style={styles.locationTag}>
              <Ionicons name="mail" size={14} color="#d1d5db" />
              <Text style={styles.locationText}>{userEmail}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* These cards summarize favorites, local weather, and account status. */}
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
              {formatLocalTemp(locationData.temp)}
            </Text>
            {/* currentCity has priority because it comes from reverse geocoding. */}
            <Text style={styles.statValueSmall} numberOfLines={1}>
              {currentCity !== "Buscando..." ? currentCity : locationData.city}
            </Text>
            <Text style={styles.statLabel}>Ubicación</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cloud-done-outline" size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>Online</Text>
            <Text style={styles.statLabel}>Estado</Text>
          </View>
        </View>

        {/* This section shows the saved biography or a fallback message. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biografía</Text>
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              {userData?.bio && userData.bio.trim() !== ""
                ? userData.bio
                : "No has añadido una biografía todavía. ¡Cuéntanos algo sobre ti!"}
            </Text>
          </View>
        </View>

        {/* The menu gives access to profile editing, units, and logout. */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/edit-profile")}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="person-outline" size={22} color="#3b82f6" />
            </View>
            <Text style={styles.menuText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: "#f0f9ff" }]}>
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

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
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
    color: "#1e293b",
    marginTop: 8,
  },
  tempText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10b981",
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 8,
    textAlign: "center",
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
  unitToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
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
    color: "#64748b",
  },
  unitBtnTextActive: {
    color: "#0ea5e9",
    fontWeight: "bold",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 12,
  },
  settingLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    marginLeft: 12,
  },
});
