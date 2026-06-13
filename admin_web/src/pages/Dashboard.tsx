import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import MetricsGrid from "../components/MetricsGrid";
import LogConsole from "../components/LogConsole";
import TopCitiesChart from "../components/TopCitiesChart";
import UsersByCityChart from "../components/UsersByCityChart";
import UserManagement from "../components/UserManagement"; // Injected new user-management functionality

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [topCities, setTopCities] = useState([]);
  const [usersDistribution, setUsersDistribution] = useState([]);
  const [activeTab, setActiveTab] = useState<"auth" | "api">("auth");

  // State to control the main Dashboard section (analytics or users)
  const [activeSection, setActiveSection] = useState<"analytics" | "users">(
    "analytics",
  );

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
    } catch (error: unknown) {
      console.error("Error en recarga manual:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response
          ?.status === "number" &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        handleLogout();
      }
    }
  }, [activeTab, handleLogout]);

  useEffect(() => {
    let isMounted = true;
    // Avoid calling setState synchronously in the effect body — call asynchronously instead
    const run = async () => {
      if (!isMounted) return;
      await handleManualRefresh();
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [activeTab, handleManualRefresh]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold">
            &gt;
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-100 font-mono">
            WeatherApp Admin Terminal
          </span>
        </div>

        {/* Section tab navigation */}
        <div className="hidden md:flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl font-mono text-xs">
          <button
            onClick={() => setActiveSection("analytics")}
            className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === "analytics"
                ? "bg-indigo-600 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            [MONITORIZACIÓN Y MÉTRICAS]
          </button>
          <button
            onClick={() => setActiveSection("users")}
            className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === "users"
                ? "bg-indigo-600 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            [GESTIÓN DE USUARIOS]
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-950/30 hover:bg-red-900/40 border border-red-500/20 text-red-400 text-xs font-mono px-4 py-2 rounded-lg cursor-pointer transition-colors"
        >
          [LOGOUT]
        </button>
      </header>

      {/* Navigation selector for small screens (mobile) */}
      <div className="flex md:hidden bg-slate-900 border-b border-slate-800 p-2 justify-around font-mono text-xs">
        <button
          onClick={() => setActiveSection("analytics")}
          className={`px-2 py-1 rounded ${activeSection === "analytics" ? "text-indigo-400 font-bold" : "text-slate-500"}`}
        >
          [MÉTRICAS]
        </button>
        <button
          onClick={() => setActiveSection("users")}
          className={`px-2 py-1 rounded ${activeSection === "users" ? "text-indigo-400 font-bold" : "text-slate-500"}`}
        >
          [USUARIOS]
        </button>
      </div>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* The global metrics panel remains visible across sections */}
        <MetricsGrid stats={stats} />

        {activeSection === "analytics" ? (
          /* Conditional render: Analytics section */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TopCitiesChart data={topCities} />
              <UsersByCityChart data={usersDistribution} />
            </div>

            <LogConsole
              logs={logs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onRefresh={handleManualRefresh}
            />
          </>
        ) : (
          /* Conditional render: User accounts CRUD section */
          <UserManagement />
        )}
      </main>
    </div>
  );
}
