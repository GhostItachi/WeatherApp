/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import MetricsGrid from "../components/MetricsGrid";
import LogConsole from "../components/LogConsole";
import TopCitiesChart from "../components/TopCitiesChart";
import UsersByCityChart from "../components/UsersByCityChart";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [topCities, setTopCities] = useState([]);
  const [usersDistribution, setUsersDistribution] = useState([]);
  const [activeTab, setActiveTab] = useState<"auth" | "api">("auth");
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.clear();
    navigate("/login");
  }, [navigate]);

  const handleManualRefresh = useCallback(async () => {
    try {
      const [statsRes, logsRes, citiesRes, distRes] = await Promise.all([
        apiClient.get("/users/stats"),
        apiClient.get(`/users/logs?type=${activeTab}`),
        apiClient.get("/users/top-cities"),
        apiClient.get("/users/users-distribution"),
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data);
      setTopCities(citiesRes.data);
      setUsersDistribution(distRes.data);
    } catch (err: any) {
      console.error("Error en recarga manual:", err);
      if (err.response?.status === 401) handleLogout();
    }
  }, [activeTab, handleLogout]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        // Dashboard cards, logs, and charts load in parallel to reduce wait time.
        const [statsRes, logsRes, citiesRes, distRes] = await Promise.all([
          apiClient.get("/users/stats"),
          apiClient.get(`/users/logs?type=${activeTab}`),
          apiClient.get("/users/top-cities"),
          apiClient.get("/users/users-distribution"),
        ]);

        if (isMounted) {
          setStats(statsRes.data);
          setLogs(logsRes.data);
          setTopCities(citiesRes.data);
          setUsersDistribution(distRes.data);
        }
      } catch (err: any) {
        console.error(`[ERROR TELEMETRÍA]: ${err}`);
        if (err.response?.status === 401 && isMounted) {
          handleLogout();
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [activeTab, handleLogout]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold">
            &gt;
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-100">
            WeatherApp Admin Terminal
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 text-red-400 text-xs font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
        >
          [LOGOUT]
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <MetricsGrid stats={stats} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TopCitiesChart data={topCities} />
          <UsersByCityChart data={usersDistribution} />
        </div>

        <div className="w-full">
          <LogConsole
            logs={logs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onRefresh={handleManualRefresh}
          />
        </div>
      </main>
    </div>
  );
}
