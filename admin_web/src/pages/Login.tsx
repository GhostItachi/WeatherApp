import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      setLoading(false);
      return;
    }

    try {
      // FastAPI OAuth2PasswordRequestForm expects URL-encoded username/password fields.
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await apiClient.post("/users/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, role } = response.data;

      // The web dashboard accepts only admin accounts.
      if (role !== "admin") {
        setError("Acceso denegado. No tienes permisos de administrador.");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin_token", access_token);
      localStorage.setItem("admin_role", role);

      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.response) {
        const det = err.response.data?.detail || "Credenciales incorrectas.";
        setError(`[${err.response.status}]: ${det}`);
      } else {
        setError("Error de conexión con el servidor de FastAPI.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
            <span className="text-xl font-mono">&gt;_</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-50 tracking-tight">
            Consola de Mando
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ingresa tus credenciales de administrador
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg font-mono">
              [ERROR]: {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              placeholder="admin@weatherapp.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium py-3 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center"
          >
            {loading ? "Autenticando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
