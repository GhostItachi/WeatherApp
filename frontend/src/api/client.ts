import axios from "axios";
import Constants from 'expo-constants';

// Accedemos a la IP que inyectamos en app.config.js
// Si por alguna razón no la detecta, cae a localhost como respaldo
const detectedIp = Constants.expoConfig?.extra?.backendIp || "localhost";
const API_BASE_URL = `http://${detectedIp}:8000`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
