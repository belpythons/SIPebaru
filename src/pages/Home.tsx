import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, LogIn, Loader2 } from "lucide-react";
import { ComplaintFormDialog } from "@/components/ComplaintFormDialog";
import { StatusSearchResult } from "@/components/StatusSearchResult";

interface ComplaintResult {
  ticket_number: string;
  item_name: string;
  department: string;
  kompartemen: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
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
        .select("ticket_number, item_name, department, kompartemen, status, reported_at, description")
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="p-4 flex justify-end">
        <Button variant="outline" onClick={() => navigate("/login")} className="gap-2">
          <LogIn className="h-4 w-4" />
          Login Admin
        </Button>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 pt-12 pb-20">
        <div className="text-center space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Cek Pengaduan Barang Rusak Anda
            </h1>
            <p className="text-muted-foreground">
              Masukkan nomor pengaduan untuk melihat status laporan Anda
            </p>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan Nomor Pengaduan (contoh: BR-0001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-center text-lg h-12"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                size="lg"
                className="gap-2 px-6"
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
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">
                Atau ajukan pengaduan Anda
              </span>
            </div>
          </div>

          {/* Submit Complaint Button */}
          <Button
            onClick={() => setIsFormOpen(true)}
            size="lg"
            className="gap-2 text-lg px-8 py-6"
          >
            <FileText className="h-5 w-5" />
            Ajukan Pengaduan
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
        © 2024 SIPebaru - Sistem Informasi Pengaduan Barang Rusak
      </footer>

      {/* Complaint Form Dialog */}
      <ComplaintFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};

export default Home;
