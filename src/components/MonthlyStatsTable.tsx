import { useEffect, useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyData {
  month: number;
  monthLabel: string;
  pending: number;
  processing: number;
  completed: number;
  total: number;
}

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MonthlyStatsTable = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedYear]);

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    try {
      const year = parseInt(selectedYear);
      const startDate = new Date(year, 0, 1).toISOString();
      const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();

      const { data: complaints } = await supabase
        .from("complaints")
        .select("reported_at, status")
        .gte("reported_at", startDate)
        .lte("reported_at", endDate);

      // Also fetch all years for the dropdown
      const { data: allComplaints } = await supabase
        .from("complaints")
        .select("reported_at");

      if (allComplaints) {
        const years = new Set<number>();
        years.add(currentYear);
        allComplaints.forEach((c) => {
          years.add(new Date(c.reported_at).getFullYear());
        });
        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      }

      // Initialize all 12 months with zero values
      const monthlyMap = new Map<number, { pending: number; processing: number; completed: number }>();
      for (let i = 0; i < 12; i++) {
        monthlyMap.set(i, { pending: 0, processing: 0, completed: 0 });
      }

      // Fill with actual data
      if (complaints) {
        complaints.forEach((complaint) => {
          const date = new Date(complaint.reported_at);
          const monthIndex = date.getMonth();

          const current = monthlyMap.get(monthIndex)!;
          if (complaint.status === "pending") current.pending++;
          else if (complaint.status === "processing") current.processing++;
          else if (complaint.status === "completed") current.completed++;
        });
      }

      // Convert to array
      const data: MonthlyData[] = Array.from(monthlyMap.entries()).map(([monthIndex, stats]) => ({
        month: monthIndex,
        monthLabel: monthNames[monthIndex],
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        total: stats.pending + stats.processing + stats.completed,
      }));

      setMonthlyData(data);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = monthlyData.reduce(
    (acc, row) => ({
      pending: acc.pending + row.pending,
      processing: acc.processing + row.processing,
      completed: acc.completed + row.completed,
      total: acc.total + row.total,
    }),
    { pending: 0, processing: 0, completed: 0, total: 0 }
  );

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Statistik Bulanan
        </CardTitle>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Pilih tahun" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Bulan</TableHead>
                  <TableHead className="text-center font-semibold text-destructive">
                    Belum Diproses
                  </TableHead>
                  <TableHead className="text-center font-semibold text-primary">
                    Sedang Diproses
                  </TableHead>
                  <TableHead className="text-center font-semibold text-green-600">
                    Selesai
                  </TableHead>
                  <TableHead className="text-center font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((row, index) => (
                  <TableRow 
                    key={row.month}
                    className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <TableCell className="font-medium">{row.monthLabel}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-semibold ${
                        row.pending > 0 
                          ? "bg-destructive/15 text-destructive" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {row.pending}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-semibold ${
                        row.processing > 0 
                          ? "bg-primary/15 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {row.processing}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-semibold ${
                        row.completed > 0 
                          ? "bg-green-100 text-green-700" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {row.completed}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-bold ${
                        row.total > 0 
                          ? "bg-foreground/10 text-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {row.total}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                  <TableCell className="font-bold text-primary">TOTAL {selectedYear}</TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-bold bg-destructive text-destructive-foreground">
                      {totals.pending}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-bold bg-primary text-primary-foreground">
                      {totals.processing}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-bold bg-green-600 text-white">
                      {totals.completed}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-bold bg-foreground text-background">
                      {totals.total}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyStatsTable;
