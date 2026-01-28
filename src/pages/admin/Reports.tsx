import { useEffect, useState } from "react";
import { Loader2, FileDown, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const Reports = () => {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
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
    setCurrentPage(1); // Reset to first page on filter
    setStats({
      pending: filtered.filter((c) => c.status === "pending").length,
      processing: filtered.filter((c) => c.status === "processing").length,
      completed: filtered.filter((c) => c.status === "completed").length,
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedComplaints = filteredComplaints.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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

  const formatDateFull = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const downloadCSV = () => {
    // BOM for UTF-8
    const BOM = "\uFEFF";
    
    const headers = [
      "No",
      "No. Pengaduan",
      "Tanggal Lapor",
      "Tanggal Selesai",
      "Nama Pelapor",
      "Departemen",
      "Nama Barang",
      "Jumlah",
      "Keterangan",
      "Status"
    ];
    
    const rows = filteredComplaints.map((c, index) => [
      index + 1,
      c.ticket_number,
      formatDate(c.reported_at),
      c.processed_at ? formatDate(c.processed_at) : "-",
      c.reporter_name,
      c.department,
      c.item_name,
      c.quantity,
      c.description || "-",
      statusLabels[c.status],
    ]);

    // Create CSV with proper escaping
    const csvContent = BOM + [
      headers.join(";"),
      ...rows.map((row) => 
        row.map(cell => {
          const cellStr = String(cell);
          // Escape quotes and wrap in quotes if contains special chars
          if (cellStr.includes(";") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(";")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-pengaduan-${dateRange.from}-${dateRange.to}.csv`;
    link.click();

    toast({
      title: "Download berhasil",
      description: "File Excel (CSV) berhasil diunduh",
    });
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN PENGADUAN BARANG", doc.internal.pageSize.width / 2, 15, { align: "center" });

    // Period
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Periode: ${formatDateFull(dateRange.from)} - ${formatDateFull(dateRange.to)}`,
      doc.internal.pageSize.width / 2,
      22,
      { align: "center" }
    );

    // Summary stats
    doc.setFontSize(9);
    const statsText = `Total: ${filteredComplaints.length} | Belum Diproses: ${stats.pending} | Sedang Diproses: ${stats.processing} | Selesai: ${stats.completed}`;
    doc.text(statsText, doc.internal.pageSize.width / 2, 28, { align: "center" });

    // Table
    const tableData = filteredComplaints.map((c, index) => [
      index + 1,
      c.ticket_number,
      formatDate(c.reported_at),
      c.processed_at ? formatDate(c.processed_at) : "-",
      c.reporter_name,
      c.department,
      c.item_name,
      c.quantity,
      statusLabels[c.status],
    ]);

    autoTable(doc, {
      startY: 33,
      head: [[
        "No",
        "No. Pengaduan",
        "Tgl Lapor",
        "Tgl Selesai",
        "Nama Pelapor",
        "Departemen",
        "Nama Barang",
        "Jml",
        "Status",
      ]],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 65, 148],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { halign: "center", cellWidth: 22 },
        3: { halign: "center", cellWidth: 22 },
        4: { cellWidth: 35 },
        5: { cellWidth: 30 },
        6: { cellWidth: 40 },
        7: { halign: "center", cellWidth: 12 },
        8: { halign: "center", cellWidth: 28 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Dicetak pada: ${new Date().toLocaleString("id-ID")} | Halaman ${i} dari ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    doc.save(`laporan-pengaduan-${dateRange.from}-${dateRange.to}.pdf`);

    toast({
      title: "Download berhasil",
      description: "File PDF berhasil diunduh",
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
              <Button variant="outline" onClick={downloadPDF} className="gap-2">
                <FileText className="h-4 w-4" />
                Download PDF
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
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>No. Pengaduan</TableHead>
                    <TableHead>Tanggal Lapor</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>Nama Pelapor</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Nama Barang</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedComplaints.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Tidak ada data dalam rentang tanggal ini
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedComplaints.map((complaint, index) => (
                      <TableRow key={complaint.id}>
                        <TableCell className="text-center">{startIndex + index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {complaint.ticket_number}
                        </TableCell>
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredComplaints.length)} dari {filteredComplaints.length} data
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map((page, index) => (
                      typeof page === "number" ? (
                        <Button
                          key={index}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="min-w-[2.5rem]"
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={index} className="px-2 text-muted-foreground">
                          {page}
                        </span>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
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

export default Reports;
