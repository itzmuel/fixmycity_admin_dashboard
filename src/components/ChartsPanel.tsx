import { useMemo } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Issue } from "../models/issue";
import "./ChartsPanel.css";

interface ChartsPanelProps {
  issues: Issue[];
}

function getDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChartsPanel({ issues }: ChartsPanelProps) {
  // 1. Reports per day (last 30 days)
  const reportsPerDayData = useMemo(() => {
    const dayMap = new Map<string, number>();

    // Initialize last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      dayMap.set(key, 0);
    }

    // Count issues per day
    issues.forEach((issue) => {
      const date = new Date(issue.createdAt);
      const key = date.toISOString().split("T")[0];
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
    });

    return Array.from(dayMap.entries()).map(([date, count]) => ({
      date: getDateLabel(new Date(date)),
      reports: count,
    }));
  }, [issues]);

  // 2. Issues by category
  const issuesByCategoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    issues.forEach((issue) => {
      const count = (categoryMap.get(issue.category) ?? 0) + 1;
      categoryMap.set(issue.category, count);
    });

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      name: category,
      value: count,
    }));
  }, [issues]);

  // 3. Status distribution
  const statusDistributionData = useMemo(() => {
    const submitted = issues.filter((i) => i.status === "submitted").length;
    const inProgress = issues.filter((i) => i.status === "in_progress").length;
    const resolved = issues.filter((i) => i.status === "resolved").length;

    return [
      { name: "Submitted", value: submitted },
      { name: "In Progress", value: inProgress },
      { name: "Resolved", value: resolved },
    ];
  }, [issues]);

  const COLORS_PIE = ["#2196f3", "#ff9800", "#4caf50"];
  const COLOR_LINE = "#2196f3";
  const COLOR_BAR = "#673ab7";

  return (
    <div className="charts-panel">
      {/* Line Chart: Reports per day */}
      <div className="chart-container">
        <h3>Reports Over Time (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={reportsPerDayData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#757575" />
            <YAxis stroke="#757575" />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="reports"
              stroke={COLOR_LINE}
              strokeWidth={2}
              dot={{ fill: COLOR_LINE, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart: Issues by category */}
      <div className="chart-container">
        <h3>Issues by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={issuesByCategoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="name" stroke="#757575" />
            <YAxis stroke="#757575" />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="value" fill={COLOR_BAR} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart: Status distribution */}
      <div className="chart-container">
        <h3>Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusDistributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusDistributionData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
