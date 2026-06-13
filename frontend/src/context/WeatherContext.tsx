/*
  WeatherContext

  Provides a small global context for the current city and weather data.
  The provider exposes a single async function `fetchGlobalLocationAndWeather`
  that requests location permissions, reverse-geocodes the coordinates and
  fetches normalized weather from the backend.
*/

import React, { createContext, useContext, useState, useCallback } from "react";
import * as Location from "expo-location";
import apiClient from "../api/client";

interface WeatherContextType {
  currentCity: string;
  weatherData: any | null;
  isLoadingWeather: boolean;
  fetchGlobalLocationAndWeather: () => Promise<void>;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentCity, setCurrentCity] = useState<string>("Buscando...");
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  const fetchGlobalLocationAndWeather = useCallback(async () => {
    // Fetch current device location and query the backend for normalized weather.
    setIsLoadingWeather(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentCity("Sin Permisos");
        setIsLoadingWeather(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      const results = await Promise.allSettled([
        Location.reverseGeocodeAsync({ latitude, longitude }),
        apiClient.get("/weather/current-coord", {
          params: { lat: latitude, lon: longitude },
        }),
      ]);

      if (results[0].status === "fulfilled" && results[0].value.length > 0) {
        const geo = results[0].value[0];
        setCurrentCity(
          geo.city || geo.subregion || geo.region || "Desconocido",
        );
      }

      if (results[1].status === "fulfilled") {
        setWeatherData(results[1].value.data);
      }
    } catch (error) {
      console.warn("Error en el contexto global de clima:", error);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  return (
    <WeatherContext.Provider
      value={{
        currentCity,
        weatherData,
        isLoadingWeather,
        fetchGlobalLocationAndWeather,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context)
    throw new Error("useWeather debe usarse dentro de WeatherProvider");
  return context;
};
