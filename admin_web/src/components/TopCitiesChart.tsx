import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

interface CityData {
  name: string;
  count: number;
}

export default function TopCitiesChart({ data }: { data: CityData[] }) {
  // Bar colors progress from blue to pink to separate ranked cities visually.
  const colors = ["#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6"];

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col h-[350px]">
      <div className="mb-4">
        <h3 className="text-sm font-bold tracking-tight text-slate-200">
          Top 5 Ciudades Más Populares
        </h3>
        <p className="text-slate-500 text-xs font-mono">
          Frecuencia de almacenamiento en favoritos
        </p>
      </div>

      <div className="flex-1 w-full text-xs font-mono">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic">
            [No hay datos suficientes para graficar]
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#1e293b"
              />

              <XAxis type="number" hide />

              <YAxis
                dataKey="name"
                type="category"
                // The category axis reserves space so city names do not wrap.
                tick={{
                  fill: "#94a3b8",
                  fontSize: 11,
                  textAnchor: "end",
                }}
                style={{ whiteSpace: "nowrap" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  border: "1px solid",
                  padding: "8px 12px",
                }}
                itemStyle={{ color: "#f8fafc", padding: "0px" }}
                labelStyle={{
                  color: "#94a3b8",
                  marginBottom: "4px",
                  fontWeight: "bold",
                }}
                cursor={{ fill: "rgba(30, 41, 59, 0.2)" }}
              />

              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
