import axios from "axios";

// Admin web API client
//
// Configures Axios to attach the admin JWT and centralizes response handling
// for the dashboard. UI strings remain Spanish while comments are English.
// Vite exposes the API base URL through import.meta.env during development and builds.
const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Requests attach the admin JWT and log outgoing traffic for dashboard debugging.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_token");
    const method = config.method?.toUpperCase();
    const url = config.url;

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

// Responses centralize success logs and expired-session cleanup.
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

    if (status === 401) {
      console.warn(
        "[AUTH] 🔒 Token expirado o inválido. Limpiando sesión local...",
      );
      localStorage.removeItem("admin_token");
    }

    return Promise.reject(error);
  },
);

export default apiClient;
