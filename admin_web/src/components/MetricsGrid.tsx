interface Stats {
  total_users: number;
  total_favorites: number;
  system_status: string;
}

export default function MetricsGrid({ stats }: { stats: Stats | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Usuarios Registrados
        </p>
        <p className="text-3xl font-mono font-bold text-indigo-400 mt-2">
          {stats ? stats.total_users : "..."}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Ciudades en Favoritos
        </p>
        <p className="text-3xl font-mono font-bold text-purple-400 mt-2">
          {stats ? stats.total_favorites : "..."}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Estado del Servidor
        </p>
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`w-3 h-3 rounded-full ${stats?.system_status === "online" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
          />
          <p className="text-xl font-mono font-bold uppercase text-slate-200">
            {stats ? stats.system_status : "Checking..."}
          </p>
        </div>
      </div>
    </div>
  );
}
