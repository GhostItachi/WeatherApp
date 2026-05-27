interface Log {
  id: number;
  level: string;
  message: string;
  user_email: string | null;
  created_at: string;
}

interface LogConsoleProps {
  logs: Log[];
  activeTab: "auth" | "api";
  setActiveTab: (tab: "auth" | "api") => void;
  onRefresh: () => void | Promise<void>;
}

// CSV export stays outside the component so it is easy to test and reuse.
const exportToCSV = (logs: Log[], type: "auth" | "api") => {
  if (logs.length === 0) return;

  const headers = ["ID", "Fecha_Hora", "Nivel", "Mensaje", "Usuario_Email"];

  // Quoted values keep commas and embedded quotes from breaking CSV columns.
  const rows = logs.map((log) => [
    log.id,
    `"${new Date(log.created_at).toLocaleString()}"`,
    `"${log.level}"`,
    `"${log.message.replace(/"/g, '""')}"`,
    `"${log.user_email || "N/A"}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join(
    "\n",
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // A temporary link lets the browser download the generated Blob.
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `audit_logs_${type}_${new Date().toISOString().split("T")[0]}.csv`,
  );
  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function LogConsole({
  logs,
  activeTab,
  setActiveTab,
  onRefresh,
}: LogConsoleProps) {
  // Log levels use distinct terminal colors for fast visual scanning.
  const getLevelColor = (level: string) => {
    switch (level) {
      case "AUTH":
        return "text-purple-400";
      case "ERROR":
        return "text-red-400 font-bold";
      case "WARN":
        return "text-amber-400";
      default:
        return "text-sky-400";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold tracking-tight text-slate-200">
            Visor de Eventos del Sistema
          </span>
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab("auth")}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${activeTab === "auth" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              Autenticación (AUTH)
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${activeTab === "api" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              Tráfico API (Técnicos)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono px-3 py-2 rounded-lg text-slate-300 cursor-pointer transition-colors"
          >
            [RELOAD DATA]
          </button>

          <button
            onClick={() => exportToCSV(logs, activeTab)}
            disabled={logs.length === 0}
            className="bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-400 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed text-xs font-mono px-3 py-2 rounded-lg cursor-pointer transition-colors"
          >
            [EXPORT TO CSV]
          </button>
        </div>
      </div>

      <div className="p-4 bg-black/40 font-mono text-xs overflow-y-auto flex-1 space-y-2 scrollbar">
        {logs.length === 0 ? (
          <p className="text-slate-600 italic text-center pt-8">
            [No se encontraron registros en este segmento]
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="border-b border-slate-950/40 pb-1 flex flex-col md:flex-row md:items-start gap-2 hover:bg-slate-900/40 px-2 rounded"
            >
              <span className="text-slate-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleString()}
              </span>
              <span className={`min-w-[60px] ${getLevelColor(log.level)}`}>
                [{log.level}]
              </span>
              <span className="text-slate-300 flex-1">{log.message}</span>
              {log.user_email && (
                <span className="text-slate-500 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {log.user_email}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
