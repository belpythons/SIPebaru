import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, Edit, Search, ChevronLeft, ChevronRight, Trash2, CalendarIcon, X, Eye } from "lucide-react";
import AddComplaintDialog from "@/components/AddComplaintDialog";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole, canWriteComplaints } from "@/hooks/useUserRole";

interface Complaint {
  id: string;
  ticket_number: string;
  complaint_code?: string;
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
  processing: "info",
  completed: "success",
} as const;

const ITEMS_PER_PAGE = 10;

const Complaints = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processing" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState<Complaint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Role-based UI control — viewers see read-only interface
  const { role } = useUserRole();
  const canWrite = canWriteComplaints(role);

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

  // Reset page when tab, search, or date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterDate]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteClick = (complaint: Complaint) => {
    setComplaintToDelete(complaint);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!complaintToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("complaints")
        .delete()
        .eq("id", complaintToDelete.id);

      if (error) throw error;

      toast.success("Pengaduan berhasil dihapus");
      fetchComplaints();
    } catch (error) {
      console.error("Error deleting complaint:", error);
      toast.error("Gagal menghapus pengaduan");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setComplaintToDelete(null);
    }
  };

  const filteredComplaints = complaints
    .filter((c) => activeTab === "all" ? true : c.status === activeTab)
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        c.ticket_number.toLowerCase().includes(query) ||
        (c.complaint_code?.toLowerCase().includes(query) ?? false) ||
        c.reporter_name.toLowerCase().includes(query) ||
        c.department.toLowerCase().includes(query) ||
        c.item_name.toLowerCase().includes(query)
      );
    })
    .filter((c) => {
      if (!filterDate) return true;
      const reportedDate = new Date(c.reported_at);
      return (
        reportedDate.getFullYear() === filterDate.getFullYear() &&
        reportedDate.getMonth() === filterDate.getMonth() &&
        reportedDate.getDate() === filterDate.getDate()
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

  // Mobile card view for complaints
  const ComplaintCard = ({ complaint }: { complaint: Complaint }) => (
    <div className="p-4 border rounded-lg space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-primary text-lg tracking-wide">{complaint.complaint_code || "-"}</span>
          <p className="text-xs text-muted-foreground">{complaint.ticket_number}</p>
        </div>
        <Badge variant={statusVariants[complaint.status]}>
          {statusLabels[complaint.status]}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Pelapor</p>
          <p className="font-medium truncate">{complaint.reporter_name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Departemen</p>
          <p className="font-medium truncate">{complaint.department}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Barang</p>
          <p className="font-medium truncate">{complaint.item_name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Jumlah</p>
          <p className="font-medium">{complaint.quantity}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tgl Lapor</p>
          <p className="font-medium">{formatDate(complaint.reported_at)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tgl Selesai</p>
          <p className="font-medium">{complaint.processed_at ? formatDate(complaint.processed_at) : "-"}</p>
        </div>
      </div>
      {/* Action buttons — hidden for viewer role (read-only access) */}
      <div className="flex gap-2">
        {canWrite ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
              className="flex-1 gap-1"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteClick(complaint)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
            className="flex-1 gap-1"
          >
            <Eye className="h-4 w-4" />
            Lihat Detail
          </Button>
        )}
      </div>
    </div>
  );

  const ComplaintsTable = ({ data }: { data: Complaint[] }) => (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>No. Urut</TableHead>
              <TableHead>Tanggal Lapor</TableHead>
              <TableHead>Tanggal Selesai</TableHead>
              <TableHead>Nama Pemohon</TableHead>
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
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "Tidak ada data yang cocok" : "Tidak ada data"}
                </TableCell>
              </TableRow>
            ) : (
              data.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-bold text-primary tracking-wide">{complaint.complaint_code || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{complaint.ticket_number}</TableCell>
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
                    <div className="flex items-center justify-center gap-2">
                      {/* Action buttons — conditionally rendered based on role */}
                      {canWrite ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
                            className="gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(complaint)}
                            className="gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Lihat
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {data.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            {searchQuery ? "Tidak ada data yang cocok" : "Tidak ada data"}
          </p>
        ) : (
          data.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))
        )}
      </div>
    </>
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
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari no. pengaduan, nama..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal gap-2",
                    filterDate && "text-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {filterDate ? format(filterDate, "d MMM yyyy", { locale: id }) : "Filter Tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {filterDate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterDate(undefined)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {/* Add Complaint button — hidden for viewer role */}
            {canWrite && <AddComplaintDialog onSuccess={fetchComplaints} />}
          </div>
        </div>

        {/* Read-only banner for viewer role */}
        {!canWrite && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Anda login sebagai <strong>Viewer</strong>. Anda hanya dapat melihat data, tidak dapat mengedit atau menghapus.
            </p>
          </div>
        )}

        <Card className="shadow-card">
          <CardHeader className="pb-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-4">
                  Semua
                  <Badge variant="neutral" className="ml-1 text-xs">
                    {complaints.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm px-2 sm:px-4">
                  <span className="hidden sm:inline">Belum Diproses</span>
                  <span className="sm:hidden">Pending</span>
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {complaints.filter((c) => c.status === "pending").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="processing" className="text-xs sm:text-sm px-2 sm:px-4">
                  <span className="hidden sm:inline">Sedang Diproses</span>
                  <span className="sm:hidden">Proses</span>
                  <Badge variant="info" className="ml-1 text-xs">
                    {complaints.filter((c) => c.status === "processing").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-4">
                  Selesai
                  <Badge variant="success" className="ml-1 text-xs">
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
                  {(searchQuery.trim() || filterDate) && (
                    <span className="font-medium text-primary ml-1">
                      (Total hasil {searchQuery.trim() ? "pencarian" : "filter"}: {filteredComplaints.length})
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="gap-1 px-2 sm:px-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </Button>

                  <div className="hidden sm:flex items-center gap-1">
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

                  <span className="sm:hidden text-sm text-muted-foreground">
                    {currentPage}/{totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="gap-1 px-2 sm:px-3"
                  >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog — only rendered for write-capable roles */}
      {canWrite && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus pengaduan{" "}
                <span className="font-semibold">{complaintToDelete?.ticket_number}</span>?
                <br />
                Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  "Hapus"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AdminLayout>
  );
};

export default Complaints;
