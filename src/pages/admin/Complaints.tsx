import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Edit } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  item_name: string;
  quantity: number;
  description: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
  processed_at: string | null;
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

const Complaints = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "processing" | "completed">("pending");

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
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
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

  const filteredComplaints = complaints.filter((c) => c.status === activeTab);

  const ComplaintsTable = ({ data }: { data: Complaint[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No. Pengaduan</TableHead>
          <TableHead>Tanggal Lapor</TableHead>
          <TableHead>Tanggal Selesai</TableHead>
          <TableHead>Nama Pelapor</TableHead>
          <TableHead>Departemen</TableHead>
          <TableHead>Nama Barang</TableHead>
          <TableHead className="text-center">Jumlah</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              Tidak ada data
            </TableCell>
          </TableRow>
        ) : (
          data.map((complaint) => (
            <TableRow key={complaint.id}>
              <TableCell className="font-medium">{complaint.ticket_number}</TableCell>
              <TableCell>{formatDate(complaint.reported_at)}</TableCell>
              <TableCell>
                {complaint.processed_at ? formatDate(complaint.processed_at) : "-"}
              </TableCell>
              <TableCell>{complaint.reporter_name}</TableCell>
              <TableCell>{complaint.department}</TableCell>
              <TableCell>{complaint.item_name}</TableCell>
              <TableCell className="text-center">{complaint.quantity}</TableCell>
              <TableCell>
                <Badge variant={statusVariants[complaint.status]}>
                  {statusLabels[complaint.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
                  className="gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

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
        <h1 className="text-2xl font-bold text-foreground">Data Pengaduan</h1>

        <Card className="shadow-card">
          <CardHeader className="pb-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="pending" className="gap-2">
                  Belum Diproses
                  <Badge variant="destructive" className="ml-1">
                    {complaints.filter((c) => c.status === "pending").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="processing" className="gap-2">
                  Sedang Diproses
                  <Badge variant="default" className="ml-1">
                    {complaints.filter((c) => c.status === "processing").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Selesai
                  <Badge variant="secondary" className="ml-1">
                    {complaints.filter((c) => c.status === "completed").length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <ComplaintsTable data={filteredComplaints} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Complaints;