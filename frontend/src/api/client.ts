import axios from "axios";

// The backend base URL comes from the Expo public environment.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  // This warning helps detect a missing IP when the app runs on a real device.
  console.warn(
    "WARNING: EXPO_PUBLIC_API_BASE_URL is not defined. " +
      "The app will fallback to localhost, which might not work on physical devices using Expo Go.",
  );
}

// This shared Axios client centralizes the API base URL and default headers.
const apiClient = axios.create({
  // localhost is used only as a fallback for local development.
  baseURL: API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
