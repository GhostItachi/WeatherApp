import React, { useEffect, useState } from "react";
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
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../src/api/client";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();

  // userData stores the profile returned by the backend.
  const [userData, setUserData] = useState<any>(null);
  // loading controls the first loading screen.
  const [loading, setLoading] = useState<boolean>(true);
  // currentCity stores the device city name from reverse geocoding.
  const [currentCity, setCurrentCity] = useState<string>("Buscando...");
  // locationData stores the weather summary shown in the stats card.
  const [locationData, setLocationData] = useState({
    city: "Cargando...",
    temp: "--",
  });

  // Initialization logic
  useEffect(() => {
    const initializeProfile = async () => {
      // Track cache existence to prevent accidental logouts
      let hasDataInCache = false;

      try {
        // 1. Load cached profile data first for immediate visual feedback.
        const [cachedUser, cachedLoc] = await Promise.all([
          AsyncStorage.getItem("user_data_cache"),
          AsyncStorage.getItem("location_weather_cache"),
        ]);

        if (cachedUser) {
          setUserData(JSON.parse(cachedUser));
          hasDataInCache = true;
        }
        if (cachedLoc) setLocationData(JSON.parse(cachedLoc));

        // If we have cache, we can stop showing the main spinner.
        if (cachedUser) setLoading(false);

        // 2. Token validation.
        const token = await AsyncStorage.getItem("userToken");
        if (!token) return router.replace("/");

        // 3. Fetch data using a single location request to optimize performance.
        const profilePromise = apiClient.get("/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const freshLocationData = await fetchUnifiedLocationAndWeather();

        const profileRes = await profilePromise;

        // 4. Update state and persistence with fresh data.
        setUserData(profileRes.data);

        // -Improved handling based on the new errorType
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
            });

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
        console.error("Initialization error:", error);
        // Only logout if there's no cached data to show
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
  }, []);

  // Added a more explicit return structure to handle different failure modes
  // Helper to distinguish between permission, network or geocoding errors.
  interface UnifiedLocationResult {
    cityName: string;
    weather: { city: string; temp: string } | null;
    errorType:
      | "none"
      | "permission_denied"
      | "location_failed"
      | "partial_success"
      | "unknown";
  }

  // Helper to get location, city name and weather in one flow
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

        // Handle Geocoding result independently
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
          console.error("Geocoding failed:", results[0].reason);
          cityName = "Error de nombre";
          hasError = true;
        }

        // Handle Weather API result independently
        if (results[1].status === "fulfilled") {
          const res = results[1].value;
          weatherData = {
            city: res.data.city,
            temp: `${Math.round(res.data.temperature)}°C`,
          };
        } else {
          console.error("Weather API failed:", results[1].reason);
          hasError = true;
        }

        return {
          cityName,
          weather: weatherData,
          errorType: hasError ? "partial_success" : "none",
        };
      } catch (e) {
        console.error("Error in unified location flow:", e);
        return { cityName: "Error", weather: null, errorType: "unknown" };
      }
    };

  const handleLogout = async () => {
    try {
      // Remove the token and send the user back to the login screen.
      await AsyncStorage.removeItem("userToken");
      router.replace("/");
    } catch (e) {
      Alert.alert("Error", "No se pudo cerrar la sesión");
    }
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
        {/* Show a spinner while profile and location data are loading. */}
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ marginTop: 10, color: "#64748b" }}>
          Cargando perfil y ubicación...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with avatar, user name, and quick buttons. */}
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

        {/* These cards show favorites, local weather, and status. */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>
              {userData?.favorites?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Favoritos</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.tempText}>{locationData.temp}</Text>
            {/* Using currentCity to show the geocoded city name */}
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

        {/* Short biography section. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biografía</Text>
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              Entusiasta de la meteorología y cazador de tormentas aficionado.
              Siempre buscando el sol.
            </Text>
          </View>
        </View>

        {/* Menu with profile actions and logout. */}
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
});
