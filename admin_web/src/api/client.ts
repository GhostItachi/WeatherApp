import axios from "axios";

// 1. Manejo dinámico de la URL.
// Si usas Vite, utiliza import.meta.env.VITE_API_URL.
// Si usas Create React App, sería process.env.REACT_APP_API_URL.
const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de peticiones: Adjunta el token JWT y registra la salida.
apiClient.interceptors.request.use(
  (config) => {
    // A diferencia de AsyncStorage, localStorage es síncrono, por lo que no necesitamos async/await aquí.
    const token = localStorage.getItem("admin_token");
    const method = config.method?.toUpperCase();
    const url = config.url;

    // Emulamos la metodología de tu servicio Logger
    console.info(`[API] ⬆️ Petición Saliente: ${method} -> ${url}`, {
      params: config.params,
    });

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("[API] ❌ Error en la configuración de la petición", error);
    return Promise.reject(error);
  },
);

// Interceptor de respuestas: Centraliza los logs de éxito y el manejo global de errores (ej. tokens expirados).
apiClient.interceptors.response.use(
  (response) => {
    console.debug(
      `[API] ✅ Respuesta Exitosa [${response.status}] de: ${response.config.url}`,
    );
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    console.error(
      `[API] 🚨 Fallo en la comunicación [${status || "NETWORK_ERROR"}]`,
      {
        metodo: method,
        url: url,
        mensaje: error.message,
        respuesta_servidor: error.response?.data,
      },
    );

    // Limpieza de sesión centralizada ante un 401 Unauthorized
    if (status === 401) {
      console.warn(
        "[AUTH] 🔒 Token expirado o inválido. Limpiando sesión local...",
      );
      localStorage.removeItem("admin_token");

      // Si usas otras llaves (como userRole), puedes usar localStorage.clear()
      // de la misma manera que usaste AsyncStorage.multiRemove()
    }

    return Promise.reject(error);
  },
);

export default apiClient;
