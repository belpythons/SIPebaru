import { useEffect, useState } from "react";
import { Loader2, FileDown, Search } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Loader2 as ProcessingIcon, CheckCircle } from "lucide-react";

interface Complaint {
  id: string;
  ticket_number: string;
  reporter_name: string;
  department: string;
  item_name: string;
  status: "pending" | "processing" | "completed";
  reported_at: string;
}

const statusLabels = {
  pending: "Belum Diproses",
  processing: "Sedang Diproses",
  completed: "Selesai",
};

const statusVariants = {
  pending: "destructive",
  processing: "default",
  completed: "secondary",
} as const;

const Reports = () => {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await supabase
        .from("complaints")
        .select("*")
        .order("reported_at", { ascending: false });

      if (data) {
        setComplaints(data);
        filterByDate(data, dateRange.from, dateRange.to);
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterByDate = (data: Complaint[], from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const filtered = data.filter((c) => {
      const reportedDate = new Date(c.reported_at);
      return reportedDate >= fromDate && reportedDate <= toDate;
    });

    setFilteredComplaints(filtered);
    setStats({
      pending: filtered.filter((c) => c.status === "pending").length,
      processing: filtered.filter((c) => c.status === "processing").length,
      completed: filtered.filter((c) => c.status === "completed").length,
    });
  };

  const handleFilter = () => {
    filterByDate(complaints, dateRange.from, dateRange.to);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const downloadCSV = () => {
    const headers = ["No. Pengaduan", "Tanggal", "Nama Pelapor", "Departemen", "Nama Barang", "Status"];
    const rows = filteredComplaints.map((c) => [
      c.ticket_number,
      formatDate(c.reported_at),
      c.reporter_name,
      c.department,
      c.item_name,
      statusLabels[c.status],
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-pengaduan-${dateRange.from}-${dateRange.to}.csv`;
    link.click();

    toast({
      title: "Download berhasil",
      description: "File CSV berhasil diunduh",
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Laporan</h1>

        {/* Filter */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Filter Laporan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="from">Dari Tanggal</Label>
                <Input
                  id="from"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">Sampai Tanggal</Label>
                <Input
                  id="to"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
              <Button onClick={handleFilter} className="gap-2">
                <Search className="h-4 w-4" />
                Tampilkan Laporan
              </Button>
              <Button variant="outline" onClick={downloadCSV} className="gap-2">
                <FileDown className="h-4 w-4" />
                Download Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Belum Diproses"
            value={stats.pending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Sedang Diproses"
            value={stats.processing}
            icon={ProcessingIcon}
            variant="info"
          />
          <StatCard
            title="Selesai Diproses"
            value={stats.completed}
            icon={CheckCircle}
            variant="success"
          />
        </div>

        {/* Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">
              Data Laporan ({filteredComplaints.length} pengaduan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pengaduan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Pelapor</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Tidak ada data dalam rentang tanggal ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComplaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="font-medium">
                          {complaint.ticket_number}
                        </TableCell>
                        <TableCell>{formatDate(complaint.reported_at)}</TableCell>
                        <TableCell>{complaint.reporter_name}</TableCell>
                        <TableCell>{complaint.department}</TableCell>
                        <TableCell>{complaint.item_name}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[complaint.status]}>
                            {statusLabels[complaint.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Reports;