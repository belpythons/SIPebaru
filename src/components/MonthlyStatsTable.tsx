import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyData {
  month: string;
  monthLabel: string;
  pending: number;
  processing: number;
  completed: number;
  total: number;
}

const MonthlyStatsTable = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyData();
  }, []);

  const fetchMonthlyData = async () => {
    try {
      const { data: complaints } = await supabase
        .from("complaints")
        .select("reported_at, status")
        .order("reported_at", { ascending: false });

      if (complaints) {
        // Group by month
        const monthlyMap = new Map<string, { pending: number; processing: number; completed: number }>();

        complaints.forEach((complaint) => {
          const date = new Date(complaint.reported_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { pending: 0, processing: 0, completed: 0 });
          }

          const current = monthlyMap.get(monthKey)!;
          if (complaint.status === "pending") current.pending++;
          else if (complaint.status === "processing") current.processing++;
          else if (complaint.status === "completed") current.completed++;
        });

        // Convert to array and format
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];

        const data: MonthlyData[] = Array.from(monthlyMap.entries())
          .map(([month, stats]) => {
            const [year, monthNum] = month.split("-");
            const monthIndex = parseInt(monthNum) - 1;
            return {
              month,
              monthLabel: `${monthNames[monthIndex]} ${year}`,
              pending: stats.pending,
              processing: stats.processing,
              completed: stats.completed,
              total: stats.pending + stats.processing + stats.completed,
            };
          })
          .sort((a, b) => b.month.localeCompare(a.month))
          .slice(0, 12); // Show last 12 months

        setMonthlyData(data);
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Statistik Bulanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Statistik Bulanan</CardTitle>
      </CardHeader>
      <CardContent>
        {monthlyData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Belum ada data
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-center">Belum Diproses</TableHead>
                  <TableHead className="text-center">Sedang Diproses</TableHead>
                  <TableHead className="text-center">Selesai</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.monthLabel}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-destructive/10 text-destructive font-medium">
                        {row.pending}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                        {row.processing}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-md bg-secondary text-secondary-foreground font-medium">
                        {row.completed}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold">{row.total}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyStatsTable;
