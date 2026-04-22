import axios from "axios";

// Check for the environment variable to avoid silent failures on mobile
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  // Warn the developer if the IP is not set for mobile testing
  console.warn(
    "WARNING: EXPO_PUBLIC_API_BASE_URL is not defined. " +
      "The app will fallback to localhost, which might not work on physical devices using Expo Go.",
  );
}

// This Axios client keeps the base URL and default JSON headers in one place.
const apiClient = axios.create({
  // Fallback to localhost only if the variable is missing
  baseURL: API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

/* Note: We now log a warning instead of just failing, 
   helping to debug connection issues on physical devices.
*/

export default apiClient;
