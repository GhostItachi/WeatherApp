import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function AboutScreen() {
  const router = useRouter();

  // Reusing cloud animations for total consistency
  const cloud1Anim = useRef(new Animated.Value(width)).current;
  const cloud2Anim = useRef(new Animated.Value(width + 150)).current;

  useEffect(() => {
    const animateCloud = (
      animValue: Animated.Value,
      duration: number,
      delay: number = 0,
    ) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -200,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: width,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    };

    animateCloud(cloud1Anim, 30000);
    animateCloud(cloud2Anim, 20000, 5000);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Animated Background Clouds */}
      <Animated.View
        style={[
          styles.cloud,
          { top: height * 0.1, transform: [{ translateX: cloud1Anim }] },
        ]}
      >
        <Ionicons name="cloud" size={150} color="#e2e8f0" />
      </Animated.View>

      <Animated.View
        style={[
          styles.cloud,
          { top: height * 0.3, transform: [{ translateX: cloud2Anim }] },
        ]}
      >
        <Ionicons name="cloud" size={100} color="#cbd5e1" />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Unified header with Edit Profile */}
        <View style={styles.header}>
          <Text style={styles.title}>About</Text>
          <Text style={styles.subtitle}>System Information</Text>
        </View>

        {/* Informative content with "Form" style (simulated inputs or cards) */}
        <View style={styles.infoSection}>
          <View style={styles.infoWrapper}>
            <Text style={styles.label}>Project Name</Text>
            <Text style={styles.value}>WeatherApp</Text>
          </View>

          <View style={styles.infoWrapper}>
            <Text style={styles.label}>Version</Text>
            <Text style={styles.value}>2.0.1 - Stable Build</Text>
          </View>

          <View style={[styles.infoWrapper, styles.bioWrapper]}>
            <Text style={styles.label}>Technical Description</Text>
            <Text style={styles.description}>
              Developed as a distributed system that integrates a RESTful API
              in FastAPI with a mobile interface in React Native.
              Focused on hardware optimization and efficient data persistence.
            </Text>
          </View>

          <View style={styles.infoWrapper}>
            <Text style={styles.label}>Developer</Text>
            <View style={styles.devRow}>
              <Ionicons
                name="code-slash"
                size={20}
                color="#3b82f6"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.value}>GhostItachi</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerText}>
          © 2026 • Faculty of Systems Engineering
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  cloud: { position: "absolute", opacity: 0.5 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: width * 0.1,
    paddingVertical: 50,
  },
  header: { alignItems: "center", marginBottom: 30 },
  title: { fontSize: 30, fontWeight: "900", color: "#1e293b", marginTop: 10 },
  subtitle: { fontSize: 16, color: "#94a3b8", marginTop: 5 },
  infoSection: { width: "100%" },
  infoWrapper: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  bioWrapper: { minHeight: 120 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3b82f6",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: { fontSize: 17, color: "#1e293b", fontWeight: "600" },
  description: { fontSize: 15, color: "#475569", lineHeight: 22, marginTop: 5 },
  devRow: { flexDirection: "row", alignItems: "center" },
  footerText: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 20,
    fontWeight: "600",
  },
});
