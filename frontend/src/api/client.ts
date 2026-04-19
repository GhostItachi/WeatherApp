import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://192.168.101.76:8000", //IP local de mi WiFi (Casa)
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
