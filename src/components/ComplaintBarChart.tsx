import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Complaint } from "@/lib/types";

interface Props {
  data: Complaint[];
}

interface ChartData {
  department: string;
  pending: number;
  processing: number;
  completed: number;
}

const chartConfig = {
  pending: {
    label: "Belum Diproses",
    color: "hsl(var(--destructive))",
  },
  processing: {
    label: "Sedang Diproses",
    color: "hsl(var(--primary))",
  },
  completed: {
    label: "Selesai",
    color: "hsl(var(--success))",
  },
} satisfies ChartConfig;

const ComplaintBarChart = ({ data }: Props) => {
  const chartData = useMemo<ChartData[]>(() => {
    const departmentMap = new Map<string, ChartData>();

    data.forEach((complaint) => {
      const dept = complaint.department;
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, { department: dept, pending: 0, processing: 0, completed: 0 });
      }

      const entry = departmentMap.get(dept)!;
      if (complaint.status === "pending") entry.pending++;
      else if (complaint.status === "processing") entry.processing++;
      else if (complaint.status === "completed") entry.completed++;
    });

    return Array.from(departmentMap.values()).sort(
      (a, b) =>
        b.pending + b.processing + b.completed -
        (a.pending + a.processing + a.completed)
    );
  }, [data]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Pengaduan per Unit Kerja</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground">
            Tidak ada data untuk ditampilkan
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -10, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={30}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="pending"
                fill="var(--color-pending)"
                radius={[4, 4, 0, 0]}
                stackId="stack"
              />
              <Bar
                dataKey="processing"
                fill="var(--color-processing)"
                radius={[0, 0, 0, 0]}
                stackId="stack"
              />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={[4, 4, 0, 0]}
                stackId="stack"
              />
            </BarChart>
          </ChartContainer>
        )}
        {/* Legend */}
        {chartData.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-destructive" />
              <span className="text-xs sm:text-sm text-muted-foreground">Belum Diproses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Sedang Diproses</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-success" />
              <span className="text-xs sm:text-sm text-muted-foreground">Selesai</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ComplaintBarChart;
