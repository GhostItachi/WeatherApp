import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");

// This type describes the weather data used by this screen.
interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  icon: string;
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();

  // favorites stores weather data for the user's saved cities.
  const [favorites, setFavorites] = useState<WeatherData[]>([]);
  // loading controls the spinner while data is loading.
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // This function gets the token and loads favorite weather data.
    const fetchWeather = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          router.replace("/login");
          return;
        }

        const response = await axios.get(
          "http://192.168.101.76:8000/weather/favorites/my",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        setFavorites(response.data);
      } catch (error) {
        console.error("Error cargando el clima:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        {/* Show a spinner while the screen waits for the API response. */}
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  // The first favorite city is used as the main weather card.
  const mainWeather = favorites.length > 0 ? favorites[0] : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar with app title and profile button. */}
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Ionicons name="menu" size={28} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>WeatherApp</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Ionicons name="person-circle-outline" size={30} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.dateTime}>Clima en tiempo real</Text>

        {/* Main card shows the first favorite city in a bigger format. */}
        {mainWeather ? (
          <LinearGradient
            colors={["#0ea5e9", "#2563eb"]}
            style={styles.mainCard}
          >
            <View style={styles.mainCardHeader}>
              <View>
                <Text style={styles.weatherCondition}>{mainWeather.city}</Text>
                <Text
                  style={[
                    styles.weatherCondition,
                    { textTransform: "capitalize" },
                  ]}
                >
                  {mainWeather.description}
                </Text>
                <View style={styles.tempRow}>
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${mainWeather.icon}@2x.png`,
                    }}
                    style={{ width: 60, height: 60 }}
                  />
                  <Text style={styles.mainTemp}>
                    {Math.round(mainWeather.temperature)}°
                  </Text>
                </View>
                <Text style={styles.feelsLike}>
                  Humedad: {mainWeather.humidity}%
                </Text>
              </View>
              <View style={styles.windInfo}>
                <Ionicons name="water" size={24} color="#fff" />
                <Text style={styles.windLabel}>Aire</Text>
                <Text style={styles.windValue}>Humedad alta</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>No tienes favoritos guardados</Text>
          </View>
        )}

        {/* This card shows a simple static suggestion to the user. */}
        <TouchableOpacity style={styles.alertCard}>
          <View style={styles.alertLeft}>
            <View style={styles.alertIconBg}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.alertTitle}>Consejo del día</Text>
              <Text style={styles.alertDesc}>
                Consulta tus ciudades favoritas
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* The rest of the favorite cities are shown in a smaller list. */}
        <View style={[styles.sectionCard, { marginBottom: 30 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>
            Otras ubicaciones
          </Text>
          {favorites.length > 1 ? (
            favorites.slice(1).map((item, index) => (
              <View key={index} style={styles.dailyRow}>
                <View style={styles.dailyDayCol}>
                  <Text style={styles.dailyDayName}>{item.city}</Text>
                  <Text style={styles.dailyDateText}>{item.description}</Text>
                </View>
                <Image
                  source={{
                    uri: `https://openweathermap.org/img/wn/${item.icon}.png`,
                  }}
                  style={{ width: 40, height: 40 }}
                />
                <View style={styles.dailyTempCol}>
                  <Text style={styles.dailyHigh}>
                    {Math.round(item.temperature)}°
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            ))
          ) : (
            <Text style={styles.sectionSubtitle}>
              Agrega más ciudades desde el buscador
            </Text>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: "#fff",
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
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: "#f59e0b",
  },
  alertLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertIconBg: {
    width: 45,
    height: 45,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
});
