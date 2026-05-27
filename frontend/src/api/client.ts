import axios from "axios";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Logger from "../services/logger";

const detectedIp = Constants.expoConfig?.extra?.backendIp || "localhost";
const API_BASE_URL = `http://${detectedIp}:8000`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor attaches the stored token and records outbound API calls.
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    const method = config.method?.toUpperCase();
    const url = config.url;

    Logger.info(`Petición Saliente: ${method} -> ${url}`, {
      headers: config.headers,
      params: config.params,
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    Logger.error("Error en la configuración de la petición", error);
    return Promise.reject(error);
  },
);

// Response interceptor centralizes API logging and expired-token cleanup.
apiClient.interceptors.response.use(
  (response) => {
    Logger.debug(
      `Respuesta Exitosa [${response.status}] de: ${response.config.url}`,
      {
        data: response.data,
      },
    );
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    Logger.error(
      `Fallo en la comunicación con la API [${status || "NETWORK_ERROR"}]`,
      {
        metodo: method,
        url: url,
        mensaje: error.message,
        respuesta_servidor: error.response?.data,
      },
    );

    if (status === 401) {
      Logger.auth("Token expirado o inválido. Limpiando sesión local...");
      await AsyncStorage.multiRemove(["userToken", "userRole"]);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
