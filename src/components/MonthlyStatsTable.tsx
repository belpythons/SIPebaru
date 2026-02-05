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
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Statistik Bulanan
        </CardTitle>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-full sm:w-32">
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
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold w-32">Status</TableHead>
                    {monthlyData.map((row) => (
                      <TableHead key={row.month} className="text-center font-semibold text-xs px-2">
                        {row.monthLabel.substring(0, 3)}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-primary/10">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Pending Row */}
                  <TableRow className="bg-background">
                    <TableCell className="font-medium text-destructive">Belum Diproses</TableCell>
                    {monthlyData.map((row) => (
                      <TableCell key={row.month} className="text-center px-2">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-semibold ${
                          row.pending > 0 
                            ? "bg-destructive/15 text-destructive" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {row.pending}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center bg-primary/5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold bg-destructive text-destructive-foreground">
                        {totals.pending}
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* Processing Row */}
                  <TableRow className="bg-muted/20">
                    <TableCell className="font-medium text-primary">Sedang Diproses</TableCell>
                    {monthlyData.map((row) => (
                      <TableCell key={row.month} className="text-center px-2">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-semibold ${
                          row.processing > 0 
                            ? "bg-primary/15 text-primary" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {row.processing}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center bg-primary/5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                        {totals.processing}
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* Completed Row */}
                  <TableRow className="bg-background">
                    <TableCell className="font-medium text-green-600">Selesai</TableCell>
                    {monthlyData.map((row) => (
                      <TableCell key={row.month} className="text-center px-2">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-semibold ${
                          row.completed > 0 
                            ? "bg-green-100 text-green-700" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {row.completed}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center bg-primary/5">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                        {totals.completed}
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* Total Row */}
                  <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                    <TableCell className="font-bold text-primary">Total</TableCell>
                    {monthlyData.map((row) => (
                      <TableCell key={row.month} className="text-center px-2">
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold ${
                          row.total > 0 
                            ? "bg-foreground/10 text-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {row.total}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full text-xs font-bold bg-foreground text-background">
                        {totals.total}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border bg-destructive/10">
                  <p className="text-xs text-muted-foreground">Belum Diproses</p>
                  <p className="text-xl font-bold text-destructive">{totals.pending}</p>
                </div>
                <div className="p-3 rounded-lg border bg-primary/10">
                  <p className="text-xs text-muted-foreground">Sedang Diproses</p>
                  <p className="text-xl font-bold text-primary">{totals.processing}</p>
                </div>
                <div className="p-3 rounded-lg border bg-green-100">
                  <p className="text-xs text-muted-foreground">Selesai</p>
                  <p className="text-xl font-bold text-green-600">{totals.completed}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-foreground">{totals.total}</p>
                </div>
              </div>

              {/* Monthly Breakdown - Horizontal Scroll */}
              <div className="overflow-x-auto -mx-3 px-3">
                <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                  {monthlyData.map((row) => (
                    <div key={row.month} className="flex-shrink-0 w-16 p-2 rounded-lg border bg-card text-center">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{row.monthLabel.substring(0, 3)}</p>
                      <p className="text-sm font-bold text-foreground">{row.total}</p>
                      <div className="mt-1 space-y-0.5">
                        {row.pending > 0 && (
                          <div className="text-[10px] text-destructive">{row.pending} P</div>
                        )}
                        {row.processing > 0 && (
                          <div className="text-[10px] text-primary">{row.processing} S</div>
                        )}
                        {row.completed > 0 && (
                          <div className="text-[10px] text-green-600">{row.completed} D</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyStatsTable;
