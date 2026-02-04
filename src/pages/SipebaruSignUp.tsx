import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, UserPlus, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SipebaruSignUp = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    npk: "",
    unit_kerja: "",
    rfid: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.nama.trim()) return "Nama wajib diisi";
    if (!formData.npk.trim()) return "NPK wajib diisi";
    if (!formData.unit_kerja.trim()) return "Unit Kerja wajib diisi";
    if (!formData.rfid.trim() && !formData.email.trim()) {
      return "RFID atau Email wajib diisi (minimal salah satu)";
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return "Format email tidak valid";
    }
    if (!formData.password) return "Password wajib diisi";
    if (formData.password.length < 6) return "Password minimal 6 karakter";
    if (formData.password !== formData.confirmPassword) {
      return "Konfirmasi password tidak cocok";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validasi Gagal",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc("register_sipebaru_user", {
        _nama: formData.nama.trim(),
        _npk: formData.npk.trim(),
        _unit_kerja: formData.unit_kerja.trim(),
        _rfid: formData.rfid.trim() || null,
        _email: formData.email.trim() || null,
        _password: formData.password,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        if (!result.success) {
          throw new Error(result.error_message);
        }
      }

      setIsSuccess(true);
    } catch (error: any) {
      toast({
        title: "Pendaftaran Gagal",
        description: error.message || "Terjadi kesalahan saat mendaftar",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-400/10 to-cyan-300/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="container max-w-6xl mx-auto px-4 sm:px-6">
              <div className="flex h-14 sm:h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary text-primary-foreground">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="font-bold text-base sm:text-lg text-foreground">SIPebaru</span>
                </Link>
              </div>
            </div>
          </header>

          {/* Success Message */}
          <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
              <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Pendaftaran Berhasil!</h2>
                <p className="text-muted-foreground">
                  Akun Anda berhasil didaftarkan dan menunggu aktivasi admin utama.
                </p>
                <p className="text-sm text-muted-foreground">
                  Anda akan menerima notifikasi setelah akun diaktivasi.
                </p>
                <div className="pt-4 space-y-2">
                  <Button asChild className="w-full">
                    <Link to="/sipebaru/login">Ke Halaman Login</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/">Kembali ke Beranda</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-400/10 to-cyan-300/5" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex h-14 sm:h-16 items-center justify-between">
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary text-primary-foreground">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base sm:text-lg text-foreground leading-tight">SIPebaru</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Sistem Informasi Pengaduan Barang Rusak</span>
                </div>
              </Link>
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Kembali</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
            <CardHeader className="text-center pb-4 px-6 pt-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 mx-auto">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                Daftar Akun SIPEBARU
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Buat akun baru untuk mengakses sistem
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Lengkap *</Label>
                  <Input
                    id="nama"
                    name="nama"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={formData.nama}
                    onChange={handleInputChange}
                    required
                    className="h-11 bg-background"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="npk">NPK *</Label>
                  <Input
                    id="npk"
                    name="npk"
                    type="text"
                    placeholder="Masukkan NPK"
                    value={formData.npk}
                    onChange={handleInputChange}
                    required
                    className="h-11 bg-background"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_kerja">Unit Kerja *</Label>
                  <Input
                    id="unit_kerja"
                    name="unit_kerja"
                    type="text"
                    placeholder="Masukkan unit kerja"
                    value={formData.unit_kerja}
                    onChange={handleInputChange}
                    required
                    className="h-11 bg-background"
                    maxLength={120}
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    Isi minimal salah satu: RFID atau Email
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rfid">RFID (opsional)</Label>
                      <Input
                        id="rfid"
                        name="rfid"
                        type="text"
                        placeholder="Masukkan nomor RFID"
                        value={formData.rfid}
                        onChange={handleInputChange}
                        className="h-11 bg-background"
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email (opsional)</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="contoh@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="h-11 bg-background"
                        maxLength={255}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-11 bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Ulangi password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="h-11 bg-background"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 h-11 text-base shadow-lg hover:shadow-xl transition-shadow"
                  disabled={isLoading}
                >
                  <UserPlus className="h-4 w-4" />
                  {isLoading ? "Memproses..." : "Daftar"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <Link to="/sipebaru/login" className="text-primary hover:underline">
                    Login di sini
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </main>

        {/* Footer */}
        <footer className="bg-card/50 backdrop-blur-sm border-t mt-auto">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
                  <Package className="h-3 w-3" />
                </div>
                <span className="font-medium text-foreground text-sm">SIPebaru</span>
              </div>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <p className="text-sm text-muted-foreground text-center">
                © {new Date().getFullYear()} Sistem Informasi Pengaduan Barang Rusak
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SipebaruSignUp;
