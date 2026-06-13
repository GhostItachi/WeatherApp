import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  AppState,
  Modal,
  Alert,
} from "react-native";
import Reanimated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../src/api/client";
import AppLoader from "../src/components/AppLoader";
import { getWeatherTheme } from "../src/constants/themes";
import { WeatherBackground } from "../src/constants/weatherbg";
import LottieView from "lottie-react-native";
import { COLORS, AppColors } from "../src/constants/design";
import { useWeather } from "../src/context/WeatherContext";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { useAuth } from "../src/context/AuthContext";

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

interface ForecastItem {
  dt: number;
  dt_txt: string;
  temp: number;
  description: string;
  icon: string;
}

interface FavoriteListItemProps {
  item: any;
  index: number;
  onShowDetails: (item: any) => void;
  onRemove: (item: any) => void;
  formatTemperature: (temp: number) => string;
  unit: "metric" | "imperial";
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { authState } = useAuth();
  const { expoPushToken } = usePushNotifications();

  // WeatherContext owns the live location weather request for shared screens.
  const {
    weatherData: currentWeather,
    isLoadingWeather: locating,
    fetchGlobalLocationAndWeather,
  } = useWeather();

  const [offlineWeather, setOfflineWeather] = useState<WeatherData | null>(
    null,
  );
  const [unit, setUnit] = useState<"metric" | "imperial">("metric");
  const [favorites, setFavorites] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedFavWeather, setSelectedFavWeather] =
    useState<WeatherData | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isRealTime, setIsRealTime] = useState(false);

  // Live weather is preferred, with cached weather kept as an offline fallback.
  const displayWeather = currentWeather || offlineWeather;
  const currentTheme = getWeatherTheme(displayWeather?.description);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cachedData = await AsyncStorage.getItem("last_weather_full");
        if (cachedData !== null) {
          setOfflineWeather(JSON.parse(cachedData));
        }
      } catch (e) {
        console.error("Error reading cache:", e);
      }
    };
    loadCache();
  }, []);

  // Fresh context data is persisted so the home screen can render offline later.
  useEffect(() => {
    if (currentWeather) {
      setIsRealTime(true);
      AsyncStorage.setItem("last_weather_full", JSON.stringify(currentWeather));
    } else {
      setIsRealTime(false);
    }
  }, [currentWeather]);

  useEffect(() => {
    const sendTokenToServer = async () => {
      if (expoPushToken && authState.token) {
        try {
          await apiClient.post(
            "/users/me/push-token",
            { token: expoPushToken },
            { headers: { Authorization: `Bearer ${authState.token}` } },
          );
        } catch (error) {
          console.log("Error al guardar el push token en el servidor", error);
        }
      }
    };

    sendTokenToServer();
  }, [expoPushToken, authState.token]);

  const fetchFavorites = useCallback(
    async (token: string) => {
      try {
        const response = await apiClient.get("/weather/favorites/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites(response.data);
      } catch (error: any) {
        if (error.response?.status === 401) {
          await AsyncStorage.multiRemove(["userToken", "userRole"]);
          router.replace("/");
        }
        setFavorites([]);
        console.warn("Could not load favorites:", error);
      }
    },
    [router],
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

  useEffect(() => {
    const initializeData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/");
          return;
        }
        await Promise.all([
          fetchGlobalLocationAndWeather(),
          fetchFavorites(token),
        ]);
      } catch (error) {
        console.warn("Error in startup flow:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [fetchGlobalLocationAndWeather, fetchFavorites, router]);

  useFocusEffect(
    useCallback(() => {
      const syncUnit = async () => {
        try {
          const savedUnit = await AsyncStorage.getItem("userUnit");
          if (savedUnit) setUnit(savedUnit as "metric" | "imperial");
        } catch (error) {
          console.warn("Error synchronizing unit:", error);
        }
      };
      syncUnit();
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchGlobalLocationAndWeather();
      }
    });
    return () => subscription.remove();
  }, [fetchGlobalLocationAndWeather]);

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
      Alert.alert(
        "Eliminada",
        `${cityName} ha sido eliminada de tus favoritos.`,
      );
    } catch (error) {
      console.error("Error removing favorite:", error);
      Alert.alert("Error", "No se pudo eliminar la ciudad.");
    }
  };

  const FavoriteListItem: React.FC<FavoriteListItemProps> = ({
    item,
    index,
    onShowDetails,
    onRemove,
    formatTemperature,
    unit,
  }) => {
    const renderRightActions = () => {
      return (
        <TouchableOpacity
          onPress={() => onRemove(item)}
          style={styles.swipeDeleteAction}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={26} color="#fff" />
          <Text style={styles.swipeDeleteText}>Quitar</Text>
        </TouchableOpacity>
      );
    };
    return (
      <Reanimated.View
        entering={FadeInDown.delay(index * 100).duration(500)}
        exiting={FadeOutLeft.duration(400)}
        layout={LinearTransition.springify()}
        style={{ overflow: "hidden" }}
      >
        <GestureHandlerRootView>
          <Swipeable
            renderRightActions={renderRightActions}
            friction={2}
            rightThreshold={80}
            containerStyle={styles.swipeableContainer}
          >
            <TouchableOpacity
              onPress={() => onShowDetails(item)}
              style={styles.favListItem}
              activeOpacity={0.7}
            >
              <View style={styles.favListLeft}>
                <Text style={styles.favListCity} numberOfLines={1}>
                  {item.city}
                </Text>
                <Text style={styles.favListDesc} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <Image
                source={{
                  uri: `https://openweathermap.org/img/wn/${item.icon}@2x.png`,
                }}
                style={styles.favListIcon}
              />
              <View
                style={[
                  styles.favListTempContainer,
                  {
                    borderColor: item.temperature > 20 ? "#f59e0b" : "#0ea5e9",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.favListTempNumber,
                    { color: item.temperature > 20 ? "#f59e0b" : "#0ea5e9" },
                  ]}
                >
                  {Math.round(item.temperature)}
                </Text>
                <Text style={styles.favListTempUnit}>
                  {unit === "metric" ? "°C" : "°F"}
                </Text>
              </View>
            </TouchableOpacity>
          </Swipeable>
        </GestureHandlerRootView>
      </Reanimated.View>
    );
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
    const formatTime = (timestamp: number) =>
      new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    return {
      visibility: visibility ? (visibility / 1000).toFixed(1) : "N/A",
      sunrise: sunrise ? formatTime(sunrise) : "--:--",
      sunset: sunset ? formatTime(sunset) : "--:--",
      humidity: humidity || 0,
    };
  };

  const details = getWeatherDetails(displayWeather);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push("/search")}>
          <Ionicons name="search" size={26} color="#0ea5e9" />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>WeatherApp</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Ionicons
            name="person-circle-outline"
            size={30}
            color={AppColors.slate900}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {locating && !displayWeather ? (
          <View style={[styles.mainCard, styles.loaderCard]}>
            <ActivityIndicator color="#0ea5e9" />
            <Text style={styles.loaderText}>
              Sincronizando con satélites...
            </Text>
          </View>
        ) : displayWeather ? (
          <LinearGradient colors={currentTheme.primary} style={styles.mainCard}>
            <WeatherBackground themeName={currentTheme.name} />
            {!isRealTime && (
              <View style={styles.cacheBadge}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={14}
                  color="#f59e0b"
                />
                <Text
                  style={styles.cacheText}
                  onPress={fetchGlobalLocationAndWeather}
                >
                  Modo Offline - Toca aquí para actualizar
                </Text>
              </View>
            )}
            <View style={styles.mainCardHeader}>
              <View>
                <Text style={styles.cityText}>{displayWeather.city}</Text>
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {displayWeather.description}
                </Text>
                <View style={styles.tempRow}>
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${displayWeather.icon}@4x.png`,
                    }}
                    style={styles.weatherIconLarge}
                  />
                  <Text style={styles.mainTemp}>
                    {formatTemperature(displayWeather.temperature)}
                  </Text>
                </View>
                <Text style={styles.feelsLikeText}>
                  Sensación: {formatTemperature(displayWeather.feels_like)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="water-outline" size={20} color="#fff" />
                <Text style={styles.detailLabel}>Humedad</Text>
                <Text style={styles.detailValue}>
                  {displayWeather.humidity}%
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="leaf-outline" size={20} color="#fff" />
                <Text style={styles.detailLabel}>Viento</Text>
                <Text style={styles.detailValue}>
                  {formatWindSpeed(displayWeather.wind_speed)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="speedometer-outline" size={20} color="#fff" />
                <Text style={styles.detailLabel}>Presión</Text>
                <Text style={styles.detailValue}>
                  {displayWeather.pressure} hPa
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
                {displayWeather?.forecast
                  ? displayWeather.forecast
                      .filter(
                        (item: ForecastItem) => item.dt > Date.now() / 1000,
                      )
                      .slice(0, 6)
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
            onPress={fetchGlobalLocationAndWeather}
            activeOpacity={0.8}
          >
            <LottieView
              source={require("../assets/animations/sad-cloud.json")}
              autoPlay
              loop
              style={styles.errorAnimation}
            />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Ubicación no disponible</Text>
              <View style={styles.retryAction}>
                <Ionicons name="refresh" size={16} color="#0ea5e9" />
                <Text style={styles.retryTextInline}>Reintentar</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.detailsContainer}>
          <View style={styles.detailCard}>
            <Ionicons name="sunny-outline" size={24} color="#f59e0b" />
            <Text style={styles.detailLabelTips}>Amanecer</Text>
            <Text style={styles.detailValueTips}>{details?.sunrise}</Text>
          </View>
          <View style={styles.detailCard}>
            <Ionicons name="eye-outline" size={24} color="#0ea5e9" />
            <Text style={styles.detailLabelTips}>Visibilidad</Text>
            <Text style={styles.detailValueTips}>{details?.visibility} km</Text>
          </View>
          <View style={styles.detailCard}>
            <Ionicons name="moon-outline" size={24} color="#6366f1" />
            <Text style={styles.detailLabelTips}>Atardecer</Text>
            <Text style={styles.detailValueTips}>{details?.sunset}</Text>
          </View>
        </View>

        <View style={styles.favoritesSection}>
          <View style={styles.favSectionHeader}>
            <Text style={styles.sectionTitle}>Ciudades Guardadas</Text>
            {favorites.length > 0 && (
              <Text style={styles.swipeHint}>
                Swipe <Ionicons name="arrow-back" size={12} /> para quitar
              </Text>
            )}
          </View>

          {favorites.length > 0 ? (
            <View style={styles.favoritesList}>
              {favorites.map((item, index) => (
                <FavoriteListItem
                  key={item.city_name || item.city}
                  item={item}
                  index={index}
                  onShowDetails={handleShowDetails}
                  onRemove={(cityItem) => {
                    Alert.alert(
                      "Confirmar",
                      `¿Quitar ${cityItem.city} de favoritos?`,
                      [
                        { text: "No", style: "cancel" },
                        {
                          text: "Sí, Quitar",
                          style: "destructive",
                          onPress: () =>
                            removeFavorite(cityItem.city_name || cityItem.city),
                        },
                      ],
                    );
                  }}
                  formatTemperature={formatTemperature}
                  unit={unit}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyFavoritesContainer}>
              <LottieView
                source={require("../assets/animations/empty-heart.json")}
                autoPlay
                loop
                style={styles.emptyAnimation}
              />
              <Text style={styles.emptyTextText}>
                Tu lista está vacía. Busca una ciudad y toca el{" "}
                <Ionicons name="heart-outline" /> para agregarla aquí.
              </Text>
            </View>
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
                  style={[styles.modalHeaderGradient]}
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
                    style={styles.modalWeatherIcon}
                  />
                  <Text style={styles.modalTemp}>
                    {formatTemperature(selectedFavWeather.temperature)}
                  </Text>
                  <Text style={styles.modalDesc}>
                    {selectedFavWeather.description}
                  </Text>
                </LinearGradient>
                <ScrollView
                  style={styles.modalBodyScroll}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={false}
                >
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
                        `¿Quieres eliminar ${selectedFavWeather?.city} de tus favoritos?`,
                        [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Sí, eliminar",
                            style: "destructive",
                            onPress: () => {
                              removeFavorite(
                                selectedFavWeather!.city_name ||
                                  selectedFavWeather!.city,
                              );
                              setDetailsModalVisible(false);
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={styles.deleteBtnText}>
                      Eliminar de favoritos
                    </Text>
                  </TouchableOpacity>
                  <View style={{ height: 30 }} />
                </ScrollView>
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
    backgroundColor: COLORS.background,
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
    color: AppColors.sky900,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  mainCard: {
    overflow: "hidden",
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
  sectionTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.sky900,
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
    overflow: "hidden",
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
    color: AppColors.slate500,
    fontSize: 12,
    marginTop: 8,
  },
  modalValue: {
    color: "#1e293b",
    fontSize: 16,
    fontWeight: "bold",
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
    marginBottom: 10,
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
    color: "#fff",
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
    flexDirection: "column",
    gap: 10,
  },

  errorTextContainer: {
    alignItems: "center",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },

  retryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  retryTextInline: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "500",
  },
  cacheBadge: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
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
    color: "#ffffffde",
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
    width: "30%",
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
    color: AppColors.slate500,
    marginTop: 5,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  detailValueTips: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.slate900,
    marginTop: 2,
  },
  errorAnimation: {
    width: 80,
    height: 80,
  },
  modalWeatherIcon: {
    width: 100,
    height: 100,
  },
  modalBodyScroll: {
    flex: 0,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  favoritesSection: {
    paddingHorizontal: 15,
    marginTop: 20,
    flex: 1,
  },
  favSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  favoritesList: {
    paddingBottom: 40,
  },
  swipeHint: {
    fontSize: 11,
    color: "#94a3b8",
    opacity: 0.8,
  },
  swipeableContainer: {
    backgroundColor: "transparent",
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 10,
  },
  favListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    padding: 15,
    paddingVertical: 18,
  },
  favListLeft: {
    flex: 2,
  },
  favListCity: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  favListDesc: {
    fontSize: 13,
    color: "#64748b",
    textTransform: "capitalize",
    marginTop: 2,
  },
  favListIcon: {
    width: 45,
    height: 45,
    marginHorizontal: 10,
  },
  // The circular temperature badge keeps the list row compact and scannable.
  favListTempContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  favListTempNumber: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: -1,
    includeFontPadding: false,
  },
  favListTempUnit: {
    fontSize: 10,
    color: "#64748b",
    marginTop: -2,
    fontWeight: "500",
  },
  swipeDeleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    height: "100%",
  },
  swipeDeleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  emptyFavoritesContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyAnimation: {
    width: 120,
    height: 120,
  },
  emptyTextText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 10,
  },
});
