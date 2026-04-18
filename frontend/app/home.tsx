import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// Datos simulados para el pronóstico por horas
const hourlyData = [
  { time: "15:00", temp: "37°", icon: "sunny" },
  { time: "16:00", temp: "38°", icon: "sunny" },
  { time: "17:00", temp: "38°", icon: "sunny" },
  { time: "18:00", temp: "38°", icon: "partly-sunny" },
  { time: "19:00", temp: "37°", icon: "partly-sunny" },
  { time: "20:00", temp: "36°", icon: "sunny" },
];

// Datos simulados para los próximos días
const dailyData = [
  {
    day: "Hoy",
    date: "19 JUL",
    high: "38°",
    low: "24°",
    icon: "cloudy",
    wind: "27-55 km/h",
  },
  {
    day: "Mañana",
    date: "20 JUL",
    high: "36°",
    low: "22°",
    icon: "sunny",
    wind: "28-55 km/h",
  },
  {
    day: "Vie",
    date: "21 JUL",
    high: "33°",
    low: "19°",
    icon: "sunny",
    wind: "21-45 km/h",
  },
];

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barra de herramientas superior */}
      <View style={styles.topBar}>
        <TouchableOpacity>
          <Ionicons name="menu" size={28} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>WeatherApp</Text>
          <View style={styles.paginationDots}>
            {/*<View style={styles.dotActive} />
            <View style={styles.dot} />
            <View style={styles.dot} />*/}
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Ionicons name="person-circle-outline" size={30} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.dateTime}>14:21 Miércoles</Text>

        {/* Tarjeta Principal de Clima Actual */}
        <LinearGradient colors={["#0ea5e9", "#2563eb"]} style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <View>
              <Text style={styles.weatherCondition}>Cielos despejados</Text>
              <View style={styles.tempRow}>
                <Ionicons name="sunny-outline" size={50} color="#fff" />
                <Text style={styles.mainTemp}>36°</Text>
              </View>
              <Text style={styles.feelsLike}>Sensación de 34°</Text>
            </View>
            <View style={styles.windInfo}>
              <Ionicons name="trending-up" size={24} color="#fff" />
              <Text style={styles.windLabel}>Suroeste</Text>
              <Text style={styles.windValue}>23 - 46 km/h</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Pronóstico por horas */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Por horas</Text>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </View>
          <Text style={styles.sectionSubtitle}>
            Intervalos nubosos en las próximas horas
          </Text>

          <FlatList
            horizontal
            data={hourlyData}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.time}
            renderItem={({ item }) => (
              <View style={styles.hourlyItem}>
                <Text style={styles.hourlyTime}>{item.time}</Text>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color="#f59e0b"
                  style={styles.hourlyIcon}
                />
                <Text style={styles.hourlyTemp}>{item.temp}</Text>
              </View>
            )}
          />
        </View>

        {/* Alerta de Riesgo */}
        <TouchableOpacity style={styles.alertCard}>
          <View style={styles.alertLeft}>
            <View style={styles.alertIconBg}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.alertTitle}>1 Alerta Ahora!</Text>
              <Text style={styles.alertDesc}>Riesgo moderado</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Pronóstico Diario */}
        <View style={[styles.sectionCard, { marginBottom: 30 }]}>
          {dailyData.map((item, index) => (
            <View
              key={index}
              style={[
                styles.dailyRow,
                index === dailyData.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.dailyDayCol}>
                <Text style={styles.dailyDayName}>{item.day}</Text>
                <Text style={styles.dailyDateText}>{item.date}</Text>
              </View>
              <Ionicons name={item.icon as any} size={28} color="#64748b" />
              <View style={styles.dailyTempCol}>
                <Text style={styles.dailyHigh}>
                  {item.high} <Text style={styles.dailyLow}>/ {item.low}</Text>
                </Text>
              </View>
              <View style={styles.dailyWindCol}>
                <Ionicons name="leaf-outline" size={14} color="#0ea5e9" />
                <Text style={styles.dailyWindText}>{item.wind}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          ))}
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
  //dotActive: {
  //  width: 6,
  //  height: 6,
  //  borderRadius: 3,
  //  backgroundColor: "#0369a1",
  //  marginHorizontal: 2,
  //},
  //dot: {
  //  width: 6,
  //  height: 6,
  //  borderRadius: 3,
  //  backgroundColor: "#cbd5e1",
  //  marginHorizontal: 2,
  //},
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
