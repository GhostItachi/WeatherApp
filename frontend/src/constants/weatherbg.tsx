import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

interface WeatherBackgroundProps {
  themeName: string;
}

export const WeatherBackground = ({ themeName }: WeatherBackgroundProps) => {
  const isRain = themeName === "rain" || themeName === "thunderstorm";
  const isSnow = themeName === "snow";
  const isClear = themeName === "clear";

  const numParticles = isRain ? 30 : isSnow ? 20 : 10;
  const particles = useRef(
    Array(numParticles)
      .fill(0)
      .map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = particles.map((animValue) => {
      const duration = isSnow ? 4000 : isRain ? 1000 : 2500;
      const delay = Math.random() * 3000;

      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return animation;
    });

    return () => animations.forEach((a) => a.stop());
  }, [themeName]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((anim, index) => {
        const marginLeft = Math.random() * width;
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, height / 2],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: marginLeft,
                transform: [{ translateY }],
                opacity: 0.3,
                width: isClear ? 4 : 4,
                height: isClear ? 4 : 20,
                backgroundColor: isRain ? "#60a5fa" : "#fff",
                borderRadius: isClear ? 2 : 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: { position: "absolute" },
});
