import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, LogIn, Loader2, Package, ClipboardList, CheckCircle2, Clock, Send, Eye, X, Copy, CheckCircle } from "lucide-react";
import { ComplaintFormDialog } from "@/components/ComplaintFormDialog";
import { StatusSearchResult } from "@/components/StatusSearchResult";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ComplaintResult {
  ticket_number: string;
  complaint_code: string;
  item_name: string;
  department: string;
  kompartemen: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
  processed_at: string | null;
  completed_at: string | null;
  description: string | null;
  reporter_name: string;
  admin_note: string | null;
  completion_photo_url: string | null;
}

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<ComplaintResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSOPOpen, setIsSOPOpen] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{ ticketNumber: string; complaintCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const sopSteps = [
    {
      icon: Send,
      title: "Ajukan Pengaduan",
      description: "Isi formulir pengaduan dengan data lengkap termasuk nama, departemen, nama barang, dan deskripsi kerusakan.",
    },
    {
      icon: ClipboardList,
      title: "Terima Kode Pengaduan",
      description: "Setelah berhasil submit, Anda akan menerima kode pengaduan 5 digit. Simpan kode ini untuk melacak status.",
    },
    {
      icon: Clock,
      title: "Proses Verifikasi",
      description: "Tim admin akan memverifikasi dan memproses pengaduan Anda. Status berubah menjadi 'Diproses'.",
    },
    {
      icon: CheckCircle2,
      title: "Pengaduan Selesai",
      description: "Setelah barang diperbaiki/diganti, status berubah menjadi 'Selesai' beserta bukti penyelesaian.",
    },
    {
      icon: Eye,
      title: "Cek Status Kapan Saja",
      description: "Gunakan kode pengaduan untuk memantau progres pengaduan Anda melalui halaman utama.",
    },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Masukkan Nomor Pengaduan",
        description: "Silakan masukkan nomor pengaduan untuk mencari status",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResult(null);
    setSearchError(null);

    try {
      // Use RPC function that supports partial search
      // Users can search by: "0001", "0001/ADKOR", or full "0001/ADKOR/Feb/2026"
      const { data, error } = await supabase
        .rpc("get_complaint_status", { ticket_num: searchQuery.trim() });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map RPC result to ComplaintResult format
        const result = data[0];
        setSearchResult({
          ticket_number: result.ticket_number,
          complaint_code: result.complaint_code,
          item_name: result.item_name,
          department: result.department,
          kompartemen: result.kompartemen,
          status: result.status as "pending" | "processing" | "completed",
          reported_at: result.reported_at,
          processed_at: result.processed_at,
          completed_at: result.completed_at,
          description: result.description,
          reporter_name: "", // Not exposed for privacy
          admin_note: null, // Not exposed for privacy
          completion_photo_url: result.completion_photo_url,
        });
      } else {
        setSearchError("Pengaduan dengan nomor tersebut tidak ditemukan");
      }
    } catch (error: any) {
      console.error("Error searching complaint:", error);
      setSearchError("Terjadi kesalahan saat mencari pengaduan");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setSearchResult(null);
    setSearchQuery("");
    setSearchError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-400/10 to-cyan-300/5" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-blue-300/15 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative z-10 flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary text-primary-foreground">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-lg text-foreground leading-tight">SIPebaru</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Sistem Informasi Pengaduan Barang Rusak</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsSOPOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">SOP Pengaduan</span>
              </Button>
              <Button variant="outline" onClick={() => navigate("/login")} className="gap-2" size="sm">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login Admin</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center container max-w-2xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center space-y-6 sm:space-y-8 w-full">
          {/* Submission Success Banner */}
          {lastSubmission && (
            <div className="relative bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 sm:p-5 text-left animate-fade-in">
              <button
                onClick={() => setLastSubmission(null)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">Pengaduan Berhasil Dikirim!</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Simpan kode ini untuk mengecek status pengaduan Anda</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="bg-background border-2 border-primary/30 px-4 py-2 rounded-lg">
                      <span className="text-xl sm:text-2xl font-bold text-primary tracking-widest">{lastSubmission.complaintCode}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() => {
                        navigator.clipboard.writeText(lastSubmission.complaintCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                        toast({ title: "Tersalin!", description: "Kode pengaduan berhasil disalin" });
                      }}
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Tersalin" : "Salin"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    No. Tiket: <span className="font-medium">{lastSubmission.ticketNumber}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Hero Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-3 sm:mb-4">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pb-2">
              Selamat Datang di SIPebaru
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground font-medium px-2">
              Sistem Informasi Pengaduan Barang Rusak
            </p>
          </div>

          {/* Search Section */}
          <div className="bg-card rounded-xl sm:rounded-2xl shadow-lg border p-4 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Cek Status Pengaduan Anda
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Masukkan Kode Pengaduan (5 karakter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-center text-base sm:text-lg h-11 sm:h-12"
                maxLength={5}
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                size="lg"
                className="gap-2 px-6 h-11 sm:h-12 w-full sm:w-auto"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Cari
              </Button>
            </div>

            {/* Search Error */}
            {searchError && (
              <p className="text-destructive text-sm">{searchError}</p>
            )}
          </div>

          {/* Search Result */}
          {searchResult && (
            <div className="space-y-4">
              <StatusSearchResult complaint={searchResult} />
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Cek Status Lainnya
              </Button>
            </div>
          )}

          {/* Divider */}
          <div className="relative py-3 sm:py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gradient-to-br from-primary/5 via-background to-secondary/20 px-3 sm:px-4 text-muted-foreground">
                Atau ajukan pengaduan baru
              </span>
            </div>
          </div>

          {/* Submit Complaint Button */}
          <div className="space-y-3 sm:space-y-4">
            <Button
              onClick={() => setIsFormOpen(true)}
              size="lg"
              className="gap-2 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-shadow w-full sm:w-auto"
            >
              <FileText className="h-5 w-5" />
              Ajukan Pengaduan
            </Button>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Laporkan barang rusak dengan cepat dan mudah
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t mt-auto">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
                <Package className="h-3 w-3" />
              </div>
              <span className="font-medium text-foreground text-sm">SIPebaru</span>
            </div>
            
            <span className="hidden sm:inline text-muted-foreground">•</span>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} Sistem Informasi Pengaduan Barang Rusak
            </p>
          </div>
        </div>
      </footer>

      {/* Complaint Form Dialog */}
      <ComplaintFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmitSuccess={(result) => {
          setLastSubmission(result);
          setCopied(false);
        }}
      />

      {/* SOP Dialog */}
      <Dialog open={isSOPOpen} onOpenChange={setIsSOPOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5 text-primary" />
              SOP Proses Pengaduan
            </DialogTitle>
            <DialogDescription>
              Berikut adalah langkah-langkah proses pengaduan barang rusak
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {sopSteps.map((step, index) => (
              <div 
                key={index} 
                className="flex gap-4 p-4 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-foreground">{step.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <Button 
              onClick={() => {
                setIsSOPOpen(false);
                setIsFormOpen(true);
              }}
              className="w-full gap-2"
            >
              <FileText className="h-4 w-4" />
              Ajukan Pengaduan Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Home;
