import { useEffect, useState } from "react";
import { FileText, Clock, Loader2, CheckCircle, Users } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import StatCard from "@/components/StatCard";
import ComplaintTrendsChart from "@/components/ComplaintTrendsChart";
import ComplaintBarChart from "@/components/ComplaintBarChart";
import MonthlyStatsTable from "@/components/MonthlyStatsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Complaint {
  id: string;
  ticket_number: string;
  reporter_name: string;
  department: string;
  status: "pending" | "processing" | "completed";
  reported_at: string;
}

interface Stats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  adminCount: number;
}

const statusLabels = {
  pending: "Belum Diproses",
  processing: "Sedang Diproses",
  completed: "Selesai",
};

const statusVariants = {
  pending: "destructive",
  processing: "default",
  completed: "success",
} as const;

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    adminCount: 0,
  });
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch complaints
      const { data: complaints } = await supabase
        .from("complaints")
        .select("*")
        .order("reported_at", { ascending: false });

      if (complaints) {
        const pending = complaints.filter((c) => c.status === "pending").length;
        const processing = complaints.filter((c) => c.status === "processing").length;
        const completed = complaints.filter((c) => c.status === "completed").length;

        setStats({
          total: complaints.length,
          pending,
          processing,
          completed,
          adminCount: 0,
        });

        setRecentComplaints(complaints.slice(0, 5));
      }

      // Fetch admin count
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setStats((prev) => ({ ...prev, adminCount: count || 0 }));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Pengaduan"
            value={stats.total}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Belum Diproses"
            value={stats.pending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Sedang Diproses"
            value={stats.processing}
            icon={Loader2}
            variant="info"
          />
          <StatCard
            title="Selesai Diproses"
            value={stats.completed}
            icon={CheckCircle}
            variant="success"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ComplaintTrendsChart />
          <ComplaintBarChart />
        </div>

        {/* Monthly Statistics Table */}
        <MonthlyStatsTable />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Reports */}
          <Card className="xl:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Pengaduan Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {recentComplaints.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada pengaduan
                </p>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No. Pengaduan</TableHead>
                          <TableHead>Nama Pelapor</TableHead>
                          <TableHead>Departemen</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentComplaints.map((complaint) => (
                          <TableRow key={complaint.id}>
                            <TableCell className="font-medium">
                              {complaint.ticket_number}
                            </TableCell>
                            <TableCell>{complaint.reporter_name}</TableCell>
                            <TableCell>{complaint.department}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariants[complaint.status]}>
                                {statusLabels[complaint.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(complaint.reported_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {recentComplaints.map((complaint) => (
                      <div key={complaint.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary text-sm">{complaint.ticket_number}</span>
                          <Badge variant={statusVariants[complaint.status]} className="text-xs">
                            {statusLabels[complaint.status]}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Pelapor</p>
                            <p className="font-medium truncate">{complaint.reporter_name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Departemen</p>
                            <p className="font-medium truncate">{complaint.department}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(complaint.reported_at)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Admin Count */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Akun Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="p-4 bg-primary/10 rounded-full inline-block mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-4xl font-bold text-foreground">{stats.adminCount}</p>
                  <p className="text-muted-foreground mt-1">Total Admin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;