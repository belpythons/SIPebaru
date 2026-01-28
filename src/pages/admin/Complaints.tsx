import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Edit, Search, ChevronLeft, ChevronRight } from "lucide-react";
import AddComplaintDialog from "@/components/AddComplaintDialog";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const ITEMS_PER_PAGE = 10;

const Complaints = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "processing" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchComplaints = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const filteredComplaints = complaints
    .filter((c) => c.status === activeTab)
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        c.ticket_number.toLowerCase().includes(query) ||
        c.reporter_name.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query) ||
        c.item_name.toLowerCase().includes(query)
      );
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedComplaints = filteredComplaints.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

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
              {searchQuery ? "Tidak ada data yang cocok" : "Tidak ada data"}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">Data Pengaduan</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari no. pengaduan, nama, departemen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <AddComplaintDialog onSuccess={fetchComplaints} />
          </div>
        </div>

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
              <ComplaintsTable data={paginatedComplaints} />
            </div>

            {/* Pagination */}
            {filteredComplaints.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredComplaints.length)} dari {filteredComplaints.length} data
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, index) =>
                      typeof page === "number" ? (
                        <Button
                          key={index}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={index} className="px-2 text-muted-foreground">
                          {page}
                        </span>
                      )
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="gap-1"
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Complaints;
