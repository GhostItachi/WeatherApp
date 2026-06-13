import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import apiClient from "../src/api/client";
import { AppColors, COLORS } from "../src/constants/design";
import { calculateDistance } from "../src/utils/math";

interface CitySuggestion {
  id: string;
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  temp?: number | null;
}

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const savedRecents = await AsyncStorage.getItem("recent_searches");
        if (savedRecents) {
          setRecentSearches(JSON.parse(savedRecents));
        }

        const loc = await Location.getLastKnownPositionAsync();
        if (loc) {
          setUserLocation({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          });
        }
      } catch (error) {
        console.warn("Error cargando datos iniciales:", error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setSearching(true);
    try {
      const response = await apiClient.get(`/weather/search-suggestions`, {
        params: { q: query },
      });
      setSuggestions(response.data);
    } catch (error) {
      console.warn("Error en búsqueda:", error);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  const saveToRecents = async (city: CitySuggestion) => {
    const filtered = recentSearches.filter((c) => c.id !== city.id);
    const updatedRecents = [city, ...filtered].slice(0, 5);
    setRecentSearches(updatedRecents);
    await AsyncStorage.setItem(
      "recent_searches",
      JSON.stringify(updatedRecents),
    );
  };

  const selectCity = async (city: CitySuggestion) => {
    setSearching(true);
    try {
      // Weather details are loaded before the confirmation modal is shown.
      const res = await apiClient.get("/weather/current-coord", {
        params: { lat: city.lat, lon: city.lon },
      });

      setWeatherData(res.data);
      setSelectedCity(city);
      setModalVisible(true);
    } catch {
      Alert.alert("Error", "No se pudo obtener la información de esta ciudad.");
    } finally {
      setSearching(false);
    }
  };

  const confirmSaveFavorite = async () => {
    if (!selectedCity) return;
    const token = await AsyncStorage.getItem("userToken");
    try {
      await apiClient.post(
        "/weather/favorites",
        { city_name: `${selectedCity.name},${selectedCity.country}` },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setModalVisible(false);
      await saveToRecents(selectedCity);
      Alert.alert("Éxito", `${selectedCity.name} añadida a favoritos.`);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "No se pudo agregar la ciudad.";
      Alert.alert("Aviso", errorMessage);
    }
  };

  const renderCityCard = ({ item }: { item: CitySuggestion }) => {
    const distance = userLocation
      ? calculateDistance(
          userLocation.lat,
          userLocation.lon,
          item.lat,
          item.lon,
        )
      : null;

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => selectCity(item)}
      >
        <Text style={styles.flagEmoji}>{getFlagEmoji(item.country)}</Text>
        <View style={styles.resultInfo}>
          <View style={styles.cityHeaderRow}>
            <Text style={styles.cityName}>{item.name}</Text>
            {item.temp !== undefined && item.temp !== null && (
              <View style={styles.tempBadge}>
                <Text style={styles.tempText}>{item.temp}°</Text>
              </View>
            )}
          </View>
          <Text style={styles.stateName}>
            {item.state ? `${item.state}, ` : ""}
            {item.country}
          </Text>
          {distance !== null && (
            <View style={styles.distanceRow}>
              <Ionicons
                name="navigate-outline"
                size={12}
                color={AppColors.slate400}
              />
              <Text style={styles.distanceText}>A {distance} km de ti</Text>
            </View>
          )}
        </View>
        <View style={styles.actionIcon}>
          <Ionicons name="add-circle" size={28} color={AppColors.sky500} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={26} color={AppColors.slate900} />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={AppColors.blue500} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ej. Maicao, Bogotá, Tokyo..."
              placeholderTextColor={AppColors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.body}>
          {searching ? (
            <ActivityIndicator size="large" color={AppColors.blue500} />
          ) : searchQuery.length >= 2 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={renderCityCard}
            />
          ) : (
            <View style={styles.historyContainer}>
              <Text style={styles.sectionTitle}>Búsquedas Recientes</Text>
              <FlatList
                data={recentSearches}
                keyExtractor={(item) => `recent-${item.id}`}
                renderItem={renderCityCard}
              />
            </View>
          )}
        </View>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>¿Agregar a favoritos?</Text>
              {weatherData && (
                <View style={styles.previewContainer}>
                  <Text style={styles.cityName}>{weatherData.city}</Text>
                  <Text style={styles.tempMain}>
                    {Math.round(weatherData.temperature)}°C
                  </Text>
                  <Text style={styles.weatherDesc}>
                    {weatherData.description}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="water-outline"
                        size={20}
                        color={AppColors.blue500}
                      />
                      <Text style={styles.statText}>
                        {weatherData.humidity}%
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons
                        name="speedometer-outline"
                        size={20}
                        color={AppColors.blue500}
                      />
                      <Text style={styles.statText}>
                        {weatherData.wind_speed} km/h
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.txtCancel}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSave}
                  onPress={confirmSaveFavorite}
                >
                  <Text style={styles.txtSave}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.slate200,
  },
  backBtn: {
    marginRight: 10,
    padding: 5,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.offWhite,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: AppColors.slate200,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: AppColors.slate900,
  },
  body: {
    flex: 1,
  },
  historyContainer: {
    flex: 1,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.slate500,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  flagEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  resultInfo: {
    flex: 1,
  },
  cityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityName: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.slate900,
    flexShrink: 1,
  },
  tempBadge: {
    backgroundColor: AppColors.lightBlue,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tempText: {
    fontSize: 14,
    fontWeight: "bold",
    color: AppColors.blue500,
  },
  stateName: {
    fontSize: 13,
    color: AppColors.slate500,
    marginTop: 2,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: AppColors.slate400,
    marginLeft: 4,
  },
  actionIcon: {
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  previewContainer: { alignItems: "center", marginVertical: 10 },
  tempMain: { fontSize: 48, fontWeight: "800", color: AppColors.blue500 },
  weatherDesc: { fontSize: 16, color: AppColors.slate500, marginBottom: 15 },
  statsRow: { flexDirection: "row", gap: 20, marginBottom: 20 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { marginLeft: 5, color: AppColors.slate700 },
  buttonRow: { flexDirection: "row", gap: 10, width: "100%" },
  btnCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: AppColors.slate100,
    alignItems: "center",
  },
  btnSave: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: AppColors.blue500,
    alignItems: "center",
  },
  txtCancel: { color: AppColors.slate700, fontWeight: "600" },
  txtSave: { color: "white", fontWeight: "600" },
});
