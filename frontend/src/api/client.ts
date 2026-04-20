import axios from "axios";

// This Axios client keeps the base URL and default JSON headers in one place.
const apiClient = axios.create({
  baseURL: "http://192.168.101.76:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
