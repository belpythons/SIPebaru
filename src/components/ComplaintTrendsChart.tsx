import { useEffect, useState } from "react";
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { id } from "date-fns/locale";

interface Complaint {
  id: string;
  department: string;
  reported_at: string;
  status: string;
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

const ComplaintTrendsChart = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("complaints")
      .select("department")
      .order("department");

    if (data) {
      const uniqueDepts = [...new Set(data.map((c) => c.department))];
      setDepartments(uniqueDepts);
    }
  };

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      // Get complaints from last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);

      let query = supabase
        .from("complaints")
        .select("id, department, reported_at, status")
        .gte("reported_at", thirtyDaysAgo.toISOString())
        .order("reported_at", { ascending: true });

      if (selectedDepartment !== "all") {
        query = query.eq("department", selectedDepartment);
      }

      const { data: complaints } = await query;

      // Generate all dates in the range
      const dateRange = eachDayOfInterval({
        start: thirtyDaysAgo,
        end: new Date(),
      });

      // Count complaints per day
      const countsByDate = new Map<string, number>();
      dateRange.forEach((date) => {
        countsByDate.set(format(date, "yyyy-MM-dd"), 0);
      });

      complaints?.forEach((complaint) => {
        const dateKey = format(new Date(complaint.reported_at), "yyyy-MM-dd");
        if (countsByDate.has(dateKey)) {
          countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
        }
      });

      // Convert to chart data
      const data: ChartData[] = Array.from(countsByDate.entries()).map(
        ([date, count]) => ({
          date: format(new Date(date), "dd MMM", { locale: id }),
          count,
        })
      );

      setChartData(data);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
        <CardTitle className="text-base sm:text-lg">Tren Pengaduan (30 Hari)</CardTitle>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Pilih Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Departemen</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {isLoading ? (
          <Skeleton className="h-[250px] sm:h-[300px] w-full" />
        ) : chartData.length === 0 ? (
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
