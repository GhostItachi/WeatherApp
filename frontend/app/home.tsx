import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
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
import { WeatherBackground } from "../src/constants/weatherbg";
import LottieView from "lottie-react-native";

// This type matches the weather details rendered on the Home screen.
interface WeatherData {
  city: string;
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  visibility?: number;
  sunrise?: number;
  sunset?: number;
  pressure: number;
  wind_speed: number;
  icon: string;
  city_name?: string;
  forecast?: ForecastItem[];
}

interface CitySuggestion {
  id: number | string;
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

interface ForecastItem {
  dt: number;
  dt_txt: string;
  temp: number;
  description: string;
  icon: string;
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  // currentWeather stores the weather shown in the main location card.
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null,
  );
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  // favorites stores the saved cities returned by the backend.
  const [favorites, setFavorites] = useState<WeatherData[]>([]);
  // loading controls the first full screen load.
  const [loading, setLoading] = useState<boolean>(true);
  // locating is true while the app reads the device position and weather.
  const [locating, setLocating] = useState<boolean>(true);
  const currentTheme = getWeatherTheme(currentWeather?.description);
  // These states control the search modal and suggestion list.
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedFavWeather, setSelectedFavWeather] =
    useState<WeatherData | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isRealTime, setIsRealTime] = useState(false);

  const loadCache = async () => {
    try {
      const cachedData = await AsyncStorage.getItem("last_weather_full");
      if (cachedData !== null) {
        setCurrentWeather(JSON.parse(cachedData));
        setIsRealTime(false);
      }
    } catch (e) {
      console.error("Error reading cache:", e);
    }
  };
  const saveLastWeather = async (data: WeatherData) => {
    try {
      await AsyncStorage.setItem("last_weather_full", JSON.stringify(data));
    } catch (e) {
      console.error("Error saving cache:", e);
    }
  };

  const fetchCurrentLocationWeather = async () => {
    setLocating(true);
    try {
      // The GPS flow asks for permission, reads coordinates, and then calls the backend.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        await loadCache();
        return;
      }

      const servecesEnabled = await Location.hasServicesEnabledAsync();
      if (!servecesEnabled) {
        await loadCache();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      if (!latitude || !longitude) {
        throw new Error("Invalid coordinates");
      }
      const response = await apiClient.get("/weather/current-coord", {
        params: { lat: latitude.toString(), lon: longitude.toString() },
      });

      setCurrentWeather(response.data);
      await saveLastWeather(response.data);
      setIsRealTime(true);
    } catch (error) {
      console.warn("Could not update current weather:", error);
      await loadCache();
    } finally {
      setLocating(false);
    }
  };
  useEffect(() => {
    const prepareApp = async () => {
      // 1. Cargamos el caché de inmediato para que haya algo en pantalla
      await loadCache();
      // 2. Intentamos actualizar con la ubicación real
      await fetchCurrentLocationWeather();
    };

    prepareApp();
  }, []);
  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/");
          return;
        }
        // Home loads live weather and favorite cities at the same time.
        await Promise.all([
          fetchCurrentLocationWeather(),
          fetchFavorites(token),
        ]);
      } catch (error) {
        console.warn("Error in startup flow:", error);
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
          console.warn("Error synchronizing unit:", error);
        }
      };

      syncUnit();

      return () => {};
    }, []),
  );
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
      console.warn("Could not load favorites:", error);
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
        // The backend returns short city suggestions for the search modal.
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

      // Actualizamos la lista local inmediatamente para mejorar la UX
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

  const ForecastCard = ({ item }: { item: ForecastItem }) => {
    const date = new Date(item.dt * 1000);

    const timeString = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return (
      <View style={styles.forecastCard}>
        <Text style={styles.forecastTime}>{timeString}</Text>
        <Image
          source={{
            uri: `https://openweathermap.org/img/wn/${item.icon}@2x.png`,
          }}
          style={styles.forecastIcon}
        />
        <Text style={styles.forecastTemp}>{Math.round(item.temp)}°</Text>
      </View>
    );
  };
  const getWeatherDetails = (weather: WeatherData | null) => {
    if (!weather) return null;

    const { visibility, sunrise, sunset, humidity } = weather;

    const formatTime = (timestamp: number) => {
      return new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return {
      visibility: visibility ? (visibility / 1000).toFixed(1) : "N/A", // Km
      sunrise: sunrise ? formatTime(sunrise) : "--:--",
      sunset: sunset ? formatTime(sunset) : "--:--",
      humidity: humidity || 0,
    };
  };
  const details = getWeatherDetails(currentWeather);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* The top bar opens search on the left and the profile screen on the right. */}
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

      {/* This modal lets the user search cities and add one to favorites. */}
      <Modal visible={searchVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.searchContainer}>
            {/* HEADER DEL MODAL */}
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

            {/* CUERPO DE RESULTADOS */}
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
                  } // Supone que tu API devuelve objetos, no solo strings
                  renderItem={({ item }: { item: CitySuggestion }) => (
                    <TouchableOpacity
                      style={styles.suggestionItemSearch} // Usamos el estilo correcto con padding
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
                        {/* Aquí podrías mapear ciudades por defecto */}
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
        {/* The main card switches between loader, weather data, and retry state. */}
        {locating ? (
          <View style={[styles.mainCard, styles.loaderCard]}>
            <ActivityIndicator color="#0ea5e9" />
            <Text style={styles.loaderText}>
              Sincronizando con satélites...
            </Text>
          </View>
        ) : currentWeather ? (
          <LinearGradient
            colors={currentTheme.primary}
            style={[styles.mainCard, { overflow: "hidden" }]}
          >
            <WeatherBackground themeName={currentTheme.name} />
            {/* This section shows the main summary for the current location. */}
            {!isRealTime && (
              <View style={styles.cacheBadge}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={14}
                  color="#f59e0b"
                />
                <Text
                  style={styles.cacheText}
                  onPress={fetchCurrentLocationWeather}
                >
                  Modo Offline - Toca aquí para actualizar
                </Text>
              </View>
            )}
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

            {/* This row shows extra weather details returned by the backend. */}
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
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitleForecast}>Próximamente</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.forecastScroll}
              >
                {currentWeather?.forecast
                  ? currentWeather.forecast
                      /* 1. Filtramos: Solo mostramos bloques cuya hora sea mayor a la actual */
                      .filter(
                        (item: ForecastItem) => item.dt > Date.now() / 1000,
                      )
                      /* 2. Limitamos: Tomamos solo los primeros 6 resultados (las próximas 18 horas) */
                      .slice(0, 6)
                      /* 3. Renderizamos: Mapeamos los datos ya filtrados */
                      .map((item: ForecastItem, index: number) => (
                        <ForecastCard key={index} item={item} />
                      ))
                  : null}
              </ScrollView>
            </View>
          </LinearGradient>
        ) : (
          <TouchableOpacity
            style={[
              styles.mainCard,
              styles.loaderCard,
              styles.errorCardExtension,
            ]}
            onPress={fetchCurrentLocationWeather}
            activeOpacity={0.8}
          >
            <LottieView
              source={require("../assets/animations/sad-cloud.json")}
              autoPlay
              loop
              style={{ width: 80, height: 80 }}
            />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Ubicación no disponible</Text>
              <View style={styles.retryAction}>
                <Ionicons name="refresh" size={16} color="#0ea5e9" />
                <Text style={styles.retryTextInline}>Toca para reintentar</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.detailsContainer}>
          {/* Tarjeta de Amanecer/Atardecer */}
          <View style={styles.detailCard}>
            <Ionicons name="sunny-outline" size={24} color="#f59e0b" />
            <Text style={styles.detailLabelTips}>Amanecer</Text>
            <Text style={styles.detailValueTips}>{details?.sunrise}</Text>
          </View>

          {/* Tarjeta de Visibilidad */}
          <View style={styles.detailCard}>
            <Ionicons name="eye-outline" size={24} color="#0ea5e9" />
            <Text style={styles.detailLabelTips}>Visibilidad</Text>
            <Text style={styles.detailValueTips}>{details?.visibility} km</Text>
          </View>

          {/* Tarjeta de Atardecer */}
          <View style={styles.detailCard}>
            <Ionicons name="moon-outline" size={24} color="#6366f1" />
            <Text style={styles.detailLabelTips}>Atardecer</Text>
            <Text style={styles.detailValueTips}>{details?.sunset}</Text>
          </View>
        </View>

        {/* Favorite cities are listed here, and each row can open a details modal. */}
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
                          onPress: () =>
                            removeFavorite(item.city_name || item.city),
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
      {/* This bottom modal shows the full details for one favorite city. */}
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
                  style={[styles.modalHeaderGradient, { overflow: "hidden" }]}
                >
                  <WeatherBackground themeName={currentTheme.name} />
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
                              removeFavorite(
                                selectedFavWeather!.city_name ||
                                  selectedFavWeather!.city,
                              ),
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
  sectionContainer: {
    marginVertical: 20,
    paddingHorizontal: 15,
    alignItems: "center",
  },
  sectionTitleForecast: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff", // O el color de tu tema
    marginBottom: 10,
  },
  forecastScroll: {
    paddingLeft: 5,
  },
  forecastCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 15,
    marginRight: 12,
    alignItems: "center",
    width: 80,
  },
  forecastTime: {
    color: "#eee",
    fontSize: 12,
  },
  forecastIcon: {
    width: 40,
    height: 40,
  },
  forecastTemp: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorCardExtension: {
    // Ajustamos la altura si la animación + texto necesitan más espacio,
    // pero 200px es el estándar que ya definiste.
    flexDirection: "column",
    gap: 10,
  },

  errorTextContainer: {
    alignItems: "center",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155", // Un gris oscuro profesional
    marginBottom: 4,
  },

  retryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  retryTextInline: {
    fontSize: 14,
    color: "#0ea5e9", // Usamos el mismo azul del ActivityIndicator
    fontWeight: "500",
  },
  cacheBadge: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.15)", // Un naranja suave de advertencia
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },

  cacheText: {
    color: "#ffffffde", // Color ámbar/naranja para indicar "atención"
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: "#fff",
    width: "30%", // Tres columnas
    borderRadius: 20,
    padding: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailLabelTips: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 5,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  detailValueTips: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 2,
  },
});
