import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, LogIn, Loader2, Package } from "lucide-react";
import { ComplaintFormDialog } from "@/components/ComplaintFormDialog";
import { StatusSearchResult } from "@/components/StatusSearchResult";

interface ComplaintResult {
  ticket_number: string;
  item_name: string;
  department: string;
  kompartemen: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
  processed_at: string | null;
  completed_at: string | null;
  description: string | null;
}

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<ComplaintResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      const { data, error } = await supabase
        .from("complaints")
        .select("ticket_number, item_name, department, kompartemen, status, reported_at, processed_at, completed_at, description")
        .eq("ticket_number", searchQuery.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSearchResult(data as ComplaintResult);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
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
                onClick={() => setIsFormOpen(true)}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Ajukan Pengaduan</span>
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
      <main className="flex-1 container max-w-2xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-3 sm:mb-4">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
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
                placeholder="Masukkan Nomor Pengaduan (contoh: BR-0001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-center text-base sm:text-lg h-11 sm:h-12"
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
          {searchResult && <StatusSearchResult complaint={searchResult} />}

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
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground">
                <Package className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-foreground">SIPebaru</span>
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center">
              © {new Date().getFullYear()} SIPebaru - Sistem Informasi Pengaduan Barang Rusak
            </p>

            {/* Quick Links */}
            <div className="flex items-center gap-4 text-sm">
              <button 
                onClick={() => setIsFormOpen(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Ajukan Pengaduan
              </button>
              <button 
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Login Admin
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Complaint Form Dialog */}
      <ComplaintFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};

export default Home;
