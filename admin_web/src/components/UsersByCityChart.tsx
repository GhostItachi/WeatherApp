import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface DistributionData {
  name: string;
  value: number;
}

const COLORS = [
  "#818cf8",
  "#2dd4bf",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#6366f1",
];

export default function UsersByCityChart({
  data,
}: {
  data: DistributionData[];
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col h-[350px]">
      <div className="mb-2">
        <h3 className="text-sm font-bold tracking-tight text-slate-200">
          Distribución de Usuarios
        </h3>
        <p className="text-slate-500 text-xs font-mono">
          Usuarios únicos por ubicación
        </p>
      </div>

      <div className="flex-1 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic text-xs">
            [Sin datos de distribución]
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-[10px] font-mono text-slate-400">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
