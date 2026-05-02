import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  AppState,
  TextInput,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../src/api/client";
import * as Location from "expo-location";
import AppLoader from "../components/AppLoader";
import { getWeatherTheme } from "../src/constants/themes";

const { width, height } = Dimensions.get("window");

interface WeatherData {
  city: string;
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  pressure: number;
  wind_speed: number;
  icon: string;
}
interface CitySuggestion {
  id: number | string;
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null,
  );
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [favorites, setFavorites] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [locating, setLocating] = useState<boolean>(true);
  const currentTheme = getWeatherTheme(currentWeather?.description);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedFavWeather, setSelectedFavWeather] =
    useState<WeatherData | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/");
          return;
        }
        await Promise.all([
          fetchCurrentLocationWeather(),
          fetchFavorites(token),
        ]);
      } catch (error) {
        console.warn("Error en el flujo de inicio:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);
  useFocusEffect(
    useCallback(() => {
      const syncUnit = async () => {
        try {
          const savedUnit = await AsyncStorage.getItem("userUnit");
          if (savedUnit) {
            setUnit(savedUnit as "metric" | "imperial");
          }
        } catch (error) {
          console.warn("Error sincronizando unidad:", error);
        }
      };

      syncUnit();

      return () => {};
    }, []),
  );
  const fetchCurrentLocationWeather = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentWeather(null);
        return;
      }

      const servecesEnabled = await Location.hasServicesEnabledAsync();
      if (!servecesEnabled) {
        setCurrentWeather(null);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      if (!latitude || !longitude) {
        throw new Error("Coordenadas inválidas");
      }
      const response = await apiClient.get("/weather/current-coord", {
        params: { lat: latitude.toString(), lon: longitude.toString() },
      });

      setCurrentWeather(response.data);
      await AsyncStorage.setItem(
        "last_weather_description",
        response.data.description,
      );
    } catch (error) {
      setCurrentWeather(null);
      console.warn("No fue posible actualizar el clima actual:", error);
    } finally {
      setLocating(false);
    }
  };
  const formatTemperature = (celsius: number | undefined) => {
    if (celsius === undefined || celsius === null) return "--°";

    if (unit === "imperial") {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const formatWindSpeed = (speedMs: number) => {
    if (unit === "imperial") {
      return `${(speedMs * 2.237).toFixed(1)} mph`;
    }
    return `${speedMs} m/s`;
  };

  const fetchFavorites = async (token: string) => {
    try {
      const response = await apiClient.get("/weather/favorites/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(response.data);
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem("userToken");
        router.replace("/");
      }
      setFavorites([]);
      console.warn("No fue posible cargar favoritos:", error);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchCurrentLocationWeather();
      }
    });

    return () => subscription.remove();
  }, [fetchCurrentLocationWeather]);

  const handleSearchTextChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length >= 2) {
      setSearching(true);
      try {
        const response = await apiClient.get(`/weather/search-suggestions`, {
          params: { q: text },
        });
        const formattedData = response.data.map((city: any, index: number) => ({
          id: city.id || index,
          name: city.name || city,
          country: city.country || "N/A",
          state: city.state || "",
          lat: city.lat || 0,
          lon: city.lon || 0,
        }));
        setSuggestions(formattedData);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleShowDetails = (weather: WeatherData) => {
    setSelectedFavWeather(weather);
    setDetailsModalVisible(true);
  };

  const removeFavorite = async (cityName: string) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await apiClient.delete(`/weather/favorites/${cityName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (token) fetchFavorites(token);

      Alert.alert("Eliminado", `${cityName} ha sido quitada de tus favoritos.`);
    } catch (error) {
      console.error("Error al eliminar favorito:", error);
      Alert.alert("Error", "No se pudo eliminar la ciudad.");
    }
  };

  const selectCity = async (city: CitySuggestion) => {
    setSearching(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await apiClient.get("/weather/current-coord", {
        params: { lat: city.lat, lon: city.lon },
      });
      const uniqueCityName = `${city.name}, ${city.country}`;
      Alert.alert(
        `${uniqueCityName}: ${Math.round(res.data.temperature)}°C`,
        `¿Deseas agregar esta ciudad a tus favoritos?`,
        [
          { text: "Cerrar", style: "cancel" },
          {
            text: "Agregar",
            onPress: async () => {
              try {
                await apiClient.post(
                  "/weather/favorites",
                  { city_name: uniqueCityName },
                  { headers: { Authorization: `Bearer ${token}` } },
                );
                if (token) fetchFavorites(token);
                setSearchVisible(false);
                setSearchQuery("");
                Alert.alert(
                  "Éxito",
                  `${res.data.city} se añadió a tus favoritos.`,
                );
              } catch (error: any) {
                const errorMessage =
                  error.response?.data?.detail ||
                  "No se pudo agregar la ciudad a favoritos.";
                const isDuplicate = error.response?.status === 400;
                Alert.alert(isDuplicate ? "Aviso" : "Error", errorMessage);
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert(
        "Error",
        "No se encontró la ciudad o hubo un problema de conexión.",
      );
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return <AppLoader />;
  }

  const getDynamicAdvice = (weather: WeatherData | null) => {
    if (!weather) {
      return {
        title: "Consejo del día",
        desc: "Explora el mapa y agrega ciudades a tus favoritos.",
        icon: "bulb",
        color: "#f59e0b",
        bg: "#fef3c7",
      };
    }

    const { temperature, description, wind_speed } = weather;
    const descLower = description.toLowerCase();

    if (
      descLower.includes("lluvia") ||
      descLower.includes("llovizna") ||
      descLower.includes("tormenta")
    ) {
      return {
        title: "Pronóstico de lluvia",
        desc: "No olvides llevar tu paraguas hoy.",
        icon: "umbrella",
        color: "#6366f1",
        bg: "#e0e7ff",
      };
    } else if (temperature >= 30) {
      return {
        title: "Temperatura alta",
        desc: "Mantente hidratado y usa protector solar si sales.",
        icon: "thermometer",
        color: "#ef4444",
        bg: "#fee2e2",
      };
    } else if (temperature <= 16) {
      return {
        title: "Clima frío",
        desc: "Abrígate bien antes de salir de casa.",
        icon: "snow",
        color: "#0ea5e9",
        bg: "#e0f2fe",
      };
    } else if (wind_speed >= 10) {
      return {
        title: "Vientos fuertes",
        desc: "Precaución con ráfagas de viento en tu zona.",
        icon: "leaf",
        color: "#10b981",
        bg: "#d1fae5",
      };
    } else {
      return {
        title: "Clima agradable",
        desc: "Excelente día para realizar actividades al aire libre.",
        icon: "sunny",
        color: "#f59e0b",
        bg: "#fef3c7",
      };
    }
  };

  const advice = getDynamicAdvice(currentWeather);
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setSearchVisible(true)}>
          <Ionicons name="search" size={26} color="#0ea5e9" />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>WeatherApp</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Ionicons name="person-circle-outline" size={30} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <Modal visible={searchVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.searchContainer}>
            <View style={styles.searchHeader}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color="#3b82f6" />
                <TextInput
                  placeholder="Buscar ciudad..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={handleSearchTextChange}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSearchVisible(false);
                  setSearchQuery("");
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.resultsBody}>
              {searching ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loaderTextSearch}>
                    Buscando en el mapa...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, index) =>
                    item.id?.toString() || index.toString()
                  }
                  renderItem={({ item }: { item: CitySuggestion }) => (
                    <TouchableOpacity
                      style={styles.suggestionItemSearch}
                      onPress={() => selectCity(item)}
                    >
                      <View style={styles.suggestionIcon}>
                        <Ionicons
                          name="location-sharp"
                          size={20}
                          color="#64748b"
                        />
                      </View>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionTextSearch}>
                          {item.name}
                        </Text>
                        <Text style={styles.suggestionSubtext}>
                          {item.country}
                          {item.state ? `, ${item.state}` : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name="heart-outline"
                        size={24}
                        color="#3b82f6"
                      />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    searchQuery.length > 2 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons
                          name="map-outline"
                          size={50}
                          color="#e2e8f0"
                        />
                        <Text style={styles.emptyTextSearch}>
                          No encontramos esa ciudad
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.historyTitle}>
                          RECIENTES RESULTADOS
                        </Text>
                      </View>
                    )
                  }
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.dateTime}>Clima en tiempo real</Text>

        {locating ? (
          <View style={[styles.mainCard, styles.loaderCard]}>
            <ActivityIndicator color="#0ea5e9" />
            <Text style={styles.loaderText}>
              Sincronizando con satélites...
            </Text>
          </View>
        ) : currentWeather ? (
          <LinearGradient colors={currentTheme.primary} style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <View>
                <Text style={styles.cityText}>{currentWeather.city}</Text>
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {currentWeather.description}
                </Text>
                <View style={styles.tempRow}>
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${currentWeather.icon}@4x.png`,
                    }}
                    style={styles.weatherIconLarge}
                  />
                  <Text style={styles.mainTemp}>
                    {formatTemperature(currentWeather.temperature)}
                  </Text>
                </View>
                <Text style={styles.feelsLikeText}>
                  Sensación térmica:{" "}
                  {formatTemperature(currentWeather.feels_like)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="water-outline" size={20} color="#fff" />
                <Text style={styles.detailLabel}>Humedad</Text>
                <Text style={styles.detailValue}>
                  {currentWeather.humidity}%
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="leaf-outline" size={20} color="#fff" />
                <Text style={styles.detailLabel}>Viento</Text>
                <Text style={styles.detailValue}>
                  {formatWindSpeed(currentWeather.wind_speed)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={20} color="#fff" />
                <Text style={styles.detailLabel}>Presión</Text>
                <Text style={styles.detailValue}>
                  {currentWeather.pressure} hPa
                </Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={fetchCurrentLocationWeather}
          >
            <Ionicons name="location-outline" size={30} color="#f59e0b" />
            <Text style={styles.alertTitle}>Ubicación no disponible</Text>
            <Text style={styles.alertDesc}>Reintentar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.alertCard, { borderLeftColor: advice.color }]}
        >
          <View style={styles.alertLeft}>
            <View style={[styles.alertIconBg, { backgroundColor: advice.bg }]}>
              <Ionicons name={advice.icon} size={24} color={advice.color} />
            </View>
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>{advice.title}</Text>
              <Text style={styles.alertDesc} numberOfLines={2}>
                {advice.desc}
              </Text>
            </View>
          </View>
          <Ionicons
            name="sparkles"
            size={20}
            color={advice.color}
            style={{ opacity: 0.4 }}
          />
        </TouchableOpacity>

        <View style={[styles.sectionCard, { marginBottom: 30 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
            Tus Cuidades Favoritas
          </Text>
          {favorites.length > 0 ? (
            favorites.map((item, index) => (
              <View key={index} style={styles.dailyRow}>
                <View style={styles.dailyDayCol}>
                  <Text style={styles.dailyDayName}>{item.city}</Text>
                  <Text
                    style={[
                      styles.dailyDateText,
                      { textTransform: "capitalize" },
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>

                <Image
                  source={{
                    uri: `https://openweathermap.org/img/wn/${item.icon}.png`,
                  }}
                  style={{ width: 40, height: 40 }}
                />

                <View style={styles.dailyTempCol}>
                  <Text style={styles.dailyHigh}>
                    {formatTemperature(item.temperature)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleShowDetails(item)}
                  style={styles.detailsIconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      "Eliminar favorito",
                      `¿Estás seguro de que quieres quitar ${item.city}?`,
                      [
                        { text: "Cancelar", style: "cancel" },
                        {
                          text: "Eliminar",
                          style: "destructive",
                          onPress: () => removeFavorite(item.city),
                        },
                      ],
                    );
                  }}
                  style={[styles.detailsIconBtn, { marginLeft: 10 }]}
                >
                  <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No tienes ciudades favoritas aún.
            </Text>
          )}
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlayCity}>
          <View style={styles.detailsModalContent}>
            {selectedFavWeather && (
              <>
                <LinearGradient
                  colors={currentTheme.primary}
                  style={styles.modalHeaderGradient}
                >
                  <TouchableOpacity
                    style={styles.closeModalBtn}
                    onPress={() => setDetailsModalVisible(false)}
                  >
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>

                  <Text style={styles.modalCityName}>
                    {selectedFavWeather.city}
                  </Text>
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${selectedFavWeather.icon}@4x.png`,
                    }}
                    style={{ width: 100, height: 100 }}
                  />
                  <Text style={styles.modalTemp}>
                    {formatTemperature(selectedFavWeather.temperature)}
                  </Text>
                  <Text style={styles.modalDesc}>
                    {selectedFavWeather.description}
                  </Text>
                </LinearGradient>

                <View style={styles.modalBody}>
                  <View style={styles.modalGrid}>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="water" size={24} color="#0ea5e9" />
                      <Text style={styles.modalLabel}>Humedad</Text>
                      <Text style={styles.modalValue}>
                        {selectedFavWeather.humidity}%
                      </Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="leaf" size={24} color="#0ea5e9" />
                      <Text style={styles.modalLabel}>Viento</Text>
                      <Text style={styles.modalValue}>
                        {formatWindSpeed(selectedFavWeather.wind_speed)}
                      </Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="thermometer" size={24} color="#0ea5e9" />
                      <Text style={styles.modalLabel}>Sensación</Text>
                      <Text style={styles.modalValue}>
                        {formatTemperature(selectedFavWeather.feels_like)}
                      </Text>
                    </View>
                    <View style={styles.modalGridItem}>
                      <Ionicons name="speedometer" size={24} color="#0ea5e9" />
                      <Text style={styles.modalLabel}>Presión</Text>
                      <Text style={styles.modalValue}>
                        {selectedFavWeather.pressure} hPa
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtnModal}
                    onPress={() => {
                      Alert.alert(
                        "Eliminar Ciudad",
                        `¿Deseas quitar ${selectedFavWeather?.city} de tus favoritos?`,
                        [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Sí, eliminar",
                            style: "destructive",
                            onPress: () =>
                              removeFavorite(selectedFavWeather!.city),
                          },
                        ],
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>
                      Eliminar de mis favoritos
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  locationContainer: {
    alignItems: "center",
  },
  locationText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0369a1",
  },
  paginationDots: {
    flexDirection: "row",
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  dateTime: {
    fontSize: 14,
    color: "#64748b",
    marginVertical: 15,
  },
  mainCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weatherCondition: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.9,
  },
  tempRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  mainTemp: {
    color: "#fff",
    fontSize: 64,
    fontWeight: "300",
    marginLeft: 10,
  },
  feelsLike: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.8,
  },
  windInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  windLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  windValue: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0369a1",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginVertical: 10,
  },
  hourlyItem: {
    alignItems: "center",
    marginRight: 20,
    paddingVertical: 10,
  },
  hourlyTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  hourlyIcon: {
    marginVertical: 8,
  },
  hourlyTemp: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e293b",
  },
  alertDesc: {
    fontSize: 13,
    color: "#64748b",
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dailyDayCol: {
    width: 70,
  },
  dailyDayName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
  },
  dailyDateText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  dailyTempCol: {
    width: 60,
  },
  dailyHigh: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ef4444",
  },
  dailyLow: {
    color: "#3b82f6",
    fontWeight: "normal",
  },
  dailyWindCol: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  dailyWindText: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#334155",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#94a3b8",
  },
  cityText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
  },
  descriptionText: {
    color: "#fff",
    fontSize: 16,
    textTransform: "none",
    opacity: 0.9,
    flexShrink: 1,
  },
  weatherIconLarge: {
    width: 80,
    height: 80,
    marginLeft: -10,
  },
  feelsLikeText: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
    marginTop: -5,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 15,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  detailValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  loaderCard: {
    backgroundColor: "#fff",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  alertLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  alertIconBg: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  modalOverlayCity: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailsModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: "80%",
    overflow: "hidden",
  },
  modalHeaderGradient: {
    alignItems: "center",
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  closeModalBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
  },
  modalCityName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  modalTemp: {
    color: "#fff",
    fontSize: 64,
    fontWeight: "200",
  },
  modalDesc: {
    color: "#fff",
    fontSize: 18,
    textTransform: "capitalize",
    opacity: 0.9,
  },
  modalBody: {
    padding: 25,
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  modalGridItem: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 15,
  },
  modalLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
  },
  modalValue: {
    color: "#1e293b",
    fontSize: 16,
    fontWeight: "bold",
  },
  detailsIconBtn: {
    padding: 10,
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  searchContainer: {
    backgroundColor: "#fff",
    height: "90%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1e293b",
  },
  cancelBtn: {
    marginLeft: 15,
  },
  cancelText: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 15,
  },
  suggestionItemSearch: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTextSearch: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  suggestionSubtext: {
    fontSize: 13,
    color: "#94a3b8",
  },
  loaderContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  loaderTextSearch: {
    marginTop: 15,
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTextSearch: {
    marginTop: 10,
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
  },
  resultsBody: {
    flex: 1,
    paddingTop: 10,
  },

  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  deleteBtnModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: 15,
    borderRadius: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  deleteBtnText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 10,
  },
});
