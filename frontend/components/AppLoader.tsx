import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

// This local animation is used as the shared loading screen.
const weatherAnimation = require("../assets/animations/weather-load.json");

export default function AppLoader() {
  const animation = useRef<LottieView>(null);
  useEffect(() => {
    // The animation starts as soon as the loader is mounted.
    if (animation.current) {
      animation.current.play();
    }
  }, []);
  return (
    <View style={styles.container}>
      <View style={styles.animationContainer}>
        <LottieView
          ref={animation}
          source={require("../assets/animations/weather-load.json")}
          autoPlay={true}
          loop={true}
          style={styles.animation}
          // SOFTWARE mode keeps the animation smoother on Android devices.
          renderMode="SOFTWARE"
        />
      </View>
      <Text style={styles.loadingText}>Sincronizando satélites...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  animationContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: (width * 0.7) / 2,
    elevation: 10,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  animation: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 10,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
});
