import axios from "axios";
import Constants from 'expo-constants';

const detectedIp = Constants.expoConfig?.extra?.backendIp || "localhost";
const API_BASE_URL = `http://${detectedIp}:8000`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
