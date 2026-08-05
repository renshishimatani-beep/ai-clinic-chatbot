import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "#0EA5E9",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
  "#06B6D4",
  "#A855F7",
  "#64748B",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  fontSize: "12px",
} as const;

export function MonthlyTrendChart({
  data,
}: {
  data: { label: string; total: number; answered: number; outsideHours: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="total" name="問い合わせ総数" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="answered" name="AI回答数" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="outsideHours" name="休診時間の問い合わせ" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Aggregated category data for donut: top 6 + その他
type CategorySlice = { category: string; count: number; percentage: number };

function aggregateCategories(data: CategorySlice[]): CategorySlice[] {
  // Combine アクセス + 駐車場 into a single slice
  const combined: CategorySlice[] = [];
  let accessParking = 0;
  for (const d of data) {
    if (d.category === "アクセス" || d.category === "駐車場") {
      accessParking += d.count;
    } else {
      combined.push({ ...d });
    }
  }
  if (accessParking > 0) {
    combined.push({ category: "アクセス・駐車場", count: accessParking, percentage: 0 });
  }

  const sorted = [...combined].sort((a, b) => b.count - a.count);
  const top6 = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const restCount = rest.reduce((s, d) => s + d.count, 0);
  const total = sorted.reduce((s, d) => s + d.count, 0);

  // Recalculate percentages
  const withPct = top6.map((d) => ({ ...d, percentage: total ? (d.count / total) * 100 : 0 }));
  if (restCount > 0) {
    return [...withPct, { category: "その他", count: restCount, percentage: total ? (restCount / total) * 100 : 0 }];
  }
  return withPct;
}

export function CategoryDonutChart({
  data,
}: {
  data: CategorySlice[];
}) {
  const chartData = aggregateCategories(data);
  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="w-full lg:w-1/2 flex justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              paddingAngle={2}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, _name, entry) =>
                [`${value}件 (${total ? (((value as number) / total) * 100).toFixed(1) : 0}%)`, (entry?.payload as { category?: string })?.category ?? ""] as [string, string]
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full lg:w-1/2 space-y-2">
        {chartData.map((d, i) => (
          <div key={d.category} className="flex items-center gap-3 text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="text-slate-700 flex-1">{d.category}</span>
            <span className="font-semibold text-slate-800">{d.count}件</span>
            <span className="text-slate-400 w-12 text-right text-xs">{d.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryBarChart({
  data,
}: {
  data: { category: string; count: number; percentage: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" name="件数" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HourlyChart({
  data,
}: {
  data: { hour: number; count: number; isBusinessHour: boolean }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: `${d.hour}`,
  }));

  // Find peak outside-hours hour
  const outsideHours = chartData.filter((d) => !d.isBusinessHour);
  const peakHour = outsideHours.reduce((max, h) => (h.count > max.count ? h : max), outsideHours[0] ?? chartData[0]);

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#0EA5E9] inline-block" /> 診療時間内
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#CBD5E1] inline-block" /> 休診時間
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#F59E0B] inline-block" /> ピーク時間帯
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} unit="時" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="count" name="件数" radius={[3, 3, 0, 0]}>
            {chartData.map((d, i) => {
              let fill = "#CBD5E1";
              if (d.isBusinessHour) fill = "#0EA5E9";
              if (peakHour && d.hour === peakHour.hour) fill = "#F59E0B";
              return <Cell key={i} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeekdayChart({
  data,
}: {
  data: { weekday: string; count: number; isClosed: boolean }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="weekday" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" name="件数" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isClosed ? "#F59E0B" : "#0EA5E9"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TimeTypeChart({
  data,
}: {
  data: { type: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="type" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" name="件数" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.type === "診療時間内" ? "#22C55E" : "#F59E0B"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyCategoryTrendChart({
  labels,
  data,
  categories,
}: {
  labels: string[];
  data: Record<string, number[]>;
  categories: string[];
}) {
  const chartData = labels.map((label, i) => {
    const row: Record<string, number | string> = { label };
    for (const cat of categories) {
      row[cat] = data[cat]?.[i] ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {categories.map((cat, i) => (
          <Line
            key={cat}
            type="monotone"
            dataKey={cat}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
