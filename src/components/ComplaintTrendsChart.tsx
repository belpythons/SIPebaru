import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Complaint } from "@/lib/types";

interface Props {
  data: Complaint[];
}

interface ChartData {
  date: string;
  count: number;
}

const chartConfig = {
  count: {
    label: "Pengaduan",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const ComplaintTrendsChart = ({ data }: Props) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const departments = useMemo(
    () => [...new Set(data.map((c) => c.department))].sort(),
    [data]
  );

  const chartData = useMemo<ChartData[]>(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Filter by department if needed
    const filtered = data.filter((c) => {
      if (selectedDepartment !== "all" && c.department !== selectedDepartment) return false;
      return new Date(c.reported_at) >= thirtyDaysAgo;
    });

    // Generate all dates in the range
    const dateRange = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() });

    // Count complaints per day
    const countsByDate = new Map<string, number>();
    dateRange.forEach((date) => countsByDate.set(format(date, "yyyy-MM-dd"), 0));

    filtered.forEach((complaint) => {
      const dateKey = format(new Date(complaint.reported_at), "yyyy-MM-dd");
      if (countsByDate.has(dateKey)) {
        countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
      }
    });

    return Array.from(countsByDate.entries()).map(([date, count]) => ({
      date: format(new Date(date), "dd MMM", { locale: idLocale }),
      count,
    }));
  }, [data, selectedDepartment]);

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
        <CardTitle className="text-base sm:text-lg">Tren Pengaduan (30 Hari)</CardTitle>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Pilih Unit Kerja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Unit Kerja</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground">
            Tidak ada data untuk ditampilkan
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickMargin={4}
                width={30}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-count)"
                strokeWidth={2}
                dot={{ fill: "var(--color-count)", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplaintTrendsChart;
