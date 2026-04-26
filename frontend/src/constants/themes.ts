// These theme presets change the UI colors based on the weather description.
export const weatherThemes = {
  clear: {
    name: "clear",
    primary: ["#f59e0b", "#fbbf24"] as const,
    secondary: "#fef3c7",
    accent: "#b45309",
    statusBarStyle: "light" as const,
  },
  clouds: {
    name: "clouds",
    primary: ["#64748b", "#94a3b8"] as const,
    secondary: "#f1f5f9",
    accent: "#1e293b",
    statusBarStyle: "light" as const,
  },
  rain: {
    name: "rain",
    primary: ["#3b82f6", "#1d4ed8"] as const,
    secondary: "#dbeafe",
    accent: "#1e3a8a",
    statusBarStyle: "light" as const,
  },
  thunderstorm: {
    name: "thunderstorm",
    primary: ["#4338ca", "#312e81"] as const,
    secondary: "#e0e7ff",
    accent: "#1e1b4b",
    statusBarStyle: "light" as const,
  },
  snow: {
    name: "snow",
    primary: ["#0ea5e9", "#7dd3fc"] as const,
    secondary: "#f0f9ff",
    accent: "#0369a1",
    statusBarStyle: "light" as const,
  },
  default: {
    name: "default",
    primary: ["#0ea5e9", "#2563eb"] as const,
    secondary: "#f1f5f9",
    accent: "#0369a1",
    statusBarStyle: "light" as const,
  },
};

// This helper maps weather words to one of the theme presets above.
export const getWeatherTheme = (description: string = "") => {
  const desc = description.toLowerCase();

  if (
    desc.includes("clear") ||
    desc.includes("cielo claro") ||
    desc.includes("sol")
  )
    return weatherThemes.clear;

  if (
    desc.includes("cloud") ||
    desc.includes("nubes") ||
    desc.includes("nublado") ||
    desc.includes("bruma") ||
    desc.includes("niebla")
  )
    return weatherThemes.clouds;

  if (
    desc.includes("rain") ||
    desc.includes("lluvia") ||
    desc.includes("llovizna") ||
    desc.includes("chubascos")
  )
    return weatherThemes.rain;

  if (desc.includes("thunder") || desc.includes("tormenta"))
    return weatherThemes.thunderstorm;

  if (desc.includes("snow") || desc.includes("nieve"))
    return weatherThemes.snow;

  return weatherThemes.default;
};
