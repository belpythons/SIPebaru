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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Loader2 as ProcessingIcon, CheckCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Complaint {
  id: string;
  ticket_number: string;
  complaint_code: string;
  npk: string | null;
  reporter_name: string;
  department: string;
  item_name: string;
  quantity: number;
  description: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
  processed_at: string | null;
  completed_at: string | null;
}

const statusLabels = { pending: "Belum Diproses", processing: "Sedang Diproses", completed: "Selesai" };
const statusVariants = { pending: "destructive", processing: "default", completed: "secondary" } as const;
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
  const [stats, setStats] = useState({ pending: 0, processing: 0, completed: 0 });

  useEffect(() => { fetchComplaints(); }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await supabase.from("complaints").select("*").order("reported_at", { ascending: false });
      if (data) { setComplaints(data); filterByDate(data, dateRange.from, dateRange.to); }
    } catch (error) { console.error("Error fetching complaints:", error); } finally { setIsLoading(false); }
  };

  const filterByDate = (data: Complaint[], from: string, to: string) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    const filtered = data.filter((c) => { const d = new Date(c.reported_at); return d >= fromDate && d <= toDate; });
    setFilteredComplaints(filtered);
    setCurrentPage(1);
    setStats({
      pending: filtered.filter((c) => c.status === "pending").length,
      processing: filtered.filter((c) => c.status === "processing").length,
      completed: filtered.filter((c) => c.status === "completed").length,
    });
  };

  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedComplaints = filteredComplaints.slice(startIndex, endIndex);

  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 3) { for (let i = 1; i <= 4; i++) pages.push(i); pages.push("..."); pages.push(totalPages); }
    else if (currentPage >= totalPages - 2) { pages.push(1); pages.push("..."); for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); pages.push("..."); for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i); pages.push("..."); pages.push(totalPages); }
    return pages;
  };

  const handleFilter = () => { filterByDate(complaints, dateRange.from, dateRange.to); };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const formatDateFull = (dateStr: string) => new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  const downloadCSV = () => {
    const BOM = "\uFEFF";
    const title = "LAPORAN PENGADUAN ITEM";
    const period = `Periode: ${formatDateFull(dateRange.from)} - ${formatDateFull(dateRange.to)}`;
    const printDate = `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;

    const headers = ["No", "Kode", "No. Pengaduan", "Tanggal Lapor", "Tanggal Selesai", "NPK", "Nama Pemohon", "Unit Kerja", "Nama Item", "Jumlah", "Keterangan", "Status"];
    
    const rows = filteredComplaints.map((c, index) => [
      index + 1, c.complaint_code, c.ticket_number, formatDate(c.reported_at),
      c.completed_at ? formatDate(c.completed_at) : "-", c.npk || "-",
      c.reporter_name, c.department, c.item_name, c.quantity, c.description || "-", statusLabels[c.status],
    ]);

    const escapeCell = (cell: any) => {
      const s = String(cell);
      if (s.includes(";") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = [
      title, period, printDate, "",
      headers.join(";"),
      ...rows.map((row) => row.map(escapeCell).join(";")),
      "",
      "REKAP TOTAL",
      `Total Pengaduan;${filteredComplaints.length}`,
      `Belum Diproses;${stats.pending}`,
      `Sedang Diproses;${stats.processing}`,
      `Selesai;${stats.completed}`,
    ];

    const csvContent = BOM + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-pengaduan-${dateRange.from}-${dateRange.to}.csv`;
    link.click();
    toast({ title: "Download berhasil", description: "File Excel (CSV) berhasil diunduh" });
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN PENGADUAN ITEM", pageWidth / 2, 25, { align: "center" });

    // Period
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${formatDateFull(dateRange.from)} - ${formatDateFull(dateRange.to)}`, pageWidth / 2, 33, { align: "center" });

    // Print date
    doc.setFontSize(9);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, 39, { align: "center" });

    // Table
    const tableData = filteredComplaints.map((c, index) => [
      index + 1, c.complaint_code, c.ticket_number, formatDate(c.reported_at),
      c.completed_at ? formatDate(c.completed_at) : "-", c.npk || "-",
      c.reporter_name, c.department, c.item_name, c.quantity, statusLabels[c.status],
    ]);

    autoTable(doc, {
      startY: 45,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      head: [["No", "Kode", "No. Pengaduan", "Tgl Lapor", "Tgl Selesai", "NPK", "Nama Pemohon", "Unit Kerja", "Nama Item", "Jml", "Status"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [0, 0, 0], lineWidth: 0.1, overflow: "linebreak" },
      headStyles: { fillColor: [41, 65, 148], textColor: 255, fontStyle: "bold", halign: "center", lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 8.5 },
      bodyStyles: { lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        9: { halign: "center", cellWidth: 12 },
        10: { halign: "center", cellWidth: 20 },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Summary section after table
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    const summaryY = finalY + 12;

    const drawSummary = (y: number) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("REKAP TOTAL", margin, y);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Pengaduan   : ${filteredComplaints.length}`, margin, y + 8);
      doc.text(`Belum Diproses    : ${stats.pending}`, margin, y + 15);
      doc.text(`Sedang Diproses   : ${stats.processing}`, margin, y + 22);
      doc.text(`Selesai           : ${stats.completed}`, margin, y + 29);
    };

    if (summaryY + 35 > pageHeight - 20) {
      doc.addPage();
      drawSummary(25);
    } else {
      drawSummary(summaryY);
    }

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")} | Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save(`laporan-pengaduan-${dateRange.from}-${dateRange.to}.pdf`);
    toast({ title: "Download berhasil", description: "File PDF berhasil diunduh" });
  };

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Laporan</h1>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg">Filter Laporan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:gap-4 lg:items-end">
              <div className="space-y-2"><Label htmlFor="from">Dari Tanggal</Label><Input id="from" type="date" value={dateRange.from} onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="to">Sampai Tanggal</Label><Input id="to" type="date" value={dateRange.to} onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))} /></div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-wrap gap-2">
                <Button onClick={handleFilter} className="gap-2 flex-1 sm:flex-none"><Search className="h-4 w-4" /><span className="hidden sm:inline">Tampilkan</span> Laporan</Button>
                <Button variant="outline" onClick={downloadCSV} className="gap-2 flex-1 sm:flex-none"><FileDown className="h-4 w-4" /><span className="hidden sm:inline">Download</span> Excel</Button>
                <Button variant="outline" onClick={downloadPDF} className="gap-2 flex-1 sm:flex-none"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Download</span> PDF</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Belum Diproses" value={stats.pending} icon={Clock} variant="warning" />
          <StatCard title="Sedang Diproses" value={stats.processing} icon={ProcessingIcon} variant="info" />
          <StatCard title="Selesai Diproses" value={stats.completed} icon={CheckCircle} variant="success" />
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-lg">Data Laporan ({filteredComplaints.length} pengaduan)</CardTitle></CardHeader>
          <CardContent>
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>No. Pengaduan</TableHead>
                    <TableHead>Tanggal Lapor</TableHead>
                    <TableHead>Tanggal Selesai</TableHead>
                    <TableHead>NPK</TableHead>
                    <TableHead>Nama Pemohon</TableHead>
                    <TableHead>Unit Kerja</TableHead>
                    <TableHead>Nama Item</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedComplaints.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Tidak ada data dalam rentang tanggal ini</TableCell></TableRow>
                  ) : paginatedComplaints.map((complaint, index) => (
                    <TableRow key={complaint.id}>
                      <TableCell className="text-center">{startIndex + index + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{complaint.complaint_code}</TableCell>
                      <TableCell className="font-medium">{complaint.ticket_number}</TableCell>
                      <TableCell>{formatDate(complaint.reported_at)}</TableCell>
                      <TableCell>{complaint.completed_at ? formatDate(complaint.completed_at) : "-"}</TableCell>
                      <TableCell>{complaint.npk || "-"}</TableCell>
                      <TableCell>{complaint.reporter_name}</TableCell>
                      <TableCell>{complaint.department}</TableCell>
                      <TableCell>{complaint.item_name}</TableCell>
                      <TableCell className="text-center">{complaint.quantity}</TableCell>
                      <TableCell><Badge variant={statusVariants[complaint.status]}>{statusLabels[complaint.status]}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="lg:hidden space-y-3">
              {paginatedComplaints.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Tidak ada data dalam rentang tanggal ini</p>
              ) : paginatedComplaints.map((complaint, index) => (
                <div key={complaint.id} className="p-4 border rounded-lg space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">#{startIndex + index + 1}</span>
                    <Badge variant={statusVariants[complaint.status]}>{statusLabels[complaint.status]}</Badge>
                  </div>
                  <div className="font-semibold text-primary">{complaint.ticket_number}</div>
                  <div className="text-xs font-mono text-muted-foreground">Kode: {complaint.complaint_code}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-muted-foreground">Pemohon</p><p className="font-medium truncate">{complaint.reporter_name}</p></div>
                    <div><p className="text-muted-foreground">NPK</p><p className="font-medium truncate">{complaint.npk || "-"}</p></div>
                    <div><p className="text-muted-foreground">Unit Kerja</p><p className="font-medium truncate">{complaint.department}</p></div>
                    <div><p className="text-muted-foreground">Item</p><p className="font-medium truncate">{complaint.item_name}</p></div>
                    <div><p className="text-muted-foreground">Jumlah</p><p className="font-medium">{complaint.quantity}</p></div>
                    <div><p className="text-muted-foreground">Tgl Lapor</p><p className="font-medium">{formatDate(complaint.reported_at)}</p></div>
                    <div><p className="text-muted-foreground">Tgl Selesai</p><p className="font-medium">{complaint.completed_at ? formatDate(complaint.completed_at) : "-"}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center sm:text-left">Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredComplaints.length)} dari {filteredComplaints.length} data</p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="gap-1 px-2 sm:px-3"><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Sebelumnya</span></Button>
                  <div className="hidden sm:flex items-center gap-1 mx-2">
                    {getPageNumbers().map((page, index) => typeof page === "number" ? (
                      <Button key={index} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => goToPage(page)} className="min-w-[2.5rem]">{page}</Button>
                    ) : <span key={index} className="px-2 text-muted-foreground">{page}</span>)}
                  </div>
                  <span className="sm:hidden text-sm text-muted-foreground">{currentPage}/{totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="gap-1 px-2 sm:px-3"><span className="hidden sm:inline">Selanjutnya</span><ChevronRight className="h-4 w-4" /></Button>
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
